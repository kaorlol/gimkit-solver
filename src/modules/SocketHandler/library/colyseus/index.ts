import { Defer, PayloadValue } from "../../../../types/socket";
import { string, number, stringCheck } from "./components/decode";

// JOIN_ROOM: 10
// ERROR: 11
// LEAVE_ROOM: 12
// ROOM_DATA: 13
// ROOM_STATE: 14
// ROOM_STATE_PATCH: 15
// ROOM_DATA_SCHEMA: 16

// (mostly) taken from the game code and converted to typescript

class Decoder {
	offset: number;
	buffer: ArrayBuffer;
	view: DataView;

	constructor(buffer: number[] | ArrayBuffer, offset: number) {
		this.offset = offset;

		if (buffer instanceof ArrayBuffer) {
			this.buffer = buffer;
			this.view = new DataView(this.buffer);
		} else if (ArrayBuffer.isView(buffer)) {
			this.buffer = buffer.buffer;
			this.view = new DataView(this.buffer, buffer.byteOffset, buffer.byteLength);
		} else {
			throw new Error("Invalid argument");
		}
	}

	array(length: number) {
		const value = new Array(length);

		for (let i = 0; i < length; i++) {
			value[i] = this.parse();
		}

		return value;
	}

	map(length: number) {
		const value: { [key: string]: unknown } = {}; // Add index signature to allow indexing with a string
		let key = "";

		for (let i = 0; i < length; i++) {
			key = this.parse() as string;
			value[key] = this.parse();
		}

		return value;
	}

	str(length: number) {
		const value = utf8Read(this.view, this.offset, length);
		this.offset += length;
		return value;
	}

	bin(length: number) {
		const value = this.buffer.slice(this.offset, this.offset + length);
		this.offset += length;
		return value;
	}

	parse() {
		const prefix = this.view.getUint8(this.offset++);

		let value;
		let length = 0;
		let type = 0;
		let high = 0;
		let low = 0;

		if (prefix < 0xc0) {
			if (prefix < 0x80) {
				return prefix;
			}

			if (prefix < 0x90) {
				return this.map(prefix & 0x0f);
			}

			if (prefix < 0xa0) {
				return this.array(prefix & 0x0f);
			}

			return this.str(prefix & 0x1f);
		}

		if (prefix > 0xdf) {
			return (0xff - prefix + 1) * -1;
		}

		switch (prefix) {
			case 0xc0:
				return null;

			case 0xc2:
				return false;

			case 0xc3:
				return true;

			case 0xc4:
				length = this.view.getUint8(this.offset);
				this.offset += 1;
				return this.bin(length);
			case 0xc5:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.bin(length);
			case 0xc6:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.bin(length);

			case 0xc7:
				length = this.view.getUint8(this.offset);
				type = this.view.getInt8(this.offset + 1);
				this.offset += 2;
				return [type, this.bin(length)];
			case 0xc8:
				length = this.view.getUint16(this.offset);
				type = this.view.getInt8(this.offset + 2);
				this.offset += 3;
				return [type, this.bin(length)];
			case 0xc9:
				length = this.view.getUint32(this.offset);
				type = this.view.getInt8(this.offset + 4);
				this.offset += 5;
				return [type, this.bin(length)];

			case 0xca:
				value = this.view.getFloat32(this.offset);
				this.offset += 4;
				return value;
			case 0xcb:
				value = this.view.getFloat64(this.offset);
				this.offset += 8;
				return value;

			case 0xcc:
				value = this.view.getUint8(this.offset);
				this.offset += 1;
				return value;
			case 0xcd:
				value = this.view.getUint16(this.offset);
				this.offset += 2;
				return value;
			case 0xce:
				value = this.view.getUint32(this.offset);
				this.offset += 4;
				return value;
			case 0xcf:
				high = this.view.getUint32(this.offset) * Math.pow(2, 32);
				low = this.view.getUint32(this.offset + 4);
				this.offset += 8;
				return high + low;

			case 0xd0:
				value = this.view.getInt8(this.offset);
				this.offset += 1;
				return value;
			case 0xd1:
				value = this.view.getInt16(this.offset);
				this.offset += 2;
				return value;
			case 0xd2:
				value = this.view.getInt32(this.offset);
				this.offset += 4;
				return value;
			case 0xd3:
				high = this.view.getInt32(this.offset) * Math.pow(2, 32);
				low = this.view.getUint32(this.offset + 4);
				this.offset += 8;
				return high + low;

			case 0xd4:
				type = this.view.getInt8(this.offset);
				this.offset += 1;
				if (type == 0x00) {
					this.offset += 1;
					return void 0;
				}
				return [type, this.bin(1)];
			case 0xd5:
				type = this.view.getInt8(this.offset);
				this.offset += 1;
				return [type, this.bin(2)];
			case 0xd6:
				type = this.view.getInt8(this.offset);
				this.offset += 1;
				return [type, this.bin(4)];
			case 0xd7:
				type = this.view.getInt8(this.offset);
				this.offset += 1;
				if (type == 0x00) {
					high = this.view.getInt32(this.offset) * Math.pow(2, 32);
					low = this.view.getUint32(this.offset + 4);
					this.offset += 8;
					return new Date(high + low);
				}
				return [type, this.bin(8)];
			case 0xd8:
				type = this.view.getInt8(this.offset);
				this.offset += 1;
				return [type, this.bin(16)];

			case 0xd9:
				length = this.view.getUint8(this.offset);
				this.offset += 1;
				return this.str(length);
			case 0xda:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.str(length);
			case 0xdb:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.str(length);

			case 0xdc:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.array(length);
			case 0xdd:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.array(length);

			case 0xde:
				length = this.view.getUint16(this.offset);
				this.offset += 2;
				return this.map(length);
			case 0xdf:
				length = this.view.getUint32(this.offset);
				this.offset += 4;
				return this.map(length);
		}
		throw new Error("Could not parse");
	}
}

