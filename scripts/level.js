const Level = {
	level: {
		bgType: "name", //name = image, raw = b64
		bgName: "none",
		bgScale: 1,
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
		bgRaw: ""
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
				else if (o.isActor) actors.push(o);
				else other.push(o);
			}
    }
    return {terrain: terrain, actors: actors, other: other};
  },
	clearLevel: function() {
		Box.killAll();
		Line.killAll();
		Garbage.clear();
		this.level = clone(BlankLevel);
		Camera.reset();
	},
	load: function(file,doLog) {
		if (doLog==void(0)) doLog = true;
		try {
			var newLevel = JSON.parse(file);
		}
		catch(err) {
			if (doLog) {
				console.log('Failed to load Level "'+file.name+'" from local file');
				console.log(err);
			}
			return false;
		}
		pauseGame(true);
		this.clearLevel();
		for (var p in newLevel) this.level[p] = newLevel[p];
		for (var s in this.level.actors) ActorManager.make(...this.level.actors[s]);
		for (var h in this.level.terrain) TerrainManager.make(this.level.terrain[h]);
		if (this.level.bgRaw!="") ImageFactory.loadImageB64("BG-LevelRaw",this.level.bgRaw);
		Camera.reset();
		if (setting=="game") {
			Game.onLevelLoad();
			G$("LevelSelectView").hide();
			if (focused) pauseGame(false);
		}
		else {
			G$("LevelSettingsClose").onClickFunction();
			EditorTools.Actor.initSpawnGhosts();
		}
		if (doLog) console.log("Loaded Level "+this.level.name);
		return true;
	},
	loadB64: function(b64) {
		if (this.load(atob(b64),false)) console.log("Loaded Level from Base64");
		else console.log("Failed to load Level from Base64");
	},
	openLocalFile: function() {
		$("#fileInput").click();
	},
	loadLocalFile: function(event) {
		if (window.File&&window.FileReader&&window.FileList&&window.Blob) {
			var file = event.target.files[0];
			if (file) {
				var reader = new FileReader;
				reader.onload = function(e) {
					var fileType = file.name.split(".").pop();
					if (fileType=="json") {
						if (Level.load(e.target.result,false)) console.log('Loaded Level "'+file.name+'" from local file');
						else console.log('Failed to load Level "'+file.name+'" from local file');
					}
					else gameAlert("Not the right file type!",120);
				}
				reader.readAsText(file);
			}
			else gameAlert("No file selected.",120);
		}
		else gameAlert("Unsupported browser.",120);
	},
	loadLevel: function(levelName) {
		canvas.showLoadScreen();
		ResourceManager.request("levels/"+levelName,function(data) {
      Level.load(data);
			canvas.clearLoadScreen();
    });
	},
	export: function() {
		let data = niceJSON(this.level);
		$("#fileOutput").attr("href","data:text/plain;charset=utf-8,"+encodeURIComponent(data))[0].click();
	},
	log: function() {
		let data = niceJSON(this.level);
		console.log(data);
	},
	getSnappingPoints: function(cancelMidpoints) {
		let points = [];
		for (var i in this.level.terrain) {
			let definition = this.level.terrain[i];
			for (var j in definition.pieces) {
				let piece = definition.pieces[j];
				switch(definition.type) {
					case 0:
						points.push([piece[0],          piece[1]]);
						points.push([piece[0]+piece[2], piece[1]]);
						points.push([piece[0]+piece[2], piece[1]-piece[3]]);
						points.push([piece[0],          piece[1]-piece[3]]);
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
	}
}
const BlankLevel = clone(Level.level);
const ActorManager = {
	actorData: [],
	init: function() {
		ResourceManager.request("scripts/actors.json",function(data) {
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
			let obj = window[actor.class].create(...props);
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
			window[this.actorData[id].class].removeInstance(actor);
		}
		return actor;
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
		let results  = [];
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
	}
}
