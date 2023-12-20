// import Colyseus from "./frameworks/Colyseus";
import Colyseus from "./frameworks/colyseus/export";
import Blueboat from "./frameworks/BlueBoat";
import { ParsePacket } from "./Utils/ParsePacket";
import { Packet, Socket } from "../../types";

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

		socket.addEventListener("message", (event) => {
			const decoded = this.Decode(event.data);
			if (!decoded) return;

			console.debug(`[GS] 📦 Received data from ${this.transportType} socket`);
			console.debug(`[GS] 🔓 Decoded data: ${JSON.stringify(decoded)}`);

			this.dispatchEvent(new CustomEvent("receiveMessage", { detail: decoded }));

			if (typeof decoded == "object" && "changes" in decoded) {
				this.dispatchEvent(new CustomEvent("receiveChanges", { detail: ParsePacket(decoded) }));
			}
		});
	}

	SendData(channel: string, data: Packet) {
		if (!this.socket) return;

		const encoded = this.Encode(channel, data);
		this.socket.send(encoded);

		console.debug(`[GS] 🥏 Sent data to ${this.transportType} socket`);
		console.debug(`[GS] 🧩 Encoded data: ${this.ArrayBufferToString(encoded)}`);
	}

	private ArrayBufferToString(buffer: ArrayBuffer) {
		return String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer)));
	}

	private Encode(channel: string, data: Packet) {
		if (!this.roomId && this.transportType == "blueboat") throw new Error("Room ID not found");

		if (this.transportType == "colyseus") return Colyseus.encode(channel, data);
		else return Blueboat.encode(channel, data, this.roomId);
	}

	private Decode(data: Packet) {
		if (this.transportType == "colyseus") return Colyseus.decode(data);
		else return Blueboat.decode(data);
	}
}

export default SocketHandler;
