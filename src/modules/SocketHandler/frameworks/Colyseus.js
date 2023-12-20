// https://github.com/colyseus/schema/tree/master/src/encoding

function utf8Readd(bytes, offset, length) {
	var string = "",
		chr = 0;
	for (var i = offset, end = offset + length; i < end; i++) {
		var byte = bytes[i];
		if ((byte & 0x80) === 0x00) {
			string += String.fromCharCode(byte);
			continue;
		}
		if ((byte & 0xe0) === 0xc0) {
			string += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[++i] & 0x3f));
			continue;
		}
		if ((byte & 0xf0) === 0xe0) {
			string += String.fromCharCode(((byte & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | ((bytes[++i] & 0x3f) << 0));
			continue;
		}
		if ((byte & 0xf8) === 0xf0) {
			chr = ((byte & 0x07) << 18) | ((bytes[++i] & 0x3f) << 12) | ((bytes[++i] & 0x3f) << 6) | ((bytes[++i] & 0x3f) << 0);
			if (chr >= 0x010000) {
				chr -= 0x010000;
				string += String.fromCharCode((chr >>> 10) + 0xd800, (chr & 0x3ff) + 0xdc00);
			} else {
				string += String.fromCharCode(chr);
			}
			continue;
		}

		console.error("Invalid byte " + byte.toString(16));
	}
	return string;
}

function int8(bytes, it) {
	return (uint8(bytes, it) << 24) >> 24;
}

function uint8(bytes, it) {
	return bytes[it.offset++];
}

function int16(bytes, it) {
	return (uint16(bytes, it) << 16) >> 16;
}

function uint16(bytes, it) {
	return bytes[it.offset++] | (bytes[it.offset++] << 8);
}

function int32(bytes, it) {
	return bytes[it.offset++] | (bytes[it.offset++] << 8) | (bytes[it.offset++] << 16) | (bytes[it.offset++] << 24);
}

function uint32(bytes, it) {
	return int32(bytes, it) >>> 0;
}

function int64(bytes, it) {
	const low = uint32(bytes, it);
	const high = int32(bytes, it) * Math.pow(2, 32);
	return high + low;
}

function uint64(bytes, it) {
	const low = uint32(bytes, it);
	const high = uint32(bytes, it) * Math.pow(2, 32);
	return high + low;
}

const _isLittleEndian = true;
const _int32 = new Int32Array(2);
const _float32 = new Float32Array(_int32.buffer);
const _float64 = new Float64Array(_int32.buffer);

function readFloat32(bytes, it) {
	_int32[0] = int32(bytes, it);
	return _float32[0];
}

function readFloat64(bytes, it) {
	_int32[_isLittleEndian ? 0 : 1] = int32(bytes, it);
	_int32[_isLittleEndian ? 1 : 0] = int32(bytes, it);
	return _float64[0];
}

function string(bytes, it) {
	const prefix = bytes[it.offset++];
	let length;

	if (prefix < 0xc0) {
		length = prefix & 0x1f;
	} else if (prefix === 0xd9) {
		length = uint8(bytes, it);
	} else if (prefix === 0xda) {
		length = uint16(bytes, it);
	} else if (prefix === 0xdb) {
		length = uint32(bytes, it);
	}

	const value = utf8Readd(bytes, it.offset, length);
	it.offset += length;

	return value;
}

function stringCheck(bytes, it) {
	const prefix = bytes[it.offset];
	return (prefix < 0xc0 && prefix > 0xa0) || prefix === 0xd9 || prefix === 0xda || prefix === 0xdb;
}

function number(bytes, it) {
	const prefix = bytes[it.offset++];

	if (prefix < 0x80) {
		return prefix;
	} else if (prefix === 0xca) {
		return readFloat32(bytes, it);
	} else if (prefix === 0xcb) {
		return readFloat64(bytes, it);
	} else if (prefix === 0xcc) {
		return uint8(bytes, it);
	} else if (prefix === 0xcd) {
		return uint16(bytes, it);
	} else if (prefix === 0xce) {
		return uint32(bytes, it);
	} else if (prefix === 0xcf) {
		return uint64(bytes, it);
	} else if (prefix === 0xd0) {
		return int8(bytes, it);
	} else if (prefix === 0xd1) {
		return int16(bytes, it);
	} else if (prefix === 0xd2) {
		return int32(bytes, it);
	} else if (prefix === 0xd3) {
		return int64(bytes, it);
	} else if (prefix > 0xdf) {
		return (0xff - prefix + 1) * -1;
	}
}

