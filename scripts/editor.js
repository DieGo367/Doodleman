const setting = "editor";
function tick() {
  if (focused) window.requestAnimationFrame(drawGame);
}

function addGui() {
	View.create("UserActionView",1,15,15,hudWidth-30,hudHeight-30,"window");
	TextElement.create("UAVText","UserActionView",hudWidth/2,hudHeight/2,"Press any key or click the screen to continue.","Catamaran, sans-serif",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();

	buildDevToolsHud();
}

function initEditor() {
  canvas = $("#paper")[0], c = canvas.getContext("2d");
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
  addEvents();
  addGui();
  globalKeyboard = new Ctrl(globalKeyboardMap);
	setInterval(tick,1000/60);
}

function loadLoop() {
  if (Animation.loadStatus==0) initEditor();
	else window.requestAnimationFrame(loadLoop);
}
$(window).on("load",loadLoop);
