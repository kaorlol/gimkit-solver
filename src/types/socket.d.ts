export interface Packet {
	key?: string;
	deviceId?: string;
	answer?: string;
	upgradeName?: string;
	level?: number;
	questionId?: string;
	data?: {
		[key: string]: string;
	};
}

export interface Change {
	id: string;
	data: {
		[key: string]: string;
	};
}

export interface Defer {
	_offset?: number;
	_length?: number;
	_str?: string | unknown;
	_bin?: ArrayBuffer;
	_float?: number | unknown;
}

export interface ChangePacket {
	changes: [number, number[], unknown[]][];
	values: string[];
}

export type PayloadValue = string | number | boolean | null | undefined | ArrayBuffer | { [key: string]: unknown };
export type Data = string | ArrayBufferLike | Blob | ArrayBufferView;