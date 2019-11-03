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
		paused = false;
		Game = this.getMode();
		Game.start();
		return this.mode;
	},
	addMode: function(mode) {
		this.modes.push(mode);
		mode.id = this.modes.length-1;
		return mode.id;
	},
	overrideTick: function(func) {
		if (!this.tick) this.tick = tick;
		if (typeof func == "function") tick = func;
		else tick = this.tick;
		setGameSpeed(gameSpeed);
		return tick;
	}
}
class GameMode {
	constructor(obj) {
		if (typeof obj == "object") for (var p in obj) this[p] = obj[p];
	}
	get mode() {
		return GameManager.mode;
	}
	set mode(mode) {
		return GameManager.setMode(mode);
	}
	start() {}
	quit() {}
	tick() {}
	onPause(paused) {}
	onLevelLoad() {}
	onHurt(ent,attacker,damage) {}
	onDeath(ent,attacker) {}
	onCollect(player,item) {}
	onBlur() {}
	onFocus() {}
	onPointerMove() {}
	onNetConnection(connection,role) {}
	onNetFailure(role,clientID) {}
	onNetData(data,role) {}
}
var Game = new GameMode();

function tick() { //GAME UPDATES//
	Net.update();
	if (!focused&&!online) return;
	Timer.update();
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
	if (!paused||online) {
		Game.tick();

		Collision.checkRequests();
		Animation.update();
		Box.callForAll("update");
		Line.callForAll("update");
		Collision.run();
		Particle.callForAll("update");
		if (currentMonth==11) { // xmas snow
			Particle.generate(Camera.leftPx()-(WIDTH/2)+Math.random()*2*WIDTH,Camera.topPx()-10,2,2,10,600,true,null,90,90,1,0.5,true);
		}

		Camera.update();
		Sector.update();
	}
	GuiElement.callForAll("update");
	//DevTools Line Maker
	if (DevTools.LineMaker.x&&(!G$("DevPencil").on||G$("DevEraser").on||!devEnabled)) DevTools.LineMaker.clear();
	//prepare keyboard for next frame
	for (var i in Key.ctrls) Key.ctrls[i].justReleasedButtons = {};
	//begin drawing
	window.requestAnimationFrame(drawGame);
}

function init() {
	if (currentMonth==11) { // xmas easter egg
		Images.loadImage("XMAS_PaintMinion.png");
		Images.imgData["PaintMinion.png"] = Images.imgData["XMAS_PaintMinion.png"];
	}
	globalKeyboard = new Ctrl(KEYBOARD,"global");
	canvas.clearLoadScreen();
	setGameSpeed(gameSpeed);
	if (netInvite) Game.mode = GAME_ONLINELOBBY; // try to connect to host if invite link was followed
	else Game.mode = GAME_LAUNCH; // normal launch
}
