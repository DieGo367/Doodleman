var Key = {
	pressedKeys: [],
	ctrls: [],
	isDown: function(keyCode) {
		return this.pressedKeys[keyCode];
	},
	onKeydown: function(event) {
		this.pressedKeys[event.keyCode] = true;
		for (var i in this.ctrls) {
			if (this.ctrls[i].contains(event.keyCode)) this.ctrls[i].setTimestamp();
		}
	},
	onKeyup: function(event) {
		delete this.pressedKeys[event.keyCode];
		for (var i in this.ctrls) this.ctrls[i].clear(event.keyCode);
	},
	ctrlButtonValue: function(id,ctrl) {
		return Key.isDown(id)?1:0;
	},
	ctrlAnalogValue: function(id,mode,sign,ctrl) {
		return 0;
	}
};
var GamePad = {
	controllers: [],
	ctrlMaps: [],
	snapshots: [],
	ctrls: [],
	haveEvents: true,
	connect: function(gp) {
		if (gp.timestamp==0) return;
		this.controllers[gp.index] = gp;
		this.controllers[gp.index].detected = true;
		this.ctrlMaps[gp.index] = gpad;

		for (var i = 0; i < 4; i++) {
			if (Player.gpIds[i]==null) {
				changeControlSlots("gamepad",i,gp.index);
				console.log("Connected Gamepad "+gp.index+" to slot "+i+": "+gp.id);
				break;
			}
		}
	},
	disconnect: function(gp) {
		delete this.controllers[gp.index];
		delete this.snapshots[gp.index];
		delete this.ctrlMaps[gp.index];
		var slot = Player.gpIds.indexOf(gp.index);
		if (slot!=-1) {
			changeControlSlots("gamepad",slot,"None");
			console.log("Disconnected Gamepad "+gp.index+" from slot "+slot+": "+gp.id);
		}
	},
	scanGamepads: function() {
		var gamepads = navigator.getGamepads?navigator.getGamepads():(navigator.webkitGetGamepads?navigator.webkitGetGamepads():[]);
		for (var i in this.controllers) this.controllers[i].detected = false;
		for (var i in gamepads) {
			if (gamepads[i]&&gamepads[i].index!=null) {
				if (gamepads[i].index in this.controllers) {
					this.controllers[gamepads[i].index] = gamepads[i];
					this.controllers[gamepads[i].index].detected = true;
				}
				else this.connect(gamepads[i]);
			}
		}
		for (var i in this.controllers) {
			if (!this.controllers[i].detected) this.disconnect(this.controllers[i]);
		}
	},
	buttonPressed: function(b) {
		if (typeof(b)=="object") return b.pressed;
		return b == 1.0;
	},
	checkButtons: function() {
		if (!this.haveEvents) this.scanGamepads();
		for (var i in this.ctrls) this.ctrls[i].justReleasedButtons = {};
		for (var i in this.controllers) {
			if (!this.controllers[i]) continue;
			var gp = this.controllers[i];
			var snap = this.snapshots[gp.index];
			if (snap) {
					for (var j in gp.buttons) {
						newState = this.buttonPressed(gp.buttons[j])
						oldState = this.buttonPressed(snap.buttons[j]);
						if (newState!=oldState) {
							if (j==0) hudText+=0.5;
							if (newState) { //Pressed a button
								buttonText = j;
								for (var k in this.ctrls) {
									if (this.ctrls[k].gamepadIndex&&this.ctrls[k].contains(j)) this.ctrls[k].setTimestamp();
								}
							}
							else if (oldState) { //Released button
								for (var k in this.ctrls) this.ctrls[k].clear(j);
							}
						}
						this.snapshots[gp.index].buttons[j] = newState;
					}
					for (var j in gp.axes) {
						newState = gp.axes[j];
						oldState = snap.axes[j];
						if (newState!=oldState) {
							for (var k in this.ctrls) {
								if (this.ctrls[k].gamepadIndex&&this.ctrls[k].contains(j,true)) this.ctrls[k].setTimestamp();
							}
						}
						this.snapshots[gp.index].axes[j] = newState;
					}

			}
			else {
				if (gp.buttons&&gp.axes) {
					this.snapshots[gp.index] = { buttons: clone(gp.buttons), axes: clone(gp.axes) };
				}
			}
		}
	},
	ctrlButtonValue: function(id,ctrl) {
		var gp = ctrl.gamepad();
		if (gp==null) return false;
		var button = gp.buttons[id];
		if (typeof button=="object") return button.value;
		else return button;
	},
	ctrlAnalogValue: function(id,mode,sign,ctrl) {
		var gp = ctrl.gamepad();
		if (gp==null) return false;
		switch(mode) {
			case 'a':
				return Math.max(0,(sign=="+"?1:-1)*gp.axes[id]);
			case 'h':
			case 'f':
				return gp.axes[id];
		}
	},
	slotsFilled: function() {
		var slots = [];
		for (var i = 0; i < 4; i++) {
			if (this.controllers[i]) slots.push(i);
		}
		return slots;
	}
};
var Tap = {
	active: false,
	ctrls: [],
	touches: [],
	targetTouch: null,
	buttons: [],
	analogs: [],
	checkTouches: function() {
		if (!G$("Hud").visible||!this.active) return;
		for (var i in this.analogs) this.analogs[i].update();
		for (var i in this.buttons) this.buttons[i].update();
	},
	getTouchById: function (id) {
		for (var i in this.touches) if (this.touches[i].id==id) return this.touches[i];
	},
	draw: function() {
		if (!G$("Hud").visible||!this.active) return;
		c.globalAlpha = 0.5;
		for (var i in this.analogs) this.analogs[i].draw();
		for (var i in this.buttons) this.buttons[i].draw();
		c.globalAlpha = 1;
	},
	handler: function(event,check) {
		event.preventDefault();
		this.active = true;
		for (var i in this.ctrls) this.ctrls[i].setTimestamp();
		var touches = event.originalEvent.touches;
		var newTouches = [];
		var rect = canvas.getBoundingClientRect();
		for (var i = 0; i < touches.length; i++) {
			if (fullScreen) {
				var scale = Math.min(widthScale,heightScale);
				var x = px((touches[i].clientX-rect.left)/scale*dp(1)), y = px((touches[i].clientY-rect.top)/scale*dp(1));
			}
			else var x = px(touches[i].clientX-rect.left), y = px(touches[i].clientY-rect.top);
			var oldTouch = this.getTouchById(touches[i].identifier);
			newTouch = {x: x, y: y, id:touches[i].identifier};
			newTouches.push(newTouch);
			if (check&&!oldTouch) this.handleStart(newTouch,x,y);
		}
		this.touches = newTouches;
	},
	handleStart: function(touch,x,y) {
		var targeted = false;
		for (var j in this.buttons) {
			if (this.buttons[j].checkTap(x,y)) {
				this.buttons[j].targetTouch = touch.id;
				targeted = true;
				break;
			}
		}
		if (!targeted) for (var j in this.analogs) {
			if (this.analogs[j].checkTap(x,y)) {
				this.analogs[j].targetTouch = touch.id;
				targeted = true;
				break;
			}
		}
	},
	handleEnd: function(event) {
		var touches = event.originalEvent.touches;
		for (var i in touches) {
			for (var j in this.touches) {
				if (this.touches[j].id==touches[i].identifier) this.touches[j].found = true;
			}
		}
		var deleted = [];
		for (var i in this.touches) {
			if (!this.touches[i].found) {
				for (var j in this.buttons) {
					if (this.buttons[j].targetTouch==this.touches[i].id) this.buttons[j].targetTouch = null;
				}
				for (var j in this.analogs) {
					if (this.analogs[j].targetTouch==this.touches[i].id) this.analogs[j].targetTouch = null;
				}
				Pointer.move(this.touches[i].x,this.touches[i].y);
				click(Pointer);
				deleted.push(this.touches[i]);
			}
		}
		for (var i in deleted) {
			this.touches.splice(this.touches.indexOf(deleted[i]),1);
		}
		for (var i in this.touches) delete this.touches[i].found;
	},
	ctrlButtonValue: function(id,ctrl) {
		return this.buttons[id].pressed?1:0;
	},
	ctrlAnalogValue: function(id,mode,sign,ctrl) {
		var tilt = ["tiltX","tiltY"][id%2];
		var analog = this.analogs[Math.floor(id/2)];
		var rawVal = analog[tilt];
		if (tilt=="tiltY") rawVal /= analog.sense[id%2];
		switch(mode) {
			case 'a':
				return Math.max(0,(sign=="+"?1:-1)*rawVal);
			case 'h':
			case 'f':
				return rawVal;
		}
	}
};

