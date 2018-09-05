function printErr(err) {
	alert("Oh noes everything broke!\n"+err.stack);
	console.log("Oh noes everything broke!\n"+err.stack);
}
function printFunc(func) {
	var result = func.toString();
	if (confirm(result)) {
		console.log(result);
		result = result.split("\n");
		var pTags = "";
		for (var i in result) pTags += "<p>"+result[i].split("//")[0]+"</p>";
		output.html(pTags);
		output.show();
	}
	else output.hide();
}
function printFuncName(func) {
	var str = func.toString();
	return str.split(" ")[1];
}
//variables
var canvas, c, output; //canvas and context
var interval, gameSpeed = 50/3;
var pixelDensity = 1, hudWidth = 640, hudHeight = 360;
var heightScale, widthScale;
var paused = false, pausedBy, focused = true, fullScreen = false, fullScreenChanging = false;
var viewLock = false, viewAction = function() {};
var gameMode = 0, multiplayer = false, clickSpawn = false;
var globalKeyboard;
var selectedElement;
var myAngle = 0;
var hudText = 0, coords = "", keyText = "", buttonText = "";
var devEnabled = false;
//constants
const GUI_NONE = 0, GUI_WINDOW = 1, GUI_BUTTON = 2, GUI_TINT = 3;
const LEFT = -1, CENTER = 0, RIGHT = 1, TOP = -1, BOTTOM = 1;
const LINE_UP = 2, LINE_DOWN = -2, LINE_LEFT = -1, LINE_RIGHT = 1;
const C_NONE = 0, C_WEAK = 1, C_PUSHABLE = 2, C_ENT = 3, C_SOLID = 4, C_INFINIMASS = 5, C_LINE = 6; //, C_PUSH_UP = 6, C_PUSH_RIGHT = 7, C_PUSH_DOWN = 8, C_PUSH_LEFT = 9, C_PUSH_DIAG_UL = 10, C_PUSH_DIAG_UR = 11, C_PUSH_DIAG_DR = 12, C_PUSH_DIAG_DL = 13;
const BUTTON_NO = 0, BUTTON_NORMAL = 1, BUTTON_TOGGLE = 2;
const POINTER_NONE = 0, POINTER_CROSSHAIR = 1, POINTER_PENCIL = 2, POINTER_ERASER = 3;
const ORIENT_LIN = 0, ORIENT_CW = 1, ORIENT_CCW = -1;
//helper functions
function dp(pixels) {
	return pixels*pixelDensity;
}
function px(densityPixels) {
	return densityPixels/pixelDensity;
}
function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}
function compareList(a,b) {
	if (a.length!=b.length) return false;
	for (var i = 0; i < a.length; i++) {
		if (a[i]!=b[i]) return false;
	}
	return true;
}
function niceJSON(obj) {
  let myChanges = [];
  let str = JSON.stringify(obj,function(key,val) {
    if (typeof val == "object" && val!=null) {
			let isArray = (val instanceof Array);
			console.log(isArray)
      let arrayString = isArray?'[':'{';
      let compactable = true;
			let isFirst = true;
      for (var i in val) {
        if (val[i]!=null&&typeof val[i]=="object") {
					compactable = false;
					break;
				}
        if (compactable) {
					if (!isFirst) arrayString += ', ';
					isFirst = false;
					if (!isArray) arrayString += i + ": ";
          if (val[i]==null) arrayString += "null";
          else if (typeof val[i]=="string") arrayString += '"' + val[i] + '"';
          else arrayString += val[i];
        }
      }
      arrayString += isArray?']':'}';

      if (compactable) {
        myChanges.push(arrayString);
        return "{{{" + (myChanges.length-1) + "}}}";
      }
      else return val;
    }
    else return val;
  },'\t');

  let split = str.split('"{{{');
  for (var i = 1; i < split.length; i++) {
    let subArr = split[i].split('}}}"');
    split[i] = myChanges[i-1] + subArr[1];
  }
  return split.join("");
}
function safeConst(str) {
	let removeChars = [' ','(',')','[',']','{','}','"',"'",'+','-','*','/','%','=','&','|','!','$','?',':',',',';'];
	for (var i in removeChars) str = str.split(removeChars[i]).join("");
	let getVal = Function("return " + str + ";");
	return getVal();
}
function setCookie(key,value,expDays) {
	if (!expDays) expDays = 7;
	var date = new Date();
	date.setTime(date.getTime()+expDays*24*60*60*1000);
	document.cookie = key+"="+value.toString()+";expires="+date.toUTCString()+";path=/";
}
function getCookie(key) {
	var cookies = document.cookie.split(";");
	for (var i in cookies) {
		var cookie = cookies[i].split("=");
		if (cookie[0]==key) return cookie[1];
	}
	return "nada";
}
function deleteCookie(key) {
	setCookie(key,0,-1);
}
function refreshCookie(key,expDays) {
	if (!expDays) expDays = 7;
	var value = getCookie(key);
	setCookie(key,value,expDays);
}
function setGameSpeed(speed) {
	if (interval!=null) clearInterval(interval);
	interval = setInterval(tick,speed);
	gameSpeed = speed;
}
function averageCoords(e) {
	var tx = 0, ty = 0;
	for (var i in e) {
		tx += e[i].x;
		ty += e[i].y;
	}
	return [tx/e.length,ty/e.length];
}
function toDegrees(rad) {
	return rad/Math.PI*180;
}
function toRadians(deg) {
	return deg/180*Math.PI;
}
function drawCircle(x,y,r) {
	c.beginPath();
	c.arc(x,y,r,0,2*Math.PI);
	c.stroke();
}
function drawLine(x,y,x2,y2) {
	c.beginPath();
	c.moveTo(x,y);
	c.lineTo(x2,y2);
	c.stroke();
}
function drawStrokedText(text,x,y,textColor,strokeColor,thickness,steps,maxWidth) {
	c.fillStyle = strokeColor;
	for (var a = 0; a<steps; a++) {
		c.fillText(text,x-thickness+2*thickness*a/(steps-1),y+thickness,maxWidth);
		c.fillText(text,x-thickness+2*thickness*a/(steps-1),y-thickness,maxWidth);
		c.fillText(text,x+thickness,y-thickness+2*thickness*a/(steps-1),maxWidth);
		c.fillText(text,x-thickness,y-thickness+2*thickness*a/(steps-1),maxWidth);
	}
	c.fillStyle = textColor;
	c.fillText(text,x,y,maxWidth);
}
function getPrefixedProperty(source,strProp) {
	var capProp = strProp.charAt(0).toUpperCase()+strProp.slice(1);
	if (typeof source[strProp]!='undefined') return source[strProp];
	else if (typeof source["webkit"+capProp]!='undefined') return source["webkit"+capProp];
	else if (typeof source["ms"+capProp]!='undefined') return source["ms"+capProp];
	else if (typeof source["moz"+capProp]!='undefined') return source["moz"+capProp];
}
function setPrefixedProperty(source,strProp,val) {
	var capProp = strProp.charAt(0).toUpperCase()+strProp.slice(1);
	if (typeof source[strProp]!='undefined') source[strProp] = val;
	else if (typeof source["webkit"+capProp]!='undefined') source["webkit"+capProp] = val;
	else if (typeof source["ms"+capProp]!='undefined') source["ms"+capProp] = val;
	else if (typeof source["moz"+capProp]!='undefined') source["moz"+capProp] = val;
}
function callPrefixedFunction(source,strFunc) {
	var capFunc = strFunc.charAt(0).toUpperCase()+strFunc.slice(1);
	var useArgs = [...arguments].slice(2);
	if (typeof source[strFunc]!='undefined') source[strFunc](...useArgs);
	else if (typeof source["webkit"+capFunc]!='undefined') source["webkit"+capFunc](...useArgs);
	else if (typeof source["ms"+capFunc]!='undefined') source["ms"+capFunc](...useArgs);
	else if (typeof source["moz"+capFunc]!='undefined') source["moz"+capFunc](...useArgs);
}
function attemptUserAction(action,src) {
	if (src==Pointer) {
		action(src);
		return true;
	}
	else {
		viewLock = true;
		viewAction = action;
		G$("UserActionView").show();
		pauseGame(true);
		return false;
	}
}

