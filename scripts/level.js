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
	}
};
const BlankLevel = clone(Level);
const SpriteManager = {

}

function loadLevel(file) {
	try {
		var newLevel = JSON.parse(file);
	}
	catch(err) {
		console.log('Failed to load Level "'+file.name+'" from local file');
		return console.log(err);
	}
	pauseGame(true);
	Box.killAll();
	Line.killAll();
	Garbage.clear();
	Sectors.grid = {};
	Level = clone(BlankLevel);
	for (var p in newLevel) if (p!="spawns") Level[p] = newLevel[p];
	for (var i in newLevel.spawns) eval(newLevel.spawns[i]);
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