var TouchAnalog = class TouchAnalog {
	constructor(x,y,radius,senseX,senseY,id) {
		this.x = x;
		this.y = y;
		this.r = radius;
		this.id = id;
		this.tiltX = 0;
		this.tiltY = 0;
		this.sense = [senseX,senseY];
		this.targetTouch = null;
	}
	checkTap(x,y) {
		if (x>=this.x-this.r*2&&x<=this.x+this.r*2) {
			if (y>=this.y-this.r*2&&y<=this.y+this.r*2) {
				return true;
			}
		}
		return false;
	}
	update() {
		var touch = Tap.getTouchById(this.targetTouch);
		if (touch&&touch.x&&touch.y) {
			var x = Math.round(touch.x-this.x), y = Math.round(touch.y-this.y);
			var angle = Math.atan2(y,x);
			var dist = Math.sqrt(Math.pow(x,2)+Math.pow(y,2));
			if (dist>this.r) dist = 1;
			else dist = dist/this.r;
			this.tiltX = Math.cos(angle)*dist;
			this.tiltY = Math.sin(angle)*dist;
		}
		else {
			this.tiltX = this.tiltY = 0;
			this.targetTouch = null;
		}
	}
	draw() {
		c.strokeStyle = "darkGray";
		c.lineWidth = 5;
		drawCircle(this.x,this.y,this.r);
		c.fillStyle = "blue";
		c.beginPath();
		c.arc(this.x+this.tiltX*this.r,this.y+this.tiltY*this.r,this.r/2,0,2*Math.PI);
		c.fill();
		c.lineWidth = 1;
	}
}
var TouchButton = class TouchButton {
	constructor(x,y,width,height,slidable,id) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.pressed = false;
		this.slidable = slidable;
		this.id = id;
	}
	checkTap(x,y) {
		if (x>=this.x&&x<=this.x+this.width) {
			if (y>=this.y&&y<=this.y+this.height) {
				return true;
			}
		}
		return false;
	}
	update() {
		if (this.slidable) {
			var touch = Tap.getTouchById(this.targetTouch);
			if (touch&&touch.x&&touch.y) return this.pressed = true;
			else this.targetTouch = null;
		}
		for (var i in Tap.touches) {
			var x = Tap.touches[i].x, y = Tap.touches[i].y;
			if (this.checkTap(x,y)) {
				if (this.slidable&&!this.targetTouch) this.targetTouch = Tap.touches[i].id;
				return this.pressed = true;
			}
		}
		if (this.pressed) for (var i in Tap.ctrls) Tap.ctrls[i].clear(this.id);
		this.pressed = false;
	}
	draw() {
		var x = this.pressed?32:0;
		ImageFactory.drawImage("GUI-TouchButton.png",this.x,this.y,this.width,this.height,x,0,32,32);
		ImageFactory.drawImage("GUI-TouchButton.png",this.x,this.pressed?this.y+2:this.y,this.width,this.height,this.id*32,32,32,32);
	}
}
Tap.analogs[0] = new TouchAnalog(hudWidth/8,hudHeight-hudWidth/8,hudWidth/16,1,1,0);
Tap.buttons[0] = new TouchButton(hudWidth*7/8-35-30,hudHeight-hudWidth/8-35+30,60,60,false,0);
Tap.buttons[1] = new TouchButton(hudWidth*7/8-35+35,hudHeight-hudWidth/8-35-30,60,60,true,1);

