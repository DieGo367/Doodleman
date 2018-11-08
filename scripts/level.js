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
	makeBackground: function(data,slot) {
		if (!data) return;
		if (data.type=="name") Background.create(slot,data.name,data.layer,data.scale,data.parallax);
		else if (data.raw!="") BackgroundB64.create(slot,data.raw,data.layer,data.scale,data.parallax);
	},
	clearLevel: function() {
		Box.killAll();
		Line.killAll();
		Background.killAll();
		Sector.update();
		this.level = clone(BlankLevel);
		Camera.reset();
	},
	load: function(file,doLog) {
		if (doLog==void(0)) doLog = true;
		try {
			var newLevel = JSON.parse(file);
		}
		catch(err) {
			if (doLog) console.warn('Failed to load Level');
			return false;
		}
		if (!this.isUpToDate(newLevel)) this.convert(newLevel);
		pauseGame(true);
		this.clearLevel();
		for (var p in newLevel) this.level[p] = newLevel[p];
		for (var s in this.level.actors) ActorManager.make(...this.level.actors[s]);
		for (var h in this.level.terrain) TerrainManager.make(this.level.terrain[h]);
		for (var b in this.level.bg) this.makeBackground(this.level.bg[b],b);
		Camera.reset();
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
	loadLevel: function(levelName) {
		canvas.showLoadScreen();
		ResourceManager.request("levels/"+levelName,function(data) {
      Level.load(data);
			canvas.clearLoadScreen();
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
	convert: function(data) {
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
