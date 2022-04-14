import { Engine } from "./engine.js";
import { ResourceManager } from "./resource.js";
import { GameObject, isActorDefArg, Objects } from "./object.js";
import { BackgroundData } from "./backgrounds.js";
import { never, validate, Validation } from "./util.js";
import { Pt } from "./shape.js";

export enum EDGE { NONE, SOLID, WRAP, KILL };
export enum TERRAIN { BOX, LINE, CIRCLE, POLYGON };

interface ActorData extends Array<unknown> {
	0: number;
	1: number;
	2: number;
}
type TerrainData = (
	{
		type: TERRAIN.BOX;
		properties: [string, ...unknown[]];
		pieces: [number, number, number, number][];
	}
	| {
		type: TERRAIN.LINE;
		properties: [string, ...unknown[]];
		pieces: [number, number, number, number][];
	}
	| {
		type: TERRAIN.CIRCLE;
		properties: [string, ...unknown[]];
		pieces: [number, number, number][];
	}
	| {
		type: TERRAIN.POLYGON;
		properties: [string, ...unknown[]];
		pieces: [number, number, [number,number][] ][];
	}
);

export interface Level {
	_version_: number;
	name: string;
	width: number;
	height: number;
	edge: {
		top: EDGE;
		bottom: EDGE;
		left: EDGE;
		right: EDGE;
	};
	camStart: {
		x: number;
		y: number;
	};
	horScrollBuffer: number;
	vertScrollBuffer: number;
	zoomScale: number;
	minZoom: number;
	maxZoom: number;
	actors: ActorData[];
	terrain: TerrainData[];
	bg: BackgroundData[];
}
const LevelValidation: Validation = {
	"_version_,width,height,horScrollBuffer,vertScrollBuffer,zoomScale,minZoom,maxZoom": "number",
	name: "string",
	edge: {
		"top,bottom,left,right": {"@": EDGE}
	},
	camStart: {"x,y": "number"},
	actors: {"[]": {"&": [Array, {
		"0,1,2": "number"
	}]}},
	terrain: {"[]": {"|": [
		{
			type: {"=": TERRAIN.BOX},
			properties: {"&": [Array, {
				0: "string"
			}]},
			pieces: {"[]": ["number", "number", "number", "number"]}
		},
		{
			type: {"=": TERRAIN.LINE},
			properties: {"&": [Array, {
				0: "string"
			}]},
			pieces: {"[]": ["number", "number", "number", "number"]}
		},
		{
			type: {"=": TERRAIN.CIRCLE},
			properties: {"&": [Array, {
				0: "string"
			}]},
			pieces: {"[]": ["number", "number", "number"]}
		},
		{
			type: {"=": TERRAIN.POLYGON},
			properties: {"&": [Array, {
				0: "string"
			}]},
			pieces: {"[]":[ "number", "number", {"[]": ["number", "number"]} ]}
		}
	]}},
	bg: {"[]": {
		type: {"@": ["name", "raw"]},
		"name,raw": "string",
		"layer,scale,parallax,velX,velY": "number",
		anchorFlip: {"x,y": "boolean"}
	}}
};

