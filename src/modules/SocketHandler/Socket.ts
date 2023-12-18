// took (mostly) from https://github.com/TheLazySquid/GimkitCheat/blob/main/src/network/socket.ts THANKS!

import Colyseus from "./modules/Colyseus"
import Blueboat from "./modules/BlueBoat";
import { ParsePacket } from "./Utils/ParsePacket";

interface Socket extends WebSocket {
	_send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
	RegisterSocket: (socket: Socket) => void;
}

class SocketHandler extends EventTarget {
	socket: Socket | null = null;
	hasFired: boolean = false;
	transportType: string = "unknown";
	roomId: string | null = null;

	constructor() {
		super();
	}

	GetSocket() {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const handlerThis = this;
		(WebSocket.prototype as Socket)._send = WebSocket.prototype.send;
		WebSocket.prototype.send = function (data) {
			if (this.url.startsWith("ws://localhost")) return (this as Socket)._send(data);

			handlerThis.RegisterSocket(this as Socket);

			if (!handlerThis.socket) return;
			handlerThis.socket._send(data);

			const decoded = Blueboat.decode(data);

			if (handlerThis.transportType == "blueboat" && !handlerThis.roomId) {
				if (decoded.roomId) handlerThis.roomId = decoded.roomId;
				if (decoded.room) handlerThis.roomId = decoded.room;

				console.info(`[GS] 🥅 Caught roomId: ${handlerThis.roomId}`);
			}
		};
	}

	RegisterSocket(socket: Socket) {
		if (this.hasFired) return;
		this.socket = socket;
		this.hasFired = true;
		this.dispatchEvent(new CustomEvent("socket", { detail: socket }));

		if ("stores" in window) this.transportType = "colyseus";
		else this.transportType = "blueboat";

		socket.addEventListener("message", (e) => {
			let decoded
			if (this.transportType == "colyseus") decoded = Colyseus.decode(e.data);
			else decoded = Blueboat.decode(e.data);

			if (!decoded) return;

			this.dispatchEvent(new CustomEvent("receiveMessage", { detail: decoded }));

			if (typeof decoded != "object") return;
			if ("changes" in decoded) {
				const parsed = ParsePacket(decoded);
				this.dispatchEvent(new CustomEvent("receiveChanges", { detail: parsed }));
			}
		});
	}

	SendData(channel: string, data: unknown) {
		if (!this.socket) return;
		if (!this.roomId && this.transportType == "blueboat") throw new Error("Room ID not found, can't send data");

		let encoded
		if(this.transportType == "colyseus") encoded = Colyseus.encode(channel, data);
		else encoded = Blueboat.encode(channel, data, this.roomId);

		this.socket.send(encoded);

		console.debug(`[GS] 🥏 Sent data to ${this.transportType} socket sent successfully.`);
	}
}

export default SocketHandler;
