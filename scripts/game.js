const setting = "game";
const Game = {
	gamemode: null,
	modeObjects: [],
	get: function() { return this.modeObjects[this.gamemode]; },
	get mode() { return this.gamemode; },
	set mode(mode) {
		if (this.gamemode==mode) return;
		this.gamemode = Math.min(Math.max(0,mode),this.modeObjects.length-1);
		Box.killAll();
		Line.killAll();
		Garbage.clear();
		G$("RespawnP1Button").hide();
		G$("AddP1Button").hide();
		G$("AddP2Button").hide();
		this.get().start();
		return this.gamemode;
	},
	start: function() { this.get().start(); },
	onLevelLoad: function() { this.get().onLevelLoad(); }
}

function tick() { //GAME UPDATES//
	//update button states
	GamePad.checkButtons();
	Tap.checkTouches();
	//global controls
	doGlobalControls(globalKeyboard);
	for (var i = 0; i < GamePad.globalCtrls.length; i++) {
		let ctrl = GamePad.globalCtrls[i];
		if (ctrl) {
			let gp = ctrl.gamepad();
			let id = G$("MapperTool").selectedId;
			if (gp && (!G$("MapperTool").visible || GamePad.controllers[id]!=gp)) {
				doGlobalControls(ctrl);
			}
		}
	}
	//update all objects
	if (!paused) {
		Garbage.clear();

		Collision.checkRequests();
		Entity.callForAll("animationTick");
		Door.callForAll("animationTick");
		Box.callForAll("update");
		Line.callForAll("update");
		Collision.run();
		Particle.callForAll("update");

		Camera.update();
		Sectors.update();

		Garbage.clear();
	}
	GuiElement.callForAll("update");
	//DevTools Line Maker
	if (DevTools.LineMaker.x&&(!G$("DevPencil").on||G$("DevEraser").on||!devEnabled)) DevTools.LineMaker.clear();
	//prepare keyboard for next frame
	for (var i in Key.ctrls) Key.ctrls[i].justReleasedButtons = {};
	//begin drawing
	if (focused) window.requestAnimationFrame(drawGame);
}

function addGui() {
	buildMainHud();
	buildPauseMenu();
	buildLevelSelectMenu();
	buildControllerSettingsMenu();
	buildMapperView();
	buildMapperTool();
	buildHelpPage();
	buildDevToolsHud();
}

function initGame() {
	addEvents();
	addGui();

	globalKeyboard = new Ctrl(KEYBOARD,"global");
	Player.respawnButtons = [G$("AddP1Button"),G$("AddP2Button"),null,null];

	canvas.clearLoadScreen();
	setGameSpeed(gameSpeed);
	Game.mode = GAME_SANDBOX;
}

function loadLoop() {
	if (ResourceManager.pendingRequests()==0) {
		initGame();
	}
	else window.requestAnimationFrame(loadLoop);
}
$(window).on("load",function() {
	canvas = $("#paper")[0], c = canvas.getContext("2d");
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
	output = $("#output");
	output.hide();
	setupLoadScreen();

	ResourceManager.requestGroup("res",function(item,name) {
		ImageFactory.loadImage(name);
	});

	ResourceManager.requestGroup("animations",function(item,name) {
		Animation.loadSpritesheet(name,item);
	},
	function(list,groupName) {
		Animation.doInheritance(list);
	});

	loadLoop();
});