var CtrlMap = function(name,type,actions,mappings) {
	this.name = name;
	this.type = type;
	this.actions = actions; //Ex: ["jump","moveRight","crouch","moveLeft","attack"];
	this.mappings = mappings; //Ex: [ 0, 'a0+', 'a1+', 'a0-', 3 ];
};
var Ctrl = class Ctrl {
	constructor(ctrlMap,gamepadIndex) {
		if (ctrlMap==null||ctrlMap=="None") return new NullCtrl();
		this.name = ctrlMap.name;
		this.type = ctrlMap.type;
		if (this.type=="gamepad") {
			if (gamepadIndex!=null) {
				this.gamepadIndex = gamepadIndex;
				this.gamepadName = GamePad.controllers[gamepadIndex].id.split("(")[0].trim();
			}
			else return new NullCtrl();
		}
		this.actions = ctrlMap.actions;
		this.mappings = ctrlMap.mappings;
		this.usedButtons = {};
		this.justReleasedButtons = {};
		this.usedButtonsPaused = {};
		this.justReleasedButtonsPaused = {};
		this.timestamp = Date.now();
		[NullCtrl,Key,GamePad,Tap][["NullCtrl","keyboard","gamepad","touch"].indexOf(ctrlMap.type)].ctrls.push(this);
	}
	getCtrlManager() {
		var typeIndex = ["NullCtrl","keyboard","gamepad","touch"].indexOf(this.type);
		return [NullCtrl,Key,GamePad,Tap][typeIndex];
	}
	id(action) {
		var index = this.actions.indexOf(action);
		if (index==-1) return "none";
		else return this.mappings[index];
	}
	namify(id) {
		var name = "";
		for (var i in id) {
			name = name+id[i].toString();
		}
		return name;
	}
	getValue(action,skip) {
		var id = skip?action:this.id(action);
		if (id=="none") return console.log("Invalid action name: "+action),false;
		var ctrlManager = this.getCtrlManager();
		switch(typeof id) {
			case "number":
				return ctrlManager.ctrlButtonValue(id,this);
			case "string":
				return ctrlManager.ctrlAnalogValue(parseInt(id.charAt(1)),id.charAt(0),id.charAt(2),this);
			case "object":
				var value = 0;
				for (var i in id) {
					value = Math.max(value,this.getValue(id[i],true));
				}
				return value;
			default: return false;
		}
	}
	pressed(action,threshold=0.1,skip=false) {
		var id = skip?action:this.id(action);
		if (id=="none") return console.log("Invalid action name: "+action),false;
		switch(typeof id) {
			case "number":
				return this.getValue(id,true)>threshold;
			case "string":
				var value = this.getValue(id,true);
				var mode = id.charAt(0), sign = id.charAt(2);
				switch(mode) {
					case "a":
					case "f":
						return Math.abs(value)>threshold;
					case "h":
						var requested = [-1,-0.4285714030265808,0.14285719394683838,0.7142857313156128][parseInt(sign)];
						if (Math.abs(requested-value)<0.3) return true;
						if ((requested==1&&value==-1)||(value==1&&requested==-1)) return true;
						return false;
				}
			case "object":
				var value = 0;
				for (var i in id) {
					value = Math.max(value,this.pressed(id[i],threshold,true));
				}
				return value;
			default: return false;
		}
		return false;
	}
	used(action) {
		if (this.id(action)=="none") return console.log("Invalid action name: "+action),false;
		if (typeof this.id(action)=="object") return this.usedButtons["actions-"+action];
		else return this.usedButtons[this.id(action)];
	}
	ready(action) {
		if (this.id(action)=="none") return console.log("Invalid action name: "+action),false;
		if (this.pressed(action)&&!this.used(action)) return true;
		else return false;
	}
	use(action,source) {
		if (this.id(action)=="none") return console.log("Invalid action name: "+action),false;
		if (typeof this.id(action)=="object") this.usedButtons["actions-"+action] = true;
		else this.usedButtons[this.id(action)] = true;
	}
	justReleased(action) {
		if (this.id(action)=="none") return console.log("Invalid action name: "+action),false;
		if (typeof this.id(action)=="object") return this.justReleasedButtons["actions-"+action];
		else return this.justReleasedButtons[this.id(action)];
	}
	clear(id,isAxis) {
		this.usedButtons[id] = false;
		this.justReleasedButtons[id] = true;
		for (var i in this.mappings) {
			var mapping = this.mappings[i];
			if (typeof mapping=="object") { //for all multi-mappings
				for (var j in mapping) {
					if (mapping[j]==id) { //if this button is a part of it
						if (!this.pressed(mapping[j],null,true)) { //and if the mapping is no longer counted, then it's no longer used
							this.usedButtons["actions-"+this.actions[i]] = false;
							this.justReleasedButtons["actions-"+this.actions[i]] = true;
						}
					}
				}
			}
		}
	}
	contains(mapping,checkAnalogs) {
		if (checkAnalogs) {
			var mappingsToCheck = ["a"+mapping+"+","a"+mapping+"-","f"+mapping,"h"+mapping+"0","h"+mapping+"1","h"+mapping+"2","h"+mapping+"3"];
			for (var i in mappingsToCheck) if (this.contains(mappingsToCheck[i])) return true;
		}
		for (var i in this.mappings) {
			if (typeof this.mappings[i]=="object") {
				for (var j in this.mappings[i]) {
					if (mapping==this.mappings[i][j]) return true;
				}
			}
			else if (mapping==this.mappings[i]) return true;
		}
		return false;
	}
	makePausedCache() {
		for (var property in this.usedButtons) this.usedButtonsPaused[property] = this.usedButtons[property];
		for (var property in this.justReleasedButtons) this.justReleasedButtonsPaused[property] = this.justReleasedButtons[property];
	}
	loadPausedCache() {
		for (var property in this.usedButtonsPaused) this.usedButtons[property] = this.usedButtonsPaused[property];
		for (var property in this.justReleasedButtonsPaused) this.justReleasedButtons[property] = this.justReleasedButtonsPaused[property];
	}
	gamepad() {
		if (this.type=="gamepad") return GamePad.controllers[this.gamepadIndex];
		else return void(0);
	}
	setTimestamp() {
		this.timestamp = Date.now();
	}
	selfDestruct() {
		var ctrlManager = this.getCtrlManager();
		ctrlManager.ctrls.splice(ctrlManager.ctrls.indexOf(this),1);
		for (var property in this) delete this[property];
		delete this;
	}
}

