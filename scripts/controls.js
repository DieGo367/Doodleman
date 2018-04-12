var Key = {
	pressedKeys: [],
	ctrls: [],
	isDown: function(keyCode) {
		return this.pressedKeys[keyCode];
	},
	onKeydown: function(event) {
		this.pressedKeys[event.keyCode] = true;
		for (var i in this.ctrls) {
			if (this.ctrls[i].contains(event.keyCode)) {
				this.ctrls[i].setTimestamp();
				this.ctrls[i].updateActionStates(event.keyCode);
			}
		}
	},
	onKeyup: function(event) {
		delete this.pressedKeys[event.keyCode];
		for (var i in this.ctrls) {
			if (this.ctrls[i].contains(event.keyCode)) {
				this.ctrls[i].setTimestamp();
				this.ctrls[i].updateActionStates(event.keyCode);
			}
		}
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
	customMaps: [],
	snapshots: [],
	ctrls: [],
	haveEvents: true,
	connect: function(gp) {
		if (gp.timestamp==0) return;
		this.controllers[gp.index] = gp;
		this.controllers[gp.index].detected = true;
		this.ctrlMaps[gp.index] = gpad;
		gp.name = gp.index + ": " + gp.id.split("(").reverse().slice(1).reverse().join("(").trim(); //remove vendor info and show index

		for (var i = 0; i < 2; i++) {
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
		for (var i in this.ctrls) this.ctrls[i].justReleasedActions = {};
		for (var i in this.controllers) {
			if (!this.controllers[i]) continue;
			var gp = this.controllers[i];
			var snap = this.snapshots[gp.index];
			if (snap) {
				for (var j in gp.buttons) {
					var newState = this.buttonPressed(gp.buttons[j]);
					var oldState = this.buttonPressed(snap.buttons[j]);
					if (newState!=oldState) {
						for (var k in this.ctrls) {
							if (this.ctrls[k].gamepadIndex==gp.index) {
								this.ctrls[k].setTimestamp();
								this.ctrls[k].updateActionStates(j);
							}
						}
					}
					this.snapshots[gp.index].buttons[j] = newState;
				}
				for (var j in gp.axes) {
					var newState = gp.axes[j];
					var oldState = snap.axes[j];
					if (newState!=oldState) {
						for (var k in this.ctrls) {
							if (this.ctrls[k].gamepadIndex==gp.index) {
								this.ctrls[k].setTimestamp();
								this.ctrls[k].updateActionStates('a'+j);
							}
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
	ctrlAnalogValue: function(id,ctrl) {
		var gp = ctrl.gamepad();
		if (gp==null) return false;
		return gp.axes[id];
	},
	slotsFilled: function() {
		var slots = [];
		for (var i = 0; i < this.controllers.length; i++) {
			if (this.controllers[i]) slots.push(i);
		}
		return slots;
	},
	changeMap: function(id,map) {
		if (!map) return;
		var gp = this.controllers[id];
		if (!gp) return console.warn("Invalid id");
		this.ctrlMaps[id] = map;
		for (var i in this.ctrls) {
			var ctrl = this.ctrls[i];
			if (ctrl.gamepad()==gp) {
				ctrl.actions = map.actions;
				ctrl.mappings = map.mappings;
			}
		}
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
	ctrlAnalogValue: function(id,ctrl) {
		var tilt = ["tiltX","tiltY"][id%2];
		var analog = this.analogs[Math.floor(id/2)];
		var rawVal = analog[tilt];
		if (tilt=="tiltY") rawVal /= analog.sense[id%2];
		return rawVal;
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
		// this is now not pressed
		var wasPressed = this.pressed;
		this.pressed = false;
		if (wasPressed) for (var i in Tap.ctrls) Tap.ctrls[i].updateActionStates(this.id);
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

var CtrlMap = function(name,type,inputs,mappings,actions,groups) {
	this.name = name;
	this.type = type;
	this.inputs = inputs; //Ex: ["A","B","Dpad","Up","Down","AnalogL_X","AnalogL_Y"];
	this.mappings = mappings; //Ex: [ 0, 1, 'a9', 13, 14, 'a0', 'a1' ];
	this.actions = actions; //Ex: ["jump","moveRight","crouch"];
	this.groups = groups; //Ex: ["A",["Right","AnalogL_X::+","Dpad::R"],["Down","AnalogL_Y::+","Dpad::D"]];
};
var Ctrl = class Ctrl {
	constructor(ctrlMap,gamepadIndex) {
		if (ctrlMap==null||ctrlMap=="None") return new NullCtrl();
		this.name = ctrlMap.name;
		this.type = ctrlMap.type;
		if (this.type=="gamepad") {
			if (gamepadIndex!=null) {
				this.gamepadIndex = gamepadIndex;
				this.gamepadName = GamePad.controllers[gamepadIndex].name;
			}
			else return new NullCtrl();
		}
		this.inputs = ctrlMap.inputs;
		this.mappings = ctrlMap.mappings;
		this.actions = ctrlMap.actions;
		this.groups = ctrlMap.groups;
		this.usedActions = {};
		this.justReleasedActions = {};
		this.usedActionsPaused = {};
		this.justReleasedActionsPaused = {};
		this.timestamp = Date.now();
		[NullCtrl,Key,GamePad,Tap][["NullCtrl","keyboard","gamepad","touch"].indexOf(ctrlMap.type)].ctrls.push(this);
	}
	getCtrlManager() {
		var typeIndex = ["NullCtrl","keyboard","gamepad","touch"].indexOf(this.type);
		return [NullCtrl,Key,GamePad,Tap][typeIndex];
	}
	getMapping(input) {
		var index = this.inputs.indexOf(input);
		if (index==-1) return;
		else return this.mappings[index];
	}
	getGroup(action) {
		var index = this.actions.indexOf(action);
		if (index==-1) return;
		var result = this.groups[index];
		if (!(result instanceof Array)&&result!=void(0)) return [result];
		else return result;
	}
	getInputValue(input) {
		var id = this.getMapping(input)
		if (id===void(0)) return console.warn("Invalid input name: "+input),false;
		var ctrlManager = this.getCtrlManager();
		switch(typeof id) {
			case "number":
				return ctrlManager.ctrlButtonValue(id,this);
			case "string": //Ex: "a0"
				return ctrlManager.ctrlAnalogValue(parseInt(id.charAt(1)),this);
			default:
				return null;
		}
	}
	getActionValue(action) {
		var group = this.getGroup(action);
		if (!group) return console.warn("Invalid action name: "+action),false;
		var groupValue;
		for (var i in group) {
			if (!group[i]) continue;
			var input = group[i].split("::")[0];
			var modifier = group[i].split("::")[1];
			var val = this.getInputValue(input);
			if (modifier) {
				switch(typeof modifier) {
					case '-':
						val *= -1;
					case '+':
						if (val<0) val = 0;
						break;
					case 'U':
						if (val==-1) {
							val = 1;
							break;
						}
					case 'R':
					case 'D':
					case 'L':
						var requested = [-1,-0.428571,0.142857,0.714286][['U','R','D','L'].indexOf(modifier)];
						if (Math.abs(requested-val)<0.3) val = 1;
						else val = 0;
				}
			}
			if (groupValue==void(0)) groupValue = val;
			else if (val>groupValue) groupValue = val;
		}
		return groupValue;
	}
	pressed(action,threshold) {
		threshold = threshold||0.1;
		var group = this.getGroup(action);
		if (!group) return console.warn("Invalid action name: "+action),false;
		for (var i in group) {
			if (!group[i]) continue;
			var input = group[i].split("::")[0];
			var modifier = group[i].split("::")[1];
			var val = this.getInputValue(input);
			if (modifier) {
				switch(modifier) {
					case '-':
						val *= -1;
					case '+':
						if (val<0) val = 0;
						break;
					case 'U':
						if (val==-1) {
							val = 1;
							break;
						}
					case 'R':
					case 'D':
					case 'L':
						var requested = [-1,-0.428571,0.142857,0.714286][['U','R','D','L'].indexOf(modifier)];
						if (Math.abs(requested-val)<0.3) val = 1;
						else val = 0;
				}
			}
			if (Math.abs(val)>=threshold) return true;
		}
		return false;
	}
	used(action) {
		var group = this.getGroup(action);
		if (!group) return console.warn("Invalid action name: "+action),false;
		return this.usedActions[action];
	}
	ready(action) {
		var group = this.getGroup(action);
		if (!group) return console.warn("Invalid action name: "+action),false;
		return (this.pressed(action)&&!this.used(action));
	}
	use(action,source) {
		var group = this.getGroup(action);
		if (!group) return console.warn("Invalid action name: "+action),false;
		this.usedActions[action] = true;
	}
	justReleased(action) {
		var group = this.getGroup(action);
		if (!group) return console.warn("Invalid action name: "+action),false;
		return this.justReleasedActions[action];
	}
	updateActionStates(mapping) {
		if (!this.contains(mapping)) return;
		for (var i in this.actions) {
			var group = this.getGroup(this.actions[i]);
			if (!group) continue;
			if (!this.mappingInGroup(mapping,group)) continue;
			if (!this.pressed(this.actions[i])) this.usedActions[this.actions[i]] = false;
		}
	}
	contains(mapping) {
		if (!isNaN(parseInt(mapping))) mapping = parseInt(mapping);
		var index = this.mappings.indexOf(mapping);
		return index!=-1;
	}
	mappingInGroup(mapping,group) {
		for (var i in group) {
			var input = group[i].split("::")[0];
			if (this.getMapping(input)==mapping) return true;
		}
		return false;
	}
	makePausedCache() {
		for (var property in this.usedActions) this.usedActionsPaused[property] = this.usedActions[property];
		for (var property in this.justReleasedActions) this.justReleasedActionsPaused[property] = this.justReleasedActions[property];
	}
	loadPausedCache() {
		for (var property in this.usedActionsPaused) this.usedActions[property] = this.usedActionsPaused[property];
		for (var property in this.justReleasedActionsPaused) this.justReleasedActions[property] = this.justReleasedActionsPaused[property];
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
		super({name:"NullCtrl",type:"NullCtrl",inputs:[],mappings:[],actions:[],groups:[]});
	}
	getActionValue() { return false; }
	pressed() { return false; }
	used() { return false; }
	ready() { return false; }
	use() {}
	justReleased() { return false; }
}
NullCtrl.ctrls = [];
var nullController = new NullCtrl();

var dmInputs = ["A","B","Dpad","Up","Down","Left","Right","AnalogL_X","AnalogL_Y","Start","Select","BumperL","BumperR","AnalogR_X","AnalogR_Y"];
var dmActions = ["lookUp","moveRight","crouch","moveLeft","jump","attack","pause","showInfo","click","respawn","pointerMoveX","pointerMoveY"];

var playerActions = ["lookUp","moveRight","crouch","moveLeft","jump","attack"];
var gameActions = ["pause","respawn","showInfo"];
var cameraActions = ["camUp","camRight","camDown","camLeft","camZoomIn","camZoomOut","camRotateCW","camRotateCCW","camReset"];
var pointerActions = ["pointerMoveX","pointerMoveY","click"];

var globalKeyboardMap = new CtrlMap("GlobalKeyboard","keyboard",["P1","P2","R","\\","NumUp","NumRight","NumDown","NumLeft","NumTR","NumTL","NumBR","NumBL","NumB","]"],[82,80,192,220,104,102,101,100,99,97,103,105,98,221],
[...gameActions,...cameraActions,"snippet","pause-p1","pause-p2"],["P1","R","\\","NumUp","NumRight","NumDown","NumLeft","NumTR","NumTL","NumBR","NumBL","NumB","]","P1","P2"]);

var wasd = new CtrlMap("WASD","keyboard",dmInputs,[87,71,null,69,83,65,68],dmActions,["Up","Right","Down","Left","A","B"]);
var ijkl = new CtrlMap("IJKL","keyboard",dmInputs,[73,222,null,79,75,74,76],dmActions,["Up","Right","Down","Left","A","B"]);
// var dpad = new CtrlMap("DPad","keyboard",playerActions,[[191,96],39,40,37,38,[190,110]]);
var gpad = new CtrlMap("GPAD","gamepad",dmInputs,[0,2,'a9',12,13,14,15,'a0','a1',9,8,4,5,'a2','a5'],dmActions,[
	["Up","AnalogL_Y::-","Dpad::U"],["Right","AnalogL_X::+","Dpad::R"],["Down","AnalogL_Y::+","Dpad::D"],["Left","AnalogL_X::-","Dpad::L"],
	"A","B","Start","Select","BumperL","BumperR","AnalogR_X","AnalogR_Y"
]);
var tscr = new CtrlMap("TOUCH","touch",dmInputs,[0,1,null,null,null,null,null,'a0','a1'],dmActions,["AnalogL_Y::-","AnalogL_X::+","AnalogL_Y::+","AnalogL_X::-","A","B"]);

function getCtrlDisplayName(obj,type) {
	if (obj!=null&&(typeof obj=="object"||typeof obj=="number")) {
		switch(type) {
			case "keyboard":
				return obj.name;
				break;
			case "gamepad":
				return GamePad.controllers[obj].name;
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
				if (Player.globalGPCtrls[slot]) Player.globalGPCtrls[slot].selfDestruct();
				Player.globalGPCtrls[slot] = new Ctrl(GamePad.ctrlMaps[ctrl],ctrl);
				Player.gpMaps[slot] = GamePad.ctrlMaps[ctrl];
			}
			break;
		case "touch":
			Player.tapMaps[slot] = ctrl=="None"?null:ctrl;
			break;
	}
	Player.relinkCtrls();
}
