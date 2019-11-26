const Level = {
	level: {
		name: null,
		width: 640,
		height: 360,
		edge: {top: EDGE_NONE, bottom: EDGE_SOLID, left: EDGE_WRAP, right: EDGE_WRAP},
		camStart: {x: 320, y: 180},
		horScrollBuffer: 240,
		vertScrollBuffer: 125,
		zoomScale: 1,
		minZoom: 1,
		maxZoom: 1,
		playerSpawns: [
			{x: 20, y: 310, direction: RIGHT},
			{x: 620, y: 310, direction: LEFT}
		],
		actors: [],
		terrain: [],
		bg: [
			// {type: "name", name: "", raw:"", layer: -2, scale: 1, parallax: 1}
		],
		_version_: 0
	},
	list: [],
	exists: function(name) {
		if (name=="__EDITOR_TEST__") return true;
		return this.list.indexOf(name) != -1;
	},
	addTerrainData: function(data) {
		let index = this.findMatchingTerrainDefinitionIndex(data);
		if (index==-1) this.level.terrain.push(data);
		else {
			let definition = this.level.terrain[index];
			for (var i in data.pieces) {
				definition.pieces.push(data.pieces[i]);
			}
		}
	},
	removeTerrainData: function(data) {
		let index = this.findMatchingTerrainDefinitionIndex(data);
		if (index!=-1) {
			let definition = this.level.terrain[index];
			for (var i in data.pieces) {
				let rawPiece = JSON.stringify(data.pieces[i]);
				for (var j in definition.pieces) {
					if (JSON.stringify(definition.pieces[j])==rawPiece) {
						definition.pieces.splice(j,1);
						break;
					}
				}
			}
			if (definition.pieces.length==0) this.level.terrain.splice(index,1);
		}
	},
	findMatchingTerrainDefinitionIndex: function(data) {
		let rawProps = JSON.stringify(data.properties);
		for (var i in this.level.terrain) {
			let definition = this.level.terrain[i];
			if (definition.type==data.type) {
				if (JSON.stringify(definition.properties)==rawProps) {
					return i;
				}
			}
		}
		return -1;
	},
	addActorData: function(data) {
		this.level.actors.push(data);
	},
	removeActorData: function(data) {
		let raw = JSON.stringify(data);
		for (var i in this.level.actors) {
			if (JSON.stringify(this.level.actors[i])==raw) {
				this.level.actors.splice(i,1);
				break;
			}
		}
	},
	classify: function(list,requirePhysical) {
		let terrain = [], actors = [], other = [];
		for (var i in list) {
			let o = list[i];
			if (!requirePhysical||o instanceof PhysicsBox||o instanceof Line) {
				if (o.isTerrain) terrain.push(o);
				else actors.push(o);
			}
			else other.push(list);
		}
		return {terrain: terrain, actors: actors, other: other};
	},
	makeBackground: function(bg,slot) {
		if (!bg) return;
		if (bg.type=="name") {
			Background.create(slot,bg.name,bg.layer,bg.scale,bg.parallax);
			if (!Images.getImage(bg.name)) return Images.loadImage(bg.name);
		}
		else if (bg.raw!="") return BackgroundLZ.create(slot,bg.raw,bg.layer,bg.scale,bg.parallax).promise;
	},
	setSpawn: function(x,y,playerNumber,direction) {
		let spawn = this.level.playerSpawns[playerNumber];
		if (!spawn) spawn = this.level.playerSpawns[playerNumber] = {x: 0, y:0, direction: RIGHT};
		spawn.x = x, spawn.y = y, spawn.direction = direction;
		return spawn;
	},
	removeSpawn: function(playerNumber) {
		let spawns = Level.level.playerSpawns;
		delete spawns[playerNumber];
		trimListEnd(spawns);
	},
	clearLevel: function() {
		Box.killAll();
		Line.killAll();
		Background.killAll();
		Particle.killAll();
		RemoteObject.killAll();
		Sector.update();
		this.level = clone(BlankLevel);
		Camera.reset();
	},
	load: async function(file,doLog,skipParse) {
		if (doLog==void(0)) doLog = true;
		if (skipParse) var newLevel = file;
		else try {
			var newLevel = JSON.parse(file);
		}
		catch(err) {
			if (doLog) console.warn('Failed to load Level');
			return false;
		}
		if (!this.isUpToDate(newLevel)) await this.convert(newLevel);
		pauseGame(true);
		this.clearLevel();
		for (var p in newLevel) this.level[p] = newLevel[p];
		for (var s in this.level.actors) ActorManager.make(...this.level.actors[s]);
		for (var h in this.level.terrain) TerrainManager.make(this.level.terrain[h]);
		let promises = [];
		for (var b in this.level.bg) {
			let promise = this.makeBackground(this.level.bg[b],b);
			if (promise) promises.push(promise);
		}
		await Promise.all(promises);
		Camera.reset();
		if (online) Net.onLevelLoad(this.optimize(newLevel));
		Game.onLevelLoad();
		if (doLog) console.log("Loaded Level "+this.level.name);
		return true;
	},
	loadB64: function(b64) {
		if (this.load(atob(b64),false)) console.log("Loaded Level from Base64");
		else console.log("Failed to load Level from Base64");
	},
	openLocalFile: function() {
		FileInput.ask(["json"],"readAsText",function(result,file) {
			if (Level.load(result,false)) console.log('Loaded Level "'+file.name+'" from local file');
			else console.log('Failed to load Level "'+file.name+'" from local file');
		});
	},
	loadLevel: function(levelName,onLoad,onFail) {
		canvas.showLoadScreen();
		if (levelName=="__EDITOR_TEST__") {
			canvas.clearLoadScreen();
			if (EditorTools.loadTestLevel()) {
				if (typeof onLoad == "function") onLoad();
			}
			else if (typeof onFail == "function") onFail();
		}
		else Resources.request("levels/"+levelName,function(data) {
			new Promise(function(resolve) {
				resolve(Level.load(data));
			}).
			then(function(success) {
				canvas.clearLoadScreen();
				if (success && typeof onLoad == "function") onLoad();
				else if (!success && typeof onFail == "function") onFail();
			});
		},function() {
			canvas.clearLoadScreen();
			console.log("fail from Resources");
			if (typeof onFail == "function") onFail();
		});
	},
	export: function() {
		let data = niceJSON(Level.level);
		let url = URL.createObjectURL(new Blob([data],{type:"application/json"}));
		let name = Level.level.name || "Doodleman Level";
		$("#fileOutput").attr("download",name+".json").attr("href",url)[0].click();
	},
	log: function() {
		let data = niceJSON(Level.level);
		console.log(data);
	},
	copy: function() {
		let data = niceJSON(Level.level);
		if (data.length>1000000) {
			gameAlert("Level is too big for clipboard!",120);
		}
		else {
			$("#clipboard").val(data).select();
			document.execCommand("copy");
			gameAlert("Level data copied to clipboard.",120);
		}
	},
	isUpToDate: function(level) {
		return level._version_ == BlankLevel._version_;
	},
	convert: async function(data) {
		if (data._version_==void(0)) {
			// No version was specified. File is from before versions were introduced
			// Terrain boxes should now merge their color and sprite properties into gfx
			if (data.terrain) for (var i in data.terrain) {
				let terr = data.terrain[i];
				if (terr.type==0) {
					let color = terr.properties[0];
					let sprite = terr.properties[1];
					terr.properties.splice(0,1);
					terr.properties[0] = sprite || color || null;
				}
			}
			// Actor id 20 properties changed
			if (data.actors) for (var i in data.actors) {
				let props = data.actors[i];
				if (props[0]==20) {
					props.splice(5,1); // remove hasColorFill
				}
			}
			data._version_ = 0;
		}
		// switch(data._version_) {
		// 	case 0:
		// 		// Raw BG data is now LZ compressed, not base64 encoded
		// 		if (data.bg) {
		// 			for (var i = 0; i < data.bg.length; i++) {
		// 				let bg = data.bg[i];
		// 				if (bg && bg.raw!="") {
		// 					// this will decode to binary and LZ compress it
		// 					bg.raw = await Images.compress(bg.raw);
		// 				}
		// 			}
		// 		}
		// 	default:
		// 		data._version_ = BlankLevel._version_;
		// }
	},
	getSnappingPoints: function(cancelMidpoints) {
		let points = [];
		for (var i in this.level.terrain) {
			let definition = this.level.terrain[i];
			for (var j in definition.pieces) {
				let piece = definition.pieces[j];
				switch(definition.type) {
					case 0:
						points.push([piece[0],					piece[1]]);
						points.push([piece[0]+piece[2], piece[1]]);
						points.push([piece[0]+piece[2], piece[1]-piece[3]]);
						points.push([piece[0],					piece[1]-piece[3]]);
						break;
					case 1:
						points.push([piece[0],piece[1]]);
						points.push([piece[2],piece[3]]);
						if (!cancelMidpoints) points.push([(piece[0]+piece[2])/2, (piece[1]+piece[3])/2]);
						break;
				}
			}
		}
		return points;
	},
	randPt: function() {
		let x = Math.round(Math.random()*this.level.width);
		let y = Math.round(Math.random()*this.level.height);
		return new Point(x,y);
	},
	optimize: function(levelData) {
		let copy = clone(levelData);
		delete copy.actors;
		if (copy.bg) for (var i in copy.bg) {
			let bg = copy.bg[i];
			if (bg&&bg.raw) bg.raw = "";
		}
		return copy;
	}
}
const BlankLevel = clone(Level.level);
const ActorManager = {
	actorData: [],
	init: function() {
		Resources.request("data/actors.json",function(data) {
			var rawData = JSON.parse(data);
			for (var i in rawData) {
				var id = rawData[i].id;
				ActorManager.actorData[id] = rawData[i];
			}
		});
	},
	make: function(id) {
		let vals = Array.from(arguments).slice(1);
		let actor = this.actorData[id];
		if (actor) {
			let props = [];
			for (var i in actor.properties) {
				let p = actor.properties[i];
				switch(typeof p) {
					case "string":
						props.push(this.interpretStr(p,vals));
						break;
					case "object":
						let choice = null;
						if (p!=null) {
							//from the vals passed in, choose one to determine how to resolve this array
							let choice = this.interpretStr(p[0],vals);
							//interpret the choice
							let result = p[1]; //default, if our choice isn't valid
							switch(typeof choice) {
								case "number":
									if (choice>0&&choice<p.length-1) result = p[choice +1];
									break;
								case "boolean":
									result = choice? p[2]: p[1];
									break;
							}
							//result could be another val string, resolve it if necessary
							if (typeof result=="string") props.push(this.interpretStr(result,vals));
							else props.push(result);
						}
						else props.push(null);
						break;
					default:
						props.push(p);
				}
			}
			let obj = Constants.read(actor.class).create(...props);
			obj.isActor = true;
			obj.rawActorData = Array.from(arguments);
			return obj;
		}
		else console.log("Missing actor ID: "+id);
	},
	makeGhostActor: function(id) {
		let a = Array.from(arguments);
		let actor = this.make(...a);
		if (actor) {
			Constants.read(this.actorData[id].class).removeInstance(actor);
		}
		actor.isGhost = true;
		return actor;
	},
	searchFor: function(data) {
		let def = JSON.stringify(data);
		let construct = Constants.read(this.actorData[data[0]].class);
		let all = construct.getAll();
		for (var i in all) {
			let actor = all[i];
			if (JSON.stringify(actor.rawActorData)==def) {
				return actor;
			}
		}
	},
	interpretStr: function(str,vals) {
		var sub = str.substring(0,3), index = parseInt(str.substring(3));
		if (sub=="val") return vals[index];
		else return str;
	},
	getActorValueNames: function(id) {
		if (!this.actorData[id]) return [];
		let vals = this.actorData[id].valueNames;
		return vals || [];
	}
}
ActorManager.init();
const TerrainManager = {
	make: function(terrain) {
		let construct = [PhysicsBox,Line][terrain.type];
		let results	= [];
		for (var i in terrain.pieces) {
			let piece = clone(terrain.pieces[i]);
			if (terrain.type==0) piece[0] += piece[2]/2;
			let args = [...piece,...terrain.properties];
			let obj = construct.create(...args);
			obj.isTerrain = true;
			obj.rawTerrainData = {
				type: terrain.type,
				pieces: [clone(terrain.pieces[i])],
				properties: clone(terrain.properties)
			};
			results.push(obj);
		}
		return results;
	},
	searchFor: function(definition) {
		let construct = [PhysicsBox,Line][definition.type];
		let all = construct.getAll();
		for (var i in all) {
			let obj = all[i];
			let raw = obj.rawTerrainData;
			if (!raw) continue;
			if (raw.type!=definition.type) continue;
			if (JSON.stringify(raw.pieces)==JSON.stringify(definition.pieces)) {
				if (JSON.stringify(raw.properties)==JSON.stringify(definition.properties)) {
					return obj;
				}
			}
		}
	}
}
