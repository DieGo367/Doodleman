/* TODO:
more controller stuff
	easy switch menu
		players can have up to 3 ctrls, listen to whichever has dominance (gp>touch>keyboard)
		menu w/ all ctrls visible, player and null columns, 3 ctrl type rows. move to whichever is desirable
	mapper
		save via cookies?
do something with login
level loader and level system - better gui format
spritesheet system
	add alternate imgs.
	carried object behavior???
	fix discrepencies between preventAnimTick and inherited Animation.protoDraw
	idk if there's actually any issues tho...
finish pause menu controls
touch controls - regular buttons
collision system
	collided sides cacheing:
		store maximum collisionType per side
		if our a can't top that, then b outweighs a/
attacks
	Entity.attack();
	change attack to only a few specific frames
	down stab

   NOTES:
	Flipnote speed 6 (12fps) frame = 5 60fps game frames
*/
function printErr(err) {
	alert("Oh noes everything broke! Diego is stupid lol.\n"+err.stack);
	console.log("Oh noes everything broke! Diego is stupid lol.\n"+err.stack);
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
	str = func.toString();
	return str.split(" ")[1];
}
//variables
var canvas, c, output; //canvas and context
var interval, gameSpeed = 50/3;
var pixelDensity = 1, hudWidth = 640, hudHeight = 360;
var paused = false, pausedBy, focused = true, fullScreen = false;
var viewLock = false, viewAction = function() {};
var gameMode = 0, multiplayer = false, clickSpawn = false;
var globalKeyboard, keyboardDetector;
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
}
function averageCoords(e) {
	var tx = 0, ty = 0;
	for (var i in e) {
		tx += e[i].x;
		ty += e[i].y;
	}
	return [tx/e.length,ty/e.length];
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
function drawStrokedText(text,x,y,textColor,strokeColor,thickness,steps) {
	c.fillStyle = strokeColor;
	for (var a = 0; a<steps; a++) {
		c.fillText(text,x-thickness+2*thickness*a/(steps-1),y+thickness);
		c.fillText(text,x-thickness+2*thickness*a/(steps-1),y-thickness);
		c.fillText(text,x+thickness,y-thickness+2*thickness*a/(steps-1));
		c.fillText(text,x-thickness,y-thickness+2*thickness*a/(steps-1));
	}
	c.fillStyle = textColor;
	c.fillText(text,x,y);
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
var Level = {
	bgType: "name", //name = ImageFactory, raw = b64
	bgName: "none",
	bgRaw: "",
	bgScale: 1,
	width: 640,
	height: 360,
	zoomScale: 1,
	camStartX: 320,
	camStartY: 180,
	horScrollBuffer: 240,
	vertScrollBuffer: 125,
	minZoom: 1,
	player1SpawnX: 20,
	player1SpawnY: 310,
	player2SpawnX: 620,
	player2SpawnY: 310
};
const BlankLevel = clone(Level);
const Pointer = {
	x:0,y:0,
	focusLayer: 0, cursor: "crosshair",
	styles: ["crosshair","pencil","eraser"],
	mousemove: function(event) {
		var rect = canvas.getBoundingClientRect();
		if (fullScreen) {
			var awkScale = Math.min(calcedWidth,calcedHeight);
			this.move(px((event.clientX-rect.left)/awkScale*dp(1)),px((event.clientY-rect.top)/awkScale*dp(1)));
		}
		else this.move(px(event.clientX-rect.left),px(event.clientY-rect.top));
	},
	move: function(x,y) {
		if (x>hudWidth) x = hudWidth;
		if (x<0) x = 0;
		if (y>hudHeight) y = hudHeight;
		if (y<0) y = 0;
		this.x = Math.round(x), this.y = Math.round(y);
		Button.callForAll("checkMouse");
	},
	click: function(event) { click(this); },
	camX: function() { return Math.floor(Camera.x+(this.x-hudWidth/2)/Camera.zoom); },
	camY: function() { return Math.floor(Camera.y+(this.y-hudHeight/2)/Camera.zoom); },
	draw: function() {
		ImageFactory.drawImage("GUI-Pointer",this.x-16,this.y-16,32,32,32*this.styles.indexOf(this.cursor),0,32,32);
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
		this.x = Level.camStartX;
		this.y = Level.camStartY;
		this.zoom = this.requestedZoom = 1/Level.zoomScale;
	},
	width: function() { return hudWidth/this.zoom; },
	height: function() { return hudHeight/this.zoom; },
	leftPx: function() { return this.x-this.width()/2; },
	rightPx: function() { return this.x+this.width()/2; },
	topPx: function() { return this.y-this.height()/2; },
	bottomPx: function() { return this.y+this.height()/2; },
	approachX: function(goal) {
		if (this.leftPx()<0) this.x = this.width()/2;
		if (this.rightPx()>Level.width) this.x = Level.width-this.width()/2;
		var value = Math.min(goal,Level.width-this.width()/2);
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
		if (this.bottomPx()>Level.height) this.y = Level.height-this.height()/2;
		var value = Math.min(goal,Level.height-this.height()/2);
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
		var value = Math.max(goal,Level.minZoom);
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

				if (targetX>this.rightPx()-Level.horScrollBuffer/this.zoom) this.approachX(targetX+(Level.horScrollBuffer-hudWidth/2)/this.zoom);
				else if (targetX<this.leftPx()+Level.horScrollBuffer/this.zoom) this.approachX(targetX-(Level.horScrollBuffer-hudWidth/2)/this.zoom);
				else this.approachX(this.x);

				if (targetY>this.bottomPx()-Level.vertScrollBuffer/this.zoom) this.approachY(targetY+(Level.vertScrollBuffer-hudHeight/2)/this.zoom);
				else if (targetY<this.topPx()+Level.vertScrollBuffer/this.zoom) this.approachY(targetY-(Level.vertScrollBuffer-hudHeight/2)/this.zoom);
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
const LineMaker = {
	mode: 'line',
	x: null,
	y: null,
	xx: null,
	yy: null,
	dir: null,
	fill: "",
	size: 1,
	isBuilding: false,
	clear: function() {
		this.x = this.y = this.xx = this.yy = this.dir = null;
		this.isBuilding = false;
	},
	makeLine: function() {
		SolidLine.create(this.x,this.y,this.xx,this.yy,this.size,this.fill,this.dir);
		output.show();
		output.html(output.html()+"\nSolidLine:"+this.x+","+this.y+","+this.xx+","+this.yy+","+(this.fill?this.fill:"null")+","+this.dir);
		this.clear();
	},
	makeBox: function() {
		PhysicsBox.create(this.x,this.y,this.xx-this.x,this.yy-this.y,this.fill,null,true,C_INFINIMASS,false,0);
		output.show();
		output.html(output.html()+"\nPhysicsBox:"+this.x+","+this.y+","+(this.xx-this.x)+","+(this.yy-this.y)+","+(this.fill?this.fill:"null")+",null,true,C_INFINIMASS,false,0");
		this.clear();
	},
	input: function(x,y) {
		if (this.x==null) {
			this.x = x;
			this.y = y;
		}
		else switch(this.mode) {
			case 'line':
				if (this.xx==null) {
					this.xx = x;
					this.yy = y;
				}
				else if (this.dir) {
					this.makeLine();
				}
				break;
			case 'box':
				this.makeBox(x,y);
		}
	},
	calcDir: function(x,y) {
		if (!this.xx) return 0;
		var midX = (this.xx-this.x)/2+this.x;
		var midY = (this.yy-this.y)/2+this.y;
		var slope = Math.abs((y-midY)/(x-midX));
		if (y<midY&&slope>1) return this.dir = LINE_UP;
		else if (y>midY&&slope>1) return this.dir = LINE_DOWN;
		else if (x>midX&&slope<1) return this.dir = LINE_RIGHT;
		else if (x<midX&&slope<1) return this.dir = LINE_LEFT;
		else return this.dir = 0;
	},
	getColor: function(dir) {
		switch(dir) {
			case LINE_DOWN: return "red";
			case LINE_LEFT: return "green";
			case LINE_RIGHT: return "orange";
			case LINE_UP: return "blue";
			default: return "darkGray";
		}
	},
	draw: function() {
		c.lineWidth = 1;
		switch(this.mode) {
			case 'line':
				if (LineMaker.xx==null) {
					c.strokeStyle = "hotpink";
					drawLine(LineMaker.x,LineMaker.y,Pointer.camX(),Pointer.camY());
				}
				else {
					var midX = (LineMaker.xx-LineMaker.x)/2+LineMaker.x;
					var midY = (LineMaker.yy-LineMaker.y)/2+LineMaker.y;
					c.strokeStyle = LineMaker.getColor(LineMaker.calcDir(Pointer.camX(),Pointer.camY()));
					drawLine(midX,midY,Pointer.camX(),Pointer.camY());
					c.strokeStyle = "darkGray";
					drawLine(LineMaker.x,LineMaker.y,LineMaker.xx,LineMaker.yy);
				}
				break;
			case 'box':
				if (LineMaker.xx==null) {
					c.strokeStyle = "hotpink";
					c.strokeRect(LineMaker.x,LineMaker.y,Pointer.camX(),Pointer.camY());
				}
		}
	}
}
const CollisionCache = {
	c0: [],
	c1: [],
	type: [],
	old: [],
	requests: [],
	findPair: function(b1,b2) {
		for (var i in this.c0) {
			if (this.c0[i]==b1) {
			if (this.c1[i]==b2) return i;
			}
			else if (this.c0[i]==b2) {
				if (this.c1[i]==b1) return i;
			}
		}
		return "none";
	},
	addPair: function(b1,b2,type) {
		this.c0.push(b1);
		this.c1.push(b2);
		this.type.push(type!=null?type:null);
		this.old.push(false);
		return this.c0.length-1;
	},
	removePair: function(i) {
		this.c0.splice(i,1);
		this.c1.splice(i,1);
		this.type.splice(i,1);
		this.old.splice(i,1);
	},
	runCollision: function() {
		for (var i in this.c0) {
			this.collidePair(this.c0[i],this.c1[i],this.type[i]);
		}
	},
	refreshBehavior: function(b1,b2) {
		var i = this.findPair(b1,b2);
		if (i!="none") this.type[i] = this.determineBehavior(b1,b2);
	},
	requestRefresh: function(b1,b2,ticks) {
		this.requests.push({
			box1:b1, box2:b2,
			tick:ticks
		});
	},
	checkRequests: function() {
		var list = [];
		for (var i in this.requests) {
			var req = this.requests[i];
			req.tick--;
			if (req.tick<=0) {
				this.refreshBehavior(req.box1,req.box2);
				list.push(req);
			}
		}
		for (var i in list) {
			this.requests.splice(this.requests.indexOf(list[i]),1);
		}
	},
	removeAllPairsWith: function(b) {
		var list = [];
		for (var i in this.c0) {
			if (this.c0[i]==b||this.c1[i]==b) list.push(i);
		}
		for (var n=list.length-1;n>-1;n--) this.removePair(list[n]);
	},
	determineBehavior: function(a,b) {
		var ac = a.collisionType, bc = b.collisionType;
		if ((a.held&&a.held==b)||(b.held&&b.held==a)) behavior = 0;
		else if ((a.heldBy&&a.heldBy==b)||(b.heldBy&&b.heldBy==a)) behavior = 0;
		else if ((a.heldBy&&bc==C_LINE)||(b.heldBy&&ac==C_LINE)) behavior = 0;
		else if (ac==C_NONE||bc==C_NONE) behavior = 0;
		else if (ac==C_LINE&&bc<C_INFINIMASS) behavior = SolidLine.testBehavior(a,b)?9:10;
		else if (bc==C_LINE&&ac<C_INFINIMASS) behavior = SolidLine.testBehavior(b,a)?8:10;
		else if (ac>=C_INFINIMASS&&bc>=C_INFINIMASS) behavior = 0;
		else if (ac>=C_INFINIMASS) behavior = 1;
		else if (bc>=C_INFINIMASS) behavior = 2;
		else if (ac==bc) behavior = 3;
		else if (ac==C_SOLID||bc==C_SOLID) behavior = ac>bc?4:5;
		else if (ac==C_WEAK||bc==C_WEAK) behavior = ac>bc?4:5;
		else {
			//pushable and entity.
			if (ac==C_ENT) behavior = 6;
			else behavior = 7;
		}
		return behavior;
	},
	/*balanceType
		0: no reaction
		1: a overpowers b
		2: b overpowers a
		3: equal movement
		4: a pushes b
		5: b pushes a
			6: a and push-block b
			7: b and push-block a
			8: a and line b
			9: b and line a
			10: pending line
	*/
	collidePair: function(a,b,behavior) {
		if (!a.intersect(b)||behavior==0) return;
		if (behavior==8) {
			b.line.singleCheck(a);
			return;
		}
		else if (behavior==9) {
			a.line.singleCheck(b);
			return;
		}
		else if (behavior==10) {
			this.refreshBehavior(a,b);
			return;
		}
		PhysicsBox.collide(a,b,behavior);
	}
};
const Sectors = {
	grid: {},
	size: {width:320 , height:180 },
	update: function() {
		for (var i in this.grid) this.grid[i].updateLoadedState();
		Box.callForAll("setSectors");
	},
	removeFromSector: function(obj,sectorNameOrX,sectorY) {
		var sector = this.getSector(sectorNameOrX,sectorY);
		sector.list.splice(sector.list.indexOf(obj),1);
	},
	addToSector: function(obj,sectorX,sectorY) {
		var sector = this.getSector(sectorX,sectorY);
		sector.list.push(obj);
		obj.sectors.push(sector.name);
	},
	checkIfInSector: function(obj,sectorNameOrX,sectorY) {
		var sector = this.getSector(sectorNameOrX,sectorY);
		if (obj.rightX()>=sector.leftX()&&obj.leftX()<=sector.rightX()) {
			if (obj.y>=sector.topY()&&obj.topY()<=sector.bottomY()) return true;
		}
		else return false;
	},
	getSector: function(sectorX,sectorY) {
		if (typeof sectorX=="string") var sectorName = sectorX;
		else if (typeof sectorX=="number"&&typeof sectorY=="number") var sectorName = sectorX+","+sectorY;
		else return {list: []};
		var sector = this.grid[sectorName];
		if (!sector) sector = this.grid[sectorName] = new Sector(...sectorName.split(","));
		return sector;
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

class Sector {
	constructor(sectorX,sectorY) {
		this.x = sectorX;
		this.y = sectorY;
		this.name = sectorX+","+sectorY;
		this.list = [];
		this.loaded = true;
	}
	drawDebug() {
		c.strokeStyle = "orange";
		c.strokeRect(this.leftX(),this.topY(),Sectors.size.width,Sectors.size.height);
		c.font = "10px Consolas";
		c.strokeText(this.name,this.leftX(),this.topY()+10);
	}
	leftX() { return this.x*Sectors.size.width; }
	rightX() { return this.leftX()+Sectors.size.width; }
	topY() { return this.y*Sectors.size.height; }
	bottomY() { return this.topY()+Sectors.size.height; }
	updateLoadedState() {
		this.loaded = false;
		if (this.rightX()>=Camera.leftPx()&&this.leftX()<=Camera.rightPx()) {
			if (this.bottomY()>=Camera.topPx()&&this.topY()<=Camera.bottomPx()) {
				this.loaded = true;
			}
		}
	}
}

var DrawableClassList = [];
function callOnAllClasses (method) {
	for (var i in DrawableClassList) {
		DrawableClassList[i].callForAll(method);
	}
}


function loadScripts() {
	$.getScript("scripts/animation.js", function() {
		$.getScript("scripts/controls.js", function() {
			$.getScript("scripts/classes.js", initGame);
		});
	});
}

var LevelDir = ["TestLevel","1st Platformy Level","SMB1-1","Dungeon-0"];

function clearViewLock() {
	viewLock = false;
	viewAction();
	viewAction = function() {};
	G$("UserActionView").hide();
}

//Game Functions

function addPlayer(number) {
	var sheet = [Bluesheet,Redsheet][number];
	var button = Player.respawnButtons[number];
	var coords = [[Level.player1SpawnX,Level.player1SpawnY],[Level.player2SpawnX,Level.player2SpawnY]][number];
	var player = Player.create(coords[0],coords[1],19,44,38,4,multiplayer?sheet:DoodlemanSpritesheet,number,new Ctrl(Player.keyCtrls[number]));
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
		PaintMinion.create(Level.width/4+(isEven(wave)?Level.width/2:0),0);
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
			if (!multiplayer) PaintMinion.create(Level.width*3/4,30);
			break;
		case 1: //dungeon mode
			G$("GameModeToggle").text = "Dungeon Mode";

			break;
	}
}

/* WHAT NEEDS TO GO DOWN:
-update the game with a tick first
-then do window.requestAnimationFrame on the canvas to draw with frameskip
-first draw gray and BG
-then draw all tints
-then draw all objects
-then draw hearts and in-game hud
-then draw main hud and gui elements
-then draw debug and outlines
*/

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

		CollisionCache.checkRequests();
		Box.callForAll("update");
		PhysicsBox.runPhysics();
		Line.callForAll("update");
		Particle.callForAll("update");

		Camera.update();
		Sectors.update();

		Garbage.clear();
	}
	GuiElement.callForAll("update");
	//DevTools Line Maker
	if (LineMaker.x&&(!G$("DevPencil").on||G$("DevEraser").on||!devEnabled)) LineMaker.clear();
	//prepare keyboard for next frame
	for (var i in Key.controlObjs) Key.controlObjs[i].justReleasedButtons = {};
	//begin drawing
	if (focused) window.requestAnimationFrame(drawGame);
}

function drawGame(preventAnimTick) {
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
	c.fillRect(0,0,Level.width,Level.height);
	if (Level.bgType=="name"&&Level.bgName!="none") ImageFactory.drawImagePattern(Level.bgName,0,0,Level.width,Level.height,Level.bgScale);
	else if (Level.bgType=="raw") ImageFactory.drawImagePattern("BG-LevelRaw",0,0,Level.width,Level.height,Level.bgScale);
	//objects and elements
	callOnAllClasses("drawTint");
	for (var layer = -2; layer<4; layer++) { //layers: -2: bg stuff -1: doors and other bg sprites, 0:ground and lines, 1: entities, 2: players 3: particles
		for (var i in DrawableClassList) {
			var all = DrawableClassList[i].getAll();
			for (var j in all) {
				if (layer==all[j].drawLayer) all[j].draw(preventAnimTick);
			}
		}
	}
	//in game debug and elements
	callOnAllClasses("drawElements");
	if (devEnabled) callOnAllClasses("drawDebug");
	//devTool eraser highlight
	if (G$("DevEraser").on&&devEnabled) {
		var type = G$("DevSpawnPM").on?0:1;
		var thing = findTopThing(Pointer.camX(),Pointer.camY(),type);
		if (thing) thing.drawHighlighted();
	}
	if (devEnabled) for (var i in Sectors.grid) {
		Sectors.grid[i].drawDebug();
	}
	//devTool line maker
	if (G$("DevPencil").on&&!G$("DevEraser").on&&LineMaker.x!=null) LineMaker.draw();
	//untranslate
	c.restore();
	//draw dev camera view
	if (devEnabled) {
		var allP = Player.getAll();
		c.strokeStyle = "turquoise";
		c.lineWidth = 1;
		if (allP.length==1) c.strokeRect(Level.horScrollBuffer,Level.vertScrollBuffer,hudWidth-2*Level.horScrollBuffer,hudHeight-2*Level.vertScrollBuffer);
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
	Tap.draw();
	if (focused&&Tap.touches.length==0) Pointer.draw();
	//debug hud
	if (devEnabled&&!viewLock) {
		c.fillStyle = "black";
		c.font = "12px Consolas";
		c.fillText("("+Pointer.camX()+","+Pointer.camY()+")",Pointer.x,Pointer.y+12);
		var textGroup = [], allPlayers = Player.getAll();
		for (var i in allPlayers) textGroup.push(allPlayers[i].slot+1+"XY: "+allPlayers[i].x+", "+allPlayers[i].y);
		textGroup.push("LastPressedKey: "+keyText,"LastPressedButton: "+buttonText,"Entities: "+Entity.getAll().length,"Misc: "+hudText);
		var textY = 42+(24*(allPlayers.length-1));
		for (var i in textGroup) c.fillText(textGroup[i],10,textY+(14*i));
	}

	//normalPixels
	c.restore();
}
function redrawFrame() {
	drawGame(true);
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
		if (controller.type=="gamepad") slot = Player.gpIndices.indexOf(controller.gamepadIndex);
		else if (controller.type=="keyboard") {
			slot = controller.ready("pause-p1")?0:1;
			controller.use("pause-p"+(slot+1));
		}
		pauseGame(!paused,slot!=-1?slot:null);
		controller.use("pause");
	}
	if (controller.type=="keyboard") {
		if (controller.ready("snippet")) {
			controller.use("snippet")
			var code = prompt("Run code snippet:");
			eval(code);
		}
	}
	if (controller.ready("showInfo")) {
		devEnabled = !devEnabled;
		if (!paused&&devEnabled) G$("DevTools").show();
		else G$("DevTools").hide();
		controller.use("showInfo");
	}
	else {
		if (!multiplayer&&controller.ready("respawn")) { PhysicsBox.callForAll("respawn"); controller.use("respawn"); }
		if (devEnabled&&controller.type=="keyboard") {
			if (controller.pressed("camRotateCW")) myAngle += 0.01;
			if (controller.pressed("camRotateCCW")) myAngle -= 0.01;
			if (controller.pressed("camLeft")) Camera.x -= 5;
			if (controller.pressed("camRight")) Camera.x += 5;
			if (controller.pressed("camDown")) Camera.y += 5;
			if (controller.pressed("camUp")) Camera.y -= 5;
			if (controller.pressed("camZoomIn")) Camera.zoom += 0.01;
			if (controller.pressed("camZoomOut")) Camera.zoom -= 0.01;
			if (controller.pressed("camReset")) {
				myAngle = 0;
				Camera.reset();
			}
			if (Camera.zoom<0) Camera.zoom = 0;
		}
	}
	if (controller.type=="gamepad") {
		var moveX = controller.getValue("pointerMoveX"), moveY = controller.getValue("pointerMoveY"), moved = false;
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
	if (devEnabled&&!found&&!paused) {
		if (!G$("DevEraser").on) {
			if (G$("DevSpawnPM").on) addPM(Pointer.camX(),Pointer.camY());
			else if (G$("DevPencil").on) LineMaker.input(Pointer.camX(),Pointer.camY());
		}
		else {
			var type = G$("DevSpawnPM").on?0:1;
			var thing = findTopThing(Pointer.camX(),Pointer.camY(),type);
			if (thing) {
				Particle.generate(Pointer.camX(),Pointer.camY(),0,15,5,30,false,type==0?"#6a00d8":thing.stroke,-90,45,8,2);
				thing.remove();
			}
		}
	}
	Pointer.move(Pointer.x,Pointer.y);
}

function loadLevel(file) {
	var newLevel = {spawns:[]};
	var lines = file.split("\r\n");
	if (lines[0]==file) lines = file.split("\n");
	if (lines[0]==file) lines = file.split("\r");

	var doSpawnList = false;
	for (var i in lines) {
		var line = lines[i].split(":");
		if (line.length>2) return console.log("Failed to load level file @line: "+i),false;
		var name = line[0];
		var data = line[1];
		var endChar = lines[i].charAt(lines[i].length-1);
		if (doSpawnList==true) {
			if (endChar=="]") doSpawnList = false;
			else newLevel.spawns.push(name+'.create('+data+');');
		}
		else {
			switch(name) {
				//Single String
				case "name":
				case "bgType":
				case "bgName":
				case "bgRaw":
					newLevel[name] = data;
					break;
				//dimension pair
				case "dimensions":
					newLevel.width = parseInt(data.split("x")[0]);
					newLevel.height = parseInt(data.split("x")[1]);
					break;
				//Coordinate Pair
				case "player1Spawn":
				case "player2Spawn":
				case "camStart":
					newLevel[name+"X"] = parseInt(data.split(",")[0]);
					newLevel[name+"Y"] = parseInt(data.split(",")[1]);
					break;
				//spawnlist
				case "spawns":
					if (endChar=="[") doSpawnList = true;
					else return console.log("Failed to load level file @line: "+i),false;
					break;
				//Single Number
				case "zoomScale":
				case "horScrollBuffer":
				case "vertScrollBuffer":
				case "minZoom":
				case "bgScale":
					newLevel[name] = parseFloat(data);
					break;
				//blank
				case "":
					break;
				default:
					console.log("unknown tag line: "+name);
			}
		}
	}
	if (doSpawnList) return console.log("Failed to load level file @line: "+i),false;
	pauseGame(true);
	Box.killAll();
	Line.killAll();
	Garbage.clear();
	Sectors.grid = {};
	Level = clone(BlankLevel);
	for (var p in newLevel) if (p!="spawns") Level[p] = newLevel[p];
	for (var i in newLevel.spawns) eval(newLevel.spawns[i]);
	if (Level.bgRaw!="") ImageFactory.initImageB64("BG-LevelRaw",Level.bgRaw);
	Camera.reset();
	addPlayer(0);
	if (multiplayer) addPlayer(1);
	G$("LevelSelectView").hide();
	if (focused) pauseGame(false);
	return true;
}
function loadLevelB64(b64) {
	if (loadLevel(atob(b64))) console.log("Loaded Level from Base64");
	else console.log("Failed to load Level from Base64");
}
function openLocalFile() {
	$("#fileInput").click();
}
function loadLocalFile(event) {
	if (window.File&&window.FileReader&&window.FileList&&window.Blob) {
		var file = event.target.files[0];
		if (file) {
			var reader = new FileReader;
			reader.onload = function(e) {
				var fileType = file.name.split(".").pop();
				if (fileType=="dmlf") {
					if (loadLevel(e.target.result)) console.log('Loaded Level "'+file.name+'" from local file');
					else console.log('Failed to load Level "'+file.name+'" from local file');
				}
				else alert("Not the right file type!");
			}
			reader.readAsText(file);
		}
		else alert("No file selected.");
	}
	else alert("Unsupported browser.");
}

function findTopThing(x,y,type) {
	var allEnem = Enemy.getAll(), allSl = SolidLine.getAll();
	for (var i in allEnem) {
		if (allEnem[i].containsPoint(x,y)&&type==0) return allEnem[i];
	}
	for (var i in allSl) {
		if (allSl[i].hitbox.containsPoint(x,y)&&type==1) {
			var lx = allSl[i].valueAt(y,'y');
			var ly = allSl[i].valueAt(x,'x');
			var diffX = Math.abs(x-lx);
			var diffY = Math.abs(y-ly);
			var slope = Math.abs(allSl[i].slope());
			if ((slope=="vertical tangent"||slope>50)&&diffX<15) return allSl[i];
			if (diffY<15) return allSl[i];
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
	$("#fileInput").on("change",loadLocalFile);
	$(window).on("resize",function() {
		fullScreen = getPrefixedProperty(document,"fullscreenElement") || getPrefixedProperty(document,"fullScreenElement");
		G$("FSToggle").on = fullScreen;
		G$("FSToggle").toggleState = fullScreen?1:0;
		if (fullScreen) {
			calcedWidth = window.innerWidth/hudWidth;
			calcedHeight = window.innerHeight/hudHeight;
			var res = Math.round(Math.max(calcedWidth,calcedHeight));
			if (res<1) res = 1;
			screenSize(res);
			if (calcedWidth>=calcedHeight) $(canvas).css({height: '100%', width:'auto'});
			if (calcedHeight>=calcedWidth) $(canvas).css({width: '100%', height:'auto'});
			redrawFrame();
		}
		else {
			screenSize(1);
			$(canvas).css({width: 'auto', height: 'auto'});
			redrawFrame();
		}
	});
	$(window).on("blur",function() {
		focused = false;
		G$("PauseFocusMsg").show();
		$(canvas).css({cursor: 'auto'});
		pauseGame(true);
		window.requestAnimationFrame(redrawFrame);
	});
	$(window).on("focus",function() {
		focused = true;
		G$("PauseFocusMsg").hide();
		$(canvas).css({cursor: 'none'});
	});
}
function addGui() {
	View.create("Hud",0,0,0,Level.width,hudHeight).show();
	Button.create("RespawnP1Button","Hud",hudWidth/2-50,50,100,40,"Respawn").setOnClick(function() {
		addPlayer(0);
	});
	Button.create("AddP1Button","Hud",hudWidth/2-110,50,100,40,"P1 Start").setOnClick(function() {
		addPlayer(0);
	});
	Button.create("AddP2Button","Hud",hudWidth/2+10,50,100,40,"P2 Start").setOnClick(function() {
		addPlayer(1);
	});
	Button.create("PauseButton","Hud",hudWidth-60,10,50,50).setOnClick(function() {
		pauseGame(true);
	}).setIcon("GUI-Icons",0,0,42,4).show();

	View.create("PauseMenu",0,0,0,hudWidth,hudHeight,"tint","black");
	TextElement.create("PauseText","PauseMenu",hudWidth/2,hudHeight/2,"Paused","Proxima Nova",60,true,"yellow",CENTER,true,"darkOrange",5,true,"orange",3,8).show();
	TextElement.create("PauseFocusMsg","PauseMenu",hudWidth/2,hudHeight/2+55,"Click to focus","Proxima Nova",30,false,"#ff6f6b",CENTER,false,"#ad2f2b",3,true,"#ad2f2b",3,8);
	Button.create("PauseClose","PauseMenu",hudWidth-60,10,50,50).setOnClick(function() {
		pauseGame(false);
	}).setIcon("GUI-Icons",1,0,42,4).show();
	Button.create("MultiJumpToggle","PauseMenu",20,hudHeight-120,130,40,"MultiJump").setOnClick(function() {
		this.on = !this.on;
		Player.prototype.multiJump = this.on;
	}).show();
	Button.create("LevelSelectButton","PauseMenu",20,hudHeight-60,130,40,"Level Select").setOnClick(function() {
		G$("LevelSelectView").show();
		G$("PauseMenu").hide();
	}).show().setPressDelay(1);
	Button.create("GameModeToggle","PauseMenu",hudWidth-150,hudHeight-60,130,40,"Sandbox Mode").setOnClick(function(ctrl) {
		setGameMode(gameMode+1);
	}).show();
	Button.create("MPToggle","PauseMenu",hudWidth-150,hudHeight-120,130,40,"Singleplayer").setOnClick(function(ctrl) {
		multiplayer = !multiplayer;
		G$("MPToggle").text = multiplayer?"Multiplayer":"Singleplayer";
		if (multiplayer) {
			G$("RespawnP1Button").hide();
			for (var i in Player.slots) {
				if (!Player.respawnButtons[i]) continue;
				if (!Player.slots[i]) Player.respawnButtons[i].show();
				else Player.respawnButtons[i].hide();
			}
		}
		else {
			for (var i in Player.slots) if (Player.respawnButtons[i]) Player.respawnButtons[i].hide();
			if (!Player.slots[0]) G$("RespawnP1Button").show();
			else G$("RespawnP1Button").hide();
		}
	}).show();
	Button.create("FSToggle","PauseMenu",hudWidth-130,10,50,50).setToggle(function() {
		callPrefixedFunction(canvas,"requestFullscreen");
		callPrefixedFunction(canvas,"requestFullScreen");
	}, function() {
			callPrefixedFunction(document,"exitFullscreen");
			callPrefixedFunction(document,"exitFullScreen");
	},true).setIcon("GUI-Icons",2,0,42,4).show();
	Button.create("CtrlSettingsButton","PauseMenu",10,10,50,50,"Controller Settings").setOnClick(function() {
		G$("CtrlSettingsView").show();
		G$("PauseMenu").hide();
	}).setIcon("GUI-Icons",3,1,42,4);//.show();
	TextElement.create("UserInfo","PauseMenu",hudWidth/2,hudHeight-30,"Logged in as "+User.name,"Proxima Nova",15,false,"white",CENTER)//.show();
	Button.create("LoginoutButton","PauseMenu",hudWidth/2-50,hudHeight-20,100,15,User.loggedIn?"Logout":"Login").setOnClick(function() {
		User.useLink();
	})//.show();

	View.create("CtrlSettingsView",1,0,0,hudWidth,hudHeight,"tint","black");
	TextElement.create("CtrlSettingsText","CtrlSettingsView",hudWidth/2,30,"Controller Settings","Proxima Nova",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();
	Button.create("CtrlSettingsClose","CtrlSettingsView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("CtrlSettingsView").hide();
		G$("PauseMenu").show();
	}).setIcon("GUI-Icons",3,0,42,4).setClose(true).show();
	TextElement.create("CtrlP1","CtrlSettingsView",hudWidth/3,80,"Player 1","Proxima Nova",20,false,"white",CENTER,true,"gray",5,false).show();
	TextElement.create("CtrlP2","CtrlSettingsView",hudWidth*2/3,80,"Player 2","Proxima Nova",20,false,"white",CENTER,true,"gray",5,false).show();
	Button.create("CtrlP1Keyboard","CtrlSettingsView",hudWidth/3-100,130,200,40,"Keyboard").setOnViewShown(function() {
		this.text = getCtrlDisplayName(Player.keyCtrls[0],"keyboard");
		this.playerSlot = 0;
	}).setOnClick(function() {
		createControllerChooserGUI([wasd,ijkl],"keyboard",this);
	}).show();
	Button.create("CtrlP1GamePad","CtrlSettingsView",hudWidth/3-100,180,200,40,"GamePad").setOnViewShown(function() {
		var globalGPCtrl = Player.globalGPCtrls[0];
		if (globalGPCtrl) this.text = globalGPCtrl.gamepadName;
		else this.text = "None";
	}).show();
	Button.create("CtrlP1Touch","CtrlSettingsView",hudWidth/3-100,230,200,40,"Touch Controls").setOnViewShown(function() {
		this.text = Player.usesTouch[0]?"Touch Controls":"None";
	}).show();

	View.create("CtrlChooser",2,15,15,hudWidth-30,hudHeight-30,"window");

	View.create("UserActionView",1,15,15,hudWidth-30,hudHeight-30,"window");
	TextElement.create("UAVText","UserActionView",hudWidth/2,hudHeight/2,"Press any key or click the screen to continue.","Proxima Nova",30,true,"white",CENTER,true,"gray",5,true,"black",3,8).show();

	View.create("MapperView",1,15,15,hudWidth-30,hudHeight-30,"window");
	ImgElement.create("MapperImg","MapperView",hudWidth/2,hudHeight/2,"GUI-Controller",640,360).show();
	TextElement.create("MapperText","MapperView",hudWidth/2,hudHeight-90,"Press buttons to map.","Proxima Nova",30,false,"white",CENTER,false,null,null,true,"black",3,8).show();
	Button.create("MapperClose","MapperView",hudWidth-100,20,80,50,"Cancel").setOnClick(function() {
		G$("MapperView").hide();
	}).setClose(true).show();

	View.create("DevTools",0,hudWidth-70,70,70,210,"tint","lightBlue");
	var setOn = function() {
		this.on = !this.on;
		for (var i in this.view.children) {
			if (this.view.children[i]!=this) this.view.children[i].on = false;
		}
		if (G$("DevPencil").on) Pointer.cursor = "pencil";
		else Pointer.cursor = "crosshair";
	}
	Button.create("DevSpawnPM","DevTools",hudWidth-60,80,50,50).setOnClick(setOn).setIcon("GUI-Icons",0,1,42,4).show();
	Button.create("DevPencil","DevTools",hudWidth-60,150,50,50).setOnClick(setOn).setIcon("GUI-Icons",1,1,42,4).show();
	Button.create("DevEraser","DevTools",hudWidth-60,220,50,50).setOnClick(function(){
		if (this.on) this.on = false;
		else if (G$("DevSpawnPM").on||G$("DevPencil").on) this.on = true;
		Pointer.cursor = this.on?"eraser":(G$("DevPencil").on?"pencil":"crosshair");
	}).setIcon("GUI-Icons",2,1,42,4).show();

	View.create("LevelSelectView",1,0,0,hudWidth,hudHeight,"tint","black");
	Button.create("LSClose","LevelSelectView",hudWidth-60,10,50,50).setOnClick(function() {
		G$("LevelSelectView").hide();
		G$("PauseMenu").show();
	}).setIcon("GUI-Icons",3,0,42,4).setClose(true).show();
	TextElement.create("LSText","LevelSelectView",hudWidth/2,30,"Select a level","Proxima Nova",30,false,"white",CENTER,true,"gray",5,true,"black",3,8).show();
	for (var i in LevelDir) {
		var name = LevelDir[i];
		var y = Math.floor(i/2);
		var x = i%2==0?20:240;
		Button.create("LS"+name,"LevelSelectView",x,50+y*60,200,40,name).setOnClick(function() {
			$.get("levels/"+this.text+".dmlf",function(data) {
				loadLevel(data);
			});
		}).show();
	}
	Button.create("LSFileButton","LevelSelectView",hudWidth-170,hudHeight-60,150,40,"Load From File").setOnClick(openLocalFile,true).show().setPressDelay(1);
}

function getCtrlDisplayName(obj,type) {
	if (obj!=null&&typeof obj=="object") {
		switch(type) {
			case "keyboard":
				return obj.name;
				break;
			case "gamepad":
				return obj.gamepad().id.split("(")[0].trim();
				break;
			case "touch":
				return "Touch Controls";
		}
	}
	return "None";
}

function createControllerChooserGUI(list,type,sourceButton) {
	var finalList = [];
	for (var i in list) {
		switch (type) {
			case "keyboard":
				if (Player.keyCtrls.indexOf(list[i])==-1 || list[i]==Player.keyCtrls[sourceButton.playerSlot]) {
					finalList.push(list[i]);
				}
				break;
		}
	}
	finalList.push("None");
	G$("CtrlChooser").show();
	for (var i in finalList) {
		Button.create("ctrlChooser::"+i+"::"+type,"CtrlChooser",30,30+50*i,200,40,getCtrlDisplayName(finalList[i],type)).setOnClick(function() {
			var resultCtrl = finalList[this.name.split("::")[1]];
			var type = this.name.split("::")[2];
			sourceButton.text = getCtrlDisplayName(resultCtrl,type);
			changeControlSlots(type,sourceButton.playerSlot,resultCtrl);
			G$("CtrlChooserClose").onClickFunction();
		}).show();
	}
	Button.create("CtrlChooserClose","CtrlChooser",hudWidth-80,30,50,50).setOnClick(function() {
		var view = G$("CtrlChooser");
		for (var i in view.children) view.children[i].remove();
		view.children = [];
		view.hide();
	}).setIcon("GUI-Icons",3,0,42,4).setClose(true).show();
}

function changeControlSlots(type,slot,ctrl) {
	switch(type) {
		case "keyboard":
			Player.keyCtrls[slot] = ctrl=="None"?null:ctrl;
			break;
		case "touch":
			Player.usesTouch[slot] = ctrl=="None"?false:true;
			break;
	}
}

function G$(query) {
	var v = View.getAll(), g = GuiElement.getAll();
	for (var i in v) {
		if (v[i].name==query) return v[i];
	}
	for (var i in g) {
		if (g[i].name==query) return g[i];
	}
}
G$.hide = function(q) { return this(q).hide(); }
G$.show = function(q) { return this(q).show(); }
G$.on = function(q) {
	var g = this(q);
	if (g instanceof GuiElement) {
		return g.on;
	}
}


var calcedHeight, calcedWidth;
function initGame() {
	//canvas stuff
	canvas = $("#paper")[0], c = canvas.getContext("2d");
	setPrefixedProperty(c,"imageSmoothingEnabled",false);
	output = $("#output");
	output.hide();
	//event listeners
	addEvents();
	//toolongtago//set up gui objects
	addGui();
	//some other stuff
	globalKeyboard = new Ctrl(globalKeyboardMap);
	keyboardDetector = new Ctrl(keyboardDetectorMap);
	Player.respawnButtons = [G$("AddP1Button"),G$("AddP2Button"),null,null];
	//set up physical objects
	addPlayer(0);
	//start game
	setGameSpeed(gameSpeed);
}
$(document).ready(loadScripts);