function utf8Read(view: DataView, offset: number, length: number) {
	let string = "";
	let chr = 0;

	for (let i = offset, end = offset + length; i < end; i++) {
		const byte = view.getUint8(i);

		if ((byte & 0x80) == 0x00) {
			string += String.fromCharCode(byte);
			continue;
		}

		if ((byte & 0xe0) == 0xc0) {
			string += String.fromCharCode(((byte & 0x1f) << 6) | (view.getUint8(++i) & 0x3f));
			continue;
		}

		if ((byte & 0xf0) == 0xe0) {
			string += String.fromCharCode(((byte & 0x0f) << 12) | ((view.getUint8(++i) & 0x3f) << 6) | ((view.getUint8(++i) & 0x3f) << 0));
			continue;
		}

		if ((byte & 0xf8) == 0xf0) {
			chr = ((byte & 0x07) << 18) | ((view.getUint8(++i) & 0x3f) << 12) | ((view.getUint8(++i) & 0x3f) << 6) | ((view.getUint8(++i) & 0x3f) << 0);

			if (chr >= 0x010000) {
				chr -= 0x010000;
				string += String.fromCharCode((chr >>> 10) + 0xd800, (chr & 0x3ff) + 0xdc00);
			} else {
				string += String.fromCharCode(chr);
			}

			continue;
		}

		throw new Error("Invalid byte " + byte.toString(16));
	}

	return string;
}

function decode(buffer: ArrayBuffer, offset: number | undefined) {
	if (offset == void 0) offset = 0;

	const decoder = new Decoder(buffer, offset);
	const value = decoder.parse();

	if (decoder.offset !== buffer.byteLength) {
		throw new Error(buffer.byteLength - decoder.offset + " trailing bytes");
	}

	return value;
}

