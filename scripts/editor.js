const setting = "editor";
function tick() {
  if (focused) window.requestAnimationFrame(drawGame);
  doGlobalControls(globalKeyboard);
  GuiElement.callForAll("update");
  Particle.callForAll("update");
}

function addGui() {
	buildDevToolsHud();
  buildEditorTools();
}

function init() {
  devEnabled = true;
  addEvents();
  addGui();
  EditorTools.enabled = true;
  EditorTools.Actor.initSpawnGhosts();
  globalKeyboard = new Ctrl(KEYBOARD,"global");
  canvas.clearLoadScreen();
	setInterval(tick,1000/60);
}
