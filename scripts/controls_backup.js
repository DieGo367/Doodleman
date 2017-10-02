var Key = {
	pressedKeys: [],
	ctrls: [],
	isDown: function(keyCode) {
		return this.pressedKeys[keyCode];
	},
	onKeydown: function(event) {
		this.pressedKeys[event.keyCode] = true;
		if (keyboardDetector.pressed("a")) TouchPad.active = false;
	},
	onKeyup: function(event) {
		delete this.pressedKeys[event.keyCode];
		for (var i in this.ctrls) this.ctrls[i].clear(event.keyCode);
	},
	ctrlButtonValue: function(id,ctrl) {
		return Key.isDown(id)?1:0;
	},
	ctrlAnalogValue: function(id,ctrl) {
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
		this.controllers[gp.index] = gp;
		this.controllers[gp.index].detected = true;
		console.log("Connected Gamepad "+gp.index+": "+gp.id);
		if (gp.mapping=="standard") {
			this.ctrlMaps[gp.index] = gpad;
			var slot = Player.gpIndices.indexOf(gp.index);
			Player.globalGPCtrls[slot] = new Ctrl(globalGamepadMap,gp.index);
			Player.gpCtrls[slot] = gpad;
		}
		else {
			this.ctrlMaps[gp.index] = rsam;
			var slot = Player.gpIndices.indexOf(gp.index)
			Player.globalGPCtrls[slot] = new Ctrl(globalRSamMap,gp.index);
			Player.gpCtrls[slot] = rsam;
		}
	},
	disconnect: function(gp) {
		delete this.controllers[gp.index];
		delete this.snapshots[gp.index];
		delete this.ctrlMaps[gp.index];
		Player.globalGPCtrls[Player.gpIndices.indexOf(gp.index)].selfDestruct();
		Player.globalGPCtrls[Player.gpIndices.indexOf(gp.index)] = null;
		console.log("Disonnected Gamepad "+gp.index+": "+gp.id);
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

	},
	ctrlAnalogValue: function(id,ctrl) {

	}
};

var TouchPoints = [];
var targetTouch = null;

var TouchPad = {
	active: false,
	ctrls: [],
	buttons: [],
	analog: {
		x: hudWidth/8,
		y: hudHeight-hudWidth/8,
		r: hudWidth/16,
		tiltX: 0,
		tiltY: 0,
		sense: [0.1,0.5],
		draw: function() {
			c.strokeStyle = "darkGray";
			c.lineWidth = 5;
			drawCircle(this.x,this.y,this.r);
			c.fillStyle = "blue";
			c.beginPath();
			c.arc(this.x+this.tiltX*this.r,this.y+this.tiltY*this.r,20,0,2*Math.PI);
			c.fill();
			c.lineWidth = 1;
		},
		update: function() {
			if (targetTouch!=null) {
				for (var i in TouchPoints) if (TouchPoints[i].id==targetTouch) var touch = TouchPoints[i];
				if (touch&&touch.x&&touch.y) {
					var x = Math.round(touch.x-this.x), y = Math.round(touch.y-this.y);
					var angle = Math.atan2(y,x);
					var dist = Math.sqrt(Math.pow(x,2)+Math.pow(y,2));
					dist = dist/this.r;
					if (dist>1) dist = 1;
					this.tiltX = Math.cos(angle)*dist;
					this.tiltY = Math.sin(angle)*dist;
				}
			}
			else this.tiltX = this.tiltY = 0;
		}
	},
	checkTouches: function() {
		this.analog.update();
		for (var i in this.buttons) this.buttons[i].checkTouch();
	},
	draw: function() {
		if (!G$("Hud").visible||!this.active) return;
		c.globalAlpha = 0.5;
		this.analog.draw();
		for (var i in this.buttons) this.buttons[i].draw();
		c.globalAlpha = 1;
	},
	handler: function(event,checkForAnalog) {
		event.preventDefault();
		TouchPad.active = true;
		var touches = event.originalEvent.touches;
		TouchPoints = [];
		var foundTargetTouch = false;
		var rect = canvas.getBoundingClientRect();
		for (var i = 0; i < touches.length; i++) {
			if (touches[i].identifier==targetTouch) foundTargetTouch = true;
			if (fullScreen) {
				var awkScale = Math.min(calcedWidth,calcedHeight);
				var x = px((touches[i].clientX-rect.left)/awkScale*dp(1)) , y = px((touches[i].clientY-rect.top)/awkScale*dp(1));
			}
			else var x = px(touches[i].clientX-rect.left), y = px(touches[i].clientY-rect.top);
			if (i==0) Pointer.move(x,y);
			TouchPoints.push({x: x, y: y, id:touches[i].identifier});
			if (!targetTouch&&checkForAnalog) {
				if (x<hudHeight/2&&y>hudHeight/2) {
					targetTouch = touches[i].identifier;
					foundTargetTouch = true;
				}
			}
		}
		if (!foundTargetTouch) targetTouch = null;
	},
	ctrlButtonValue: function(id,ctrl) {

	},
	ctrlAnalogValue: function(id,ctrl) {

	}
}

