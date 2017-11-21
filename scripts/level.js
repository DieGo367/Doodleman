var Level = {
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
	player1Spawn: {
		x: 20,
		y: 310
	},
	player2Spawn: {
		x: 620,
		y: 310
	},
	sprites: [],
	shapes: []
};
const BlankLevel = clone(Level);
const SpriteManager = {
	spriteData: [],
	init: function() {
		$.get("scripts/sprites.json",function(data) {
			var rawData = JSON.parse(data);
			for (var i in rawData) {
				var id = rawData[i].id;
				SpriteManager.spriteData[id] = rawData[i];
			}
		});
	},
	make: function(id,...vals) {
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
			return window[sprite.class].create(...props);
		}
		else console.log("Missing sprite ID: "+id);
	},
	interpretStr: function(str,props,vals) {
		var sub = str.substring(0,3), index = parseInt(str.substring(3));
		if (sub=="val") props.push(vals[index]);
		else props.push(str);
	}
}
SpriteManager.init();
function makeLevelShape(shape) {
	var construct = [PhysicsBox,SolidLine][shape.type];
	for (var i in shape.pieces) {
		var piece = shape.pieces[i];
		if (shape.type==0) piece[0] += piece[2]/2;
		var args = [...piece,...shape.properties];
		construct.create(...args);
	}
}

function loadLevel(file) {
	try {
		var newLevel = JSON.parse(file);
	}
	catch(err) {
		console.log('Failed to load Level "'+file.name+'" from local file');
		console.log(err);
		return false;
	}
	pauseGame(true);
	Box.killAll();
	Line.killAll();
	Garbage.clear();
	Sectors.grid = {};
	Level = clone(BlankLevel);
	for (var p in newLevel) Level[p] = newLevel[p];
	for (var s in Level.sprites) SpriteManager.make(...Level.sprites[s]);
	for (var h in Level.shapes) makeLevelShape(Level.shapes[h]);
	if (Level.bgRaw!="") ImageFactory.initImageB64("BG-LevelRaw",Level.bgRaw);
	Camera.reset();
	addPlayer(0);
	if (multiplayer) addPlayer(1);
	G$("LevelSelectView").hide();
	if (focused) pauseGame(false);
	console.log("Loaded Level "+newLevel.name);
	return true;
}
function loadLevelB64(b64) {
	if (loadLevel(atob(b64))) console.log("Loaded Level from Base64");
	else console.log("Failed to load Level from Base64");
}
function openLocalFile() {
	$("#fileInput").click();
}
function loadLocalFile(event) {
	if (window.File&&window.FileReader&&window.FileList&&window.Blob) {
		var file = event.target.files[0];
		if (file) {
			var reader = new FileReader;
			reader.onload = function(e) {
				var fileType = file.name.split(".").pop();
				if (fileType=="json") {
					if (loadLevel(e.target.result)) console.log('Loaded Level "'+file.name+'" from local file');
					else console.log('Failed to load Level "'+file.name+'" from local file');
				}
				else alert("Not the right file type!");
			}
			reader.readAsText(file);
		}
		else alert("No file selected.");
	}
	else alert("Unsupported browser.");
}

function exportLevel() {
	var data = JSON.stringify(Level);
	$("#fileOutput").attr("href","data:text/plain;charset=utf-8,"+encodeURIComponent(data))[0].click();
}
function logLevel() {
	var data = JSON.stringify(Level);
	console.log(data);
}