var NullCtrl = class NullCtrl extends Ctrl {
	constructor() {
		super({name:"NullCtrl",type:"NullCtrl",actions:[],mappings:[]});
	}
	getValue() { return false; }
	pressed() { return false; }
	used() { return false; }
	ready() { return false; }
	use() {}
	justReleased() { return false; }
}
NullCtrl.ctrls = [];
var nullController = new NullCtrl();
/*Controller mapping documentation
The actions argument is an array that contains all the different actions this controller can have. These strings are what will be passed into things like controller.usable(action);
The mappings argument is an array that contains a matching keycode or button id for every action.
Items may be:
	integers:
		Just put the raw id of the input. Keycodes for the keyboard, Button IDs for gamepads.
	strings:
		For gamepads only. Indicates that we're dealing with an axis.
		These follow the format "x0?":
			'x' is a letter that corresponds to how we should read the axis.
				'a' means just a normal direction on an axis.
				'h' means that this axis is actually a hat switch for the dpad. We're testing for a specific direction.
				'f' means to take the value of the whole axis.
			'0' represents the number of the axis.
			'?' depends on 'x':
				For 'a' this should be a +/- sign indicating which side of the axis we're mapping to.
				For 'h' this should be the button's distance from up. This order goes URDL and 0-3.
					The Controller will check if it's at or near the value associated with that button.
					It will also check for the two diagonals associated with our button.
	arrays:
		lists of buttons that should all map to the same action.
		If at least one of the mapped buttons is pressed, then ctrl.pressed(action) will return true.
		Items are treated the same as any other in mappings.

So that's pretty much it.
*/