function utf8Write(view: DataView, offset: number, str: string) {
	let count = 0;

	for (let i = 0, l = str.length; i < l; i++) {
		count = str.charCodeAt(i);

		if (count < 0x80) {
			view.setUint8(offset++, count);
		} else if (count < 0x800) {
			view.setUint8(offset++, 0xc0 | (count >> 6));
			view.setUint8(offset++, 0x80 | (count & 0x3f));
		} else if (count < 0xd800 || count >= 0xe000) {
			view.setUint8(offset++, 0xe0 | (count >> 12));
			view.setUint8(offset++, 0x80 | ((count >> 6) & 0x3f));
			view.setUint8(offset++, 0x80 | (count & 0x3f));
		} else {
			i++;
			count = 0x10000 + (((count & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
			view.setUint8(offset++, 0xf0 | (count >> 18));
			view.setUint8(offset++, 0x80 | ((count >> 12) & 0x3f));
			view.setUint8(offset++, 0x80 | ((count >> 6) & 0x3f));
			view.setUint8(offset++, 0x80 | (count & 0x3f));
		}
	}
}
function utf8Length(str: string) {
	let count = 0;
	let length = 0;

	for (let i = 0, l = str.length; i < l; i++) {
		count = str.charCodeAt(i);

		if (count < 0x80) length += 1;
		else if (count < 0x800) length += 2;
		else if (count < 0xd800 || count >= 0xe000) length += 3;
		else {
			i++;
			length += 4;
		}
	}

	return length;
}

function _encode(bytes: number[], defers: Defer[], value: PayloadValue) {
	let high = 0;
	let low = 0;
	let length = 0;
	let size = 0;

	if (typeof value == "string") {
		length = utf8Length(value);

		if (length < 0x20) {
			bytes.push(length | 0xa0);
			size = 1;
		} else if (length < 0x100) {
			bytes.push(0xd9, length);
			size = 2;
		} else if (length < 0x10000) {
			bytes.push(0xda, length >> 8, length);
			size = 3;
		} else if (length < 0x100000000) {
			bytes.push(0xdb, length >> 24, length >> 16, length >> 8, length);
			size = 5;
		} else {
			throw new Error("String too long");
		}

		defers.push({ _str: value, _length: length, _offset: bytes.length });

		return size + length;
	}

	if (typeof value == "number") {
		if (Math.floor(value) !== value || !isFinite(value)) {
			bytes.push(0xcb);
			defers.push({ _float: value, _length: 8, _offset: bytes.length });

			return 9;
		}

		if (value >= 0) {
			if (value < 0x80) {
				bytes.push(value);
				return 1;
			}

			if (value < 0x100) {
				bytes.push(0xcc, value);
				return 2;
			}

			if (value < 0x10000) {
				bytes.push(0xcd, value >> 8, value);
				return 3;
			}

			if (value < 0x100000000) {
				bytes.push(0xce, value >> 24, value >> 16, value >> 8, value);
				return 5;
			}

			high = (value / Math.pow(2, 32)) >> 0;
			low = value >>> 0;
			bytes.push(0xcf, high >> 24, high >> 16, high >> 8, high, low >> 24, low >> 16, low >> 8, low);

			return 9;
		} else {
			if (value >= -0x20) {
				bytes.push(value);
				return 1;
			}

			if (value >= -0x80) {
				bytes.push(0xd0, value);
				return 2;
			}

			if (value >= -0x8000) {
				bytes.push(0xd1, value >> 8, value);
				return 3;
			}

			if (value >= -0x80000000) {
				bytes.push(0xd2, value >> 24, value >> 16, value >> 8, value);
				return 5;
			}

			high = Math.floor(value / Math.pow(2, 32));
			low = value >>> 0;
			bytes.push(0xd3, high >> 24, high >> 16, high >> 8, high, low >> 24, low >> 16, low >> 8, low);
			return 9;
		}
	}

	if (typeof value == "object") {
		if (value == null) {
			bytes.push(0xc0);
			return 1;
		}

		if (Array.isArray(value)) {
			length = value.length;

			if (length < 0x10) {
				bytes.push(length | 0x90);
				size = 1;
			} else if (length < 0x10000) {
				bytes.push(0xdc, length >> 8, length);
				size = 3;
			} else if (length < 0x100000000) {
				bytes.push(0xdd, length >> 24, length >> 16, length >> 8, length);
				size = 5;
			} else {
				throw new Error("Array too large");
			}

			for (let i = 0; i < length; i++) size += _encode(bytes, defers, value[i]);

			return size;
		}

		if (value instanceof Date) {
			const time = value.getTime();

			high = Math.floor(time / Math.pow(2, 32));
			low = time >>> 0;
			bytes.push(0xd7, 0, high >> 24, high >> 16, high >> 8, high, low >> 24, low >> 16, low >> 8, low);

			return 10;
		}

		if (value instanceof ArrayBuffer) {
			length = value.byteLength;

			if (length < 0x100) {
				bytes.push(0xc4, length);
				size = 2;
			} else if (length < 0x10000) {
				bytes.push(0xc5, length >> 8, length);
				size = 3;
			} else if (length < 0x100000000) {
				bytes.push(0xc6, length >> 24, length >> 16, length >> 8, length);
				size = 5;
			} else {
				throw new Error("Buffer too large");
			}

			defers.push({ _bin: value, _length: length, _offset: bytes.length });

			return size + length;
		}

		if (typeof value.toJSON == "function") {
			return _encode(bytes, defers, value.toJSON());
		}

		const keys = [];
		const allKeys = Object.keys(value);

		let key = "";
		for (let i = 0, l = allKeys.length; i < l; i++) {
			key = allKeys[i];

			if (value && typeof value[key] !== "function") {
				keys.push(key);
			}
		}

		length = keys.length;

		if (length < 0x10) {
			bytes.push(length | 0x80);
			size = 1;
		} else if (length < 0x10000) {
			bytes.push(0xde, length >> 8, length);
			size = 3;
		} else if (length < 0x100000000) {
			bytes.push(0xdf, length >> 24, length >> 16, length >> 8, length);
			size = 5;
		} else {
			throw new Error("Object too large");
		}

		for (let i = 0; i < length; i++) {
			key = keys[i];
			size += _encode(bytes, defers, key);
			if (value) size += _encode(bytes, defers, value[key] as PayloadValue);
		}

		return size;
	}

	if (typeof value == "boolean") {
		bytes.push(value ? 0xc3 : 0xc2);
		return 1;
	}

	if (typeof value == "undefined") {
		bytes.push(0xd4, 0, 0);
		return 3;
	}

	throw new Error("Could not encode");
}

function encode(value: PayloadValue) {
	const bytes: number[] = [];
	const defers: Defer[] = [];
	const size = _encode(bytes, defers, value);
	const buffer = new ArrayBuffer(size);
	const view = new DataView(buffer);

	let deferIndex = 0;
	let deferWritten = 0;
	let nextOffset = -1;

	if (defers.length > 0) nextOffset = defers[0]._offset as number;

	let defer;
	let deferLength = 0;
	let offset = 0;

	for (let i = 0, l = bytes.length; i < l; i++) {
		view.setUint8(deferWritten + i, bytes[i]);

		if (i + 1 !== nextOffset) continue;

		defer = defers[deferIndex];
		deferLength = defer._length as number;
		offset = deferWritten + nextOffset;

		if (defer._bin) {
			const bin = new Uint8Array(defer._bin);
			for (let j = 0; j < deferLength; j++) view.setUint8(offset + j, bin[j]);
		} else if (defer._str) utf8Write(view, offset, defer._str as string);
		else if (defer._float !== undefined) view.setFloat64(offset, defer._float as number);

		deferIndex++;
		deferWritten += deferLength;
		if (defers[deferIndex]) nextOffset = defers[deferIndex]._offset as number;
	}
	return buffer;
}

export default {
	encode: (channel: string, payload: ArrayBuffer) => {
		const header = [13];
		const channelEncoded = encode(channel);
		const payloadEncoded = encode(payload);

		const combined = new Uint8Array(channelEncoded.byteLength + payloadEncoded.byteLength + header.length);
		combined.set(header);
		combined.set(new Uint8Array(channelEncoded), header.length);
		combined.set(new Uint8Array(payloadEncoded), header.length + channelEncoded.byteLength);

		return combined.buffer;
	},
	decode: (payload: ArrayBuffer) => {
		const u8arr = new Uint8Array(payload);
		const bytes = Array.from(u8arr);
		const prefix = bytes[0];

		if (prefix == 13) {
			const iterator = { offset: 1 };
			stringCheck(bytes, iterator) ? string(bytes, iterator) : number(bytes, iterator);

			return decode(payload, iterator.offset);
		}

		return undefined;
	},
};
