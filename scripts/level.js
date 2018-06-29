const Level = {
	level: {
		bgType: "name", //name = image, raw = b64
		bgName: "none",
		bgRaw: "",
		bgScale: 1,
		width: 640,
		height: 360,
		zoomScale: 1,
		camStart: {
			x: 320,
			y: 180
		},
		horScrollBuffer: 240,
		vertScrollBuffer: 125,
		minZoom: 1,
		maxZoom: 1,
		player1Spawn: {
			x: 20,
			y: 310
		},
		player2Spawn: {
			x: 620,
			y: 310
		},
		sprites: [],
		terrain: []
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
	addSpriteData: function(data) {
		this.level.sprites.push(data);
	},
	removeSpriteData: function(data) {
		let raw = JSON.stringify(data);
		for (var i in this.level.sprites) {
			if (JSON.stringify(this.level.sprites[i])==raw) {
				this.level.sprites.splice(i,1);
				break;
			}
		}
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
		Box.killAll();
		Line.killAll();
		Garbage.clear();
		Sectors.grid = {};
		this.level = clone(BlankLevel);
		for (var p in newLevel) this.level[p] = newLevel[p];
		for (var s in this.level.sprites) SpriteManager.make(...this.level.sprites[s]);
		for (var h in this.level.terrain) TerrainManager.make(this.level.terrain[h]);
		if (this.level.bgRaw!="") ImageFactory.initImageB64("BG-LevelRaw",this.level.bgRaw);
		Camera.reset();
		addPlayer(0);
		if (multiplayer) addPlayer(1);
		G$("LevelSelectView").hide();
		if (focused) pauseGame(false);
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
					else alert("Not the right file type!");
				}
				reader.readAsText(file);
			}
			else alert("No file selected.");
		}
		else alert("Unsupported browser.");
	},
	export: function() {
		let data = JSON.stringify(this.level,null,'\t');
		$("#fileOutput").attr("href","data:text/plain;charset=utf-8,"+encodeURIComponent(data))[0].click();
	},
	log: function() {
		let data = JSON.stringify(this.level,null,'\t');
		console.log(data);
	}
}
const BlankLevel = clone(Level.level);
const SpriteManager = {
	spriteData: [],
	init: function() {
		ResourceManager.request("scripts/sprites.json",function(data) {
			var rawData = JSON.parse(data);
			for (var i in rawData) {
				var id = rawData[i].id;
				SpriteManager.spriteData[id] = rawData[i];
			}
		});
	},
	make: function(id) {
		var vals = Array.from(arguments).slice(1);
		var sprite = this.spriteData[id];
		if (sprite) {
			var props = [];
			for (var i in sprite.properties) {
				var p = sprite.properties[i];
				switch(typeof p) {
					case "string":
						this.interpretStr(p,props,vals);
						break;
					case "object":
						if (p!=null&&p[0].substring(0,3)=="val") {
							var choice = vals[parseInt(p[0].substring(3))] +1; //to ignore 1st index in p, which is this
							if (choice==0||p[choice]==void(0)) var result = p[1];
							else var result = p[choice];
							if (typeof result=="string") this.interpretStr(result,props,vals);
							else props.push(result);
						}
						else props.push(null);
						break;
					default:
						props.push(p);
				}
			}
			let obj = window[sprite.class].create(...props);
			obj.isSprite = true;
			obj.rawSpriteData = Array.from(arguments);
			return obj;
		}
		else console.log("Missing sprite ID: "+id);
	},
	makeGhostSprite: function(id) {
		let a = Array.from(arguments);
		let sprite = this.make(...a);
		if (sprite) {
			window[this.spriteData[id].class].removeInstance(sprite);
		}
		return sprite;
	},
	interpretStr: function(str,props,vals) {
		var sub = str.substring(0,3), index = parseInt(str.substring(3));
		if (sub=="val") props.push(vals[index]);
		else props.push(str);
	},
	// getSpriteValuesLength: function(id) {
	// 	let highestValNum = -1;
	// 	if (!this.spriteData[id]) return -1;
	// 	let propSettings = this.spriteData[id].properties;
	// 	for (var i in propSettings) {
	// 		if (propSettings[i] instanceof Array) {
	// 			for (var j in propSettings[i]) {
	// 				let s  = propSettings[i][j];
	// 				if (typeof s != "string") continue;
	// 				let sub = s.substring(0,3), index = parseInt(s.substring(3));
	// 				if (sub=="val"&&index>highestValNum) highestValNum = index;
	// 			}
	// 		}
	// 		else {
	// 			let s  = propSettings[i];
	// 			if (typeof s != "string") continue;
	// 			let sub = s.substring(0,3), index = parseInt(s.substring(3));
	// 			if (sub=="val"&&index>highestValNum) highestValNum = index;
	// 		}
	// 	}
	// 	return highestValNum + 1;
	// }
	getSpriteValueNames: function(id) {
		if (!this.spriteData[id]) return [];
		let vals = this.spriteData[id].valueNames;
		return vals || [];
	}
}
SpriteManager.init();
const TerrainManager = {
	make: function(terrain) {
		let construct = [PhysicsBox,SolidLine][terrain.type];
		let results  = [];
		for (var i in terrain.pieces) {
			let piece = clone(terrain.pieces[i]);
			if (terrain.type==0) piece[0] += piece[2]/2;
			let args = [...piece,...terrain.properties];
			let obj = construct.create(...args);
			obj.isTerrain = true;
			obj.rawTerrainData = clone(terrain);
			results.push(obj);
		}
		return results;
	}
}
