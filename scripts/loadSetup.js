function canvasSetup() {
  let canvas = $("#paper")[0];
  let realWidth = canvas.width, realHeight = canvas.height;
  canvas.width = realWidth/8;
  canvas.height = canvas.width/2;
  let h = canvas.height/2;
  let c = canvas.getContext("2d");
  c.fillStyle = "#187acd";
  c.fillRect(0,0,canvas.width,canvas.height);
  c.beginPath();
  c.moveTo(0,h);
  let movements = [[1,0],[3,0],[4,1],[4,2],[2,0],[0,2]];
  for (var i in movements) c.lineTo(movements[i][0]*h,movements[i][1]*h);
  c.closePath();
  c.fillStyle = "#0004d3";
  c.fill();
  c.beginPath();
  c.moveTo(2*h,h);
  movements = [[3,2],[1,2]];
  for (var i in movements) c.lineTo(movements[i][0]*h,movements[i][1]*h);
  c.closePath();
  c.fill();
  canvas.loadPattern = c.createPattern(canvas,"repeat");
  canvas.width = realWidth;
  canvas.height = realHeight;
  c.fillStyle = canvas.loadPattern;
  c.fillRect(0,0,canvas.width,canvas.height);
  canvas.drawLoadScreen = function() {
    let width = canvas.width, height = canvas.height, doScale = false;
    try {
      width = WIDTH;
      height = HEIGHT;
      if (dp) doScale = true;
    } catch(err) {}
    if (canvas.time==void(0)) canvas.time = 0;
    canvas.time++;
    let scroll = canvas.time % (width/8);
    let alpha = canvas.time % 120;
    c.save();
    if (doScale) c.scale(dp(1),dp(1));
      c.save();
      c.translate(scroll,0);
        c.fillStyle = canvas.loadPattern;
        c.fillRect(-width/8,0,width*9/8,height);
      c.restore();
      c.fillStyle = "#f0f0ff";
      c.font = "40px Fredoka One";
      c.globalAlpha = Math.abs(60-alpha)/60;
        c.fillText("Loading...",10,height-20);
      c.globalAlpha = 1;
    if (doScale) c.restore();
  }
  canvas.showLoadScreen = function() {
    canvas.isInLoadScreen = true;
    canvas.time = 0;
    canvas.loadInterval = setInterval(canvas.drawLoadScreen,1000/60);
  }
  canvas.clearLoadScreen = function() {
    canvas.isInLoadScreen = false;
    clearInterval(canvas.loadInterval);
  }
  canvas.showLoadScreen();
}
function loadLoop() {
	if (ResourceManager.pendingRequests()==0) init();
	else window.requestAnimationFrame(loadLoop);
}
$(window).on("load",function() {
	canvas = $("#paper")[0], c = canvas.getContext("2d");
	setTimeout(function() {
    setPrefixedProperty(c,"imageSmoothingEnabled",false);
  },0);
  addEvents();

	ResourceManager.requestGroup("res",function(item,name) {
		Images.loadImage(name);
	});
  ResourceManager.request("levels/_list_.json",function(data) {
    try {
      Level.list = JSON.parse(data);
    }
    catch(e) {
    }
  });

	ResourceManager.requestGroup("animations",function(item,name) {
		Animation.loadSpritesheet(name,item);
	},
	function(list,groupName) {
		Animation.doInheritance(list);
	});

  ResourceManager.requestGroup("res/sound",function(item,name) {
    Sound.loadSound(name);
  });
  ResourceManager.requestGroup("res/tracks",function(item,name) {
    Sound.addTrack(name);
  });

	loadLoop();
});