//helper objects
const Garbage = {
	list: [],
	add: function(obj) {
		this.list.push(obj);
	},
	clear: function() {
		for (var i in this.list) {
			var g = this.list[i];
			g.constructor.removeInstance(g);
			delete g;
		}
		this.list = [];
	}
};
const Pointer = {
	x:0,y:0,
	focusLayer: 0, cursor: POINTER_CROSSHAIR,
	styles: [POINTER_CROSSHAIR,POINTER_PENCIL,POINTER_ERASER],
	mousemove: function(event) {
		var rect = canvas.getBoundingClientRect();
		if (fullScreen) {
			var scale = Math.min(widthScale,heightScale);
			this.move(px((event.clientX-rect.left)/scale*dp(1)),px((event.clientY-rect.top)/scale*dp(1)));
		}
		else this.move(px(event.clientX-rect.left),px(event.clientY-rect.top));
	},
	move: function(x,y) {
		if (x>hudWidth) x = hudWidth;
		if (x<0) x = 0;
		if (y>hudHeight) y = hudHeight;
		if (y<0) y = 0;
		if (EditorTools.enabled&&!globalKeyboard.pressed("Ctrl")) {
			let pts = Level.getSnappingPoints();
			let minDist = 5;
			let closestPoint = null;
			for (var i in pts) {
				let pt = pts[i];
				pt[0] = pt[0] - Camera.x + hudWidth/2;
				pt[1] = pt[1] - Camera.y + hudHeight/2;
				let dist = Math.sqrt(Math.pow(pt[0]-x,2)+Math.pow(pt[1]-y,2));
				if (dist<=minDist) {
					minDist = dist;
					closestPoint = pt;
				}
			}
			if (closestPoint!=null) {
				x = closestPoint[0];
				y = closestPoint[1];
			}
		}
		this.x = Math.round(x), this.y = Math.round(y);
		Button.callForAll("checkMouse");
	},
	click: function(event) { click(this); },
	camX: function() { return Math.floor(Camera.x+(this.x-hudWidth/2)/Camera.zoom); },
	camY: function() { return Math.floor(Camera.y+(this.y-hudHeight/2)/Camera.zoom); },
	draw: function() {
		ImageFactory.drawImage("GUI-HUD-Pointer.png",this.x-16,this.y-16,32,32,32*this.styles.indexOf(this.cursor),0,32,32);
	}
};
const Camera = {
	x:320, y:180,
	zoom: 1,
	requestedZoom: 1,
	centerPlayer: null,
	setX: function(px) {
		this.x = Math.floor(px);
	},
	setY: function(px) {
		this.y = Math.floor(px);
	},
	reset: function() {
		this.x = Level.level.camStart.x;
		this.y = Level.level.camStart.y;
		this.zoom = this.requestedZoom = 1/Level.level.zoomScale;
	},
	width: function() { return hudWidth/this.zoom; },
	height: function() { return hudHeight/this.zoom; },
	leftPx: function() { return this.x-this.width()/2; },
	rightPx: function() { return this.x+this.width()/2; },
	topPx: function() { return this.y-this.height()/2; },
	bottomPx: function() { return this.y+this.height()/2; },
	approachX: function(goal) {
		if (this.leftPx()<0) this.x = this.width()/2;
		if (this.rightPx()>Level.level.width) this.x = Level.level.width-this.width()/2;
		var value = Math.min(goal,Level.level.width-this.width()/2);
		value = Math.max(this.width()/2,value);
		var diff = value-this.x;
		var step = diff/10;
		if (Math.abs(step)<1) {
			if (Math.abs(diff)<3) this.setX(value);
			else this.setX(this.x+Math.abs(diff)/diff);

		}
		else this.setX(this.x+step);
	},
	approachY: function(goal) {
		if (this.topPx()<0) this.y = this.height()/2;
		if (this.bottomPx()>Level.level.height) this.y = Level.level.height-this.height()/2;
		var value = Math.min(goal,Level.level.height-this.height()/2);
		value = Math.max(this.height()/2,value);
		var diff = value-this.y;
		var step = diff/10;
		if (Math.abs(step)<1) {
			if (Math.abs(diff)<3) this.setY(value);
			else this.setY(this.y+Math.abs(diff)/diff);
		}
		else this.setY(this.y+step);
	},
	approachZoom: function(goal) {
		var value = Math.max(goal,Level.level.minZoom);
		value = Math.min(goal,Level.level.maxZoom);
		var diff = value-this.zoom;
		var step = diff/20;
		if (Math.abs(step)<0.0003) this.zoom = value;
		else this.zoom += step;
	},
	update: function() {
		var allP = Player.getAll();
		if (allP.length>0) {
			var target = averageCoords(allP);
			var targetX = target[0], targetY = target[1];
			if (allP.length==1) {
				this.approachZoom(this.requestedZoom);

				if (targetX>this.rightPx()-Level.level.horScrollBuffer/this.zoom) this.approachX(targetX+(Level.level.horScrollBuffer-hudWidth/2)/this.zoom);
				else if (targetX<this.leftPx()+Level.level.horScrollBuffer/this.zoom) this.approachX(targetX-(Level.level.horScrollBuffer-hudWidth/2)/this.zoom);
				else this.approachX(this.x);

				if (targetY>this.bottomPx()-Level.level.vertScrollBuffer/this.zoom) this.approachY(targetY+(Level.level.vertScrollBuffer-hudHeight/2)/this.zoom);
				else if (targetY<this.topPx()+Level.level.vertScrollBuffer/this.zoom) this.approachY(targetY-(Level.level.vertScrollBuffer-hudHeight/2)/this.zoom);
				else this.approachY(this.y);
			}
			else {
				this.approachX(targetX);
				this.approachY(targetY);
				var maxDist = 0;
				for (var i in allP) {
					var p = allP[i];
					var dist = Math.sqrt(Math.pow(targetX-p.x,2)+Math.pow(targetY-p.y,2));
					maxDist = Math.max(dist,maxDist);
				}
				maxDist += 60;
				if (maxDist+5>hudHeight/2/this.requestedZoom) this.approachZoom(hudHeight/2/(maxDist));
				else this.approachZoom(this.requestedZoom);
				this.approachX(this.x);
				this.approachY(this.y);
			}
		}
	}
}
const User = {
	name: "",
	logUrl: "",
	loggedIn: false,
	setInfo: function(name,url) {
		this.name = name;
		this.logUrl = url;
	},
	useLink: function() {
		window.location = this.logUrl;
	}
};