const Protocol = {
	JOIN_ROOM: 10,
	ERROR: 11,
	LEAVE_ROOM: 12,
	ROOM_DATA: 13,
	ROOM_STATE: 14,
	ROOM_STATE_PATCH: 15,
	ROOM_DATA_SCHEMA: 16,
};

function Decoder(buffer, offset) {
	this._offset = offset;
	if (buffer instanceof ArrayBuffer) {
		this._buffer = buffer;
		this._view = new DataView(this._buffer);
	} else if (ArrayBuffer.isView(buffer)) {
		this._buffer = buffer.buffer;
		this._view = new DataView(this._buffer, buffer.byteOffset, buffer.byteLength);
	} else {
		throw new Error("Invalid argument");
	}
}

function utf8Read(view, offset, length) {
	var string = "",
		chr = 0;
	for (var i = offset, end = offset + length; i < end; i++) {
		var byte = view.getUint8(i);
		if ((byte & 0x80) === 0x00) {
			string += String.fromCharCode(byte);
			continue;
		}
		if ((byte & 0xe0) === 0xc0) {
			string += String.fromCharCode(((byte & 0x1f) << 6) | (view.getUint8(++i) & 0x3f));
			continue;
		}
		if ((byte & 0xf0) === 0xe0) {
			string += String.fromCharCode(((byte & 0x0f) << 12) | ((view.getUint8(++i) & 0x3f) << 6) | ((view.getUint8(++i) & 0x3f) << 0));
			continue;
		}
		if ((byte & 0xf8) === 0xf0) {
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
Decoder.prototype._array = function (length) {
	var value = new Array(length);
	for (var i = 0; i < length; i++) {
		value[i] = this._parse();
	}
	return value;
};
Decoder.prototype._map = function (length) {
	var key = "",
		value = {};
	for (var i = 0; i < length; i++) {
		key = this._parse();
		value[key] = this._parse();
	}
	return value;
};
Decoder.prototype._str = function (length) {
	var value = utf8Read(this._view, this._offset, length);
	this._offset += length;
	return value;
};
Decoder.prototype._bin = function (length) {
	var value = this._buffer.slice(this._offset, this._offset + length);
	this._offset += length;
	return value;
};
Decoder.prototype._parse = function () {
	var prefix = this._view.getUint8(this._offset++);
	var value,
		length = 0,
		type = 0,
		hi = 0,
		lo = 0;
	if (prefix < 0xc0) {
		if (prefix < 0x80) {
			return prefix;
		}

		if (prefix < 0x90) {
			return this._map(prefix & 0x0f);
		}

		if (prefix < 0xa0) {
			return this._array(prefix & 0x0f);
		}

		return this._str(prefix & 0x1f);
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
			length = this._view.getUint8(this._offset);
			this._offset += 1;
			return this._bin(length);
		case 0xc5:
			length = this._view.getUint16(this._offset);
			this._offset += 2;
			return this._bin(length);
		case 0xc6:
			length = this._view.getUint32(this._offset);
			this._offset += 4;
			return this._bin(length);

		case 0xc7:
			length = this._view.getUint8(this._offset);
			type = this._view.getInt8(this._offset + 1);
			this._offset += 2;
			return [type, this._bin(length)];
		case 0xc8:
			length = this._view.getUint16(this._offset);
			type = this._view.getInt8(this._offset + 2);
			this._offset += 3;
			return [type, this._bin(length)];
		case 0xc9:
			length = this._view.getUint32(this._offset);
			type = this._view.getInt8(this._offset + 4);
			this._offset += 5;
			return [type, this._bin(length)];

		case 0xca:
			value = this._view.getFloat32(this._offset);
			this._offset += 4;
			return value;
		case 0xcb:
			value = this._view.getFloat64(this._offset);
			this._offset += 8;
			return value;

		case 0xcc:
			value = this._view.getUint8(this._offset);
			this._offset += 1;
			return value;
		case 0xcd:
			value = this._view.getUint16(this._offset);
			this._offset += 2;
			return value;
		case 0xce:
			value = this._view.getUint32(this._offset);
			this._offset += 4;
			return value;
		case 0xcf:
			hi = this._view.getUint32(this._offset) * Math.pow(2, 32);
			lo = this._view.getUint32(this._offset + 4);
			this._offset += 8;
			return hi + lo;

		case 0xd0:
			value = this._view.getInt8(this._offset);
			this._offset += 1;
			return value;
		case 0xd1:
			value = this._view.getInt16(this._offset);
			this._offset += 2;
			return value;
		case 0xd2:
			value = this._view.getInt32(this._offset);
			this._offset += 4;
			return value;
		case 0xd3:
			hi = this._view.getInt32(this._offset) * Math.pow(2, 32);
			lo = this._view.getUint32(this._offset + 4);
			this._offset += 8;
			return hi + lo;

		case 0xd4:
			type = this._view.getInt8(this._offset);
			this._offset += 1;
			if (type === 0x00) {
				this._offset += 1;
				return void 0;
			}
			return [type, this._bin(1)];
		case 0xd5:
			type = this._view.getInt8(this._offset);
			this._offset += 1;
			return [type, this._bin(2)];
		case 0xd6:
			type = this._view.getInt8(this._offset);
			this._offset += 1;
			return [type, this._bin(4)];
		case 0xd7:
			type = this._view.getInt8(this._offset);
			this._offset += 1;
			if (type === 0x00) {
				hi = this._view.getInt32(this._offset) * Math.pow(2, 32);
				lo = this._view.getUint32(this._offset + 4);
				this._offset += 8;
				return new Date(hi + lo);
			}
			return [type, this._bin(8)];
		case 0xd8:
			type = this._view.getInt8(this._offset);
			this._offset += 1;
			return [type, this._bin(16)];

		case 0xd9:
			length = this._view.getUint8(this._offset);
			this._offset += 1;
			return this._str(length);
		case 0xda:
			length = this._view.getUint16(this._offset);
			this._offset += 2;
			return this._str(length);
		case 0xdb:
			length = this._view.getUint32(this._offset);
			this._offset += 4;
			return this._str(length);

		case 0xdc:
			length = this._view.getUint16(this._offset);
			this._offset += 2;
			return this._array(length);
		case 0xdd:
			length = this._view.getUint32(this._offset);
			this._offset += 4;
			return this._array(length);

		case 0xde:
			length = this._view.getUint16(this._offset);
			this._offset += 2;
			return this._map(length);
		case 0xdf:
			length = this._view.getUint32(this._offset);
			this._offset += 4;
			return this._map(length);
	}
	throw new Error("Could not parse");
};
function decode(buffer, offset) {
	if (offset === void 0) {
		offset = 0;
	}
	var decoder = new Decoder(buffer, offset);
	var value = decoder._parse();
	if (decoder._offset !== buffer.byteLength) {
		throw new Error(buffer.byteLength - decoder._offset + " trailing bytes");
	}
	return value;
}

function utf8Write(view, offset, str) {
	var c = 0;
	for (var i = 0, l = str.length; i < l; i++) {
		c = str.charCodeAt(i);
		if (c < 0x80) {
			view.setUint8(offset++, c);
		} else if (c < 0x800) {
			view.setUint8(offset++, 0xc0 | (c >> 6));
			view.setUint8(offset++, 0x80 | (c & 0x3f));
		} else if (c < 0xd800 || c >= 0xe000) {
			view.setUint8(offset++, 0xe0 | (c >> 12));
			view.setUint8(offset++, 0x80 | ((c >> 6) & 0x3f));
			view.setUint8(offset++, 0x80 | (c & 0x3f));
		} else {
			i++;
			c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
			view.setUint8(offset++, 0xf0 | (c >> 18));
			view.setUint8(offset++, 0x80 | ((c >> 12) & 0x3f));
			view.setUint8(offset++, 0x80 | ((c >> 6) & 0x3f));
			view.setUint8(offset++, 0x80 | (c & 0x3f));
		}
	}
}
function utf8Length(str) {
	var c = 0,
		length = 0;
	for (var i = 0, l = str.length; i < l; i++) {
		c = str.charCodeAt(i);
		if (c < 0x80) {
			length += 1;
		} else if (c < 0x800) {
			length += 2;
		} else if (c < 0xd800 || c >= 0xe000) {
			length += 3;
		} else {
			i++;
			length += 4;
		}
	}
	return length;
}
function _encode(bytes, defers, value) {
	var type = typeof value,
		i = 0,
		l = 0,
		hi = 0,
		lo = 0,
		length = 0,
		size = 0;
	if (type === "string") {
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
	if (type === "number") {
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

			hi = (value / Math.pow(2, 32)) >> 0;
			lo = value >>> 0;
			bytes.push(0xcf, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo);
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

			hi = Math.floor(value / Math.pow(2, 32));
			lo = value >>> 0;
			bytes.push(0xd3, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo);
			return 9;
		}
	}
	if (type === "object") {
		if (value === null) {
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
			for (i = 0; i < length; i++) {
				size += _encode(bytes, defers, value[i]);
			}
			return size;
		}

		if (value instanceof Date) {
			var time = value.getTime();
			hi = Math.floor(time / Math.pow(2, 32));
			lo = time >>> 0;
			bytes.push(0xd7, 0, hi >> 24, hi >> 16, hi >> 8, hi, lo >> 24, lo >> 16, lo >> 8, lo);
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
		if (typeof value.toJSON === "function") {
			return _encode(bytes, defers, value.toJSON());
		}
		var keys = [],
			key = "";
		var allKeys = Object.keys(value);
		for (i = 0, l = allKeys.length; i < l; i++) {
			key = allKeys[i];
			if (typeof value[key] !== "function") {
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
		for (i = 0; i < length; i++) {
			key = keys[i];
			size += _encode(bytes, defers, key);
			size += _encode(bytes, defers, value[key]);
		}
		return size;
	}

	if (type === "boolean") {
		bytes.push(value ? 0xc3 : 0xc2);
		return 1;
	}

	if (type === "undefined") {
		bytes.push(0xd4, 0, 0);
		return 3;
	}
	throw new Error("Could not encode");
}
function encode(value) {
	var bytes = [];
	var defers = [];
	var size = _encode(bytes, defers, value);
	var buf = new ArrayBuffer(size);
	var view = new DataView(buf);
	var deferIndex = 0;
	var deferWritten = 0;
	var nextOffset = -1;
	if (defers.length > 0) {
		nextOffset = defers[0]._offset;
	}
	var defer,
		deferLength = 0,
		offset = 0;
	for (var i = 0, l = bytes.length; i < l; i++) {
		view.setUint8(deferWritten + i, bytes[i]);
		if (i + 1 !== nextOffset) {
			continue;
		}
		defer = defers[deferIndex];
		deferLength = defer._length;
		offset = deferWritten + nextOffset;
		if (defer._bin) {
			var bin = new Uint8Array(defer._bin);
			for (var j = 0; j < deferLength; j++) {
				view.setUint8(offset + j, bin[j]);
			}
		} else if (defer._str) {
			utf8Write(view, offset, defer._str);
		} else if (defer._float !== undefined) {
			view.setFloat64(offset, defer._float);
		}
		deferIndex++;
		deferWritten += deferLength;
		if (defers[deferIndex]) {
			nextOffset = defers[deferIndex]._offset;
		}
	}
	return buf;
}

function decodeExport(packet) {
	const u8arr = new Uint8Array(packet);
	const bytes = Array.from(u8arr);
	const prefix = bytes[0];

	if (prefix == Protocol.ROOM_DATA) {
		let it = { offset: 1 };

		stringCheck(bytes, it) ? string(bytes, it) : number(bytes, it);
		let parsed = decode(packet, it.offset);
		return parsed;
	} else {
		return null;
	}
}

function encodeExport(channel, packet) {
	let header = [Protocol.ROOM_DATA];
	let channelEncoded = encode(channel);
	let packetEncoded = encode(packet);

	let combined = new Uint8Array(channelEncoded.byteLength + packetEncoded.byteLength + header.length);
	combined.set(header);
	combined.set(new Uint8Array(channelEncoded), header.length);
	combined.set(new Uint8Array(packetEncoded), header.length + channelEncoded.byteLength);

	return combined.buffer;
}

export default {
	decode: decodeExport,
	encode: encodeExport,
};