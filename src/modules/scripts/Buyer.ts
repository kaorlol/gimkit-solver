import { CompletedUpgrade, UpgradeData, UpgradeKeys, UpgradeLevels, UpgradeStrategy } from "@gimkitsolver/types";
import SocketHandler from "../SocketHandler/Socket";

class Buyer {
	socketHandler: SocketHandler;
	upgradeLevels: UpgradeLevels;
	upgradeStrategy: UpgradeStrategy;
	currentUpgrade: UpgradeData | undefined;
	completedUpgrades: CompletedUpgrade[] = [];
	receivedMessageInit = false;
	bought = false;
	balance = 0;
	gameEnded = false;

	constructor(socketHandler: SocketHandler) {
		this.socketHandler = socketHandler;

		this.upgradeLevels = {
			moneyPerQuestion: 1,
			streakBonus: 1,
			multiplier: 1,
			insurance: 1,
		};

		this.upgradeStrategy = [
			["streakBonus", 2, 20],
			["moneyPerQuestion", 3, 100],
			["streakBonus", 3, 200],
			["multiplier", 3, 300],
			["streakBonus", 4, 2000],
			["multiplier", 4, 2000],
			["moneyPerQuestion", 5, 1e4],
			["streakBonus", 5, 2e4],
			["multiplier", 5, 1.2e4],
			["moneyPerQuestion", 6, 7.5e4],
			["multiplier", 6, 8.5e4],
			["streakBonus", 6, 2e5],
			["streakBonus", 7, 2e6],
			["streakBonus", 8, 2e7],
			["multiplier", 7, 7e5],
			["moneyPerQuestion", 9, 1e7],
			["multiplier", 8, 6.5e6],
			["streakBonus", 9, 2e8],
			["multiplier", 9, 6.5e7],
			["streakBonus", 10, 2e9],
			["moneyPerQuestion", 10, 1e8],
			["multiplier", 10, 1e9],
		];
	}

	AutoBuy() {
		if (this.gameEnded) return;

		const interval = setInterval(() => {
			if (this.gameEnded) {
				clearInterval(interval);
				return;
			}

			this.HandleBlueboatTransport();
		}, 1000);
	}

	StartReceiver() {
		this.socketHandler.addEventListener("receiveMessage", (event) => {
			const detail = (event as CustomEvent).detail;
			if (detail?.key == "end_game" || detail?.key == "UPDATED_PLAYER_LEADERBOARD") {
				console.info("[GS] 🏁 Game ended");
				this.gameEnded = true;
				return;
			}

			if (this.socketHandler.transportType == "colyseus") return;

			if (detail.data.type == "BALANCE") this.balance = detail.data.value;
			if (detail.data.type == "UPGRADE_LEVELS") {
				this.upgradeLevels = detail.data.value;

				for (const [name, level] of Object.entries(this.upgradeLevels)) {
					this.PushCompleted(name as keyof UpgradeLevels, level);
				}

				this.receivedMessageInit = true;
				this.bought = false;
			}

			if (this.receivedMessageInit && !this.bought) {
				const availableUpgrade = this.GetAvailable();
				if (!availableUpgrade) {
					this.currentUpgrade = undefined;
					return;
				}

				const [name, level, price] = availableUpgrade;
				this.currentUpgrade = {
					name,
					level,
					price,
				};
			}
		});
	}

	private GetAvailable() {
		const availableUpgrade = this.upgradeStrategy.find((upgrade) => {
			const [name, level, price] = upgrade;
			const isCompleted = this.IsCompleted(name, level);

			return !isCompleted && this.balance >= price;
		});

		if (availableUpgrade) {
			const [name, level, price] = availableUpgrade;
			return [name, level, price] as [keyof UpgradeLevels, number, number];
		}

		return undefined;
	}

	private IsCompleted(name: keyof UpgradeLevels, level: number) {
		return this.completedUpgrades.some((completedUpgrade) => {
			return completedUpgrade.name == name && completedUpgrade.level >= level;
		});
	}

	private PushCompleted(name: keyof UpgradeLevels, level: number) {
		this.completedUpgrades.push({
			name,
			level,
		});
	}

	private BuyUpgrade(name: string, level: number) {
		if (this.IsCompleted(name as keyof UpgradeLevels, level)) return;

		name = UpgradeKeys[name as keyof typeof UpgradeKeys];
		this.socketHandler.SendData("UPGRADE_PURCHASED", {
			upgradeName: name,
			level,
		});

		this.bought = true;

		console.info(`[GS] 💰 Bought level: ${level} of ${name}`);
	}

	private HandleBlueboatTransport() {
		const name = this.currentUpgrade?.name;
		const level = this.currentUpgrade?.level;
		if (name && level) this.BuyUpgrade(name, level);
	}
}

export default Buyer;
