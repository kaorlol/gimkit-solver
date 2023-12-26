import { ChangePacket } from "types/socket";

export function ParsePacket(packet: ChangePacket) {
	const returnVar = [];

	for (const change of packet.changes) {
		const data: { [index: string]: unknown } = {};
		const keys = change[1].map((index: number) => packet.values[index]);
		for (let i = 0; i < keys.length; i++) {
			data[keys[i]] = change[2][i];
		}

		returnVar.push({ id: change[0], data });
	}

	return returnVar;
}
