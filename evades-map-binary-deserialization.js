function ReadEvadesMap(buffer/*Must be ArrayBuffer or any TypedArray object*/) {
	if(!(buffer instanceof ArrayBuffer) && buffer.buffer)buffer=buffer.buffer;
	if(!(buffer instanceof ArrayBuffer))throw new TypeError("buffer must be ArrayBuffer or TypedArray");
	const reader = {
		pos: 0,
		buffer: new DataView(buffer),
		readInt32BE() {
			return this.readUint16BE() << 16 | this.readUint16BE();
		},
		readUint16BE() {
			return this.readByte() << 8 | this.readByte();
		},
		readByte() {
			return this.buffer.getUint8(this.pos++);
		},
		readChar() {
			return String.fromCharCode(this.readByte());
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
				type: reader.readByte(),
				x: reader.readInt32BE(),
				y: reader.readInt32BE(),
				width: reader.readInt32BE(),
				height: reader.readInt32BE()
			};
	},	readArea = function() {
		const area = {
			x: reader.readInt32BE(),
			y: reader.readInt32BE(),
			zone_count: reader.readUint16BE(),
			zones: []
		};
		while(area.zones.length<area.zone_count)area.zones.push(readZone());
		return area;
	},	readRegion = function() {
		const region = {
			region_name: reader.readString(),
			area_count: reader.readUint16BE(),
			areas: []
		};
		while(region.areas.length<region.area_count)region.areas.push(readArea());
		return region;
	},	readMap = function() {
		const map = {
			spawn_region: reader.readString(),
			region_count: reader.readUint16BE(),
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