var DrawableClassList = [];
function callOnAllClasses (method) {
	for (var i in DrawableClassList) {
		DrawableClassList[i].callForAll(method);
	}
}

function clearViewLock() {
	viewLock = false;
	viewAction();
	viewAction = function() {};
	G$("UserActionView").hide();
}

//Game Functions

function addPlayer(number) {
	let sheet = ["Blueman.json","Redman.json"][number];
	let button = Player.respawnButtons[number];
	let coords = Level.level.playerSpawns[number];
	let player = Player.create(coords.x,coords.y,19,44,38,4,multiplayer?sheet:"Doodleman.json",number);
	if (multiplayer) button.hide();
	else G$("RespawnP1Button").hide();
}

function addPM(x,y) { PaintMinion.create(x,y); }

var wave = 0;

function isEven(n) {
	return n==0 || !(n%2);
}
function isOdd(n) {
	return !isEven(n);
}

function spawnWave(wave) {
	while(wave-->0) {
		PaintMinion.create(Level.level.width/4+(isEven(wave)?Level.level.width/2:0),0);
	}
}

function setGameMode(mode) {
	if (gameMode==mode) return;
	gameMode = mode;
	if (gameMode>1) gameMode = 0;
	Entity.killAll();
	Garbage.clear();
	PhysicsBox.callForAll("respawn");
	addPlayer(0);
	if (multiplayer) addPlayer(1);
	G$("RespawnP1Button").hide();
	G$("AddP1Button").hide();
	G$("AddP2Button").hide();
	switch(gameMode) {
		case 0: //sandbox and battle
			G$("GameModeToggle").text = "Sandbox Mode";
			if (!multiplayer) PaintMinion.create(Level.level.width*3/4,30);
			break;
		case 1: //dungeon mode
			G$("GameModeToggle").text = "Dungeon Mode";

			break;
	}
}

