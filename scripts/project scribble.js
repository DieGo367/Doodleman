//variables
var canvas, c; //canvas and context
var interval, gameSpeed = 50/3;
var pixelDensity = 1, heightScale, widthScale;
var paused = false, pausedBy, focused = true, frameByFrame = false;
var fullScreen = false, fullScreenChanging = false, startedInFullScreen = false;
var viewLock = false;
var gameMode = 0, multiplayer = false, online = false, clickSpawn = false;
var globalKeyboard;
var guiStartElement, guiSelectedElement;
var uid = 0, uidDeleted = 0;
var myAngle = 0;
var hudText = 0, coords = "", keyText = "", buttonText = "";
var devEnabled = false;
var lastDrawnFrame = 0, lastFPSCalc = 0, fps;
var netInvite;
//constants
const WIDTH = 640, HEIGHT = 360;
const GUI_NONE = 0, GUI_WINDOW = 1, GUI_BUTTON = 2, GUI_TINT = 3;
const LEFT = -1, CENTER = 0, RIGHT = 1, TOP = -1, BOTTOM = 1;
const LINE_UP = 2, LINE_DOWN = -2, LINE_LEFT = -1, LINE_RIGHT = 1;
const C_NONE = 0, C_WEAK = 1, C_PUSHABLE = 2, C_ENT = 3, C_SOLID = 4, C_INFINIMASS = 5, C_LINE = 6; //, C_PUSH_UP = 6, C_PUSH_RIGHT = 7, C_PUSH_DOWN = 8, C_PUSH_LEFT = 9, C_PUSH_DIAG_UL = 10, C_PUSH_DIAG_UR = 11, C_PUSH_DIAG_DR = 12, C_PUSH_DIAG_DL = 13;
const BUTTON_NO = 0, BUTTON_NORMAL = 1, BUTTON_TOGGLE = 2;
const POINTER_NONE = 0, POINTER_NORMAL = 1, POINTER_CROSSHAIR = 2, POINTER_PENCIL = 3, POINTER_ERASER = 4, POINTER_MOVE = 5, POINTER_INTERACT = 6;
const ORIENT_LIN = 0, ORIENT_CW = 1, ORIENT_CCW = -1;
const EDGE_NONE = 0, EDGE_SOLID = 1, EDGE_WRAP = 2, EDGE_KILL = 3;
const CANCEL = -1;
const IMAGE_STRETCH = 0, IMAGE_ZOOM = 1;
//helper functions
function dp(pixels) {
	return pixels*pixelDensity;
}
function px(densityPixels) {
	return densityPixels/pixelDensity;
}
function readEventCoords(event,rect) {
	if (!rect) rect = canvas.getBoundingClientRect();
	let x = event.pageX-rect.left;
	let y = event.pageY-rect.top;
	x = x/rect.width*WIDTH;
	y = y/rect.height*HEIGHT;
	return new Point(x,y);
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
function trimListEnd(list) {
	for (var i = list.length-1; i>=0; i--) {
		if (list[i]==void(0)) list.splice(i);
		else break;
	}
	return list;
}
function swapListItems(list,i,j) {
	let temp = list[i];
	list[i] = list[j];
	list[j] = temp;
	return list;
}
function niceJSON(obj) {
	let myChanges = [];
	let str = JSON.stringify(obj,function(key,val) {
		if (typeof val == "object" && val!=null) {
			let isArray = (val instanceof Array);
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
	var count = e.length;
	for (var i in e) {
		if (isNaN(e[i].x)||isNaN(e[i].y)) count--;
		else {
			tx += e[i].x;
			ty += e[i].y;
		}
	}
	return [tx/count,ty/count];
}
function angleTo(p1,p2) {
	return Math.atan2(p2.y-p1.y,p2.x-p1.x);
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
	if (typeof source[strFunc]=="function") return source[strFunc](...useArgs);
	else if (typeof source["webkit"+capFunc]=="function") return source["webkit"+capFunc](...useArgs);
	else if (typeof source["ms"+capFunc]=="function") return source["ms"+capFunc](...useArgs);
	else if (typeof source["moz"+capFunc]=="function") return source["moz"+capFunc](...useArgs);
}
function wait(ticks,func) {
	Timer.wait(ticks,func);
}

//helper objects
const Pointer = {
	x:0,y:0,
	active: false,
	cursor: POINTER_NORMAL, downPoint: null, downButton: null,
	styles: [POINTER_NORMAL,POINTER_CROSSHAIR,POINTER_PENCIL,POINTER_ERASER,POINTER_MOVE,POINTER_INTERACT],
	mousemove: function(event) {
		this.active = true;
		let coords = readEventCoords(event);
		this.move(coords.x,coords.y);
	},
	move: function(x,y) {
		if (x>WIDTH) x = WIDTH;
		if (x<0) x = 0;
		if (y>HEIGHT) y = HEIGHT;
		if (y<0) y = 0;
		this.x = Math.round(x), this.y = Math.round(y);
		Button.checkAll();
		guiSelectedElement = null;
		let altered = Game.onPointerMove(x,y);
		if (altered&&altered.x!=null&&altered.y!=null) this.x = altered.x, this.y = altered.y;
	},
	mousedown: function(event) {
		this.downPoint = new Point(this.x,this.y);
		this.downButton = event.which;
		this.move(this.x,this.y);
		if (!Button.underPointer()) EditorTools.onDown();
	},
	mouseup: function(event) {
		if (!this.downPoint) this.mousedown(event);
		if (this.downButton!=event.which) return;
		if (event.which==3) rightClick(this);
		else click(this);
		this.downPoint = null;
		this.downButton = null;
		this.move(this.x,this.y);
	},
	camX: function() { let cam = Camera.getCam(0); if (cam) return Math.floor(cam.x+(this.x-WIDTH/2)/cam.zoom); },
	camY: function() { let cam = Camera.getCam(0); if (cam) return Math.floor(cam.y+(this.y-HEIGHT/2)/cam.zoom); },
	camPoint: function() { return new Point(this.camX(), this.camY()) },
	draw: function() {
		if (Tap.active||!this.active) return;
		let cursor = this.interactCursor? POINTER_INTERACT: this.cursor;
		Images.drawImage("GUI/Pointer.png",this.x-16,this.y-16,32,32,32*this.styles.indexOf(cursor),0,32,32);
	}
};
class Camera {
	constructor(id) {
		this.id = id;
		this.x = 320, this.y = 180;
		this.zoom = 1;
		this.requestedZoom = 1;
	}
	setX(px) {
		this.x = Math.floor(px);
	}
	setY(px) {
		this.y = Math.floor(px);
	}
	reset() {
		this.x = Level.level.camStart.x;
		this.y = Level.level.camStart.y;
		this.zoom = this.requestedZoom = 1/Level.level.zoomScale;
	}
	width() { return WIDTH/this.zoom; }
	height() { return HEIGHT/this.zoom; }
	leftPx() { return this.x-this.width()/2; }
	rightPx() { return this.x+this.width()/2; }
	topPx() { return this.y-this.height()/2; }
	bottomPx() { return this.y+this.height()/2; }
	halfW() { return this.width()/2; }
	halfH() { return this.height()/2; }
	getLeftLimit() { return 0+this.halfW(); }
	getRightLimit() { return Level.level.width-this.halfW(); }
	getTopLimit() { return 0+this.halfH(); }
	getBottomLimit() { return Level.level.height-this.halfH(); }
	approachX(goal) {
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
	}
	approachY(goal) {
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
	}
	approachZoom(goal) {
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
	}
	update() {
		if (Camera.controllable) return;
		let targets;
		if (online) targets = Player.findAllOfSlot(this.id);
		else targets = Player.getAll();
		let avg = averageCoords(targets);
		let targetX = avg[0], targetY = avg[1];
		if (isNaN(targetX)||isNaN(targetY)) return;
		if (targets.length==0) {
			this.approachZoom(this.requestedZoom);

			if (targetX>this.rightPx()-Level.level.horScrollBuffer/this.zoom) this.approachX(targetX+(Level.level.horScrollBuffer-WIDTH/2)/this.zoom);
			else if (targetX<this.leftPx()+Level.level.horScrollBuffer/this.zoom) this.approachX(targetX-(Level.level.horScrollBuffer-WIDTH/2)/this.zoom);

			if (targetY>this.bottomPx()-Level.level.vertScrollBuffer/this.zoom) this.approachY(targetY+(Level.level.vertScrollBuffer-HEIGHT/2)/this.zoom);
			else if (targetY<this.topPx()+Level.level.vertScrollBuffer/this.zoom) this.approachY(targetY-(Level.level.vertScrollBuffer-HEIGHT/2)/this.zoom);
		}
		else if (targets.length>0) {
			this.approachX(targetX);
			this.approachY(targetY);
			var maxDist = 0;
			for (var i in targets) {
				var p = targets[i];
				var dist = Math.sqrt(Math.pow(targetX-p.x,2)+Math.pow(targetY-p.y,2));
				maxDist = Math.max(dist,maxDist);
			}
			maxDist += 60;
			if (maxDist+5>HEIGHT/2/this.requestedZoom) this.approachZoom(HEIGHT/2/(maxDist));
			else this.approachZoom(this.requestedZoom);
		}
	}
	static addCam(id) {
		let cam = new this(id);
		this.cameras[id] = cam;
		return cam;
	}
	static getCam(id) {
		return this.cameras[id];
	}
	static removeCam(id) {
		this.cameras[id] = null;
		trimListEnd(this.cameras);
	}
	static getData(id) {
		let cam = this.cameras[id];
		if (cam) {
			let data = [cam.x,cam.y,cam.zoom,cam.requestedZoom];
			if (cam.lastData) {
				let matches = true;
				for (var i in data) {
					if (data[i]!==cam.lastData[i]) {
						matches = false;
						break;
					}
				}
				if (!matches) return data;
			}
			else return data;
			cam.lastData = data;
		}
	}
	static loadData(data) {
		let cam = this.cameras[0];
		if (cam) {
			cam.x = data[0];
			cam.y = data[1];
			cam.zoom = data[2];
			cam.requestedZoom = data[3];
		}
	}
	static update() {
		for (var i in this.cameras) if (this.cameras[i]) this.cameras[i].update();
	}
	static reset() {
		for (var i in this.cameras) if (this.cameras[i]) this.cameras[i].reset();
	}
	static drawDebug() {
		let cam = this.cameras[0];
		if (!cam) return;
		let targets;
		if (online) targets = Player.findAllOfSlot(0);
		else targets = Player.getAll();
		let coords = averageCoords(targets);
		c.strokeStyle = "turquoise";
		c.lineWidth = 1;
		if (targets.length==1) c.strokeRect(Level.level.horScrollBuffer,Level.level.vertScrollBuffer,WIDTH-2*Level.level.horScrollBuffer,HEIGHT-2*Level.level.vertScrollBuffer);
		else if (targets.length>1) {
			drawCircle(WIDTH/2,HEIGHT/2,5);
			let tx = (coords[0]-cam.x)*cam.zoom+WIDTH/2, ty = (coords[1]-cam.y)*cam.zoom+HEIGHT/2;
			drawCircle(tx,ty,5);
			drawLine(WIDTH/2,HEIGHT/2,tx,ty);
		}
	}
}
Camera.cameras = [];
Camera.controllable = false;
Camera.addCam(0);
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
	static copy(font,options) {
		if (!options) options = {};
		let f = new this(options.family||font.family,options.size||font.size,
			options.isBold==void(0)?font.isBold:options.isBold,
			options.color||font.color);
		if (font.hasShadow) f.setShadow(font.shadowColor,font.shadowDistance);
		if (font.hasStroke) f.setStroke(font.strokeColor,font.strokeSize);
		return f;
	}
}
var fontLogo = new Font("Gochi Hand",100,false,"black").setStroke("white",15);
var fontCredit = Font.copy(fontLogo,{size:20});
var fontButton = new Font("Fredoka One",20,false,"white").setStroke("black",6);
var fontButtonBold = Font.copy(fontButton,{isBold:true});
var fontPaused = new Font("Fredoka One",60,true,"yellow").setStroke("orange",9).setShadow("darkOrange",5);
var fontFocus = new Font("Fredoka One",30,false,"#ff6f6b").setStroke("#ad2f2b",9);
var fontMenuTitle = new Font("Fredoka One",30,true,"white").setStroke("black",9).setShadow("gray",5);
var fontMenuItem = new Font("Fredoka One",20,false,"yellow").setShadow("darkOrange",2);
var fontMenuData = Font.copy(fontMenuItem,{color:"lime"}).setShadow("darkGreen",2);
var fontMenuEdit = Font.copy(fontMenuItem,{color:"fuchsia"}).setShadow("purple",2);
var fontInput = new Font("Fredoka One",20,false,"black");
var fontInputEmpty = Font.copy(fontInput,{color:"gray"});
var fontInputSelect = Font.copy(fontInput,{color:"blue"});
var fontInputType = Font.copy(fontInput,{color:"yellow"});
var fontInputDesc = Font.copy(fontInput,{color:"white"});
var fontHudScore = new Font("Fredoka One",30,false,"yellow").setStroke("black",6);
var fontDebug10 = new Font("Consolas",10,false,"black");
var fontFrameByFrame = Font.copy(fontDebug10,{color:"blue", size: 12});
var fontPlayerHud = new Font("Fredoka One",20,false,"black").setStroke("white",1.5);
const DrawableClasses = [];
DrawableClasses.forAll = function(method) {
	for (var i = 0; i < this.length; i++) {
		if (typeof method=="string") this[i].callForAll(method);
		else if (typeof method=="function") {
			let all = this[i].getAll();
			for (var j in all) method(all[j]);
		}
	}
}
const FileInput = {
	input: $("#fileInput")[0], asking: false, tempfs: false,
	onChange: function(event) {
		this.onCancel();
		if (this.successAction||this.failureAction) this.readFile(event,this.extensions,this.readMode,this.successAction,this.failureAction);
		this.input.value = "";
		this.input.type = "text";
		this.input.type = "file";
	},
	onCancel: function() {
		this.asking = false;
		if (this.tempfs) Timer.wait(1,function() {
			Staller.useEvent(function() {
				setFullScreen(true);
			});
		});
	},
	ask: function(extensions,readMode,success,failure) {
		this.readMode = (typeof readMode == "string"?readMode:null);
		this.extensions = (extensions instanceof Array?extensions:null);
		this.successAction = (typeof success=="function"?success:null);
		this.failureAction = (typeof failure=="function"?failure:null);
		this.asking = true;
		this.tempfs = fullScreen;
		this.input.click();
	},
	readFile: function(event,extensions,readMode,success,failure) {
		let fail = function(msg,warn) {
			if (msg) gameAlert(msg,120);
			if (warn) console.log(event);
			if (typeof failure == "function") failure();
		}
		if (!event||!event.originalEvent) return fail(null,"No event specified.");
		if (!(extensions instanceof Array)) extensions = null;
		if (typeof readMode != "string") readMode = "readAsText";
		if (window.File&&window.FileReader&&window.FileList&&window.Blob) {
			let file = event.target.files[0];
			if (file) {
				let ext = file.name.split(".").pop();
				if (extensions&&extensions.indexOf(ext)==-1) return fail("Not the right file type!");
				let reader = new FileReader;
				reader.onload = function(e) {
					if (typeof success == "function") success(e.target.result,file);
				}
				reader[readMode](file);
			}
			else fail("No file selected.");
		}
		else fail("Unsupported browser.");
	}
}
function Point(x,y) {
	if (x instanceof Point) y = x.y, x = x.x;
	this.x = x;
	this.y = y;
}
function P(x,y) {
	return new Point(x,y);
}
const Sound = {
	ctx: null, gain: null,
	soundData: {}, tracks: {}, playing: null, volume: 1,
	init: function(trueInit) {
		if (trueInit) {
			this.ctx = new (AudioContext || webkitAudioContext)();
			this.gain = this.ctx.createGain();
			this.gain.gain.value = this.volume;
			this.gain.connect(this.ctx.destination);
			for (var i in this.soundData) this.buffer(this.soundData[i]);
		}
		else Staller.useEvent(function() { Sound.init(true); });
	},
	loadSound: function(name) {
		Resources.requestArrayBuffer("res/sound/"+name,function(data,url) {
			let name = url.split("res/sound/").pop();
			let sound = Sound.soundData[name] = {raw: data};
			if (Sound.gain) Sound.buffer(sound);
		});
	},
	buffer: function(sound) {
		this.ctx.decodeAudioData(sound.raw,function(buf) {
			sound.buffer = buf;
		});
	},
	getSound: function(name) {
		return this.soundData[name];
	},
	play: function(name) {
		let sound = this.getSound(name);
		if (!sound) return;
		if (!sound.buffer) this.buffer(sound);
		let source = this.ctx.createBufferSource();
		source.buffer = sound.buffer;
		source.connect(this.gain);
		source.start(0);
	},
	addTrack: function(name) {
		this.tracks[name] = new Audio("res/tracks/"+name);
		this.tracks[name].loop = true;
	},
	getTrack: function(name) {
		return this.tracks[name];
	},
	playTrack: function(name) {
		let track = this.getTrack(name||this.playing);
		if (track) {
			track.play();
			this.playing = name||this.playing;
		}
	},
	pauseTrack: function() {
		let track = this.getTrack(this.playing);
		if (track) track.pause();
	},
	stopTrack: function() {
		let track = this.getTrack(this.playing);
		if (track) {
			track.pause();
			track.currentTime = 0;
			this.playing = null;
		}
	},
	setVolume: function(volume) {
		this.gain.gain.value = this.volume = volume;
		let track = this.getTrack(this.playing);
		if (track) track.volume = volume;
	}
}
const Timer = {
	tick: 0,
	timers: [],
	funcs: [],
	callers: [],
	now: function() {
		return this.tick;
	},
	wait: function(ticks,func,caller) {
		if (!isNaN(parseInt(ticks)) && typeof func != "function") return;
		this.timers.push(ticks);
		this.funcs.push(func);
		if (typeof caller == "object") this.callers[this.timers.length-1] = caller;
	},
	update: function() {
		this.tick++;
		let completed = [];
		for (var i in this.timers) {
			if (--this.timers[i] == 0) {
				let func = this.funcs[i];
				let caller = this.callers[i];
				if (caller) func.call(caller);
				else func();
				completed.push(i);
			}
		}
		for (var i in completed) {
			let index = completed[i];
			this.timers.splice(index,1);
			this.funcs.splice(index,1);
			delete this.callers[index];
		}
	}
}
class TypeAnnotation {
	constructor(dataType,dataName,notes) {
		this.dataType = dataType;
		this.dataName = dataName;
		this.notes = notes;
	}
	is(dataType) {
		return this.dataType == dataType;
	}
	getNotes() {
		return this.notes;
	}
	validate(data) {
		if (this.dataType=="boolean") {
			if (typeof data == "undefined" || data === null) return data;
			else return !!data;
		}
		else if (this.dataType=="number") {
			let parsed = parseFloat(data);
			if (!isNaN(parsed)) return parsed;
			else return;
		}
		else if (this.dataType=="accessor") {
			if (data==void(0)) return;
			try {
				let accessed = Constants.read(data);
				if (accessed!=void(0)) return accessed;
			}
			catch(err) {
				console.warn("Failed to access value: "+data);
			}
			return;
		}
		else if (this.dataType=="string") {
			if (data!=void(0)) return ""+data;
			else return;
		}
		else return data;
	}
	static interpret(str) {
		str = str.split(":");
		let notes = str[1]!=null? str[1].split(","): [];
		str = str[0];
		let types = {};
		types['#'] = "number", types['?'] = "boolean", types['@'] = "accessor";
		let type = types[str.charAt(0)];
		if (!type) type = "string";
		else str = str.slice(1);
		return new TypeAnnotation(type,str,notes);
	}
}
const Staller = {
	actionQueue: [],
	stalledEvents: [],
	stall: function(event,longer) {
		this.stalledEvents[event.type] = event;
		event.uses = 2;
		for (var i = 0; i < 10; i+=2) this.makeTimeout(event,i); // 8 timeouts in 10 ms
		for (var i = 10; i < 1000; i+=10) this.makeTimeout(event,i); // 9 timeouts in 1 s
		if (longer) for (var i = 1000; i < 60000; i+=1000) this.makeTimeout(event,i); // 59 timeouts in 1 min
		// 76 timeouts total per stalled event
	},
	makeTimeout: function(event,ms) {
		try {
			setTimeout(function() {
				Staller.checkForActions(event);
			},ms);
		}
		catch(err) {}
	},
	useEvent: function(func) {
		this.actionQueue.push(func);
	},
	checkForActions: function(event) {
		if (this.stalledEvents[event.type]!=event) return;
		if (event.uses>0&&this.actionQueue.length>0) {
			event.uses--;
			let action = this.actionQueue.shift();
			if (typeof action=="function") action();
		}
	}
};
const Net = {
	mainHost: "doodle-man.appspot.com",
	serverURL: "https://doodle-man.appspot.com/net/",
	room: null, listener: null, roomTick: 0, roomHeartbeat: 50 * 60 * 60, // 50 minutes
	dataLog: false,
	bytesSent: 0, doCompression: true, compressionThreshold: 150,
	// used by host
	clients: [],
	newClient: null, discoveryAlerts: false,
	// used by client
	host: null,
	clientID: null,
	webInputID: null, ctrls: null,
	// host methods
	createRoom: function() {
		this.POST("createroom",null,function(data) {
			if (data.success) {
				this.room = data.room;
				this.openToNewClient();
			}
		});
	},
	openToNewClient: function() {
		if (this.newClient) this.newClient.destroy();
		// if (this.discoveryStream) this.discoveryStream.close();
		this.newClient = new SimplePeer({
			initiator: true,
			trickle: false
		});
		this.newClient.on("signal",function(data) {
			Net.POST("posthost",{room:Net.room,signal:JSON.stringify(data)});
		});
		this.newClient.on("connect",function() { this.pending = false; Net.receiveClient(); });
		this.newClient.on("error",function(e) {
			console.warn(e);
			if (this==Net.newClient) {
				gameAlert("Network Error: Retrying",60);
				Net.openToNewClient();
			}
			else Net.hostFailure(this); // was a client
		});
		this.newClient.pending = true;
		this.roomListener("clientSignal",function(data) {
			if (data) this.POST("takeclient",{room:this.room},function() {
				this.newClient.signal(data);
			});
		});
	},
	lockRoom: function() {
		this.newClient.destroy();
		this.newClient = null;
		this.POST("lockroom",{room:this.room});
	},
	receiveClient: function() {
		let client = this.newClient;
		client.on("data",function(data) { Net.onData(data,"host",this); });
		let added = false;
		for (var i = 0; i < this.clients.length; i++)  {
			if (!this.clients[i]) {
				this.clients[i] = client;
				client.clientID = i;
				added = true;
				break;
			}
		}
		if (!added) {
			client.clientID = this.clients.length;
			this.clients.push(client);
		}
		client.webInputID = WebInput.newChannel();
		this.send({
			assignClientID: client.clientID,
			webInputID: client.webInputID
		},client);
		this.send({level:Level.optimize(Level.level)},client);
		if (this.lastState) this.send({objectState:this.lastState},client);
		Player.assignCtrl(client.clientID+1,WEBIN,client.webInputID);
		Camera.addCam(client.clientID+1);
		this.newClient = null;
		Game.onNetConnection(client,"host");
		this.openToNewClient();
	},
	removeClient: function(client) {
		this.clients[client.clientID] = null;
		trimListEnd(this.clients);
		WebInput.removeChannel(client.webInputID);
		Camera.removeCam(client.clientID+1);
	},
	hostUpdate: function() {
		for (var i in this.clients) {
			let client = this.clients[i];
			if (!client) continue;
			if (!this.usable(client)) this.hostFailure(client);
			if (Timer.now()-client.lastMessage > WebInput.channelTimeout) WebInput.silenceChannel(client.webInputID);
			let camData = Camera.getData(client.clientID+1);
			if (camData) this.send({cam: camData},client);
		}
		let objectState = RemoteObject.generateState();
		let delta = RemoteObject.delta(this.lastState||{},objectState);
		Net.send({objectState: delta});
		this.lastState = objectState;
	},
	hostFailure: function(client) {
		gameAlert("Client "+client.clientID+" was disconnected",60);
		this.removeClient(client);
		Game.onNetFailure("host");
	},
	onLevelLoad: function(levelCopy) {
		if (this.clients.length>0) {
			Net.send({level:levelCopy});
		}
	},
	// client methods
	joinRoom: function(code) {
		this.room = code;
		this.POST("enterqueue",{room:code},function(data) {
			if (data.stamp) {
				this.clientStamp = data.stamp;
				this.roomListener("clientQueue",function(data) {
					if (data&&data.length>0) {
						if (data[0]==this.clientStamp) this.connectToHost();
					}
				});
			}
		});
	},
	connectToHost: function() {
		if (this.host) this.leaveRoom();
		this.host = new SimplePeer({
			initiator: false,
			trickle: false
		});
		this.host.on("signal",function(data) {
			Net.POST("postclient",{room:Net.room,signal:JSON.stringify(data)});
		});
		this.host.on("connect",function() { Net.onAccepted(); });
		this.host.on("data",function(data) { Net.onData(data,"client",this); });
		this.host.on("error",function() { Net.clientFailure(); });
		this.host.pending = true;
		this.roomListener("hostSignal",function(data) {
			if (data) this.POST("takehost",{room:this.room},function() {
				this.host.signal(data);
			});
		});
	},
	onAccepted: function() {
		this.listener.off();
		this.host.pending = false;
		this.POST("leavequeue",{room:this.room});
		this.ctrls = new CtrlPack();
		Game.onNetConnection(Net.host,"client");
	},
	leaveRoom: function() {
		this.host.destroy();
		if (this.ctrls) this.ctrls.selfDestructAll();
		this.host = this.ctrls = null;
		this.clientCode = this.clientID = this.webInputID = null;
		RemoteObject.clearState();
	},
	clientUpdate: function() {
		if (!this.usable(this.host)) return this.clientFailure();
		if (this.ctrls) {
			let ctrl = this.ctrls.mostRecent();
			let data = {
				clientID: this.clientID,
				webInputID: this.webInputID,
				buttons: [ctrl.pressed("jump"),ctrl.pressed("attack")],
				analogs: [
					ctrl.getActionValue("moveRight")-ctrl.getActionValue("moveLeft"),
					ctrl.getActionValue("crouch")-ctrl.getActionValue("lookUp")
				],
			};
			this.send(data);
		}
	},
	clientFailure: function() {
		gameAlert("Lost connection to host",60);
		this.leaveRoom();
		Game.onNetFailure("client");
	},
	// universal methods
	url: function(str) {
		if (location.host==this.mainHost || location.host.split(":")[0]=="localhost") return "/net/"+str;
		else return this.serverURL+str;
	},
	POST: function(url,data,func) {
		$.ajax({
			type: "POST", url: this.url(url), dataType: "json",
			contentType: "application/json",
			data: JSON.stringify(data),
			success: function(data) {
				if (typeof func == "function") func.call(Net,data);
			}
		});
	},
	roomListener: function(target,callback) {
		if (this.listener) this.listener.off();
		if (typeof callback!="function") return;
		this.listener = firebase.database().ref("rooms/"+this.room+"/"+target);
		this.listener.on("value",data=>{callback.call(this,data.val())});
	},
	send: function(obj,target) {
		try {
			obj = JSON.stringify(obj);
		}
		catch(e) {
			return console.warn("Failed to stringify JSON before sending");
		}
		if (this.doCompression&&obj.length>this.compressionThreshold) {
			let compressed = LZString.compressToUint8Array(obj).buffer;
			if (compressed.byteLength < obj.length) obj = compressed;
		}
		if (devEnabled) this.bytesSent += obj.length || obj.byteLength;
		if (this.sendable(target)) target.send(obj);
		else {
			if (this.sendable(this.host)) this.host.send(obj);
			let cl = this.clients;
			for (var i in cl) if (this.sendable(cl[i])) cl[i].send(obj);
		}
	},
	usable: function(conn) {
		if (conn&&conn.pending) return true;
		return conn && conn._pc.connectionState == "connected";
	},
	sendable: function(conn) {
		return this.usable(conn) && conn._channel.readyState=="open";
	},
	log: function(msg) {
		this.send({log:msg});
	},
	onData: function(data,role,sender) {
		let str = data.toString();
		let first = str.charAt(0);
		if (first=="[" || first=="{") data = str;
		else data = LZString.decompressFromUint8Array(data);
		try {
			data = JSON.parse(data);
		}
		catch(e) {
			return console.log("Received invalid data: "+str);
		}
		if (data.log) console.log(data.log);
		if (role=="host") {
			sender.lastMessage = Timer.now();
			if (data.requestClientID) this.send({assignClientID:sender.clientID},sender);
			if (data.webInputID!=void(0)) WebInput.channelUpdate(data);
		}
		if (role=="client") {
			if (data.assignClientID!=void(0)) this.clientID = data.assignClientID;
			if (data.webInputID!=void(0)) this.webInputID = data.webInputID;
			if (data.objectState) RemoteObject.matchState(data.objectState);
			if (data.level) Level.load(data.level,true,true);
			if (data.cam) Camera.loadData(data.cam);
		}
		Game.onNetData(data,role);
	},
	cleanup: function() {
		if (this.host) this.host.destroy();
		for (var i in this.clients) this.clients[i].destroy();
		if (this.roomListener) this.roomListener.off();
		this.room = this.roomListener = this.host = this.newClient = null;
		this.clients = [];
		this.roomTick = 0;
	},
	update: function() {
		if (this.room!=null) this.roomTick++;
		if (this.roomTick>=this.roomHeartbeat) {
			this.POST("keepalive",{room:this.room});
			this.roomTick = 0;
		}
		if (this.newClient) {
			if (!this.newClient.readable) {
				if (this.discoveryAlerts) gameAlert("Network Error: Retrying",60);
				this.openToNewClient();
			}
		}
		if (this.host) this.clientUpdate();
		else if (this.clients.length>0) this.hostUpdate();
	}
};

//Game Functions

let currentDate = new Date(Date.now());
let currentMonth = currentDate.getMonth();
let currentHour = currentDate.getHours();
function addPM(x,y) {
	if (currentMonth==9 && Math.random()>0.5) Skeltal.create(x,y);
	else PaintMinion.create(x,y);
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
	if (canvas.isInLoadScreen) return;
	//fps counter
	let now = performance.now();
	let sec = Math.floor(now/1000);
	if (lastDrawnFrame==0) lastDrawnFrame = sec;
	else if (lastFPSCalc!=sec) {
		lastFPSCalc = sec;
		fps = Math.round(1000/(now-lastDrawnFrame));
	}
	lastDrawnFrame = now;
	//densityPixels
	c.save();
	c.scale(dp(1),dp(1));

	//gray screen
	c.fillStyle = "gray";
	c.fillRect(0,0,WIDTH,HEIGHT);
	//camera
	let cam = Camera.getCam(0);
	if (cam) {
		c.save();
		c.translate(WIDTH/2,HEIGHT/2);
		c.scale(cam.zoom,cam.zoom);
		c.translate(-cam.x,-cam.y);
	}
	//level space
	c.fillStyle = "lightGray";
	c.fillRect(0,0,Level.level.width,Level.level.height);
	//objects and elements
	DrawableClasses.forAll("drawTint");
	//layers: -2: bg stuff -1: doors and other bg objects, 0:ground and lines, 1: entities, 2: players 3: particles
	let layers = [], minLayer, maxLayer;
	DrawableClasses.forAll(function(obj) {
		if (obj.isLoaded===false) return;
		if (minLayer==void(0)||minLayer>obj.drawLayer) minLayer = obj.drawLayer;
		if (maxLayer==void(0)||maxLayer<obj.drawLayer) maxLayer = obj.drawLayer;
		if (!layers[obj.drawLayer]) layers[obj.drawLayer] = [obj];
		else layers[obj.drawLayer].push(obj);
	});
	for (var i = minLayer; i <= maxLayer; i++) {
		if (layers[i]) for (var j in layers[i]) layers[i][j].draw();
	}
	//in game debug and elements
	DrawableClasses.forAll("drawElements");
	if (devEnabled) {
		DrawableClasses.forAll("drawDebug");
		//devTool eraser highlight
		if (G$("DevEraser").on) {
			var type = G$("DevSpawnPM").on?0:1;
			var thing = findTopThing(Pointer.camX(),Pointer.camY(),type);
			if (thing) thing.drawHighlighted("red");
		}
		for (var i in Sector.grid) {
			Sector.grid[i].drawDebug();
		}
		DevTools.LineMaker.draw();
	}
	if (EditorTools.enabled) EditorTools.draw();
	//untranslate
	if (cam) c.restore();
	//draw dev camera view
	if (devEnabled) Camera.drawDebug();
	//hud
	DrawableClasses.forAll("drawHud");
	for (var i in View.uiStack) {
		let view = View.uiStack[i];
		if (view) {
			view.drawHud();
			for (var j in view.children) view.children[j].drawHud();
			for (var j in view.subviews) {
				view.subviews[j].drawHud();
				for (var k in view.subviews[j].children) view.subviews[j].children[k].drawHud();
			}
		}
	}
	if (Game.mode!=GAME_EDITOR) Tap.draw();
	if (focused) Pointer.draw();
	//debug hud
	if (devEnabled) {
		c.fillStyle = "black";
		c.font = "12px Consolas";
		let coordText = "("+Pointer.camX()+","+Pointer.camY()+")";
		let width = c.measureText(coordText).width;
		let x = Pointer.x+16, y = Pointer.y+12;
		c.fillText(coordText, x>WIDTH-width?x-width-16:x, y>HEIGHT?y-12:y);
		if (Game.mode!=GAME_TITLE&&Game.mode!=GAME_EDITOR) {
			var textGroup = [], allPlayers = Player.getAll();
			for (var i in allPlayers) textGroup.push(allPlayers[i].slot+1+"XY: "+allPlayers[i].x+", "+allPlayers[i].y);
			textGroup.push("LastPressedKey: "+keyText,"LastPressedButton: "+buttonText,"Entities: "+Entity.getAll().length,
				"FPS: "+fps, "Resolution: "+canvas.height+"p", "Bytes sent: "+Net.bytesSent,"Misc: "+hudText);
			Net.bytesSent = 0;
			var textY = 42+(24*(allPlayers.length-1));
			for (var i in textGroup) c.fillText(textGroup[i],10,textY+(14*i));
		}
	}
	if (frameByFrame) fontFrameByFrame.draw("Frame-By-Frame Enabled",WIDTH/2,15,null,CENTER);

	//normalPixels
	c.restore();
}

function setFullScreen(fs) {
	try {
		if (fs) {
			if (fullScreenChanging) return console.log("FullScreen'd too fast.")
			else {
				let div = $("#space")[0];
				let promise = callPrefixedFunction(div,"requestFullscreen")
				|| callPrefixedFunction(div,"requestFullScreen");
				if (promise) {
					fullScreenChanging = true;
					promise.then(function(){
						fullScreenChanging = false;
						if (window.screen.lockOrientation) window.screen.lockOrientation("landscape");
					},
					function(err) {
						fullScreenChanging = false;
						console.log(err);
					});
				}
			}
		}
		else {
			if (!callPrefixedFunction(document,"exitFullscreen"))
				callPrefixedFunction(document,"exitFullScreen");
		}
	}
	catch(e) {
		console.log(e);
	}
}
function screenSize(pxDensity) {
	if (fullScreen) pixelDensity = Math.ceil(pxDensity*window.devicePixelRatio);
	else pixelDensity = pxDensity;
	canvas.width = dp(WIDTH);
	canvas.height = dp(HEIGHT);
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
}
function screenMatch() {
	widthScale = window.innerWidth/WIDTH;
	heightScale = window.innerHeight/HEIGHT;
	var resolution = Math.round(Math.max(widthScale,heightScale));
	if (resolution<1) resolution = 1;
	screenSize(resolution);
	$(canvas).css({transform:'scale('+Math.min(widthScale,heightScale)+')'})
	drawGame();
}

function pauseGame(pause,player) {
	if (paused) {
		if (!pause&&focused&&(player==pausedBy||player==null||pausedBy==null||!multiplayer)) {
			if (Game.onPause(false)!=CANCEL) {
				for (var i in Key.ctrls) { Key.ctrls[i].loadPausedCache(); }
				for (var i in GamePad.ctrls) { GamePad.ctrls[i].loadPausedCache(); }
				paused = false;
				pausedBy = null;
			}
		}
	}
	else {
		if (pause) {
			if (Game.onPause(true)!=CANCEL) {
				for (var i in Key.ctrls) { Key.ctrls[i].makePausedCache(); }
				for (var i in GamePad.ctrls) { GamePad.ctrls[i].makePausedCache(); }
				paused = true;
				pausedBy = player;
			}
		}
	}
}

function setFrameByFrame(bool) {
	frameByFrame = bool;
	if (bool) {
		paused = true; //don't trigger the normal stuff
	}
	else pauseGame(false);
}

function doGlobalControls(controller) {
	if (canvas.isInLoadScreen) return;
	if (controller.ready("pause")) {
		var slot = -1;
		if (controller.type==GAMEPAD) {
			for (var i in Player.ctrlPorts) {
				let port = Player.ctrlPorts[i];
				if (port&&port.type==GAMEPAD&&port.id==controller.gamepadIndex) {
					slot = i;
					break;
				}
			}
		}
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
		if (devEnabled) {
			if (controller.ready("enableFrameByFrame")) {
				setFrameByFrame(!frameByFrame);
				controller.use("enableFrameByFrame");
			}
			if (frameByFrame) {
				if (controller.ready("nextFrame")) {
					paused = false;
					controller.use("nextFrame");
				}
				else paused = true;
			}
			if (controller.ready("enableCamera")) {
				Camera.controllable = !Camera.controllable;
				controller.use("enableCamera");
			}
		}
	}
	if (controller.ready("showInfo")) {
		G$("CtrlDevMode").on = devEnabled = !devEnabled;
		if (!paused&&devEnabled&&View.focus==0&&Game.mode!=GAME_EDITOR) G$("DevTools").show();
		else G$("DevTools").hide();
		controller.use("showInfo");
	}
	else {
		if (!multiplayer&&controller.ready("respawn")) { PhysicsBox.callForAll("respawn"); controller.use("respawn"); }
		if (((devEnabled&&Camera.controllable)||Game.mode==GAME_EDITOR)&&controller.type==KEYBOARD&&View.focus==1) {
			let cam = Camera.getCam(0);
			if (cam) {
				if (controller.pressed("camLeft")) cam.x -= 5;
				if (controller.pressed("camRight")) cam.x += 5;
				if (controller.pressed("camDown")) cam.y += 5;
				if (controller.pressed("camUp")) cam.y -= 5;
				if (controller.pressed("camZoomIn")) cam.zoom += 0.01;
				if (controller.pressed("camZoomOut")) cam.zoom -= 0.01;
				if (controller.pressed("camZoomReset")) cam.zoom = cam.requestedZoom;
				if (controller.pressed("camReset")) cam.reset();
				if (cam.zoom<0) cam.zoom = 0;
			}
		}
		if (guiStartElement) {
			let actions = controller.type==KEYBOARD? ["camUp","camDown","camLeft","camRight"]: ["lookUp","crouch","moveLeft","moveRight"];
			let dirs = ["up","down","left","right"];
			for (var i in dirs) {
				if (controller.ready(actions[i])) {
					if (guiSelectedElement) guiSelectedElement.selectDir(dirs[i]);
					else guiStartElement.select();
					controller.use(actions[i]);
					break;
				}
			}
			if (guiSelectedElement) {
				if (controller.ready(controller.type==KEYBOARD?"accept":"jump")) {
					guiSelectedElement.onClick(controller,true);
					controller.use(controller.type==KEYBOARD?"accept":"jump");
				}
			}
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

function click(source) {
	if (canvas.isInLoadScreen) return;
	let found = Button.underPointer();
	if (!viewLock) {
		if (found) for (var i in Button.classList) {
			if (Button.classList[i].onClick(source))break;
		}
	}
	if (devEnabled&&!found&&!paused) DevTools.onClick();
	if (EditorTools.enabled) EditorTools.onClick(found);
	Pointer.move(Pointer.x,Pointer.y);
}
function rightClick(source) {
	EditorTools.onRightClick();
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
		if ([37,38,39,40,32].indexOf(event.keyCode)) event.preventDefault();
		keyText = event.keyCode;
		Staller.stall(event);
	});
	$(window).on("keyup",function(event) { Key.onKeyup(event); });
	$(window).on("mousemove",function(event) { Pointer.mousemove(event); });
	$(window).on("mousedown",function(event) { Pointer.mousedown(event); Staller.stall(event,true); });
	$(window).on("mouseup",function(event) { Pointer.mouseup(event); });
	$(window).on("contextmenu",function(event) { if (!devEnabled||event.which==3) event.preventDefault(); });
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
		Tap.ctrlMaps.push(Tap.ctrlMaps.template);
		$(canvas).on("touchstart",function(event) { Tap.handler(event,true); Staller.stall(event);	});
		$(canvas).on("touchmove",function(event) { Tap.handler(event); });
		$(canvas).on("touchend",function(event) { Tap.handleEnd(event); });
		$(canvas).on("touchcancel",function(event) { Tap.handler(event); });
	}
	$("#fileInput").on("change",function(event) { FileInput.onChange(event); Staller.stall(event); });
	$(window).on("resize",function() {
		fullScreen = getPrefixedProperty(document,"fullscreenElement") || getPrefixedProperty(document,"fullScreenElement");
		fullScreen = !!fullScreen;
		G$("FSToggle").on = fullScreen;
		if ($("#touchkeyboard").is(":focus")) TextInput.keyboardScreen();
		else screenMatch();
	});
	$(window).on("blur",function() {
		focused = false;
		$(canvas).css({cursor: 'auto'});
		Game.onBlur();
		drawGame();
	});
	$(window).on("focus",function() {
		focused = true;
		Game.onFocus();
		$(canvas).css({cursor: 'none'});
		if (FileInput.asking && FileInput.input.files.length==0) FileInput.onCancel();
	});
}
