//variables
var canvas, c; //canvas and context
var interval, gameSpeed = 50/3;
var pixelDensity = 1, hudWidth = 640, hudHeight = 360;
var heightScale, widthScale;
var paused = false, pausedBy, focused = true, fullScreen = false, fullScreenChanging = false;
var viewLock = false;
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
const EDGE_NONE = 0, EDGE_SOLID = 1, EDGE_WRAP = 2, EDGE_KILL = 3;
const GAME_TITLE = 0, GAME_SANDBOX = 1, GAME_SURVIVAL = 2;
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
					if (!isArray) arrayString += '"' + i + '": ';
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
function isEven(n) {
	return n==0 || !(n%2);
}
function isOdd(n) {
	return !isEven(n);
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
		if (EditorTools.enabled&&!globalKeyboard.pressed("Ctrl")&&G$(EditorTools.getModeText()+"Tool").on) {
			let pts = Level.getSnappingPoints();
			let minDist = 5;
			let closestPoint = null;
			for (var i in pts) {
				let pt = pts[i];
				pt[0] = (pt[0] - Camera.x)*Camera.zoom + hudWidth/2;
				pt[1] = (pt[1] - Camera.y)*Camera.zoom + hudHeight/2;
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
	halfW: function() { return this.width()/2; },
	halfH: function() { return this.height()/2; },
	getLeftLimit: function() { return 0+this.halfW(); },
	getRightLimit: function() { return Level.level.width-this.halfW(); },
	getTopLimit: function() { return 0+this.halfH(); },
	getBottomLimit: function() { return Level.level.height-this.halfH(); },
	approachX: function(goal) {
		let limitL = this.getLeftLimit(), limitR = this.getRightLimit();
		if (this.x<limitL) this.x = limitL;
		if (this.x>limitR) this.x = limitR;
		if (goal!=void(0)) {
			let value = Math.min(goal,limitR);
			value = Math.max(limitL,value);
			let diff = value-this.x;
			let step = diff/10;
			if (Math.abs(step)<1) {
				if (Math.abs(diff)<3) this.setX(value);
				else this.setX(this.x+Math.abs(diff)/diff);
			}
			else this.setX(this.x+step);
		}
	},
	approachY: function(goal) {
		let limitT = this.getTopLimit(), limitB = this.getBottomLimit();
		if (this.y<limitT) this.y = limitT;
		if (this.y>limitB) this.y = limitB;
		if (goal!=void(0)) {
			let value = Math.min(goal,limitB);
			value = Math.max(limitT,value);
			let diff = value-this.y;
			let step = diff/10;
			if (Math.abs(step)<1) {
				if (Math.abs(diff)<3) this.setY(value);
				else this.setY(this.y+Math.abs(diff)/diff);
			}
			else this.setY(this.y+step);
		}
	},
	approachZoom: function(goal) {
		if (this.zoom<Level.level.minZoom) this.zoom = Level.level.minZoom;
		if (this.zoom>Level.level.maxZoom) this.zoom = Level.level.maxZoom;
		var value = Math.max(goal,Level.level.minZoom);
		value = Math.min(value,Level.level.maxZoom);
		var diff = value-this.zoom;
		var step = diff/20;
		if (Math.abs(step)<0.0003) this.zoom = value;
		else this.zoom += step;
		//get camera back in bounds in case we zoomed out too much
		this.approachX();
		this.approachY();
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

				if (targetY>this.bottomPx()-Level.level.vertScrollBuffer/this.zoom) this.approachY(targetY+(Level.level.vertScrollBuffer-hudHeight/2)/this.zoom);
				else if (targetY<this.topPx()+Level.level.vertScrollBuffer/this.zoom) this.approachY(targetY-(Level.level.vertScrollBuffer-hudHeight/2)/this.zoom);
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
const Constants = {
	stored: {},
	store: function(str) {
		if (this.stored[str]!==void(0)) return this.stored[str];
		let removeChars = [' ','(',')','[',']','{','}','"',"'",'+','-','*','/','%','=','&','|','!','$','?',':',',',';'];
		for (var i in removeChars) str = str.split(removeChars[i]).join("");
		let getVal = Function("return " + str + ";");
		return this.stored[str] = getVal();
	},
	read: function(str) {
		let val = this.stored[str];
		if (val===void(0)) val = this.store(str);
		return val;
	},
	storeList: function(list) {
		for (var i in list) this.store(list[i]);
	},
	getKey: function(val,hints) {
		if (hints) {
			for (var i in hints) {
				if (this.read(hints[i])==val) return hints[i];
			}
		}
		for (var i in this.stored) {
			if (this.stored[i]==val) return i;
		}
	}
}
class Font {
	constructor(family,size,isBold,color) {
		this.family = family || "Arial";
		this.size = size || 0;
		this.isBold = !!isBold;
		this.color = color || "black";
		this.hasShadow = false;
		this.shadowColor = "black";
		this.shadowDistance = 0;
		this.hasStroke = false;
		this.strokeColor = "black";
		this.strokeSize = 0;
	}
	setShadow(color,distance) {
		if (color===false) this.hasShadow = false;
		else {
			this.hasShadow = true;
			this.shadowColor = color || "black";
			this.shadowDistance = distance || 0;
		}
		return this;
	}
	setStroke(color,size) {
		if (color===false) this.hasStroke = false;
		else {
			this.hasStroke = true;
			this.strokeColor = color || "black";
			this.strokeSize = size || 0;
		}
		return this;
	}
	draw(text,x,y,maxWidth,alignment) {
		c.save();
		c.font = (this.isBold?"bold ":"")+this.size+"px "+this.family;
		let width = c.measureText(text).width;
		if (maxWidth!=void(0) && width>maxWidth) width = maxWidth;
		if (alignment==void(0)) alignment = CENTER;
		c.textAlign = ["left","center","right"][[LEFT,CENTER,RIGHT].indexOf(alignment)];
		c.lineWidth = this.strokeSize;
		c.lineJoin = "round";
		if (this.hasShadow) {
			if (this.hasStroke) this.drawStep("stroke",this.shadowColor,text,x,y+this.shadowDistance,width);
			this.drawStep("fill",this.shadowColor,text,x,y+this.shadowDistance,width);
		}
		if (this.hasStroke) this.drawStep("stroke",this.strokeColor,text,x,y,width);
		this.drawStep("fill",this.color,text,x,y,width);
		c.restore();
	}
	drawStep(mode,color,text,x,y,maxWidth,strokeSize) {
		c[mode+"Style"] = color;
		c[mode+"Text"](text,x,y,maxWidth);
	}
	measureWidth(text) {
		c.font = (this.isBold?"bold ":"")+this.size+"px "+this.family;
		return c.measureText(text).width;
	}
	static copy(font,family,size,isBold,color) {
		let f = new this(family||font.family,size||font.size,isBold==void(0)?font.isBold:isBold,color||font.color);
		if (font.hasShadow) f.setShadow(font.shadowColor,font.shadowDistance);
		if (font.hasStroke) f.setStroke(font.strokeColor,font.strokeSize);
		return f;
	}
}
var fontLogo = new Font("Gochi Hand",100,false,"black").setStroke("white",15);
var fontCredit = Font.copy(fontLogo,null,20);
var fontButton = new Font("Fredoka One",20,false,"white").setStroke("black",6);
var fontButtonBold = Font.copy(fontButton,null,null,true);
var fontPaused = new Font("Fredoka One",60,true,"yellow").setStroke("orange",9).setShadow("darkOrange",5);
var fontFocus = new Font("Fredoka One",30,false,"#ff6f6b").setStroke("#ad2f2b",9);
var fontMenuTitle = new Font("Fredoka One",30,true,"white").setStroke("black",9).setShadow("gray",5);
var fontMenuItem = new Font("Fredoka One",20,false,"yellow").setShadow("darkOrange",2);
var fontMenuData = Font.copy(fontMenuItem,null,null,null,"lime").setShadow("darkGreen",2);
var fontMenuEdit = Font.copy(fontMenuItem,null,null,null,"fuchsia").setShadow("purple",2);
var fontInput = new Font("Fredoka One",20,false,"black");
var fontInputEmpty = Font.copy(fontInput,null,null,null,"gray");
var fontInputSelect = Font.copy(fontInput,null,null,null,"blue");
var fontInputType = Font.copy(fontInput,null,null,null,"yellow");
var fontInputDesc = Font.copy(fontInput,null,null,null,"white");
var fontHudScore = new Font("Fredoka One",30,false,"black");

var DrawableClassList = [];
function callOnAllClasses (method) {
	for (var i in DrawableClassList) {
		DrawableClassList[i].callForAll(method);
	}
}

//Game Functions

function addPlayer(number) {
	let sheet = ["Blueman.json","Redman.json"][number];
	let button = Player.respawnButtons[number];
	let spawn = Level.level.playerSpawns[number];
	let player = Player.create(spawn.x,spawn.y,19,44,38,4,multiplayer?sheet:"Doodleman.json",number,spawn.direction!=null?spawn.direction:RIGHT);
	if (multiplayer) button.hide();
	else G$("RespawnP1Button").hide();
}

function addPM(x,y) { PaintMinion.create(x,y).isActor = true; }

/* DRAW ORDER:
-gray and BG
-all tints
-all objects
-hearts and in-game hud
-hud and gui elements
-debug and outlines
*/
function drawGame() {
	if (canvas.isInLoadScreen) return;
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
	if (devEnabled) {
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
			if (Game.mode!=GAME_TITLE) {
				G$("PauseMenu").hide();
				G$("Hud").show();
				if (devEnabled) G$("DevTools").show();
			}
			paused = false;
			pausedBy = null;
		}
	}
	else {
		if (pause) {
			for (var i in Key.ctrls) { Key.ctrls[i].makePausedCache(); }
			for (var i in GamePad.ctrls) { GamePad.ctrls[i].makePausedCache(); }
			if (Game.mode!=GAME_TITLE) {
				G$("PauseMenu").show();
				G$("Hud").hide();
				G$("DevTools").hide();
			}
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
	if (canvas.isInLoadScreen) return;
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
		$(canvas).css({cursor: 'auto'});
		if (setting=="game"&&Game.mode!=GAME_TITLE) {
			G$("PauseFocusMsg").show();
			pauseGame(true);
		}
		window.requestAnimationFrame(drawGame);
	});
	$(window).on("focus",function() {
		focused = true;
		$(canvas).css({cursor: 'none'});
		if (setting=="game") G$("PauseFocusMsg").hide();
	});
}

function setupLoadScreen() {
	canvas.width = hudWidth/8;
	canvas.height = canvas.width/2;
	let h = canvas.height/2;
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
	canvas.width = hudWidth;
	canvas.height = hudHeight;
	c.fillStyle = canvas.loadPattern;
	c.fillRect(0,0,canvas.width,canvas.height);
	canvas.drawLoadScreen = function() {
		if (canvas.time==void(0)) canvas.time = 0;
		canvas.time++;
		let scroll = canvas.time % (hudWidth/8);
		let alpha = canvas.time % 120;
		c.save();
		c.scale(dp(1),dp(1));
			c.save();
			c.translate(scroll,0);
				c.fillStyle = canvas.loadPattern;
				c.fillRect(-hudWidth/8,0,hudWidth*9/8,hudHeight);
			c.restore();
			c.fillStyle = "#f0f0ff";
			c.font = "40px Fredoka One";
			c.globalAlpha = Math.abs(60-alpha)/60;
				c.fillText("Loading...",10,hudHeight-20);
			c.globalAlpha = 1;
		c.restore();
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
