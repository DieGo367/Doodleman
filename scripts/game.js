const setting = "game";
function tick() { //GAME UPDATES//
	//update button states
	GamePad.checkButtons();
	Tap.checkTouches();
	//global controls
	doGlobalControls(globalKeyboard);
	for (var i in Player.slots) {
		if (Player.globalGPCtrls[i]&&Player.globalGPCtrls[i].gamepad()) {
			doGlobalControls(Player.globalGPCtrls[i]);
		}
	}
	//update all objects
	if (!paused) {
		Garbage.clear();

		Collision.checkRequests();
		Entity.callForAll("animationTick");
		Door.callForAll("animationTick");
		Box.callForAll("update");
		Collision.run();
		Line.callForAll("update");
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
	//buildMapperView();
	buildDevToolsHud();
}

function initGame() {
	canvas = $("#paper")[0], c = canvas.getContext("2d");
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
	output = $("#output");
	output.hide();

	addEvents();
	addGui();

	globalKeyboard = new Ctrl(globalKeyboardMap);
	Player.respawnButtons = [G$("AddP1Button"),G$("AddP2Button"),null,null];
	addPlayer(0);

	setGameSpeed(gameSpeed);
}

function loadLoop() {
	if (Animation||Animation.loadStatus==0) initGame();
	else window.requestAnimationFrame(loadLoop);
}
$(window).on("load",loadLoop);
