export interface UpgradeLevels {
	moneyPerQuestion: number;
	streakBonus: number;
	multiplier: number;
	insurance: number;
}

export enum UpgradeKeys {
	"moneyPerQuestion" = "Money Per Question",
	"streakBonus" = "Streak Bonus",
	"multiplier" = "Multiplier",
	"insurance" = "Insurance",
}

export interface UpgradeStrategy {
	find(
		callbackfn: (value: [keyof UpgradeLevels, number, number], index: number, array: [keyof UpgradeLevels, number, number][]) => unknown,
		thisArg?: unknown
	): [keyof UpgradeLevels, number, number] | undefined;
	[index: number]: [keyof UpgradeLevels, number, number];
}

export interface UpgradeData {
	name: keyof UpgradeLevels;
	level: number;
	price: number;
}

export interface CompletedUpgrade {
	name: keyof UpgradeLevels;
	level: number;
}