/* DRAW ORDER:
-gray and BG
-all tints
-all objects
-hearts and in-game hud
-hud and gui elements
-debug and outlines
*/
function drawGame() {
	//densityPixels
	c.save();
	c.scale(dp(1),dp(1));

	//gray screen
	c.fillStyle = "gray";
	c.fillRect(0,0,hudWidth,hudHeight);
	//camera
	c.save();
	c.translate(hudWidth/2,hudHeight/2);
	c.scale(Camera.zoom,Camera.zoom);
	if (devEnabled) c.rotate(myAngle);
	c.translate(-Camera.x,-Camera.y);
	//background
	c.fillStyle = "lightGray";
	c.fillRect(0,0,Level.level.width,Level.level.height);
	if (Level.level.bgType=="name"&&Level.level.bgName!="none") ImageFactory.drawImagePattern(Level.level.bgName,0,0,Level.level.width,Level.level.height,Level.level.bgScale);
	else if (Level.level.bgType=="raw") ImageFactory.drawImagePattern("BG-LevelRaw",0,0,Level.level.width,Level.level.height,Level.level.bgScale);
	//objects and elements
	callOnAllClasses("drawTint");
	for (var layer = -2; layer<4; layer++) { //layers: -2: bg stuff -1: doors and other bg objects, 0:ground and lines, 1: entities, 2: players 3: particles
		for (var i in DrawableClassList) {
			var all = DrawableClassList[i].getAll();
			for (var j in all) {
				if (layer==all[j].drawLayer) all[j].draw();
			}
		}
	}
	//in game debug and elements
	callOnAllClasses("drawElements");
	if (devEnabled) {
		callOnAllClasses("drawDebug");
		//devTool eraser highlight
		if (G$("DevEraser").on) {
			var type = G$("DevSpawnPM").on?0:1;
			var thing = findTopThing(Pointer.camX(),Pointer.camY(),type);
			if (thing) thing.drawHighlighted("red");
		}
		for (var i in Sectors.grid) {
			Sectors.grid[i].drawDebug();
		}
		DevTools.LineMaker.draw();
	}
	if (EditorTools.enabled) EditorTools.draw();
	//untranslate
	c.restore();
	//draw dev camera view
	if (devEnabled) {
		var allP = Player.getAll();
		c.strokeStyle = "turquoise";
		c.lineWidth = 1;
		if (allP.length==1) c.strokeRect(Level.level.horScrollBuffer,Level.level.vertScrollBuffer,hudWidth-2*Level.level.horScrollBuffer,hudHeight-2*Level.level.vertScrollBuffer);
		else if (allP.length>1) {
			drawCircle(hudWidth/2,hudHeight/2,5);
			var target = averageCoords(allP);
			var tx = (target[0]-Camera.x)*Camera.zoom+hudWidth/2, ty = (target[1]-Camera.y)*Camera.zoom+hudHeight/2;
			drawCircle(tx,ty,5);
			drawLine(hudWidth/2,hudHeight/2,tx,ty);
		}
	}
	//hud
	callOnAllClasses("drawHud");
	allViews = View.getAll();
	for (var layer = 0; layer<3; layer++) {
		for (var i in allViews) {
			if (allViews[i].layer==layer) {
				allViews[i].drawHud();
				for (var j in allViews[i].children) allViews[i].children[j].drawHud();
			}
		}
	}
	if (setting=="game") Tap.draw();
	if (focused&&Tap.touches.length==0) Pointer.draw();
	//debug hud
	if (devEnabled&&!viewLock) {
		c.fillStyle = "black";
		c.font = "12px Consolas";
		c.fillText("("+Pointer.camX()+","+Pointer.camY()+")",Pointer.x,Pointer.y+12);
		if (setting=="game") {
			var textGroup = [], allPlayers = Player.getAll();
			for (var i in allPlayers) textGroup.push(allPlayers[i].slot+1+"XY: "+allPlayers[i].x+", "+allPlayers[i].y);
			textGroup.push("LastPressedKey: "+keyText,"LastPressedButton: "+buttonText,"Entities: "+Entity.getAll().length,"Misc: "+hudText);
			var textY = 42+(24*(allPlayers.length-1));
			for (var i in textGroup) c.fillText(textGroup[i],10,textY+(14*i));
		}
	}

	//normalPixels
	c.restore();
}

