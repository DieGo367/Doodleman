const setting = "game";
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
	View.create("UserActionView",1,15,15,hudWidth-30,hudHeight-30,"window");
	TextElement.create("UAVText","UserActionView",hudWidth/2,hudHeight/2,"Press any key or click the screen to continue.","Catamaran, sans-serif",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();

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
	canvas = $("#paper")[0], c = canvas.getContext("2d");
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
	output = $("#output");
	output.hide();

	addEvents();
	addGui();

	globalKeyboard = new Ctrl(KEYBOARD,"global");
	Player.respawnButtons = [G$("AddP1Button"),G$("AddP2Button"),null,null];
	addPlayer(0);

	setGameSpeed(gameSpeed);
}

function loadLoop() {
	if (ResourceManager.pendingRequests()==0) initGame();
	else window.requestAnimationFrame(loadLoop);
}
$(window).on("load",function() {
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
