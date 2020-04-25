function HiddenCanvas(w,h) {
	if ("OffscreenCanvas" in window) {
		return new OffscreenCanvas(w,h);
	}
	else {
		let canvas = document.createElement("canvas");
		canvas.width = w;
		canvas.height = h;
		return canvas;
	}
}
function canvasSetup() {
	let canvas = $("#paper")[0];
	let offScreen = HiddenCanvas(80,40);
	let h = offScreen.height/2;
	let o = offScreen.getContext("2d");
	o.fillStyle = "#187acd";
	o.fillRect(0,0,offScreen.width,offScreen.height);
	o.beginPath();
	o.moveTo(0,h);
	let movements = [[1,0],[3,0],[4,1],[4,2],[2,0],[0,2]];
	for (var i in movements) o.lineTo(movements[i][0]*h,movements[i][1]*h);
	o.closePath();
	o.fillStyle = "#0004d3";
	o.fill();
	o.beginPath();
	o.moveTo(2*h,h);
	movements = [[3,2],[1,2]];
	for (var i in movements) o.lineTo(movements[i][0]*h,movements[i][1]*h);
	o.closePath();
	o.fill();
	canvas.loadPattern = o.createPattern(offScreen,"repeat");
	canvas.drawLoadScreen = function() {
		let width = canvas.width, height = canvas.height, doScale = !!dp;
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
				c.fillText("Loading...",10,px(height)-20);
			c.globalAlpha = 1;
		c.restore();
	}
	canvas.showLoadScreen = function() {
		canvas.isInLoadScreen = true;
		canvas.loadInterval = setInterval(canvas.drawLoadScreen,1000/60);
	}
	canvas.clearLoadScreen = function() {
		canvas.isInLoadScreen = false;
		clearInterval(canvas.loadInterval);
	}
	canvas.showLoadScreen();
}
function loadLoop() {
	if (Resources.pendingRequests()==0 && Images.areLoaded()) init();
	else window.requestAnimationFrame(loadLoop);
}
$(window).on("load",function() {
	canvas = $("#paper")[0], c = canvas.getContext("2d");
	setTimeout(function() {
		setPrefixedProperty(c,"imageSmoothingEnabled",false);
	},0);
	fullScreen = startedInFullScreen = window.matchMedia("(display-mode: fullscreen)").matches;
	addEvents();
	screenMatch();
	Sound.init();

	Resources.requestJSON("imagelist.json",function(list) {
		for (var i in list) {
			Images.loadImage(list[i]);
		}
	});
	Resources.requestJSON("list/levels.json",function(list) {
		Level.list = list;
	});

	Resources.requestGroup("animations",function(item,name) {
		Animation.loadSpritesheet(name,item);
	},
	function(list,groupName) {
		Animation.doInheritance(list);
	});

	Resources.requestJSON("list/res/sound.json",function(list) {
		for (var i in list) {
			Sound.loadSound(list[i]);
		}
	});
	Resources.requestGroup("res/tracks",function(item,name) {
		Sound.addTrack(name);
	});

	if ("serviceWorker" in navigator) try {
		if (ALLOW_SW) navigator.serviceWorker.register("sw.js");
	} catch (e) {
		console.log("ServiceWorker registration failed. "+e);
	}

	loadLoop();
});