var playerActions = ["lookUp","moveRight","crouch","moveLeft","jump","attack"];
var gameActions = ["pause","respawn","showInfo"];
var cameraActions = ["camUp","camRight","camDown","camLeft","camZoomIn","camZoomOut","camRotateCW","camRotateCCW","camReset"];
var pointerActions = ["pointerMoveX","pointerMoveY","click"];

var globalKeyboardMap = new CtrlMap("GlobalKeyboard","keyboard",[...gameActions,...cameraActions,"snippet","pause-p1","pause-p2"],[[82,80],192,220,104,102,101,100,99,97,103,105,98,221,82,80]);
var globalGamepadMap = new CtrlMap("GlobalGamepad","gamepad",[...gameActions,...pointerActions],[9,5,8,'f2','f3',4]);

var globalRSamMap = new CtrlMap("GlobalGPAD-RedSamuraiChrome","gamepad",[...gameActions,...pointerActions],[11,7,10,'f2','f5',6]);

var wasd = new CtrlMap("WASD","keyboard",playerActions,[69,68,83,65,87,71])
var ijkl = new CtrlMap("IJKL","keyboard",playerActions,[79,76,75,74,73,222]);
var dpad = new CtrlMap("DPad","keyboard",playerActions,[[191,96],39,40,37,38,[190,110]]);
var gpad = new CtrlMap("GPAD","gamepad",playerActions,[[12,'a1-'],[15,'a0+'],[13,'a1+'],[14,'a0-'],0,[1,2]]);
var tscr = new CtrlMap("TOUCH","touch",playerActions,['a1-','a0+','a1+','a0-',0,1]);