function screenSize(pxDensity) {
	if (fullScreen) pixelDensity = Math.ceil(pxDensity*window.devicePixelRatio);
	else pixelDensity = pxDensity;
	canvas.width = dp(hudWidth);
	canvas.height = dp(hudHeight);
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
}

function pauseGame(pause,player) {
	if (paused) {
		if (!pause&&Pointer.focusLayer==0&&focused&&(player==pausedBy||player==null||pausedBy==null||!multiplayer)) {
			for (var i in Key.ctrls) { Key.ctrls[i].loadPausedCache(); }
			for (var i in GamePad.ctrls) { GamePad.ctrls[i].loadPausedCache(); }
			G$("PauseMenu").hide();
			G$("Hud").show();
			if (devEnabled) G$("DevTools").show();
			paused = false;
			pausedBy = null;
		}
	}
	else {
		if (pause) {
			for (var i in Key.ctrls) { Key.ctrls[i].makePausedCache(); }
			for (var i in GamePad.ctrls) { GamePad.ctrls[i].makePausedCache(); }
			G$("PauseMenu").show();
			G$("Hud").hide();
			G$("DevTools").hide();
			paused = true;
			pausedBy = player;
		}
	}
}

function doGlobalControls(controller) {
	if (controller.ready("pause")) {
		var slot = -1;
		if (controller.type==GAMEPAD) slot = Player.gpIds.indexOf(controller.gamepadIndex);
		else if (controller.type==KEYBOARD) {
			slot = controller.ready("pause-p1")?0:1;
			controller.use("pause-p"+(slot+1));
		}
		pauseGame(!paused,slot!=-1?slot:null);
		controller.use("pause");
	}
	if (controller.type==KEYBOARD) {
		if (controller.ready("snippet")) {
			controller.use("snippet")
			var code = prompt("Run code snippet:");
			eval(code);
		}
	}
	if (controller.ready("showInfo")) {
		G$("CtrlDevMode").on = devEnabled = !devEnabled;
		if (!paused&&devEnabled&&setting=="game") G$("DevTools").show();
		else G$("DevTools").hide();
		controller.use("showInfo");
	}
	else {
		if (!multiplayer&&controller.ready("respawn")) { PhysicsBox.callForAll("respawn"); controller.use("respawn"); }
		if ((devEnabled||setting=="editor")&&controller.type==KEYBOARD&&Pointer.focusLayer==0) {
			// if (controller.pressed("camRotateCW")) myAngle += 0.01;
			// if (controller.pressed("camRotateCCW")) myAngle -= 0.01;
			if (controller.pressed("camLeft")) Camera.x -= 5;
			if (controller.pressed("camRight")) Camera.x += 5;
			if (controller.pressed("camDown")) Camera.y += 5;
			if (controller.pressed("camUp")) Camera.y -= 5;
			if (controller.pressed("camZoomIn")) Camera.zoom += 0.01;
			if (controller.pressed("camZoomOut")) Camera.zoom -= 0.01;
			if (controller.pressed("camZoomReset")) Camera.zoom = Camera.requestedZoom;
			if (controller.pressed("camReset")) {
				myAngle = 0;
				Camera.reset();
			}
			if (Camera.zoom<0) Camera.zoom = 0;
		}
	}
	if (controller.type==GAMEPAD) {
		var moveX = controller.getActionValue("pointerMoveX"), moveY = controller.getActionValue("pointerMoveY"), moved = false;
		if (Math.abs(moveX)>0.01||Math.abs(moveY)>0.01) Pointer.move(Pointer.x+moveX*8,Pointer.y+moveY*8);
		if (controller.ready("click")) {
			controller.use("click");
			click(controller);
		}
	}
}

