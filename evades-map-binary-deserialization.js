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
		readChars(x=0) {
			let str="";
			while(str.length<x){
				str+=String.fromCharCode(this.readUint8());
			};
			return str;
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
			let type = reader.readUint8();
			return {
				type: ["safe","active","exit","teleport","victory","removal","dummy"][type-1]||"unknown zonetype {{type}}".replace("{{type}}",type),
				x: reader.readInt32(true),
				y: reader.readInt32(true),
				width: reader.readInt32(true),
				height: reader.readInt32(true)
			};
	},	readArea = function() {
		const area = {
			x: reader.readInt32(true),
			y: reader.readInt32(true),
			zone_count: reader.readUint16(true),
			zones: []
		};
		while(area.zones.length<area.zone_count)area.zones.push(readZone());
		return area;
	},	readRegion = function() {
		let region = {
			region_name_length: reader.readUint8(),
			region_name: reader.readString(),
			area_count: reader.readUint16(true),
			areas: []
		};
		while(region.areas.length<region.area_count)region.areas.push(readArea());
		return region;
	},	readMap = function() {
		let map = {
			spawn_region_length: reader.readUint8(),
			spawn_region: reader.readString(),
			region_count: reader.readUint16(true),
			regions: []
		};
		while(map.regions.length<map.region_count)map.regions.push(readRegion());
		return map;
	};
	return readMap();
}
/*
	File:
		binary_map.h
	Content:
		#pragma once
		
		#include <stdio.h>
		#include <stdint.h>
		
		#define STRING_MAX 64
		
		struct BinaryMap {
			uint8_t spawn_region_length;
			char* spawn_region;
			uint16_t region_count;
			struct BinaryRegion* regions;
		};
		
		struct BinaryRegion {
			uint8_t region_name_length;
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
		
		void load_map(struct BinaryMap* map, FILE* file);

	File:
		binary_map.c
	Content:
		#include "binary_map.h"
		#include <malloc.h>
		
		void load_map(struct BinaryMap* map, FILE* file) {
			// Spawn region name.
			fread(&map->spawn_region_length, sizeof(map->spawn_region_length), 1, file);
			map->spawn_region = (char *) malloc(map->spawn_region_length);
			fread(map->spawn_region, 1, map->spawn_region_length, file);
		
			// Regions.
			fread(&map->region_count, sizeof(map->region_count), 1, file);
			if (map->region_count <= 0) {
				map->regions = NULL;
				return;
			}
			map->regions = (struct BinaryRegion*) malloc(sizeof(struct BinaryRegion) * map->region_count);
		
			for (int region_index = 0; region_index < map->region_count; region_index += 1) {
				struct BinaryRegion* region = map->regions + region_index;
				// Region name.
				fread(&region->region_name_length, sizeof(region->region_name_length), 1, file);
				region->region_name = (char *) malloc(region->region_name_length);
				fread(region->region_name, 1, region->region_name_length, file);
		
				// Areas.
				fread(&region->area_count, sizeof(region->area_count), 1, file);
				if (region->area_count <= 0) {
					region->areas = NULL;
					continue;
				}
				region->areas = (struct BinaryArea*) malloc(sizeof(struct BinaryArea) * region->area_count);
		
				for (int area_index = 0; area_index < region->area_count; area_index += 1) {
					struct BinaryArea* area = region->areas + area_index;
					fread(&area->x, sizeof(area->x), 2, file); // x & y values.
					
					// Zones.
					fread(&area->zone_count, sizeof(area->zone_count), 1, file);
					if (area->zone_count <= 0) {
						area->zones = NULL;
						continue;
					}
					area->zones = (struct BinaryZone*) malloc(sizeof(struct BinaryZone) * area->zone_count);
					for (int zone_index = 0; zone_index < area->zone_count; zone_index += 1) {
						// The size of the binary zone struct is actually 20. Yikes!
						fread(area->zones + zone_index, 1, 1, file);
						fread(&area->zones[zone_index].x, 16, 1, file);
					}
				}
			}
		}
	File:
		packer.py
	Content:
		import yaml
		
		def parse_variable(definition: str, state: dict[str, int]) -> int:
			value = definition
			if isinstance(value, int):
				return value
			offset = 0
			if "+" in definition:
				split = definition.split("+")
				value = split[0].strip()
				offset = int(split[1].strip())
			if "-" in definition:
				split = definition.split("-")
				value = split[0].strip()
				offset = -int(split[1].strip())
			if value in state:
				value = state.get(value)
			else:
				value = int(value)
			return value + offset
		
		zone_types = {
			"safe": 1,
			"active": 2,
			"exit": 3,
			"teleport": 4,
			"victory": 5,
			"removal": 6,
			"dummy": 7,
		}
		
		out = open("maps/world.bin", "wb")
		with open("maps/definitions/world.yaml") as world_file:
			world = yaml.load(world_file, yaml.CLoader)
			spawn_name = f"{world['spawn']}\0".encode("ascii")
			out.write(len(spawn_name).to_bytes(1, "little"))
			out.write(spawn_name)
			out.write(len(world["regions"]).to_bytes(2, "little"))
		
			for region_meta in world["regions"]:
				region_x = region_meta["x"]
				region_y = region_meta["y"]
				with open(f"maps/definitions/{region_meta['file']}") as region_file:
					region = yaml.load(region_file, yaml.CLoader)
					region_name = f"{region['name']}\0".encode("ascii")
					out.write(len(region_name).to_bytes(1, "little"))
					out.write(region_name)
					# Write out areas
					out.write(len(region["areas"]).to_bytes(2, "little"))
					area_state = {"var x": region_x, "var y": region_y}
					for area in region["areas"]:
						# Write out area absolute position
						area_x = parse_variable(area["x"], area_state)
						area_y = parse_variable(area["y"], area_state)
						area_width = 0
						area_height = 0
						out.write(area_x.to_bytes(4, "little", signed=True))
						out.write(area_y.to_bytes(4, "little", signed=True))
						# Write out zones
						out.write(len(area["zones"]).to_bytes(2, "little"))
						zone_state = {}
						for zone in area["zones"]:
							zone_type = zone_types[zone["type"]]
							zone_x = parse_variable(zone["x"], zone_state)
							zone_y = parse_variable(zone["y"], zone_state)
							zone_width = parse_variable(zone["width"], zone_state)
							zone_height = parse_variable(zone["height"], zone_state)
							# Write out zone absolute dimensions
							out.write(zone_type.to_bytes(1, "little"))
							out.write((area_x + zone_x).to_bytes(4, "little", signed=True))
							out.write((area_y + zone_y).to_bytes(4, "little", signed=True))
							out.write(zone_width.to_bytes(4, "little", signed=True))
							out.write(zone_height.to_bytes(4, "little", signed=True))
							# Update area size
							if zone_x + zone_width > area_width:
								area_width = zone_x + zone_width
							if zone_y + zone_height > area_height:
								area_height = zone_y + zone_height
							# Store previous zone states
							zone_state["last_x"] = zone_x
							zone_state["last_y"] = zone_y
							zone_state["last_width"] = zone_width
							zone_state["last_height"] = zone_height
							zone_state["last_right"] = zone_x + zone_width
							zone_state["last_bottom"] = zone_y + zone_height
						# Store previous area states
						area_state["last_x"] = area_x
						area_state["last_y"] = area_y
						area_state["last_width"] = area_width
						area_state["last_height"] = area_height
						area_state["last_right"] = area_x + area_width
						area_state["last_bottom"] = area_y + area_height		
*/
