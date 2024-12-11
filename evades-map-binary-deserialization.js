function ReadEvadesMap(buffer/*Must be ArrayBuffer or any TypedArray object*/) {
	if(!(buffer instanceof ArrayBuffer) && buffer.buffer)buffer=buffer.buffer;
	if(!(buffer instanceof ArrayBuffer))throw new TypeError("buffer must be ArrayBuffer or TypedArray");
	const reader = {
		pos: 0,
		buffer: new DataView(buffer),
		readFloat64(LE) {
			return this.buffer.getFloat64(this.pos,LE,this.pos+=8);
		},
		readUint64(LE) {
			return this.buffer.getBigUint64(this.pos,LE,this.pos+=8);
		},
		readInt64(LE) {
			return this.buffer.getBigInt64(this.pos,LE,this.pos+=8);
		},
		readFloat32(LE) {
			return this.buffer.getFloat32(this.pos,LE,this.pos+=4);
		},
		readUint32(LE) {
			return this.buffer.getUint32(this.pos,LE,this.pos+=4);
		},
		readInt32(LE) {
			return this.buffer.getInt32(this.pos,LE,this.pos+=4);
		},
		readFloat16(LE) {
			try{
				/*Compatible with Firefox, Safari Technology Preview*/
				return this.buffer.getFloat16(this.pos,LE,this.pos+=2);
			}catch(e){
				this.pos-=2;
				return function(bytes) {
					var sign = bytes >>> 15;
					var exponent = bytes >>> 10 & 31;
					var significand = bytes & 1023;
					if (exponent === 31) return significand === 0 ? (sign === 0 ? Infinity : -Infinity) : NaN;
					if (exponent === 0) return significand * (sign === 0 ? Math.pow(2, -24) : -Math.pow(2, -24));
					return Math.pow(2, exponent - 15) * (sign === 0 ? 1 + significand * 0.0009765625 : -1 - significand * 0.0009765625);
				}(this.readUint16(LE));
			}
		},
		readUint16(LE) {
			return this.buffer.getUint16(this.pos,LE,this.pos+=2);
		},
		readInt16(LE) {
			return this.buffer.getInt32(this.pos,LE,this.pos+=2);
		},
		readBoolean() {
			return !!this.readUint8();
		},
		readUint8() {
			return this.buffer.getUint8(this.pos++);
		},
		readInt8() {
			return this.buffer.getInt8(this.pos++);
		},
		readChar() {
			return String.fromCharCode(this.readUint8());
		},
		readString() {
			let str = "", char = "";
			while (true) {
				str += char;
				if (!(char = this.readChar()).charCodeAt() || this.pos >= this.buffer.byteLength)
					return str;
			}
		},
	},	readZone = function() {
			return {
				type: reader.readUint8(),
				x: reader.readInt32(),
				y: reader.readInt32(),
				width: reader.readInt32(),
				height: reader.readInt32()
			};
	},	readArea = function() {
		const area = {
			x: reader.readInt32(),
			y: reader.readInt32(),
			zone_count: reader.readUint16(),
			zones: []
		};
		while(area.zones.length<area.zone_count)area.zones.push(readZone());
		return area;
	},	readRegion = function() {
		const region = {
			region_name: reader.readString(),
			area_count: reader.readUint16(),
			areas: []
		};
		while(region.areas.length<region.area_count)region.areas.push(readArea());
		return region;
	},	readMap = function() {
		const map = {
			spawn_region: reader.readString(),
			region_count: reader.readUint16(),
			regions: []
		};
		while(map.regions.length<map.region_count)map.regions.push(readRegion());
		return map;
	};
	return readMap();
}
/*
	File:
		raw_map.h
	Content:
		#pragma once
		
		#include <stdint.h>
		
		struct BinaryMap {
			char* spawn_region;
			uint16_t region_count;
			struct BinaryRegion* regions;
		};
		
		struct BinaryRegion {
			char* region_name;
			uint16_t area_count;
			struct BinaryArea* areas;
		};
		
		struct BinaryArea {
			int32_t x;
			int32_t y;
			uint16_t zone_count;
			struct BinaryZone* zones;
		};
		
		struct BinaryZone {
			uint8_t type;
			int32_t x;
			int32_t y;
			int32_t width;
			int32_t height;
		};
*/