function click(ctrl) {
	var found = false;
	if (!viewLock) {
		for (var i in Button.classList) {
			if (Button.classList[i].onClick(ctrl)) found = true;
		}
	}
	else if (ctrl==Pointer) clearViewLock();
	if (devEnabled&&!found&&!paused) DevTools.onClick();
	if (EditorTools.enabled) EditorTools.onClick(found);
	Pointer.move(Pointer.x,Pointer.y);
}

function findTopThing(x,y,type) {
	var allEnem = Enemy.getAll(), allLine = Line.getAll();
	if (type==0) {
		for (var i in allEnem) {
			if (allEnem[i].containsPoint(x,y)) return allEnem[i];
		}
	}
	else {
		for (var i in allLine) {
			if (allLine[i].hitboxContainsPoint(x,y)) {
				var lx = allLine[i].valueAt(y,'y');
				var ly = allLine[i].valueAt(x,'x');
				var diffX = Math.abs(x-lx);
				var diffY = Math.abs(y-ly);
				var slope = Math.abs(allLine[i].slope());
				if ((slope=="vertical tangent"||slope>50)&&diffX<15) return allLine[i];
				if (diffY<15) return allLine[i];
			}
		}
	}
}

function addEvents() {
	$(window).on("keydown",function(event) {
		Key.onKeydown(event);
		if (viewLock) clearViewLock();
		if ([37,38,39,40,32].indexOf(event.keyCode)) event.preventDefault();
		keyText = event.keyCode;
	});
	$(window).on("keyup",function(event) { Key.onKeyup(event); });
	$(window).on("mousemove",function(event) { Pointer.mousemove(event); });
	$(window).on("click",function(e) { click(Pointer); });
	$(window).on("contextmenu",function(event) { if (!devEnabled) event.preventDefault(); });
	if ("ongamepadconnected" in window) {
		GamePad.haveEvents = true;
		$(window).on("gamepadconnected",function(event) {
			GamePad.connect(event.gamepad);
		});
		$(window).on("gamepaddisconnected",function(event) {
			GamePad.disconnect(event.gamepad);
		});
	}
	else {
		GamePad.haveEvents = false;
		GamePad.scanGamepads();
	}
	if ("ontouchstart" in window) {
		$(canvas).on("touchstart",function(event) { Tap.handler(event,true); 	});
		$(canvas).on("touchmove",function(event) { Tap.handler(event); });
		$(canvas).on("touchend",function(event) { Tap.handleEnd(event); });
		$(canvas).on("touchcancel",function(event) { Tap.handler(event); });
	}
	$("#fileInput").on("change",Level.loadLocalFile);
	$(window).on("resize",function() {
		fullScreen = getPrefixedProperty(document,"fullscreenElement") || getPrefixedProperty(document,"fullScreenElement");
		fullScreen = !!fullScreen;
		G$("FSToggle").on = fullScreen;
		G$("FSToggle").toggleState = fullScreen+0;
		if (fullScreen) {
			widthScale = window.innerWidth/hudWidth;
			heightScale = window.innerHeight/hudHeight;
			var resolution = Math.round(Math.max(widthScale,heightScale));
			if (resolution<1) resolution = 1;
			screenSize(resolution);
			if (widthScale>=heightScale) $(canvas).css({height: '100%', width:'auto'});
			if (heightScale>=widthScale) $(canvas).css({width: '100%', height:'auto'});
			drawGame();
		}
		else {
			screenSize(1);
			$(canvas).css({width: 'auto', height: 'auto'});
			drawGame();
		}
	});
	$(window).on("blur",function() {
		focused = false;
		G$("PauseFocusMsg").show();
		$(canvas).css({cursor: 'auto'});
		if (setting=="game") pauseGame(true);
		window.requestAnimationFrame(drawGame);
	});
	$(window).on("focus",function() {
		focused = true;
		G$("PauseFocusMsg").hide();
		$(canvas).css({cursor: 'none'});
	});
}