export class LevelManager extends ResourceManager<Level> {
	constructor(engine: Engine) {
		super(engine, "Levels");
	}
	async _request(src: string): Promise<Level> {
		let data: unknown = await this.engine.requestData(src);
		return this.updateLevel(data);
	}
	async loadFileInput(): Promise<Level[]> {
		let levels = [] as Level[];
		let dataList = await this.engine.file.askData(["json"]) as unknown[];
		for (let i = 0; i < dataList.length; i++) {
			let data = this.updateLevel(dataList[i]);
			this.map[`file:${i}`] = data;
			levels.push(data);
		}
		return levels;
	}
	async open(level: string) {
		this.engine.levelReady = false;
		if (!this.has(level)) await this.load(level);
		let data = this.get(level);
		this.clear();
		// TODO: send over network
		Object.assign(this.engine.level, data);
		this._loadTerrain(data.terrain);
		this._loadActors(data.actors);
		await this._loadBackgrounds(data.bg);
		this.engine.camera.reset();
		this.engine.levelReady = true;
		if (this.engine.game) this.engine.game.onLevelLoad();
		console.log(`Loaded Level ${data.name || level}`);
	}
	async openFromData(data: unknown) {
		let level = this.updateLevel(data);
		this.map["data:"] = level;
		await this.open("data:");
	}
	async openFromFile() {
		let levels = await this.loadFileInput();
		if (levels.length > 0) await this.open("file:0");
		else console.log("No files selected.");
	}
	clear() {
		this.engine.objects.removeAll();
		this.engine.backgrounds.clearAll();
		// TODO: update sectors
		this.engine.level = Object.assign({}, BlankLevel);
		this.engine.camera.reset();
	}
	_loadTerrain(list: TerrainData[]) {
		for (let terrainDataEntry of list) {
			let terrain = {...terrainDataEntry};
			for (let pieceData of terrain.pieces) {
				let obj: GameObject;
				let gfx = terrain.properties[0];
				if (terrain.type === TERRAIN.BOX)
					obj = new Objects.Box(pieceData[0], pieceData[1], pieceData[2] as number, pieceData[3] as number, gfx);
				else if (terrain.type === TERRAIN.LINE)
					obj = new Objects.Line(pieceData[0], pieceData[1], pieceData[2] as number, pieceData[3] as number, gfx);
				else if (terrain.type === TERRAIN.CIRCLE)
					obj = new Objects.Circle(pieceData[0], pieceData[1], pieceData[2] as number, gfx);
				else if (terrain.type === TERRAIN.POLYGON)
					obj = new Objects.Polygon(
						pieceData[0],
						pieceData[1],
						(pieceData[2] as ([number, number][])).map(
							(item: [number,number]) => Pt(item)
						),
						gfx
					);
				else never(terrain);
				
				if (obj.collision)
					obj.collision.weight = Infinity;
				this.engine.objects.add(obj);
			}
		}
	}
	_loadActors(list: ActorData[]) {
		for (let actor of list) {
			let id = actor[0];
			let args = actor.slice(1,3);
			let inputs = actor.slice(3);

			let guide = this.engine.objects.actorData[id];
			let targetClass = this.engine.objects.registeredClasses[guide.class];
			if (targetClass) {
				if (guide.arguments) for (let j = 0; j < guide.arguments.length; j++) {
					let prop = guide.arguments[j];
					if (isActorDefArg(prop)) {
						let arg = inputs[prop.input];
						if (prop.remap) {
							if (typeof arg === "number")
								arg = prop.remap[arg];
							else throw new Error(`Couldn't remap value ${arg} since it was not a number.`);
						}
						args.push(arg);
					}
					else args.push(prop);
				}
	
				let obj = new targetClass(...args);
				obj.isActor = true;
				this.engine.objects.add(obj);
			}
			else {
				console.error("Actor #"+guide.id+" class \""+guide.class+"\" is not registered.")
			}
		}
	}
	async _loadBackgrounds(list: BackgroundData[]) {
		let promises = [];
		for (let bgData of list) {
			promises.push(this.engine.backgrounds.load(bgData));
		}
		await Promise.all(promises);
	}
	isLevel(data: unknown): data is Level {
		return validate(data, LevelValidation, console.warn);
	}
	updateLevel(data: any): Level {
		switch(data._version_) {
			case void(0):
				// No version was specified. File is from before versions were introduced
				// Terrain boxes should now merge their color and sprite properties into gfx
				if (data.terrain) for (let i = 0; i < data.terrain.length; i++) {
					let terr = data.terrain[i];
					if (terr.type === 0) {
						let color = terr.properties[0];
						let sprite = terr.properties[1];
						terr.properties.splice(0, 1);
						terr.properties[0] = sprite || color || null;
					}
				}
				// Actor id 20 properties changed
				if (data.actors) for (let i = 0; i < data.actors.length; i++) {
					let props = data.actors[i];
					if (props[0] === 20) {
						props.splice(5, 1); // remove hasColorFill
					}
				}
			case 0:
				// Level backgrounds have new properties: velX and velY
				if (data.bg) for (let i = 0; i < data.bg.length; i++) {
					let bg = data.bg[i];
					if (bg) {
						bg.velX = bg.velY = 0;
					}
					// Previously the editor allowed null layers to occur
					// While technically supported, there shouldn't be any
					else data.bg.splice(i--, 1);
				}
			case 1:
				// y-axis is flipped so that +y is up and -y is down.
				if (data.camStart) data.camStart.y = data.height - data.camStart.y;
				if (data.playerSpawns) for (let i = 0; i < data.playerSpawns.length; i++) {
					let spawn = data.playerSpawns[i];
					spawn.y = data.height - spawn.y;
				}
				if (data.actors) for (let i = 0; i < data.actors.length; i++) {
					data.actors[i][2] = data.height - data.actors[i][2];
				}
				if (data.terrain) for (let i = 0; i < data.terrain.length; i++) {
					let terrain = data.terrain[i];
					// also, line property order has changed.
					// was: size, stroke (gfx), direction, useBoxCorners
					// now: gfx ...TODO
					let direction = terrain.properties[2];
					if (terrain.type === TERRAIN.LINE) {
						terrain.properties = [
							terrain.properties[1],
							terrain.properties[0],
							...terrain.properties.slice(2)
						];
					}
					// ok back to y flipping
					for (let j = 0; j < terrain.pieces.length; j++) {
						let piece = terrain.pieces[j];
						piece[1] = data.height - piece[1];
						if (terrain.type === TERRAIN.LINE) {
							piece[3] = data.height - piece[3];

							// lines now have a single specified direction based on their normal
							// Now, adapt old lines by choosing the starting point that
							// most closesly resembles the original behavior
							if (direction === 2 && piece[2] < piece[0] // UP
								|| direction === 1 && piece[3] > piece[1] // RIGHT
								|| direction === -2 && piece[2] > piece[0] // DOWN
								|| direction === -1 && piece[3] < piece[1] // LEFT
							) {
								terrain.pieces[j] = [piece[2], piece[3], piece[0], piece[1]];
							}
						}
					}
				}
				// bgs now need to specify image directory and image anchor
				if (data.bg) for (let i = 0; i < data.bg.length; i++) {
					let bg = data.bg[i];
					if (bg) {
						if (typeof bg.name === "string" && bg.name != "") {
							bg.name = "res/" + bg.name;
						}
						bg.anchorFlip = {x: false, y: true};
					}
				}
				// spawn points are now actors, not a separate field
				if (data.playerSpawns) {
					let spawnActors = [];
					for (let i = 0; i < data.playerSpawns.length; i++) {
						let spawnpt = data.playerSpawns[i];
						if (spawnpt) {
							spawnActors.push([0, spawnpt.x, spawnpt.y, i, spawnpt.direction]);
						}
					}
					if (!data.actors) data.actors = [];
					data.actors = [...spawnActors, ...data.actors];
					delete data.playerSpawns;
				}
		}
		data._version_ = BlankLevel._version_;
		let out = {...BlankLevel, ...data};
		if (this.isLevel(out)) return out;
		else throw new Error("Bad level data.");
	}
}

export const BlankLevel: Level = {
	name: "",
	width: 640,
	height: 360,
	edge: {
		top: EDGE.NONE,
		bottom: EDGE.SOLID,
		left: EDGE.WRAP,
		right: EDGE.WRAP
	},
	camStart: {x: 320, y: 180},
	horScrollBuffer: 240,
	vertScrollBuffer: 125,
	zoomScale: 1,
	minZoom: 1,
	maxZoom: 1,
	actors: [],
	terrain: [],
	bg: [],
	_version_: 2
};