var TouchButton = class TouchButton {
	constructor(x,y,width,height,id) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.pressed = false;
		this.id = id;
	}
	checkTouch() {
		if (G$("Hud").visible) for (var i in TouchPoints) {
			var x = TouchPoints[i].x, y = TouchPoints[i].y;
			if (x>=this.x&&x<=this.x+this.width) {
				if (y>=this.y&&y<=this.y+this.height) {
					return this.pressed = true;
				}
			}
		}
		if (this.pressed) for (var i in TouchPad.ctrls) TouchPad.ctrls[i].clear(this.id);
		this.pressed = false;
	}
	draw() {
		var x = this.pressed?32:0;
		ImageFactory.drawBorderedImage("GUI-Button",this.x,this.y,this.width,this.height,8,16,x,32);
	}
}
TouchPad.buttons[0] = new TouchButton(hudWidth*7/8-25-30,hudHeight-hudWidth/8-25,50,50,0);
TouchPad.buttons[1] = new TouchButton(hudWidth*7/8-25+30,hudHeight-hudWidth/8-25,50,50,1);

var CtrlMap = function(name,type,actions,mappings) {
	this.name = name;
	this.type = type;
	this.actions = actions; //Ex: ["jump","moveRight","crouch","moveLeft","attack"];
	this.mappings = mappings; //Ex: [ 0, 'a0+', 'a1+', 'a0-', 3 ];
};
var Ctrl = class Ctrl {
	constructor(ctrlMap,gamepadIndex) {
		this.name = ctrlMap.name;
		this.type = ctrlMap.type;
		this.actions = ctrlMap.actions;
		this.mappings = ctrlMap.mappings;
		this.usedButtons = {};
		this.justReleasedButtons = {};
		this.usedButtonsPaused = {};
		this.justReleasedButtonsPaused = {};
		this.gamepadIndex = gamepadIndex;
		[Key,GamePad,TouchPad][["keyboard","gamepad","touch"].indexOf(ctrlMap.type)].ctrls.push(this);
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
	pressed(action,skip) {
		if (this.type=="gamepad") {
			var gp = this.gamepad();
			if (gp==null) return false;
		}
		var id = skip?action:this.id(action);
		if (id=="none") return console.log("Invalid action name: "+action),false;
		switch(typeof id) {
			case "number":
				if (this.type=="keyboard") return Key.isDown(id);
				else if (this.type=="gamepad") return GamePad.buttonPressed(gp.buttons[id]);
				else return TouchPad.buttons[id].pressed;
				break;
			case "string":
				if (this.type=="keyboard") return false;
				else switch(id.charAt(0)) {
					case 'a':
						var sign = id.charAt(2);
						if (this.type=="gamepad") {
							if (sign=="+") return gp.axes[parseInt(id.charAt(1))]>0.1;
							else return gp.axes[parseInt(id.charAt(1))]<-0.1;
						}
						else {
							id = parseInt(id.charAt(1));
							if (sign=="+") return TouchPad.analog[id==1?"tiltY":"tiltX"]>TouchPad.analog.sense[id];
							else return TouchPad.analog[id==1?"tiltY":"tiltX"]<-TouchPad.analog.sense[id];
						}
					case 'h':
						if (this.type=="touch") return false;
						var requested = [-1,-0.4285714030265808,0.14285719394683838,0.7142857313156128][parseInt(id.substring(2))];
						var value = gp.axes[parseInt(id.charAt(1))];
						if (Math.abs(requested-value)<0.3) return true;
						if ((requested==1&&value==-1)||(value==1&&requested==-1)) return true;
						else return false;
					case 'f':
						if (this.type=="gamepad") return Math.abs(gp.axes[parseInt(id.charAt(1))])>0.1;
						else return Math.abs(TouchPad.analog[parseInt(id.charAt(1))==1?"tiltY":"tiltX"])>0.1;
					default:
						return false;
				}
			case "object":
				var pressed = false;
				for (var i in id) {
					if (this.pressed(id[i],true)) pressed = true;
				}
				return pressed;
			default: return false;
		}
	}
	getValue(action,skip) {
		if (this.type=="gamepad") {
			var gp = this.gamepad();
			if (gp==null) return false;
		}
		var id = skip?action:this.id(action);
		if (id=="none") return console.log("Invalid action name: "+action),false;
		var typeIndex = ["keyboard","gamepad","touch"].indexOf(this.type);
		var ctrlManager = [Key,GamePad,TouchPad][typeIndex];
		switch(typeof id) {
			case "number":
				ctrlManager.ctrlButtonValue(id,this);
				if (this.type=="keyboard") return (Key.isDown(id)?1:0);
				else if (this.type=="gamepad"){
					var value = gp.buttons[id];
					if (typeof value=="object") return value.value;
					else return value;
				}
				else return TouchPad.buttons[id].pressed;
			case "string":
				ctrlManager.ctrlAnalogValue(id,this);
				if (this.type=="keyboard") return false;
				else switch(id.charAt(0)) {
					case 'a':
						var sign = id.charAt(2);
						if (this.type=="gamepad") {
							if (sign=='+') return Math.min(0,gp.axes[parseInt(id.charAt(1))]);
							else return -Math.max(0,gp.axes[parseInt(id.charAt(1))]);
						}
						else {
							if (sign=='+') return Math.min(0,TouchPad.analog[parseInt(id.charAt(1))==1?"tiltY":"tiltX"]);
							else return -Math.max(0,TouchPad.analog[parseInt(id.charAt(1))==1?"tiltY":"tiltX"]);
						}
					case 'h':
					case 'f':
						if (this.type=="gamepad") return gp.axes[parseInt(id.charAt(1))];
						else return TouchPad.analog[parseInt(id.charAt(1))==1?"tiltY":"tiltX"];
				}
				break;
			case "object":
				var value = 0;
				for (var i in id) {
					value = Math.max(value,this.getValue(id[i],true));
				}
				return value;
			default: return false;
		}
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
						if (!this.pressed(mapping[j],true)) { //and if the mapping is no longer counted, then it's no longer used
							this.usedButtons["actions-"+this.actions[i]] = false;
							this.justReleasedButtons["actions-"+this.actions[i]] = true;
						}
					}
				}
			}
		}
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
	selfDestruct() {
		var ctrlClass = this.type=="gamepad"?GamePad:Key;
		ctrlClass.ctrls.splice(ctrlClass.ctrls.indexOf(this),1);
		for (var property in this) delete this[property];
		delete this;
	}
}
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

var keyboardDetectorMap = new CtrlMap("KeyBoardSwitch","keyboard",["a"],[[69,68,83,65,87,71,82,220]]);

var globalRSamMap = new CtrlMap("GlobalGPAD-RedSamuraiChrome","gamepad",[...gameActions,...pointerActions],[11,7,10,'f2','f5',6]);

var wasd = new CtrlMap("WASD","keyboard",playerActions,[69,68,83,65,87,71])
var ijkl = new CtrlMap("IJKL","keyboard",playerActions,[79,76,75,74,73,222]);
var dpad = new CtrlMap("DPad","keyboard",playerActions,[[191,96],39,40,37,38,[190,110]]);
var gpad = new CtrlMap("GPAD","gamepad",playerActions,[[12,'a1-'],[15,'a0+'],[13,'a1+'],[14,'a0-'],0,[1,2]]);
var tscr = new CtrlMap("TOUCH","touch",playerActions,['a1-','a0+','a1+','a0-',1,0]);

var rsam = new CtrlMap("GPAD-RedSamuraiChrome","gamepad",playerActions,[['a1-','h90'],['a0+','h91'],['a1+','h92'],['a0-','h93'],0,[3,1]]);
