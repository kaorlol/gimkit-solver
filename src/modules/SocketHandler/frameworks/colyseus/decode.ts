export interface Iterator {
	offset: number;
}

function utf8Read(bytes: number[], offset: number, length: number) {
	let string = "",
		chr = 0;
	for (let i = offset, end = offset + length; i < end; i++) {
		const byte = bytes[i];
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
				// surrogate pair
				chr -= 0x010000;
				string += String.fromCharCode((chr >>> 10) + 0xd800, (chr & 0x3ff) + 0xdc00);
			} else {
				string += String.fromCharCode(chr);
			}
			continue;
		}

		console.error("Invalid byte " + byte.toString(16));
		// (do not throw error to avoid server/client from crashing due to hack attemps)
		// throw new Error('Invalid byte ' + byte.toString(16));
	}
	return string;
}

export function int8(bytes: number[], it: Iterator) {
	return (uint8(bytes, it) << 24) >> 24;
}

export function uint8(bytes: number[], it: Iterator) {
	return bytes[it.offset++];
}

export function int16(bytes: number[], it: Iterator) {
	return (uint16(bytes, it) << 16) >> 16;
}

export function uint16(bytes: number[], it: Iterator) {
	return bytes[it.offset++] | (bytes[it.offset++] << 8);
}

export function int32(bytes: number[], it: Iterator) {
	return bytes[it.offset++] | (bytes[it.offset++] << 8) | (bytes[it.offset++] << 16) | (bytes[it.offset++] << 24);
}

export function uint32(bytes: number[], it: Iterator) {
	return int32(bytes, it) >>> 0;
}

export function float32(bytes: number[], it: Iterator) {
	return readFloat32(bytes, it);
}

export function float64(bytes: number[], it: Iterator) {
	return readFloat64(bytes, it);
}

export function int64(bytes: number[], it: Iterator) {
	const low = uint32(bytes, it);
	const high = int32(bytes, it) * Math.pow(2, 32);
	return high + low;
}

export function uint64(bytes: number[], it: Iterator) {
	const low = uint32(bytes, it);
	const high = uint32(bytes, it) * Math.pow(2, 32);
	return high + low;
}

// force little endian to facilitate decoding on multiple implementations
const _isLittleEndian = true; // new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;
const _int32 = new Int32Array(2);
const _float32 = new Float32Array(_int32.buffer);
const _float64 = new Float64Array(_int32.buffer);

export function readFloat32(bytes: number[], it: Iterator) {
	_int32[0] = int32(bytes, it);
	return _float32[0];
}

export function readFloat64(bytes: number[], it: Iterator) {
	_int32[_isLittleEndian ? 0 : 1] = int32(bytes, it);
	_int32[_isLittleEndian ? 1 : 0] = int32(bytes, it);
	return _float64[0];
}

export function boolean(bytes: number[], it: Iterator) {
	return uint8(bytes, it) > 0;
}

export function string(bytes: number[], it: Iterator) {
	const prefix = bytes[it.offset++];
	let length = 0;

	if (prefix < 0xc0) {
		// fixstr
		length = prefix & 0x1f;
	} else if (prefix === 0xd9) {
		length = uint8(bytes, it);
	} else if (prefix === 0xda) {
		length = uint16(bytes, it);
	} else if (prefix === 0xdb) {
		length = uint32(bytes, it);
	}

	const value = utf8Read(bytes, it.offset, length);
	it.offset += length;

	return value;
}

export function stringCheck(bytes: number[], it: Iterator) {
	const prefix = bytes[it.offset];
	return (
		// fixstr
		(prefix < 0xc0 && prefix > 0xa0) ||
		// str 8
		prefix === 0xd9 ||
		// str 16
		prefix === 0xda ||
		// str 32
		prefix === 0xdb
	);
}

export function number(bytes: number[], it: Iterator) {
	const prefix = bytes[it.offset++];

	if (prefix < 0x80) {
		// positive fixint
		return prefix;
	} else if (prefix === 0xca) {
		// float 32
		return readFloat32(bytes, it);
	} else if (prefix === 0xcb) {
		// float 64
		return readFloat64(bytes, it);
	} else if (prefix === 0xcc) {
		// uint 8
		return uint8(bytes, it);
	} else if (prefix === 0xcd) {
		// uint 16
		return uint16(bytes, it);
	} else if (prefix === 0xce) {
		// uint 32
		return uint32(bytes, it);
	} else if (prefix === 0xcf) {
		// uint 64
		return uint64(bytes, it);
	} else if (prefix === 0xd0) {
		// int 8
		return int8(bytes, it);
	} else if (prefix === 0xd1) {
		// int 16
		return int16(bytes, it);
	} else if (prefix === 0xd2) {
		// int 32
		return int32(bytes, it);
	} else if (prefix === 0xd3) {
		// int 64
		return int64(bytes, it);
	} else if (prefix > 0xdf) {
		// negative fixint
		return (0xff - prefix + 1) * -1;
	}
}

export function numberCheck(bytes: number[], it: Iterator) {
	const prefix = bytes[it.offset];
	// positive fixint - 0x00 - 0x7f
	// float 32        - 0xca
	// float 64        - 0xcb
	// uint 8          - 0xcc
	// uint 16         - 0xcd
	// uint 32         - 0xce
	// uint 64         - 0xcf
	// int 8           - 0xd0
	// int 16          - 0xd1
	// int 32          - 0xd2
	// int 64          - 0xd3
	return prefix < 0x80 || (prefix >= 0xca && prefix <= 0xd3);
}

export function arrayCheck(bytes: number[], it: Iterator) {
	return bytes[it.offset] < 0xa0;

	// const prefix = bytes[it.offset] ;

	// if (prefix < 0xa0) {
	//   return prefix;

	// // array
	// } else if (prefix === 0xdc) {
	//   it.offset += 2;

	// } else if (0xdd) {
	//   it.offset += 4;
	// }

	// return prefix;
}