var rsam = new CtrlMap("GPAD-RedSamuraiChrome","gamepad",playerActions,[['a1-','h90'],['a0+','h91'],['a1+','h92'],['a0-','h93'],0,[3,1]]);


function getCtrlDisplayName(obj,type) {
	if (obj!=null&&(typeof obj=="object"||typeof obj=="number")) {
		switch(type) {
			case "keyboard":
				return obj.name;
				break;
			case "gamepad":
				return GamePad.controllers[obj].id.split("(")[0].trim();
				break;
			case "touch":
				return "Touch Controls";
		}
	}
	return "None";
}

function changeControlSlots(type,slot,ctrl) {
	switch(type) {
		case "keyboard":
			Player.keyMaps[slot] = ctrl=="None"?null:ctrl;
			break;
		case "gamepad":
			if (ctrl=="None") {
				Player.gpIds[slot] = null;
				if (Player.globalGPCtrls[slot]) {
					Player.globalGPCtrls[slot].selfDestruct();
					Player.globalGPCtrls[slot] = null;
				}
				Player.gpMaps[slot] = null;
			}
			else {
				Player.gpIds[slot] = ctrl;
				Player.globalGPCtrls[slot] = new Ctrl(globalGamepadMap,ctrl);
				Player.gpMaps[slot] = gpad;
			}
			break;
		case "touch":
			Player.tapMaps[slot] = ctrl=="None"?null:ctrl;
			break;
	}
	Player.relinkCtrls();
}
