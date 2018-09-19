const setting = "game";
const GameManager = {
	mode: null,
	modes: [],
	getMode: function() { return this.modes[this.mode]; },
	setMode: function(mode) {
		let newMode = Math.min(Math.max(0,mode),this.modes.length-1);
		if (this.mode==newMode) return;
		let oldMode = this.getMode();
		if (oldMode) oldMode.quit();
		this.mode = newMode;
		Level.clearLevel();
		pauseGame(false);
		Game = this.getMode();
		Game.start();
		return this.mode;
	},
	addMode: function(mode) {
		this.modes.push(mode);
	}
}
class GameMode {
	get mode() {
		return GameManager.mode;
	}
	set mode(mode) {
		return GameManager.setMode(mode);
	}
	start() {}
	quit() {}
	tick() {}
	onLevelLoad() {}
	onDeath(ent,attacker) {}
}
var Game = new GameMode();

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

		Game.tick();

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
	buildTitleScreen();
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
	Game.mode = 0;
}

function loadLoop() {
	if (ResourceManager.pendingRequests()==0) initGame();
	else window.requestAnimationFrame(loadLoop);
}
$(window).on("load",function() {
	canvas = $("#paper")[0], c = canvas.getContext("2d");
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
	setupLoadScreen();
	output = $("#output");
	output.hide();

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
