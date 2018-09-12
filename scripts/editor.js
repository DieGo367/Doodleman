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

function initEditor() {
  canvas = $("#paper")[0], c = canvas.getContext("2d");
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
  devEnabled = true;
  addEvents();
  addGui();
  EditorTools.enabled = true;
  EditorTools.Actor.initSpawnGhosts();
  globalKeyboard = new Ctrl(KEYBOARD,"global");
	setInterval(tick,1000/60);
}

function loadLoop() {
  if (ResourceManager.pendingRequests()==0) initEditor();
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
