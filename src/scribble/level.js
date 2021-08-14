Scribble.Level = class Level {
	constructor(engine) {
		this.engine = engine;
		this.map = {};
		this.loadingCount = 0;
		this.data = Object.assign({}, Scribble.BlankLevel);
	}
	load(filename) {
		this.loadingCount++;
		fetch(filename).then(res => res.json()).then(data => {
			this.map[filename] = data;
			this.loadingCount--;
			if (this.loadingCount == 0 && this.onLoadFunc) {
				this.onLoadFunc();
				this.onLoadFunc = null;
			}
		});
	}
	loadAll(list, callback) {
		if (callback) {
			if (typeof callback == "function") this.onLoadFunc = callback;
		}
		for (let i = 0; i < list.length; i++) {
			this.load(list[i]);
		}
	}
	loadFromFile() {
		this.engine.file.ask(["json"], (data, file) => {
			let json;
			try {
				json = JSON.parse(data);
			}
			catch(e) {console.error(e)};
			if (json) this.set(json);
		},
		(msg) => {
			console.log("Well that didn't work... ("+msg+")");
		});
	}
	async set(level) {
		let data;
		if (typeof level === "string") {
			data = await (await fetch(level)).json();
		}
		else if (typeof level === "object") data = level;
		else return console.error("Unable to load type "+(typeof level)+" as a level.")

		await this.updateLevel(data);
		this.clear();
		// send over network
		Object.assign(this.data, data);
		this._loadTerrain(data.terrain);
		this._loadActors(data.actors);
		this._loadBackgrounds(data.bg);
		// reset camera
		this.engine.game.onLevelLoad();
		console.log("Loaded Level "+this.data.name);
	}
	clear() {
		// TODO: comments
		this.engine.objects.removeAll();
		this.engine.backgrounds.clearAll();
		// update sectors
		this.data = Object.assign({}, Scribble.BlankLevel);
		this.engine.camera.reset();
	}
	_loadTerrain(list) {
		if (list) for (let i = 0; i < list.length; i++) {
			let terrain = Object.assign({}, list[i]);

			let objectClass;
			if (terrain.type === Scribble.TERRAIN.BOX) objectClass = Scribble.Objects.Box;
			else if (terrain.type === Scribble.TERRAIN.LINE) objectClass = Scribble.Objects.Line;
			else if (terrain.type === Scribble.TERRAIN.CIRCLE) objectClass = Scribble.Objects.Circle;
			else if (terrain.type === Scribble.TERRAIN.POLYGON) objectClass = Scribble.Objects.Polygon;
			else {
				console.warn("Unknown terrain type");
				continue;
			}
			
			for (let j = 0; j < terrain.pieces.length; j++) {
				let piece = terrain.pieces[j].slice();
				let args = [...piece, ...terrain.properties];
				
				let obj = new objectClass(...args);
				obj.collision.level = Infinity;
				this.engine.objects.add(obj);
			}
		}
	}
	_loadActors(list) {
		if (list) for (let i = 0; i < list.length; i++) {
			let actor = list[i];
			let id = actor[0];
			let args = actor.slice(1,3);
			let inputs = actor.slice(3);

			let guide = this.engine.objects.actorData[id];
			let targetClass = this.engine.objects.registeredClasses[guide.class];
			if (targetClass) {
				if (guide.arguments) for (let j = 0; j < guide.arguments.length; j++) {
					let prop = guide.arguments[j];
					if (typeof prop == "object") {
						let arg = inputs[prop.input];
						if (prop.remap) arg = prop.remap[arg];
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
	_loadBackgrounds(list) {
		if (list) for (let i = 0; i < list.length; i++) {
			if (list[i]) this.engine.backgrounds.load(list[i]);
		}
	}
	async updateLevel(data) {
		if (data._version_ == Scribble.BlankLevel._version_) return;
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
					if (terrain.type === Scribble.TERRAIN.LINE) {
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
						if (terrain.type === Scribble.TERRAIN.LINE) {
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
							// if (direction === 2) { // UP
							// 	// left-most should be first
							// 	if (piece[2] < piece[0]) {
							// 		terrain.pieces[j] = [piece[2], piece[3], piece[0], piece[1]];
							// 	}
							// }
							// else if (direction === 1) { // RIGHT
							// 	// top-most should be first
							// 	if (piece[3] > piece[1]) {
							// 		terrain.pieces[j] = [piece[2], piece[3], piece[0], piece[1]];
							// 	}
							// }
							// else if (direction === -2) { // DOWN
							// 	// right-most should be first
							// 	if (piece[2] > piece[0]) {
							// 		terrain.pieces[j] = [piece[2], piece[3], piece[0], piece[1]];
							// 	}
							// }
							// else if (direction === -1) { // LEFT
							// 	// bottom-most should be first
							// 	if (piece[3] < piece[1]) {
							// 		terrain.pieces[j] = [piece[2], piece[3], piece[0], piece[1]];
							// 	}
							// }
						}
					}
				}
				// bgs now need to specify image directory
				if (data.bg) for (let i = 0; i < data.bg.length; i++) {
					let bg = data.bg[i];
					if (bg) {
						if (typeof bg.name === "string" && bg.name != "") {
							bg.name = "res/" + bg.name;
						}
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
		data._version_ = Scribble.BlankLevel._version_;
	}
};

Scribble.BlankLevel = {
	name: null,
	width: 640,
	height: 360,
	edge: {
		top: Scribble.EDGE.NONE,
		bottom: Scribble.EDGE.SOLID,
		left: Scribble.EDGE.WRAP,
		right: Scribble.EDGE.WRAP
	},
	camStart: {x: 320, y: 180},
	horScrollBuffer: 240,
	vertScrollBuffer: 125,
	zoomScale: 1,
	minZoom: 1,
	maxZoom: 1,
	playerSpawns: [
		{x: 20, y: 310, direction: Scribble.RIGHT},
		{x: 620, y: 310, direction: Scribble.LEFT}
	],
	actors: [],
	terrain: [],
	bg: [
		// {type: "name", name: "", raw:"", layer: -2, scale: 1, parallax: 1, velX: 0, velY: 0}
	],
	_version_: 2
}