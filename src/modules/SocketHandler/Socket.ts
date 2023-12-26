import Colyseus from "./frameworks/colyseus/index";
import blueboat from "./frameworks/blueboat";
import { ParsePacket } from "./Utils/ParsePacket";
import { Packet } from "../../types";

type Data = string | ArrayBufferLike | Blob | ArrayBufferView;

class SocketHandler extends EventTarget {
	socket: WebSocket | null = null;
	hasFired: boolean = false;
	transportType: string = "unknown";
	roomId: string | null = null;

	constructor() {
		super();
	}

	/**
	 * Hooks the WebSocket prototype of 'send' using the {@link HookSend} function.
	 */
	GetSocket() {
		const SpoofSend = this.HookSend.bind(this);
		const OldSend = WebSocket.prototype.send;
		WebSocket.prototype.send = function (data: Data) {
			SpoofSend(this, data, OldSend);
		};
	}

	/**
	 * Hooks the socket and adds an event listener for messages.
	 *
	 * The messages received are decoded and dispatched as events.
	 *
	 * Two types of events are dispatched:
	 * - receiveMessage - This event is dispatched with the decoded data.
	 * - receiveChanges - This event is dispatched if the decoded data contains any changes (the changes are parsed before dispatching).
	 *
	 * @returns The {@link socket} and {@link transportType}
	 */
	HookSocket(socket: WebSocket): [WebSocket, string] | undefined {
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

		return [this.socket, this.transportType];
	}

	/**
	 * Encodes and sends the packet to the socket.
	 */
	SendData(channel: string, packet: Packet) {
		if (!this.socket) return;

		const encoded = this.Encode(channel, packet);
		this.socket.send(encoded);

		console.debug(`[GS] 🥏 Sent packet to ${this.transportType} socket`);
		console.debug(`[GS] 🧩 Encoded packet: ${this.ArrayBufferToString(encoded)}`);
	}

	/**
	 * Hooks the WebSocket prototype of 'send'.
	 *
	 * Also registers the socket with {@link HookSocket} if the socket is not a local socket.
	 *
	 * If the transport type is blueboat, the roomId is also caught and stored.
	 */
	private HookSend(socket: WebSocket, data: Data, OldSend: (data: Data) => void) {
		if (socket.url.startsWith("ws://localhost")) return OldSend(data);

		this.HookSocket(socket);

		if (!this.socket) return;
		OldSend.call(this.socket, data);

		const decoded = blueboat.decode(data);

		if (this.transportType == "blueboat" && !this.roomId) {
			if (decoded.roomId || decoded.room) this.roomId = decoded.roomId || decoded.room;

			console.info(`[GS] 🥅 Caught roomId: ${this.roomId}`);
		}
	}

	/**
	 * Converts an ArrayBuffer to a string.
	 */
	private ArrayBufferToString(buffer: ArrayBuffer) {
		return String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer)));
	}

	/**
	 * Encodes a packet with the respective transport type.
	 */
	private Encode(channel: string, packet: Packet): ArrayBuffer {
		if (!this.roomId && this.transportType == "blueboat") throw new Error("Room ID not found");
		if (this.transportType == "colyseus") {
			return Colyseus.encode(channel, packet as ArrayBuffer);
		} else if (this.transportType == "blueboat") {
			return blueboat.encode(channel, packet, this.roomId as string);
		}

		throw new Error("Unknown transport type");
	}

	/**
	 * Decodes a packet with the respective transport type.
	 */
	private Decode(packet: Packet) {
		if (this.transportType == "colyseus") {
			return Colyseus.decode(packet as ArrayBuffer);
		} else if (this.transportType == "blueboat") {
			return blueboat.decode(packet);
		}

		throw new Error("Unknown transport type");
	}
}

export default SocketHandler;
