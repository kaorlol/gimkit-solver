interface Window {
	GameId: string;
}

const OriginalWebSocket = window.WebSocket;
class CustomWebSocket extends OriginalWebSocket {
	constructor(url: string | URL, protocols?: string | string[] | undefined) {
		super(url, protocols);
		this.addEventListener("message", this.HandleMessage.bind(this));
	}

	HandleMessage(event: MessageEvent) {
		if (!(window as unknown as Window).GameId) {
			const decoder = new TextDecoder("utf-8");
			const decodedData = decoder.decode(event.data);
			if (decodedData.includes("game")) {
				const gameID = this.ExtractGameID(decodedData);
				if (gameID) {
					console.info(`🥅 [GS] Caught game ID: ${gameID}`);
					(window as unknown as Window).GameId = gameID;
				}
			}
		}
	}

	ExtractGameID(data: string): string | null {
		const regex = /\bgame(?!\uFFFDend)(?:�|":")([a-z0-9]*)/g;
		const matches = [...data.matchAll(regex)];

		if (matches.length > 0) {
			return matches[0][1];
		}

		return null;
	}
}

window.WebSocket = CustomWebSocket;

console.info("🪝 [GS] Hooked WebSocket.");

export function GetGameId(): Promise<string> {
	return new Promise((resolve) => {
		const interval = setInterval(() => {
			if ((window as unknown as Window).GameId) {
				clearInterval(interval);
				resolve((window as unknown as Window).GameId);
			}
		}, 100);
	});
}