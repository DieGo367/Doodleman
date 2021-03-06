class _c_ {
	static create() {
		var newInstance = new this(...arguments);
		if (this.listType=="uid") newInstance.uid = "u"+(uid++);
		this.addInstance(newInstance);
		if (this.onCreate) this.onCreate.call(newInstance);
		return newInstance;
	}
	static addInstance(instance) {
		if (this.parent!=null) this.parent.addInstance(instance);
		this.classList.add(instance);
	}
	static removeInstance(instance) {
		if (this.parent!=null) this.parent.removeInstance(instance);
		this.classList.remove(instance);
	}
	static has(instance) {
		return this.classList.has(instance);
	}
	static getAll() {
		return this.classList.getAll();
	}
	static getLoaded() {
		let list = [];
		if (this.listType!="none") for (var c in this.classList) if (this.classList[c].isLoaded) list.push(this.classList[c]);
		return list;
	}
	static killAll() {
		let list = this.getAll();
		for (var i in list) list[i].remove();
	}
	static callForAll(method) {
		var all = this.getAll();
		if (all.length==0) return;
		if (!this.prototype[method]) return console.log("Error: undefined method: "+method);
		var args = [].concat(arguments).splice(0,1);
		for (var i in all) {
			if (all[i]&&!all[i].deleted) {
				if (all[i][method]) all[i][method](...args);
				else console.log("Error: missing method in one case: "+method);
			}
		}
	}
	static modifyPrototype(props) {
		if (typeof props != "object") return;
		for (var p in props) {
			this.prototype[p] = props[p];
		}
	}
	static onlineProperties() {
		return [];
	}
	remove() {
		this.constructor.removeInstance(this);
		if (this.constructor.listType=="uid"&&this.uid!=void(0)) {
			if (uid==++uidDeleted) uid = uidDeleted = 0;
		}
		for (var property in this) delete this[property];
		this.deleted = true;
	}
	inherit(propertyName) {
		// inherit from prototype if property had been overwritten on this instance
		this[propertyName] = this.constructor.prototype[propertyName];
	}
	protoMethod(method) {
		if (typeof method!="string") return console.warn("No method name given");
		let args = [...arguments];
		args.shift();
		let proto = this.constructor.prototype;
		if (proto[method]) proto[method].call(this,...args);
		else console.warn("Method '" + method + "' not found in prototype chain.");
	}
	superMethod(method) {
		if (typeof method!="string") return console.warn("No method name given");
		let args = [...arguments];
		args.shift();
		let parent = this.constructor.parent.prototype;
		if (parent[method]) parent[method].call(this,...args);
		else console.warn("Method '" + method + "' not found in prototype chain.");
	}
	wait(ticks,func) {
		Timer.wait(ticks,func,this);
	}
	drawTint() {}
	draw() {}
	drawElements() {}
	drawHud() {}
	drawDebug() {}
	drawHighlighted() {}
}
function initClass(cl,param) {
	if (typeof param == "object") {
		cl.listType = param.listType || "none";
		if (param.drawable) DrawableClasses.push(cl);
	}
	else if (typeof param == "function") {
		cl.parent = param;
		cl.listType = cl.parent.listType;
	}
	switch(cl.listType) {
		case "array":
			cl.classList = new ArrayStore();
			break;
		case "uid":
		case "uid_clone":
			cl.classList = new UIDStore();
	}
	if (typeof cl.onInit=="function") cl.onInit();
}
class UIDStore {
	constructor() {
		Object.defineProperty(this,"count",{
			value: 0,
			writable: true
		})
		Object.defineProperty(this,"add",{
			value: function(instance) {
				if (!instance||!instance.uid) return;
				if (!this[instance.uid]) this.count++;
				this[instance.uid] = instance;
				return this;
			}
		});
		Object.defineProperty(this,"remove",{
			value: function(instance) {
				if (!instance||!instance.uid) return;
				if (this[instance.uid]) this.count--;
				delete this[instance.uid];
				return this;
			}
		});
		Object.defineProperty(this,"has",{
			value: function(instance) {
				if (!instance||!instance.uid) return false;
				return this[instance.uid] == instance;
			}
		});
		Object.defineProperty(this,"getAll",{
			value: function() {
				let list = [];
				for (var uid in this) list.push(this[uid]);
				return list;
			}
		});
	}
}
class ArrayStore extends Array {
	constructor() {
		super();
		Object.defineProperty(this,"count",{
			value: 0,
			writable: true
		})
		Object.defineProperty(this,"add",{
			value: function(instance) {
				if (!instance) return;
				this.push(instance);
				this.count = this.length;
				return this;
			}
		});
		Object.defineProperty(this,"remove",{
			value: function(instance) {
				if (!instance) return;
				this.splice(this.indexOf(instance),1);
				this.count = this.length;
				return this;
			}
		});
		Object.defineProperty(this,"has",{
			value: function(instance) {
				if (!instance) return false;
				return this.indexOf(instance) != -1;
			}
		});
		Object.defineProperty(this,"getAll",{
			value: function() {
				return [].concat(this);
			}
		});
	}
}

class RemoteObject extends _c_ {
	constructor(json) {
		super();
		let remoteClass = Constants.read(json.class);
		if (remoteClass) {
			this.object = Object.create(remoteClass.prototype);
			for (var property in json) {
				this.object[property] = json[property];
			}
			if (json.sheet) this.object.sheet = Animation.getSpritesheet(json.sheet.name);
			this.uid = this.object.uid;
			this.drawLayer = this.object.drawLayer;
			this.remoteClass = remoteClass;
			this.object.remoteObject = this;
		}
	}
	draw() {
		if (this.object) this.object.draw();
	}
	drawElements() {
		if (this.object) this.object.drawElements();
	}
	drawHud() {
		if (this.object) this.object.drawHud();
	}
	drawDebug() {
		if (this.object) this.object.drawDebug();
	}
	static generateState() {
		let objects = [...Box.getAll(),...Line.getAll()];
		let state = {};
		for (var i = 0; i < objects.length; i++) {
			let obj = objects[i];
			if (!obj.isLoaded||obj.isTerrain) continue;
			let onlineProps = obj.constructor.onlineProperties();
			function needed(key) {
				if (onlineProps.length==0 || key=="") return true;
				return onlineProps.indexOf(key)!=-1;
			}
			let refCache = [];
			let copy = JSON.parse(JSON.stringify(obj,function(key,value) {
				if (!needed(key)) return;
				if (typeof value == "object" && value!=null) {
					if (refCache.indexOf(value)!=-1) return;
					else refCache.push(value);
				}
				if (typeof value=="number"&&isNaN(value)) value = "NaN";
				return value;
			}));
			copy.class = obj.constructor.name;
			state[copy.uid] = copy;
		}
		return state;
	}
	static delta(oldState,newState) {
		for (var uid in newState) {
			let current = newState[uid], old = oldState[uid];
			if (old) {
				for (var prop in current) {
					if (prop=="uid") continue;
					if (current[prop]==old[prop]) delete current[prop];
				}
			}
		}
		return newState;
	}
	static matchState(state) {
		let old = this.getAll();
		for (var uid in old) old[uid].inNewState = false;
		for (var uid in state) {
			let updated = state[uid];
			let obj = this.classList[uid];
			if (obj) {
				obj.inNewState = true;
				for (var prop in updated) {
					if (prop=="sheet") continue;
					obj.object[prop] = updated[prop];
				}
			}
			else if (updated.class) this.create(updated);
		}
		for (var uid in old) if (!old[uid].inNewState) old[uid].remove();
	}
	static clearState() {
		this.killAll();
	}
	static getAllOf(className) {
		let all = this.getAll();
		let results = [];
		let targetClass = Constants.read(className);
		for (var i in all) {
			let r = all[i];
			if (r) {
				// if remote object is the same class or inherits from that class
				if (r.remoteClass.name == className || r.remoteClass.prototype instanceof targetClass) {
					results.push(r.object);
				}
			}
		}
		return results;
	}
}
initClass(RemoteObject,{drawable:true, listType: "uid_clone"});


class Background extends _c_ {
	constructor(slot,imgName,drawLayer,scale,parallax,velX,velY) {
		super();
		this.slot = slot;
		this.imgName = imgName;
		this.drawLayer = drawLayer;
		this.scale = scale;
		this.parallax = parallax;
		this.velX = velX;
		this.velY = velY;
		this.tick = 0;
		if (!Background.slots[slot]) Background.slots[slot] = this;
		else this.slot = null;
		this.load();
	}
	load() {
		if (!Images.isLoaded(this.imgName)) Images.loadImage(this.imgName);
	}
	setSlot(slot) {
		this.slot = slot;
	}
	draw() {
		let cam = Camera.getCam(0);
		if (!cam) return;
		let x = Math.max(0,cam.leftPx());
		let y = Math.max(0,cam.topPx());
		let width = Math.min(Level.level.width,cam.rightPx()) - x;
		let height = Math.min(Level.level.height,cam.bottomPx()) - y;
		let offsetX = this.tick*this.velX;
		let offsetY = this.tick*this.velY;
		Images.drawImagePattern(this.imgName,x,y,width,height,this.scale,this.parallax,offsetX,offsetY);
		if (!paused) this.tick++;
	}
	remove() {
		if (this.slot) Background.clearSlot(this.slot);
		super.remove();
	}
	static onInit() {
		this.slots = [];
	}
	static clearSlot(slot) {
		let bg = Background.slots[slot];
		delete Background.slots[slot];
		if (bg) {
			bg.slot = null;
			bg.remove();
		}
	}
	static swapSlots(i,j) {
		swapListItems(this.slots,i,j);
		if (this.slots[i]) this.slots[i].setSlot(i)
		if (this.slots[j]) this.slots[j].setSlot(j);
	}
}
initClass(Background,{drawable: true, listType: "array"});

class BackgroundB64 extends Background {
	constructor(slot,imgB64,drawLayer,scale,parallax,velX,velY) {
		super(slot,"BGRaw:"+slot,drawLayer,scale,parallax,velX,velY);
		this.imgB64 = imgB64;
		this.load();
	}
	load() {
		if (!this.imgB64) return;
		this.promise = Images.loadImageB64(this.imgName,this.imgB64);
	}
	setSlot(slot) {
		super.setSlot(slot);
		this.imgName = "BGRaw:"+slot;
		this.load();
	}
}
initClass(BackgroundB64,Background);


class Box extends _c_ {
	constructor(x,y,width,height,gfx) {
		super();
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.gfx = gfx;
		this.isLoaded = true;
		this.alwaysLoaded = false;
		this.lockSectors = false;
		this.sectors = [];
	}
	halfW() { return this.width/2 }
	leftX() { return this.x-this.halfW() }
	rightX() { return this.x+this.halfW() }
	bottomY() { return this.y; }
	topY() { return this.y-this.height }
	midX() { return this.x; }
	midY() { return this.y-(this.height/2) }
	containsPoint(x,y) {
		let pt = new Point(x,y);
		if (pt.x<=this.rightX()&&pt.x>=this.leftX()) {
			if (pt.y<=this.y&&pt.y>=this.topY()) {
				return true;
			}
		}
		return false;
	}
	intersect(obj) {
		if (obj.leftX()<=this.rightX() && this.leftX()<=obj.rightX()) {
			if (obj.topY()<=this.bottomY() && this.topY()<=obj.bottomY()) return true;
		}
		return false;
	}
	pointerHovered() {
		return this.containsPoint(Pointer.camX(),Pointer.camY());
	}

	update() { }
	setSectors() {
		if (!this.lockSectors||this.sectors[0]==null) {
			for (var i in this.sectors) Sector.removeFromSector(this,this.sectors[i]);
			this.sectors = [];
			let sectorX = Math.floor(this.x/Sector.size.width);
			let sectorY = Math.floor(this.y/Sector.size.height);
			this.sectors.push(Sector.addToSector(this,sectorX,sectorY).name);

			let leftX = Math.floor(this.leftX()/Sector.size.width);
			let rightX = Math.floor(this.rightX()/Sector.size.width);
			let topY = Math.floor(this.topY()/Sector.size.height);
			let bottomY = Math.floor(this.bottomY()/Sector.size.height);
			for (var a = leftX; a <= rightX; a++) {
				for (var b = topY; b <= bottomY; b++) {
					if (a!=sectorX||b!=sectorY) this.sectors.push(Sector.addToSector(this,a,b).name);
				}
			}
		}
		this.isLoaded = false;
		for (var i in this.sectors) {
			if (Sector.getSector(this.sectors[i]).loaded) {
				this.isLoaded = true;
				break;
			}
		}
	}
	remove() {
		for (var i in this.sectors) {
			Sector.removeFromSector(this,this.sectors[i]);
		}
		super.remove();
	}

	draw() {
		if (!this.isLoaded) return;
		if (this.gfx==null) return;
		let type = typeof this.gfx;
		if (type == "string") {
			if (this.gfx.split(".").length>1) { // use as image name
				Images.drawImage(this.gfx,Math.round(this.leftX()),Math.round(this.topY()),this.width,this.height);
			}
			else { // try to use as a color string
				c.fillStyle = this.gfx;
				c.fillRect(Math.round(this.leftX()),Math.round(this.y),this.width,-(this.height));
			}
		}
		else if (type == "object") {
			Animation.drawFromSheet(this.gfx,this.x,this.y,"none",0,CENTER,this);
		}
	}
	drawDebug() {
		if (!this.isLoaded) return;
		c.lineWidth = 1;
		c.strokeStyle = this.hitBoxStroke;
		c.strokeRect(this.x-this.halfW(),this.y,this.width,-this.height,this.hitBoxStroke);
	}
	drawHighlighted(color) {
		c.lineWidth = 5;
		c.strokeStyle = color;
		c.strokeRect(this.x-this.halfW(),this.y,this.width,-this.height,this.hitBoxStroke);
		this.draw(true);
		c.lineWidth = 1;
	}

	static onInit() {
		this.prototype.hitBoxStroke = "darkGray";
		this.prototype.drawLayer = 0;
	}
	static onlineProperties() {
		super.onlineProperties();
		return ["uid","drawLayer","isLoaded","x","y","width","height","gfx","hitBoxStroke"];
	}
}
initClass(Box,{drawable: true, listType: "uid"});

class Marker extends Box {
	constructor(x,y,name) {
		super(x,y,10,10);
		this.name = name;
	}
	drawDebug() {
		c.fillStyle = "gray";
		c.beginPath();
		c.arc(this.x,this.y,4,0,2*Math.PI);
		c.fill();
		Font.copy(fontDebug10,{color:"yellow"}).draw(this.name,this.x,this.y,null,CENTER);
	}
	static find(name) {
		let all = this.getAll();
		for (var i in all) {
			if (all[i].name==name) return all[i];
		}
		return null;
	}
	static findAll(name) {
		let all = this.getAll();
		let found = [];
		for (var i in all) {
			if (all[i].name==name) found.push(all[i]);
		}
		return found;
	}
	static onlineProperties() {
		return super.onlineProperties().concat(["name"]);
	}
}
initClass(Marker,Box);

class Interactable extends Box {
	constructor(x,y,width,height,gfx,targetClass) {
		super(x,y,width,height,gfx);
		this.targetClass = targetClass;
		this.touches = {};
	}
	onIntersect(o) { }
	onStopIntersect(o) { }
	update() {
		super.update();
		var all = this.targetClass.getLoaded();
		var newTouches = {};
		for (var i in all) {
			if (this.intersect(all[i])) {
				newTouches[all[i].uid] = all[i];
				if (!this.touches[all[i].uid]) {
					if (this.onIntersect) this.onIntersect(all[i]);
				}
			}
			else if (this.touches[all[i].uid]) {
				if (this.onStopIntersect) this.onStopIntersect(all[i]);
			}
			if (this.deleted) return;
		}
		delete this.touches;
		this.touches = newTouches;
	}
}
initClass(Interactable,Box);

class HurtBox extends Interactable {
	constructor(x,y,width,height,attacker,damage,duration,formulaX,formulaY,endCheck) {
		super(x,y,width,height,void(0),Entity);
		this.attacker = attacker;
		this.damage = damage;
		this.time = duration;
		this.formulaX = formulaX;
		this.formulaY = formulaY;
		if (endCheck) this.endCheck = endCheck;
		else this.endCheck = function() { return false; };
		this.harmed = {};
		this.hitCount = 0;
	}
	update() {
		if (this.attacker!=null&&PhysicsBox.has(this.attacker)) {
			this.x = this.formulaX(this.attacker,this);
			this.y = this.formulaY(this.attacker,this);
		}
		if (!this.endCheck(this.attacker,this)) {
			super.update();
			for (var i in this.touches) {
				var v = this.touches[i];
				if (v==this.attacker||this.harmed[v.uid]) continue;
				this.hitCount++;
				v.hurt(this.damage,this.attacker!=null?this.attacker:this);
				if (this.onHurt) this.onHurt(v);
				if (!v.dead) this.harmed[v.uid] = v;
			}
			this.time -= 1;
			if (this.time<=0) {
				this.remove();
			}
		}
		else this.remove();
	}

	static onInit() {
		this.prototype.hitBoxStroke = "red";
	}
}
initClass(HurtBox,Interactable);

class AttackBox extends HurtBox {
	constructor(x,y,width,height,attacker,damage,duration,frames,framerate) {
		var formulaX = function(ent) {
			var frameIndex = Math.floor(this.frame*this.framerate);

			var widthVal = this.frames.width[frameIndex];
			if (widthVal==null) widthVal = this.frames.width[0];
			if (widthVal!=null) this.width = parseInt(widthVal);

			var frameVal = this.frames.x[frameIndex];
			if (frameVal==null) frameVal = this.frames.x[0];
			if (frameVal==null) return ent.x;
			return ent.x + ent.direction*parseInt(frameVal);
		};
		var formulaY = function(ent) {
			var frameIndex = Math.floor(this.frame*this.framerate);
			this.frame++;

			var heightVal = this.frames.height[frameIndex];
			if (heightVal==null) heightVal = this.frames.height[0];
			if (heightVal!=null) this.height = parseInt(heightVal);

			var frameVal = this.frames.y[frameIndex];
			if (!frameVal) frameVal = this.frames.y[0];
			if (!frameVal) return ent.y;
			return ent.y + parseInt(frameVal);
		};
		super(x,y,width,height,attacker,damage,duration,formulaX,formulaY);
		this.frames = frames;
		this.frame = 0;
		this.framerate = framerate;
	}
	update() {
		if (this.specialFrames&&this.specialFuncs) { //this has special functions defined on certain frames
			var specialIndex = this.specialFrames.indexOf(this.frame);
			if (specialIndex!=-1) { //there is a special function defined for this frame
				var f = this.specialFuncs[specialIndex];
				if (f&&this.attacker) f.call(this.attacker);
			}
		}
		super.update();
	}
	remove() {
		if (this.attacker!=null) {
			let index = this.attacker.attackBoxes.indexOf(this);
			if (index!=-1) this.attacker.attackBoxes.splice(index,1);
		}
		super.remove();
	}
}
initClass(AttackBox,HurtBox);

class Entrance extends Interactable {
	constructor(x,y,width,height,gfx,targetClass,linkId,destination,preventEnter,preventExit,destLevel) {
		super(x,y,width,height,gfx,targetClass);
		this.linkId = linkId;
		this.destination = destination;
		this.preventEnter = !!preventEnter;
		this.preventExit = !!preventExit;
		this.destLevel = destLevel || '';
		this.enterStep = 0;
		this.exitStep = 0;
		this.obj = null;
		this.queue = [];
	}
	update() {
		super.update();
		if (!this.obj) {
			if (!this.preventExit) for (var i in this.touches) {
				let obj = this.touches[i];
				if (this.objCanExit(obj)) {
					this.useExit(obj);
					break;
				}
			}
		}
		else {
			if (this.exitStep>0 && this.obj.exit==this) this.doExitSteps();
			else if (this.enterStep>0 && this.obj.entrance==this) this.doEnterSteps();
			else this.forget();
		}
	}
	objCanExit(obj) {
		if (obj.exit||obj.entrance) return false;
		else return true;
	}
	forget() {
		// clear connections
		let obj = this.obj;
		if (obj) {
			this.obj = null;
			obj.exit = obj.entrance = null;
			// clear step counters
			this.exitStep = this.enterStep = 0
		}
	}
	useExit(obj) {
		// store objects and set step counter
		this.obj = obj;
		obj.exit = this;
		this.exitStep = 1;
	}
	doExitSteps() {
		this.finishExit();
	}
	sendoff(obj,dest) {
		// detach from exit
		this.forget(obj);
		// then trigger the destination
		if (!dest.perventEnter) dest.useEntrance(obj);
		// or fall back to obj's spawn point
		else obj.warp(obj.spawnX,obj.spawnY);
	}
	finishExit() {
		let obj = this.obj;
		this.forget();
		let go = function(obj,dest) {
			// send the object into limbo first
			obj.warpLimbo()
			// then trigger the destination
			dest.useEntrance(obj);
		}
		// find target level
		if (this.destLevel && this.destLevel.length > 0) {
			if (Level.exists(this.destLevel)) {
				let dest = this.destination, cls = this.targetClass;
				let pSlot = obj.slot;
				let failEntr = this.preventEnter? null: this;
				Player.cacheAllHealth();
				Level.loadLevel(this.destLevel,function() {
					dest = Entrance.findEntrance(dest,cls);
					let p = Player.getSlot(pSlot);
					if (p && dest) go(p,dest)
				}, function() { if (failEntr) go(obj,failEntr); else obj.warp(0,0); }); // failed to load
			}
			else go(obj,this); // return to same entrance
		}
		else { // find destination
			let dest = Entrance.findEntrance(this.destination,this.targetClass);
			if (dest) go(obj,dest);
			// destination wasn't found
			else if (!this.preventEnter) go(obj,this);
			else obj.warp(0,0);
		}
		// check queue in case something entered during the exit sequence
		if (this.queue.length>0) this.useEntrance(this.queue.shift());
	}
	useEntrance(obj) {
		// store the objects and set step counter
		if (this.obj) this.queue.push(obj);
		else {
			this.obj = obj;
			obj.entrance = this;
			this.enterStep = 1;
		}
	}
	doEnterSteps() {
		this.finishEntrance();
	}
	finishEntrance() {
		// do warp
		this.obj.warp(this.x,this.y);
		// clear all values
		this.forget();
	}
	static onInit() {
		this.prototype.hitBoxStroke = "purple";
		this.prototype.lockSectors = true;
	}
	static findEntrance(id,targetClass) {
		for (var u in this.classList) {
			let e = this.classList[u];
			if (e.linkId==id && (targetClass==void(0)||e.targetClass==targetClass) && !e.preventEnter) return e;
		}
	}
}
initClass(Entrance,Box);

class Door extends Entrance {
	constructor(x,y,linkId,destination,preventEnter,preventExit,destLevel) {
		super(x,y,32,55,void(0),Player,linkId,destination,preventEnter,preventExit,destLevel);
		this.sheet = Animation.getSpritesheet("Door.json");
		this.doorOpen = false;
	}
	update() {
		super.update();
		if (this.doorOpen) this.setAnimation("open");
		else this.setAnimation("closed");
	}
	objCanExit(player) {
		// only accept players when door is closed
		if (this.animCurrent!="closed") return false;
		// player must pass every test to be able to exit
		if (!super.objCanExit(player)) return false; // inherited test
		let ctrl = player.getCtrl();
		if (!ctrl.pressed("lookUp",0.8)) return false; // must press lookUp
		if (!player.isGrounded) return false; // must be on ground
		if (player.held||player.heldBy) return false; // can't be holding anything or be held by something
		if (Math.abs(this.y-player.y)>=2) return false; // must be within 2 vertical units from door
		// passed all the tests!
		return true;
	}
	forget() {
		if (this.doorOpen) this.closeDoor();
		if (this.obj) {
			this.obj.defyGravity = false;
			this.obj.collisionType = C_ENT;
			Collision.removeAllPairsWith(this.obj);
			this.obj.forcedInvuln = false;
		}
		super.forget();
	}
	useExit(player) {
		super.useExit(player);
		this.openDoor();
		player.doorTick = 30;
		player.velX = 0;
		player.velY = 0;
		player.defyGravity = true;
		player.collisionType = C_NONE;
		player.forcedInvuln = true;
		player.faceTo(this);
	}
	doExitSteps() {
		this.obj.forcedInvuln = true;
		switch(this.exitStep) {
			case 1:
				if (this.animCurrent=="open") this.exitStep++;
				break;
			case 2:
				if (this.obj.distanceTo(this)>4.5) this.obj.move(1.5);
				else {
					this.obj.setAnimation("exit-through-door",null,"full");
					this.exitStep++;
				}
				break;
			case 3:
				this.obj.move(this.obj.distanceTo(this)/2);
				if (this.obj.animCurrent!="exit-through-door") {
					this.closeDoor();
					this.exitStep++;
				}
				break;
			case 4:
				if (this.animCurrent=="closed") this.finishExit();
				break;
		}
	}
	useEntrance(player) {
		super.useEntrance(player);
		if (this.obj==player) {
		this.openDoor();
		player.warp(this.x,this.y);
		player.velX = player.velY = 0;
		player.defyGravity = true;
		player.collisionType = C_NONE;
		player.forcedInvuln = true;
	}
	}
	doEnterSteps() {
		this.obj.forcedInvuln = true;
		switch(this.enterStep) {
			case 1:
				if (this.animCurrent=="open") {
					this.obj.setAnimation("enter-from-door",null,"full");
					this.enterStep++;
				}
				break;
			case 2:
				if (this.obj.animCurrent!="enter-from-door") {
					this.closeDoor();
					this.finishEntrance();
				}
				break;
		}
	}
	openDoor() {
		this.setAnimation("opening",null,"full");
		this.doorOpen = true;
	}
	closeDoor() {
		this.setAnimation("closing",null,"full");
		this.doorOpen = false;
	}
	static onInit() {
		Animation.applyToClass(this);
		this.prototype.drawLayer = -1;
	}
}
initClass(Door,Entrance);

class SpawnZone extends Entrance {
	constructor(x,y,width,height,forceSpawns) {
		super(x,y,width,height,void(0),Entity,void(0),void(0),false,true);
		this.forceSpawns = !!forceSpawns;
		this.playerBlocked = false;
	}
	update() {
		this.playerBlocked = false;
		if (this.forceSpawns) return;
		for (var i in Player.slots) {
			let p = Player.slots[i];
			if (p&&this.intersect(p)) {
				this.playerBlocked = true;
				return;
			}
		}
	}
	area() { return this.width*this.height; }
	drawDebug() {
		super.drawDebug();
		Font.copy(fontDebug10,{color:this.hitBoxStroke}).draw("SpawnZone",this.leftX(),this.topY(),this.width,LEFT);
	}
	finishEntrance() {
		let enemy = this.obj;
		this.forget();
		enemy.x = this.leftX() + Math.floor(Math.random()*this.width);
		enemy.y = this.topY() + Math.floor(Math.random()*this.height);
	}
	enterAsSpawn(enemy) {
		this.useEntrance(enemy);
		this.finishEntrance();
		enemy.spawnX = enemy.x;
		enemy.spawnY = enemy.y;
		enemy.paceTarget = enemy.post = this.x;
	}
	static weightedSelection() {
		let zones = [];
		let totalArea = 0;
		for (var u in this.classList) {
			let zone = this.classList[u];
			if (zone.isLoaded&&!zone.playerBlocked) {
				zones.push(zone);
				totalArea += zone.area();
			}
		}
		let r = Math.floor(Math.random()*totalArea);
		for (var i = 0; i < zones.length; i++) {
			if (r<=zones[i].area()) return zones[i];
			else r -= zones[i].area();
		}
	}
}
initClass(SpawnZone,Entrance);

class PhysicsBox extends Box {
	constructor(x,y,width,height,gfx,defyPhysics,collisionType,canBeCarried,thrownDamage) {
		super(x,y,width,height,gfx);
		this.defyPhysics = defyPhysics;
		this.collisionType = collisionType;
		this.canBeCarried = canBeCarried;
		this.thrownDamage = thrownDamage;
		this.spawnX = this.prevX = x;
		this.spawnY = this.prevY = y;
		this.velX = this.velY = 0;
		this.dx = this.dy = 0;
		this.isGrounded = false;
		this.cSides = {u:0,r:0,d:0,l:0};
		this.cSidesPrev = {u:0,r:0,d:0,l:0};
	}
	preCollision() {
		//prepare values for collision detection
		if (this.defyPhysics||this.heldBy) return;
		//clear values relating to ground and side detection
		this.wasGrounded = this.isGrounded;
		this.isGrounded = false;
		this.cSidesPrev = this.cSides;
		this.cSides = {u:0,r:0,d:0,l:0};
		this.ground = null;
		this.lineGround = null;
		//bottom of screen
		if (Level.level.edge.bottom==EDGE_SOLID&&this.y>=Level.level.height) {
			this.isGrounded = true;
			this.cSides.d = true;
		}
	}
	groundDragLoop(b,loops) {
		if (!PhysicsBox.has(b)&&!Line.has(b)) return this.ground = null;
		if (!(isNaN(b.dx))) {
			this.x += b.dx;
		}
		if (loops>=10) console.log("Ground drag limit");
		else if (b.ground!=null) this.groundDragLoop(b.ground,loops+1);
	}
	doGroundDrag() {
		if (this.defyPhysics||this.heldBy) return;
		if (this.ground!=null) this.groundDragLoop(this.ground,0);
	}
	edge(edge,axis,sign,boundNeg,boundPos,sideNeg,sidePos,spacer,focusOffset) {
		let pos = this[axis];
		switch(Level.level.edge[edge]) {
			case EDGE_SOLID:
				if (sign<0&&sideNeg<boundNeg) {
					this[axis] = boundNeg + spacer + focusOffset;
					this["vel"+axis.toUpperCase()] = 0;
				}
				else if (sign>0&&sidePos>boundPos) {
					this[axis] = boundPos - spacer + focusOffset;
					this["vel"+axis.toUpperCase()] = 0;
				}
				break;
			case EDGE_WRAP:
				if (sign<0&&pos<boundNeg-spacer*2) this[axis] = boundPos + spacer*2 - 5 + focusOffset;
				else if (sign>0&&pos>boundPos+spacer*2) this[axis] = boundNeg - spacer*2 + 5 + focusOffset;
				break;
			case EDGE_KILL:
				if (sign<0&&pos<boundNeg-spacer*2) this.die? this.die(): this.remove();
				else if (sign>0&&pos>boundPos+spacer*2) this.die? this.die(): this.remove();
				break;
			case EDGE_NONE:
				break;
		}
	}
	warp(x,y) {
		if (x instanceof Point) y = x.y, x = x.x;
		this.x = this.prevX = x;
		this.y = this.prevY = y;
	}
	warpLimbo() {
		this.warp(NaN,NaN);
	}

	intersect(obj) {
		if (obj instanceof Line) return this.intersectLine(obj);
		else return super.intersect(obj);
	}
	intersectLine(obj) {
		let bufferX = Math.abs(this.velX), bufferY = Math.abs(this.velY);
		if (this.leftX()<=obj.rightX()+bufferX && obj.leftX()-bufferX<=this.rightX()) {
			if (this.topY()<=obj.bottomY()+bufferY && obj.topY()-bufferY<=this.bottomY()) return true;
		}
		return false;
	}
	update() {
		super.update();
		if (!this.isLoaded) return;
		if (this.defyPhysics||this.heldBy) return;
		var oldX = this.x, oldY = this.y;
		//gravity
		if (!this.isGrounded&&!this.defyGravity&&this.velY<50) this.velY +=1;
		//calculate X
		if (this.velX!=0) {
			if (this.lineGround&&this.intersect(this.lineGround)&&!this.ground) {
				this.x += Math.cos(this.lineGround.angle())*this.velX;
				this.y = this.lineGround.valueAt(this.x,'x');
				if (this.lineGround.useBoxCorners) this.y -= Math.sin(this.lineGround.angle())*this.halfW();
			}
			else this.x += this.velX;
			if (Math.abs(this.velX)<0.5) this.velX = 0;
			else this.velX += this.velX>0? -0.5: 0.5;
		}
		//calculate Y
		if (this.velY!=0) {
			this.y += this.velY;
			if (Math.abs(this.velY)<0.5) this.velY = 0;
			else this.velY += this.velY>0? -0.5: 0.5;
		}
		//screen edge behavior
		this.edge("left",'x',-1,0,Level.level.width,this.leftX(),this.rightX(),this.halfW(),0);
		this.edge("right",'x',1,0,Level.level.width,this.leftX(),this.rightX(),this.halfW(),0);
		this.edge("top",'y',-1,0,Level.level.height,this.topY(),this.bottomY(),this.height/2,this.height/2);
		this.edge("bottom",'y',1,0,Level.level.height,this.topY(),this.bottomY(),this.height/2,this.height/2);

		//store change in position during this update
		this.dx = this.x-oldX, this.dy = this.y-oldY;
		this.prevX = oldX, this.prevY = oldY;
	}
	respawn() {
		this.warp(this.spawnX, this.spawnY);
		Collision.removeAllPairsWith(this);
		this.held = null;
		this.heldBy = null;
		if (this.defyPhysics) return;
		this.velX = 0;
		this.velY = 0;
	}
	remove() {
		Collision.removeAllPairsWith(this);
		super.remove();
	}

	static collide(a,b,behavior) {
		var ar = a.rightX(), al = a.leftX(), am = a.midY(), aw = a.halfW(), at = a.topY();
		var br = b.rightX(), bl = b.leftX(), bm = b.midY(), bw = b.halfW(), bt = b.topY();

		//distance between a and b on x/y axes
		var xDist = a.x-b.x;			//+: a is right of b, -: a is left
		var yDist = a.midY()-b.midY();	//+: a is above,			-: a is below

		//clip: the length of the intersection
		var xClip = xDist>0?br-al:ar-bl;
		var yClip = yDist>0?b.y-at:a.y-bt;

		//pushed: the x value of a/b if a/b were to be overpowered and pushed by b/a
		var aPushedX = xDist>0?br+aw:xDist<0?bl-aw:a.x;
		var bPushedX = xDist>0?al-bw:xDist<0?ar+bw:b.x;
		var aPushedY = yDist>0?b.y+a.height:yDist<0?bt:a.y;
		var bPushedY = yDist>0?at:yDist<0?a.y+b.height:b.y;

		//equal: the x value of a/b if they get pushed equally
		var aEqualX = xDist>0?a.x+xClip/2:a.x-xClip/2;
		var bEqualX = xDist>0?b.x-xClip/2:b.x+xClip/2;
		var aEqualY = yDist>0?a.y+yClip/2:a.y-yClip/2;
		var bEqualY = yDist>0?b.y-yClip/2:b.y+yClip/2;

		var oax = a.x, oay = a.y, obx = b.x, oby = b.y; //temp store old coords
		if (behavior>7) return;
		if (Math.abs(xClip)<=Math.abs(yClip)) { //do X
			var pushResult = this.resultFromBehavior(a,b,behavior,"x",xDist,a.cSides.r,a.cSides.l,b.cSides.r,b.cSides.l);
			if (pushResult=="a"&&!a.defyPhysics&&!a.heldBy) a.x = aPushedX;
			if (pushResult=="b"&&!b.defyPhysics&&!b.heldBy) b.x = bPushedX;
			if (pushResult=="=") a.x = aEqualX, b.x = bEqualX;
			var aDX = a.x-oax, bDX = b.x-obx; //difference between old and new x positions
			if (a.collisionType<C_INFINIMASS&&!a.defyPhysics) {
				if (aDX<0||a.leftX()==b.rightX()) { //collided on left side
					a.cSides.l = true;
					a.velX = 0;
				}
				if (aDX>0||a.rightX()==b.leftX()) { //collided on right
					a.cSides.r = true;
					a.velX = 0;
				}
			}
			if (b.collisionType<C_INFINIMASS&&!b.defyPhysics) {
				if (bDX<0||b.leftX()==b.rightX()) {
					b.cSides.l = true;
					b.velX = 0;
				}
				if (bDX>0||b.rightX()==a.leftX()) {
					b.cSides.r = true;
					b.velX = 0;
				}
			}
		}
		if (Math.abs(yClip)<=Math.abs(xClip)) { //do Y
			var pushResult = this.resultFromBehavior(a,b,behavior,"y",yDist,a.cSides.d,a.cSides.u,b.cSides.d,b.cSides.u);
			if (pushResult=="a"&&!a.defyPhysics&&!a.heldBy) a.y = aPushedY;
			if (pushResult=="b"&&!b.defyPhysics&&!b.heldBy) b.y = bPushedY;
			if (pushResult=="=") a.y = aEqualY, b.y = bEqualY;
			var aDY = a.y-oay, bDY = b.y-oby;
			if (a.collisionType<C_INFINIMASS&&!a.defyPhysics) {
				if (aDY<0||a.y==b.topY()) { //collided on bottom side
					a.cSides.d = Math.max(a.cSides.d,b.collisionType);
					a.isGrounded = true;
					if (b.ground!=a) a.ground = b;
					a.velY = 0;
				}
				if (aDY>0||a.topY()==b.y) { //collided on top
					a.cSides.u = Math.max(a.cSides.u,b.collisionType);
					a.velY = 0;
				}
			}
			if (b.collisionType<C_INFINIMASS&&!b.defyPhysics) {
				if (bDY<0||b.y==a.topY()) {
					b.cSides.d = Math.max(b.cSides.d,a.collisionType);;
					b.isGrounded = true;
					if (a.ground!=b) b.ground = a;
					b.velY = 0;
				}
				if (bDY>0||b.topY()==a.y) {
					b.cSides.u = Math.max(b.cSides.u,a.collisionType);
					b.velY = 0;
				}
			}
		}
	}
	static resultFromBehavior(a,b,behavior,axis,dist,aPosSide,aNegSide,bPosSide,bNegSide) {
		if (behavior==0) return "none";
		else if (behavior==1||a.defyPhysics) return "b";
		else if (behavior==2||b.defyPhysics) return "a";
		else if ((aNegSide&&dist<=0)||(aPosSide&&dist>=0)) return "b";
		else if ((bNegSide&&dist<=0)||(bPosSide&&dist>=0)) return "a";
		else if (behavior==6) {
			if (axis=="x") return "b";
			else if (axis=="y") return "a";
		}
		else if (behavior==7) {
			if (axis=="x") return "b";
			else if (axis=="y") return "a";
		}
		else if (behavior==3) return "=";
		else if (behavior==4) return "b";
		else if (behavior==5) return "a";
		else return "none";
	}

	static onInit() {
		this.prototype.hitBoxStroke = "limeGreen";
		this.prototype.defyGravity = false;
	}
}
initClass(PhysicsBox,Box);

class MovingPlatform extends PhysicsBox {
	constructor(x,y,width,height,gfx,collisionType,velX,velY) {
		super(x,y,width,height,gfx,true,collisionType,false,false);
		this.velX = this.dx = velX;
		this.velY = this.dy = velY;
	}
	update() {
		this.x += this.velX;
		this.y += this.velY;
		if (this.x<-this.width/2) this.x = Level.level.width+this.width/2;
		else if (this.x>Level.level.width+this.width/2) this.x = -this.width/2;
	}
}
initClass(MovingPlatform,PhysicsBox);


class Line extends _c_ {
	constructor(x,y,x2,y2,size,stroke,direction,useBoxCorners) {
		super();
		this.x = x;
		this.y = y;
		this.x2 = x2;
		this.y2 = y2;
		this.size = size;
		this.stroke = stroke;
		this.direction = direction;
		this.useBoxCorners = useBoxCorners;
		this.isLoaded = true;
		this.sectors = [];
	}
	leftX() { return Math.min(this.x,this.x2); }
	rightX() { return Math.max(this.x,this.x2); }
	bottomY() { return Math.max(this.y,this.y2); }
	topY() { return Math.min(this.y,this.y2); }
	midX() { return this.x+(this.x2-this.x)/2; }
	midY() { return this.y+(this.y2-this.y)/2; }
	slope() {
		var dy = this.y2-this.y;
		var dx = this.x2-this.x;
		return dy/dx;
	}
	angle() {
		var dy = this.y2-this.y;
		var dx = this.x2-this.x;
		return Math.atan(dy/dx);
	}
	angle2() {
		var dy = this.y2-this.y;
		var dx = this.x2-this.x;
		return Math.atan2(dy,dx);
	}
	valueAt(input,respectTo) {
		var slope = this.slope();
		switch(respectTo) {
			case 'x':
				if (slope==Infinity) return this.y;
				else return slope*(input-this.x)+this.y;
			case 'y':
				if (1/slope==Infinity) return this.x;
				else return 1/slope*(input-this.y)+this.x;
		}
	}
	hasPoint(x,y) {
		let pt = new Point(x,y);
		if (this.valueAt(pt.x,'x')==pt.y || this.valueAt(pt.y,'y')==pt.x) {
			if (this.leftX()<=pt.x && pt.x<=this.rightX()) {
				if (this.topY()<=pt.y && pt.y<=this.bottomY()) return true;
			}
		}
		return false;
	}
	hitboxContainsPoint(x,y) {
		let pt = new Point(x,y);
		let yRespectX = this.valueAt(pt.x,'x');
		let xRespectY = this.valueAt(pt.y,'y');
		if (this.hasPoint(pt.x,yRespectX) || this.hasPoint(xRespectY,pt.y)) return true;
		else return false;
	}
	intersect(obj) {
		if (obj instanceof PhysicsBox) return this.intersectPhysicsBox(obj);
		if (obj.leftX()<=this.rightX() && this.leftX()<=obj.rightX()) {
			if (obj.topY()<=this.bottomY() && this.topY()<=obj.bottomY()) return true;
		}
		return false;
	}
	intersectPhysicsBox(obj) {
		let bufferX = Math.abs(obj.velX), bufferY = Math.abs(obj.velY);
		if (obj.leftX()<=this.rightX()+bufferX && this.leftX()-bufferX<=obj.rightX()) {
			if (obj.topY()<=this.bottomY()+bufferY && this.topY()-bufferY<=obj.bottomY()) return true;
		}
		return false;
	}
	crossesBox(box) {
		let a = new Point(box.leftX(),box.topY());
		let b = new Point(box.rightX(),box.topY());
		let c = new Point(box.leftX(),box.bottomY());
		let d = new Point(box.rightX(),box.bottomY());
		if (box.containsPoint(this.x,this.y)) return true;
		if (box.containsPoint(this.x2,this.y2)) return true;
		return Line.pointsCrossLine(a,d,this) || Line.pointsCrossLine(b,c,this);
	}
	pointNearLine(x,y,dist) {
		let a = new Point(x,y), b = new Point(x,y);
		let angle = this.angle2()+90;
		a.x -= dist*Math.cos(angle);
		a.y -= dist*Math.sin(angle);
		b.x += dist*Math.cos(angle);
		b.y += dist*Math.sin(angle);
		return Line.pointsCrossLine(a,b,this);
	}
	pointerHovered() {
		return this.pointNearLine(Pointer.camPoint(),null,3);
	}

	update() { }
	draw() {
		if (!this.isLoaded) return;
		c.strokeStyle = this.stroke;
		c.lineWidth = this.size;
		if (this.stroke) drawLine(this.x,this.y,this.x2,this.y2);
	}
	drawDebug() {
		if (!this.isLoaded) return;
		if (this.direction!=0) {
			c.lineWidth = 1.5;
			switch(this.direction) {
				case LINE_UP:
				c.strokeStyle = "blue";
				break;
				case LINE_DOWN:
				c.strokeStyle = "red";
				break;
				case LINE_RIGHT:
				c.strokeStyle = "orange";
				break;
				case LINE_LEFT:
				c.strokeStyle = "green";
				break;
			}
			drawLine(this.x,this.y,this.x2,this.y2);
		}
		c.lineWidth = 1;
		c.strokeStyle = "limeGreen";
		if (!this.useBoxCorners) c.setLineDash([5]);
		drawLine(this.x,this.y,this.x2,this.y2);
		c.setLineDash([]);
	}
	drawHighlighted(color) {
		c.lineWidth = 5;
		c.strokeStyle = color;
		drawLine(this.x,this.y,this.x2,this.y2);
		this.draw(true);
		c.lineWidth = 1;
	}

	static collide(a,b,behavior) {
		let line = behavior==8?b:a;
		let box = behavior==8?a:b;
		if (line.direction==0) return;

		//find the box's total movement
		let dx = box.x-box.prevX;
		let dy = box.y-box.prevY;

		//choose possible focus point(s) for the box based on line direction
		let vals = {}, fp = null, ca = null, cb = null;
		let chosenVals = null;
		vals[LINE_LEFT] = [box.rightX(),box.midY(),box.rightX(),box.topY(),box.rightX(),box.y];
		vals[LINE_RIGHT] = [box.leftX(),box.midY(),box.leftX(),box.y,box.leftX(),box.topY()];
		vals[LINE_UP] = [box.x,box.y,box.leftX(),box.y,box.rightX(),box.y];
		vals[LINE_DOWN] = [box.x,box.topY(),box.rightX(),box.topY(),box.leftX(),box.topY()];
		chosenVals = vals[line.direction];
		let cross = false;
		if (line.useBoxCorners) { //corner-point detection
			ca = new Point(chosenVals[2],chosenVals[3]);
			cb = new Point(chosenVals[4],chosenVals[5]);

			//choose one
			let angle = line.angle();
			if (angle<Infinity&&Math.abs(toDegrees(angle))!=90) {
				if (angle>0) fp = ca;
				else if (angle<0) fp = cb;
			}
		}
		else fp = new Point(chosenVals[0],chosenVals[1]); //mid-point detection

		//given our focus point(s), check if they collide with the line
		if (fp!=null) { //single focus point
			//a line segment based on box's movement and our focus point
			let b1 = new Point(fp.x-dx,fp.y-dy);
			let b2 = fp;
			//check if the points cross the line
			if (Line.pointsCrossLine(b1,b2,line)) cross = true;
		}
		else { //two focus points
			//line segments based on box's movement and our corner points
			let ca1 = new Point(ca.x-dx,ca.y-dy);
			let ca2 = ca;
			let cb1 = new Point(cb.x-dx,cb.y-dy);
			let cb2 = cb;
			//check if either segment crosses the line segment
			let caSuccess = false, cbSuccess = false;
			if (Line.pointsCrossLine(ca1,ca2,line)) caSuccess = true;
			else if (Line.pointsCrossLine(cb1,cb2,line)) cbSuccess = true;
			if (caSuccess||cbSuccess) {
				cross = true;
				//whichever point collided is the one we focus on now
				fp = caSuccess?ca:cb;
			}
		}

		if (cross) {
			//difference from box position to focus point
			let dfp = new Point(fp.x-box.x,fp.y-box.y); //[fp[0]-box.x,fp[1]-box.y];
			//per each line direction
			//if the focus point is on the 'push' side of the line, then collide
			switch(line.direction) {
				case LINE_LEFT:
					if (fp.x>=line.valueAt(fp.y,'y')) {
						box.x = line.valueAt(fp.y,'y')-dfp.x;
						if (box.velX>0) box.velX = 0;
						box.cSides.r = C_LINE;
					}
					break;
				case LINE_RIGHT:
					if (fp.x<=line.valueAt(fp.y,'y')) {
						box.x = line.valueAt(fp.y,'y')-dfp.x;
						if (box.velX<0) box.velX = 0;
						box.cSides.l = C_LINE;
					}
					break;
				case LINE_UP:
					if (fp.y>=line.valueAt(fp.x,'x')) {
						box.y = line.valueAt(fp.x,'x')-dfp.y;
						if (box.velY>0) box.velY = 0;
						box.cSides.d = C_LINE;
						box.isGrounded = true;
						box.lineGround = line;
					}
					break;
				case LINE_DOWN:
					if (fp.y<=line.valueAt(fp.x,'x')) {
						box.y = line.valueAt(fp.x,'x')-dfp.y;
						if (box.velY<0) box.velY = 0;
						box.cSides.u = C_LINE;
					}
			}
		}
		else if (line.useBoxCorners) {
			let allEndpoints = this.getAllEndpoints();
			//check if passing line's endpoints
			this.collideEndpoint(line.x,line.y,line,box,allEndpoints);
			this.collideEndpoint(line.x2,line.y2,line,box,allEndpoints);
		}
	}
	static pointsCrossLine(p1,p2,line) {
		let l1 = new Point(line.x, line.y);
		let l2 = new Point(line.x2, line.y2);

		if (line.hasPoint(p1)) return true; //previous location was on line
		else if (line.hasPoint(p2)) return true; //current location is on line
		else if (p1.x==p2.x&&p1.y==p2.y) return false; //neither on line, no movement
		else return this.determine(p1,p2,l1,l2); //locations pass pass through line
	}
	static determine(a,b,c,d) {
		let det, gamma, lambda;
		det = (b.x - a.x) * (d.y - c.y) - (d.x - c.x) * (b.y - a.y);
		if (det === 0) return false;
		else {
			lambda = ((d.y - c.y) * (d.x - a.x) + (c.x - d.x) * (d.y - a.y)) / det;
			gamma = ((a.y - b.y) * (d.x - a.x) + (b.x - a.x) * (d.y - a.y)) / det;
			return (-0.01 < lambda && lambda < 1.01) && (-0.01 < gamma && gamma < 1.01);
		}
	}
	static collideEndpoint(x,y,line,box,endpoints) {
		let opp = false;
		for (var i in endpoints) {
			let ep = endpoints[i];
			if (ep.x==x && ep.y==y && line.direction == -ep.direction) opp = true;
		}
		let dirs = {u: opp, d: opp, l: opp, r: opp};
		switch(line.direction) {
			case LINE_UP:
				dirs.u = !opp, dirs.d = false;
				break;
			case LINE_DOWN:
				dirs.u = false, dirs.d = !opp;
				break;
			case LINE_LEFT:
				dirs.l = !opp, dirs.r = false;
				break;
			case LINE_RIGHT:
				dirs.l = false, dirs.r = !opp;
				break;
		}
		let diff = new Point(box.x-box.prevX,box.y-box.prevY);
		let yMin = Math.min(box.topY(),box.topY()-diff.y);
		let yMax = Math.max(box.y,box.y-diff.y);
		if (yMin<=y && y<=yMax) {
			if (dirs.l && box.rightX()-diff.x<=x && x <= box.rightX()) {
				box.x = x-box.halfW();
				if (box.velX>0) box.velX = 0;
				box.cSides.r = C_LINE;
			}
			if (dirs.r && box.leftX()<= x && x <=box.leftX()-diff.x) {
				box.x = x+box.halfW();
				if (box.velX<0) box.velX = 0;
				box.cSides.l = C_LINE;
			}
		}
		let xMin = Math.min(box.leftX(),box.leftX()-diff.x);
		let xMax = Math.max(box.rightX(),box.rightX()-diff.x);
		if (xMin<=x && x<=xMax) {
			if (dirs.u && box.y-diff.y<= y && y <=box.y) {
				box.y = y;
				if (box.velY>0) box.velY = 0;
				box.cSides.d = C_LINE;
				box.isGrounded = true;
				//don't add lineGround because we don't want angle-walking on the end of the line anyway
			}
			if (dirs.d && box.topY()<= y && y <=box.topY()-diff.y) {
				box.y = y+box.height;
				if (box.velY<0) box.velY = 0;
				box.cSides.u = C_LINE;
			}
		}
	}
	static getAllEndpoints() {
		let lines = this.getAll();
		let points = [];
		for (var i in lines) {
			let l = lines[i];
			if (l.direction==void(0)) continue;
			let p1 = new Point(l.x,l.y), p2 = new Point(l.x2,l.y2);
			p1.direction = p2.direction = l.direction;
			points.push(p1,p2);
		}
		return points;
	}

	static onInit() {
		this.modifyPrototype({
			setSectors: Box.prototype.setSectors,
			remove: PhysicsBox.prototype.remove,
			lockSectors: true,
			collisionType: C_LINE,
			drawLayer: 0
		});
	}
	static onlineProperties() {
		super.onlineProperties();
		return ["uid","drawLayer","isLoaded","x","y","x2","y2","size","stroke","direction","useBoxCorners"];
	}
}
initClass(Line,{drawable: true, listType: "uid"});


class Entity extends PhysicsBox {
	constructor(x,y,width,height,duckHeight,health,sheet) {
		super(x,y,width,height);
		this.fullHeight = height;
		this.duckHeight = duckHeight;
		this.ducking = false;
		this.health = health;
		this.maxHealth = health;
		this.dead = false;
		this.sheet = Animation.getSpritesheet(sheet);
		this.direction = RIGHT;
		this.stun = 0;
		this.iframes = 0;
		this.forcedInvuln = false;
		this.actionCooldown = 0;
		this.actionLocked = false;
		this.movementLocked = false;
		this.justSpawned = true;
		this.attackBoxes = [];
	}
	distanceTo(target) {
		if (typeof target=="object") return Math.abs(this.x-target.x);
		else return Math.abs(this.x-target)
	}
	getDirTo(target) { //returns the x-direction in which the entity would be facing the target x-coord or obj
		if (typeof target=="object") {
			if (target.x<this.x) return LEFT;
			else if (target.x>this.x) return RIGHT;
			else return CENTER;
		}
		else {
			if (target<this.x) return LEFT;
			else if (target>this.x) return RIGHT;
			else return CENTER;
		}
	}
	faceTo(target) { this.direction = this.getDirTo(target); };
	calcXPosInFront(distance) { return this.x+(this.halfW()+distance)*this.direction; };

	jump() {
		if (this.particleColor!=null) var color = this.particleColor;
		else {
			if (this.ground&&this.ground.color) var color = this.ground.color;
			else var color = "black";
		}
		Particle.generate(this.x,this.y,0,4,4,10,false,color,270,30,8,2); //x,y,id,amount,size,duration,defyGravity,color,angle,angleRadius,magnitude,magRadius
		var tempVel = 0;
		if (this.heldBy!=null) {
			tempVel = this.heldBy.velY;
			this.heldBy.held = null;
			this.heldBy = null;
		}
		this.velY = tempVel-15;
	}
	move(vel,dir) {
		if (dir) this.direction = dir;
		this.velX = vel*this.direction;
	}
	duck(state) {
		if (state!=null) this.ducking = state;
		else this.ducking = !this.ducking;
		this.height = this.ducking?this.duckHeight:this.fullHeight;
	}
	hurt(damage,attacker) {
		if (this.isInvuln()) return;
		if (Game.onHurt(this,attacker,damage)==CANCEL) return;
		Particle.generate(this.x,this.midY(),0,8,4,10,true,this.particleColor||"red",0,360,5,0);
		Sound.playAt("hurt.ogg",this.x,this.y);
		this.health -= damage;
		if (this.health<=0) this.die(attacker);
		else { //knockback
			let deltaX = this.x - attacker.x;
			let deltaY = this.y - attacker.y;
			let angle = Math.atan2(deltaY,deltaX);
			this.velX = Math.cos(angle)*10;
			this.velY = Math.sin(angle)*10;
			if (Math.abs(this.velY)<=0.5||this.isGrounded) this.velY -= 10;
			Collision.removeAllPairsWith(this,attacker);
			Collision.addPair(this,attacker,0)
			Collision.requestRefresh(this,attacker,2);
			if (this instanceof Player) {
				this.stun = 5;
				this.iframes = 60;
			}
			else this.stun = 60;
		}
	}
	heal(amount) {
		this.health += amount;
		if (this.health>this.maxHealth) this.health = this.maxHealth;
	}

	update() {
		if (this.stun>0) this.stun--;
		if (this.iframes>0) this.iframes--;
		if (this.actionCooldown>0) this.actionCooldown--;
		if (this.actionTick>-1) {
			let action = this.constructor.getAction(this.currentAction);
			this.actionTick++;
			if (action) {
				action.callFrameFunc(this,this.actionTick);
				if (this.actionTick == action.duration) this.completeAction();
			}
			else this.actionTick = -1;
		}
		super.update();
	}
	respawn() {
		this.breakConnections();
		if (this.currentAction!=null) this.cancelAction();
		this.animLock = 0;
		this.justSpawned = true;
		this.isGrounded = false;
		super.respawn();
	}
	die(attacker) {
		Game.onDeath(this,attacker);
		if (this.respawnsOnDeath) {
			this.health = this.maxHealth;
			this.respawn();
		}
		else {
			this.dead = true;
			this.remove();
		}
	}
	breakConnections() { //removes references to this obj from other objects
		if (this.entrance) this.entrance.forget();
		if (this.exit) this.exit.forget();
		if (this.held!=null) {
			this.held.velX = this.velX;
			this.held.velY = this.velY;
			this.held.heldBy = null;
			this.held = null;
		}
		for (var i = this.attackBoxes.length-1; i >= 0; i--) this.attackBoxes[i].remove();
	}
	remove() {
		this.breakConnections();
		super.remove();
	}

	drawElements() {
		var startX = Math.round(this.x-((8*this.health)-1));
		for (var i = 0; i < this.health; i++) {
			Images.drawImage("GUI/HUD_Hearts.png",startX+(16*i),Math.round(this.y-this.fullHeight-17),14,12,0,0,14,12);
		}
	}

	getHitCount() {
		let count = 0;
		for (var i in this.attackBoxes.length) {
			count += this.attackBoxes[i].hitCount;
		}
		return count;
	}
	isInvuln() {
		return this.iframes>0 || this.forcedInvuln;
	}

	static defineAction(name,duration,cooldown,lockMovement,lockActions,defyGravity,prep) {
		if (!name) return;
		if (!this.actions) this.actions = {};
		let action = new Entity.Action(name,duration,cooldown,lockMovement,lockActions,defyGravity,prep);
		this.actions[name] = action;
		return action;
	}
	static getAction(name) {
		if (!name) return console.warn("No action specified");
		if (!this.actions) return console.warn("No actions defined for this class.");
		let action = this.actions[name];
		if (action) return action;
		else if (this!=Entity) return this.parent.getAction(name); // look for action in parent class
	}
	runAction(name) {
		if (this.actionCooldown!=0||this.direction==CENTER||isNaN(this.x)||isNaN(this.y)) return; // any of these conditions prevent actions
		let action = this.constructor.getAction(name);
		if (action) { // found valid action
			let animation = this.sheet.getAnimation(action.name);
			if (animation) { // found valid animation for action
				action.callPrep(this); // call special code for this action
				// make attack boxes, if any
				if (action.attackBoxes.length>0) {
					let attacks = animation.attacks;
					if (attacks) for (var i in action.attackBoxes) {
						let values = action.attackBoxes[i];
						if (values) {
							let attack = attacks[values.index];
							if (attack) {
								let box = AttackBox.create(attack.x[0],attack.y[0],attack.width[0],attack.height[0],this,values.damage,action.duration,attack,animation.framerate);
								if (values.onHurt) {
									box.onHurt = function(victim) {
										this.actionHurt.call(this.attacker,victim);
									}
									box.actionHurt = values.onHurt;
								}
								this.attackBoxes.push(box);
							}
							else console.warn("Couldn't add attack #"+values.index);
						}
					}
					else console.warn("Attacks not defined for animation: "+animation.action);
				}
				// set entity states
				this.actionTick = 0;
				this.actionCooldown = action.cooldown;
				if (action.defyGravity) this.defyGravity = action.defyGravity;
				this.actionLocked = action.lockActions;
				this.movementLocked = action.lockMovement;
				this.currentAction = action.name;
				this.setAnimation(action.name,null,action.duration);
			}
			else console.warn("Invalid animation: "+name);
		}
		else console.warn("Invalid action: "+name);
	}
	completeAction() {
		let action = this.constructor.getAction(this.currentAction);
		if (action) {
			if (action.defyGravity) this.inherit("defyGravity");
			this.actionLocked = false;
			this.movementLocked = false;
		}
		this.currentAction = null;
		this.actionTick = -1;
	}
	cancelAction() {
		if (this.currentAction) this.completeAction();
		for (var i = this.attackBoxes.length-1; i >= 0; i--) this.attackBoxes[i].remove();
		this.animLock = 0;
		this.actionCooldown = 0;
	}

	static onInit() {
		Animation.applyToClass(this);
		this.modifyPrototype({
			draw: function(preventAnimTick) {
				if (this.iframes%2==1) return;
				else Animation.protoDraw.call(this,preventAnimTick);
			},
			drawLayer: 1,
			respawnsOnDeath: false,
			particleColor: null,
			defyGravity: false,
			collisionType: C_ENT,
			canBeCarried: false
		});
		this.Action = class {
			constructor(name,duration,cooldown,lockMovement,lockActions,defyGravity,prep) {
				this.name = name;
				this.duration = parseInt(duration) || 0;
				this.cooldown = parseInt(cooldown) || 0;
				this.lockMovement = !!lockMovement;
				this.lockActions = !!lockActions;
				this.defyGravity = !!defyGravity;
				this.prep = prep;
				this.frameFuncs = [];
				this.attackBoxes = [];
			}
			onFrame(frameNum,func) {
				if (typeof func == "function") this.frameFuncs[frameNum] = func;
				return this;
			}
			onFrames(frameStart,frameEnd,func) {
				for (var i = frameStart; i <= frameEnd; i++) {
					this.onFrame(i,func);
				}
				return this;
			}
			addAttackBox(index,damage,onHurt) {
				if (typeof onHurt != "function") onHurt = null;
				this.attackBoxes.push({index: index, damage: damage, onHurt: onHurt});
				return this;
			}
			callPrep(caller) {
				if (typeof this.prep == "function") this.prep.call(caller);
			}
			callFrameFunc(caller,frameNum) {
				let f = this.frameFuncs[frameNum];
				if (typeof f == "function") f.call(caller);
			}
		}
		this.actions = {};
	}
	static onlineProperties() {
		return super.onlineProperties().concat(["iframes","health","fullHeight"]);
	}
}
initClass(Entity,PhysicsBox);

var chargeAttackReq = 40;
class Player extends Entity {
	constructor(x,y,width,height,duckHeight,health,sheet,slot,direction) {
		super(x,y,width,height,duckHeight,health,sheet);
		this.canBeCarried = true;
		this.thrownDamage = 0;
		this.alwaysLoaded = true;
		if (direction!=void(0)) this.direction = direction;
		this.spawnDirection = this.direction;
		this.slot = slot; //new for players
		if (slot!=null) Player.setSlot(slot,this);
		if (Player.hasHealthCached(slot)) {
			let cache = Player.takeHealthCache(slot);
			this.health = cache[0];
			this.maxHealth = cache[1];
		}
		this.attackHeld = 0;
		this.canUpAirAttack = true;
		this.hadDied = false;
		this.registerCtrls();
	}
	registerCtrls() {
		if (!multiplayer || (online&&this.slot==0)) this.ctrlPack = new CtrlPack();
		else {
			let assigned = Player.ctrlPorts[this.slot];
			if (assigned) this.ctrl = new Ctrl(assigned.type, assigned.id);
		}
	}
	removeCtrls() {
		if (this.ctrl) this.ctrl.selfDestruct();
		if (this.ctrlPack) this.ctrlPack.selfDestructAll();
		this.ctrl = this.ctrlPack = null;
	}
	getCtrl() {
		let ctrl = this.ctrl || (this.ctrlPack? this.ctrlPack.mostRecent() : NullCtrl.get(0));
		if (Player.preventLocalControls && ctrl.type!=WEBIN) return NullCtrl.get(0);
		else return ctrl;
	}

	handleControls(pad) {
		if (pad.pressed("moveLeft")&&!pad.pressed("moveRight")&&!this.movementLocked) {
			if (this.attackBoxes.length>0&&this.direction==RIGHT) this.velX = 0;
			else if (this.heldBy!=null) this.direction = LEFT;
			else this.move(4.5,LEFT);
		}
		if (pad.ready("jump")&&(this.isGrounded||this.heldBy!=null||this.multiJump)&&!this.actionLocked) {
			pad.use("jump");
			this.jump();
		}
		if (pad.pressed("moveRight")&&!pad.pressed("moveLeft")&&!this.movementLocked) {
			if (this.attackBoxes.length>0&&this.direction==LEFT) this.velX = 0;
			else if (this.heldBy!=null) this.direction = RIGHT;
			else this.move(4.5,RIGHT);
		}
		if (pad.pressed("crouch",0.8)&&this.isGrounded&&!this.actionLocked) {
			this.velX = 0;
			if (!this.ducking) this.duck(true);
			if (pad.ready("attack")&&this.held==null&&this.animLock==0) {
				this.liftObject();
				pad.use("attack");
			}
		}
		else if (this.ducking) this.duck(false);
		if (pad.ready("attack")) {
			if (this.held==null) {
				if (pad.pressed("lookUp",0.8)||pad.ready("jump")) {
					if (this.isGrounded) this.runAction("attack-upward");
					else if (this.canUpAirAttack) this.runAction("attack-upward-air");
				}
				else if (pad.pressed("crouch",0.8)&&!this.isGrounded) this.runAction("attack-down-stab");
				else this.runAction("attack");
				pad.use("attack");
			}
			else if (this.currentAction!="lift") {
				if (pad.pressed("crouch",0.8)&&this.isGrounded) this.dropHeldObject();
				else this.throwHeldObject();
				pad.use("attack");
			}
		}
		else if (pad.pressed("attack")) this.attackHeld += 1;
		else {
			if (this.attackHeld>=chargeAttackReq&&this.held==null) {
				if (this.ducking) this.runAction("attack-upward");
				else this.runAction(this.isGrounded?"attack-charge":"attack-charge-air");
			}
			this.attackHeld = 0;
		}
	}
	chooseAnimation(pad) {
		if (this.held==null) {
			if (this.exit&&this.exit.exitStep>2) this.setAnimation("invisible");
			else if (this.entrance&&this.entrance.enterStep<2) this.setAnimation("invisible");
			else if (!this.isGrounded&&this.heldBy==null&&!this.lineGround) this.setAnimation("jump");
			else if (this.velX!=0&&this.heldBy==null) this.setAnimation("run");
			else if (this.ducking) this.setAnimation("crouch");
			else this.setAnimation("stand");
		}
		else {
			if (!this.isGrounded&&this.heldBy==null&&!this.lineGround) this.setAnimation("carry-jump");
			else if (this.velX!=0) this.setAnimation("carry-run");
			else if (this.ducking) this.setAnimation("carry-crouch");
			else this.setAnimation("carry-stand");
		}
	}
	usingEntrance() {
		return !!(this.entrance||this.exit);
	}

	liftObject() {
		if (this.actionCooldown!=0) return;
		var objs = PhysicsBox.getLoaded();
		for (var i in objs) {
			var box = objs[i];
			if (!box.canBeCarried) continue;
			if (box.heldBy||this.heldBy==box) continue;
			if (Math.abs(box.topY()-this.y)<=0.1&&this.rightX()>=box.leftX()&&this.leftX()<=box.rightX()) {
				this.held = box;
				box.heldBy = this;
				Collision.findPair(this,box).refresh();
				this.velY = 0;
				this.runAction("lift");
				break;
			}
		}
	}
	throwHeldObject() {
		var throwing = this.held;
		if (!throwing) return;
		throwing.velX = this.direction*6.5+this.velX;
		throwing.velY = -7+this.velY;
		throwing.y += this.velY;
		var xFunct = function(thrownObj,harm) { return thrownObj.x; };
		var yFunct = function(thrownObj) { return thrownObj.y+5; };
		if (throwing.thrownDamage>0) {
			var throwHurt = HurtBox.create(throwing.x,throwing.y+5,throwing.width+10,throwing.height+10,throwing,throwing.thrownDamage,1000,xFunct,yFunct,function(thrownObj,harm) {
				return (thrownObj.velX==0&&thrownObj.velY==0)||thrownObj.isGrounded;
			});
			throwHurt.harmed[this.uid] = this;
		}
		throwing.heldBy = null;
		this.held = null;
		Collision.removeAllPairsWith(throwing);
		Collision.addPair(this,throwing,0);
		Collision.requestRefresh(this,throwing,20);
	}
	dropHeldObject() {
		var drop = this.held;
		if (!drop) return;
		drop.x = this.calcXPosInFront(drop.halfW());
		drop.y = this.midY();
		drop.heldBy = null;
		this.held = null;
		Collision.removeAllPairsWith(drop);
	}
	dragHeldObject(velX,velY) { // reposition carried objects
		if (this.held!=null) {
			if (this.held.deleted) this.held = null;
			else {
				this.held.x = this.x;
				this.held.y = this.y;
				var animation = this.sheet.getAnimation(this.animCurrent);
				var frameIndex = Math.floor(this.animFrame*0.2);
				if (animation.holp) {
					var holp = animation.holp;
					if (holp.x) {
						var xShift = 0, widthFactor = this.held.width;
						if (holp.x.placement[frameIndex]!=null) xShift = holp.x.placement[frameIndex];
						else xShift = holp.x.placement[0] || 0;
						if (holp.x.widthFactor[frameIndex]!=null) widthFactor *= holp.x.widthFactor[frameIndex];
						else widthFactor *= holp.x.widthFactor[0] || 0;
						this.held.x += xShift + widthFactor;
					}
					if (holp.y) {
						var yShift = 0, heightFactor = this.held.height;
						if (holp.y.placement[frameIndex]!=null) yShift = holp.y.placement[frameIndex];
						else yShift = holp.y.placement[0] || 0;
						if (holp.y.heightFactor[frameIndex]!=null) heightFactor *= holp.y.heightFactor[frameIndex];
						else heightFactor *= holp.y.heightFactor[0] || 0;
						this.held.y -= yShift + heightFactor;
					}
				}
				this.held.velX = velX;
				this.held.velY = velY;
			}
		}
	}

	update() {

		if (this.justSpawned&&!this.currentAction) this.runAction("drawing");
		if (this.isGrounded) this.canUpAirAttack = true;

		// if not stunned, run controls
		let controller = this.getCtrl();
		if (this.stun==0&&!this.usingEntrance()) this.handleControls(controller);
		this.chooseAnimation(controller);

		var tempVelX = this.velX, tempVelY = this.velY;
		super.update();
		this.dragHeldObject(tempVelX,tempVelY);
	}
	die() {
		let canRespawn = Player.loseLife(this.slot);
		if (canRespawn) {
			this.warpLimbo();
			this.hadDied = true;
			this.wait(60,function() {
				if (!this.deleted) this.superMethod("die");
			});
		}
		else {
			this.respawnsOnDeath = false;
			super.die();
		}
	}
	remove() {
		this.removeCtrls();
		Player.clearFromSlot(this);
		super.remove();
	}
	respawn() {
		this.direction = this.spawnDirection;
		this.attackHeld = 0;
		super.respawn();
	}

	drawHud() {
		if (Player.getSlot(this.slot)==this || this.remoteObject) {
			let lives = Player.getLives(this.slot);
			if (lives>0&&lives<Infinity) {
				Images.drawImage(this.sheet.pages[this.animPage],10,10+(24*this.slot),19,19,0,0,19,19);
				fontPlayerHud.draw("/ "+lives,35,27+(24*this.slot),WIDTH,LEFT);
			}
		}
	}
	drawElements() {
		if (this.attackHeld>=chargeAttackReq&&!this.held) Images.drawImage("GUI/HUD_!.png",this.x-2,this.topY()-4,4,-16);
		else super.drawElements();
	}

	static add(slot) {
		if (slot>=this.slots.length) this.lives[slot] = this.defaultLives;
		if (!this.hasLives(slot)) return;
		let sheet = ["Blueman.json","Redman.json","Greenman.json","Yellowman.json"][slot%4];
		if (!multiplayer) sheet = "Doodleman.json";
		let spawn = Level.level.playerSpawns[slot] || Level.level.playerSpawns[0] || {x: 0, y: 0, direction: RIGHT};
		let player = Player.create(spawn.x,spawn.y,19,44,38,4,sheet,slot,spawn.direction);
	}
	static addAll() {
		this.add(0);
		if (multiplayer) {
			for (var i = 1; i < this.slots.length; i++) {
				if (this.ctrlInSlot(i)) this.add(i);
			}
		}
	}
	static setSlot(slot,player) {
		if (!this.slots[slot]&&Game.mode!=GAME_EDITOR) this.slots[slot] = player;
	}
	static clearFromSlot(player) {
		if (this.slots[player.slot]==player) {
			this.slots[player.slot] = null;
			let ps = this.findAllOfSlot(player.slot);
			for (var i in ps) {
				if (ps[i]!=player) {
					this.setSlot(player.slot,ps[i]);
					break;
				}
			}
		}
	}
	static getSlot(slot) {
		return this.slots[slot];
	}
	static findAllOfSlot(slot) {
		let all = this.getAll();
		let result = [];
		for (var i in all) {
			if (all[i].slot==slot) result.push(all[i]);
		}
		return result;
	}
	static assignCtrl(slot,type,id) {
		this.ctrlPorts[slot] = {type: type, id:id};
	}
	static clearCtrlAssignments() {
		this.ctrlPorts = [null,null,null,null];
	}
	static relinkCtrls() {
		for (var i in this.ctrlPorts) {
			let ctrlPort = this.ctrlPorts[i];
			if (ctrlPort) {
				let manager = [NullCtrl,Key,GamePad,Tap,WebInput][ctrlPort.type];
				let ctrlMap = manager.ctrlMaps[ctrlPort.id];
				if (!ctrlMap) this.ctrlPorts[i] = null;
			}
		}
		let all = this.getAll();
		for (var i in all) {
			let p = all[i];
			p.removeCtrls();
			p.registerCtrls();
		}
	}
	static ctrlInSlot(slot) {
		return !!this.ctrlPorts[slot];
	}
	static removeUncontrolled(except) {
		let list = this.getAll();
		for (var i in list) {
			if (except!=void(0) && list[i].slot==except) continue;
			if (!this.ctrlInSlot(list[i].slot)) {
				this.setLives(list[i].slot,0);
				list[i].remove();
			}
		}
	}
	static setLives(slot,amount) {
		this.lives[slot] = amount;
	}
	static setAllLives(amount) {
		this.defaultLives = amount;
		for (var i in this.slots) {
			this.lives[i] = amount;
		}
	}
	static getLives(slot) {
		if (typeof this.lives[slot] == "number") {
			return this.lives[slot];
		}
		return 0;
	}
	static loseLife(slot) {
		let ps = this.findAllOfSlot(slot);
		if (ps.length==1) {
			if (typeof this.lives[slot] == "number") {
				this.lives[slot]--;
				return this.lives[slot] > 0;
			}
		}
		return false;
	}
	static hasLives(slot) {
		return this.lives[slot] > 0;
	}
	static grantLives(slot) {
		this.setLives(slot,this.defaultLives);
	}
	static hasHealthCached(slot) {
		return typeof this.healthCache[slot] == "number";
	}
	static cacheHealth(slot,health,max) {
		if (this.hasHealthCached(slot)) {
			if (health > this.healthCache[slot]) this.healthCache[slot] = health;
			if (max > this.maxHealthCache[slot]) this.maxhealthCache[slot] = max;
		}
		else {
			this.healthCache[slot] = health;
			this.maxHealthCache[slot] = max;
		}
	}
	static cacheAllHealth() {
		let all = this.getAll();
		for (var i in all) this.cacheHealth(all[i].slot,all[i].health,all[i].maxHealth);
	}
	static takeHealthCache(slot) {
		let health = this.healthCache[slot];
		let max = this.maxHealthCache[slot];
		this.healthCache[slot] = null;
		this.maxHealthCache[slot] = null;
		return [health, max];
	}

	static onInit() {
		this.preventLocalControls = false,
		this.modifyPrototype({
			drawLayer: 2,
			respawnsOnDeath: true,
			multiJump: false
		});
		this.slots = [null,null,null,null];
		this.ctrlPorts = [null,null,null,null];
		this.lives = [0,0,0,0];
		this.defaultLives = 0;
		this.healthCache = [null,null,null,null];
		this.maxHealthCache = [null,null,null,null];
		this.actions = {};
		this.defineAction("drawing",35,35,true,true,true,function() {
			this.collisionType = C_NONE;
			this.forcedInvuln = true;
		}).
		onFrame(35,function() {
			this.inherit("collisionType");
			Collision.removeAllPairsWith(this);
			this.justSpawned = false;
			if (this.hadDied) {
				this.iframes = 60;
				this.hadDied = false;
			}
			this.forcedInvuln = false;
		});
		this.defineAction("lift",15,15,true,false,true);
		this.defineAction("attack",20,30,false,false,false,function() {
			Sound.playAt("sword-swipe.ogg",this.x,this.y);
		}).addAttackBox(0,1);
		this.defineAction("attack-charge",20,30,true,true,true,function() {
			this.move(10);
			this.velY = 0;
			Sound.playAt("sword-swipe.ogg",this.x,this.y);
		}).addAttackBox(0,2);
		this.defineAction("attack-charge-air",20,30,true,true,true,function() {
			this.move(10);
			this.velY = 0;
			Sound.playAt("sword-swipe.ogg",this.x,this.y);
		}).addAttackBox(0,2);
		this.defineAction("attack-upward",20,30,true,null,null,function() {
			Sound.playAt("sword-swipe.ogg",this.x,this.y);
		}).addAttackBox(0,1);
		this.defineAction("attack-upward-air",20,30,false,true,true,function() {
			this.velY = -6;
			this.move(5);
			this.canUpAirAttack = false;
			Sound.playAt("sword-swipe.ogg",this.x,this.y);
		}).
		addAttackBox(0,1,function() { // if hurt something, can up-attack again
			this.canUpAirAttack = true;
			this.actionCooldown = this.animLock+2;
		});
		this.defineAction("attack-down-stab",30,60,true,true,false,function() {
			this.velY = -7;
		}).addAttackBox(0,1).
		onFrame(5,function() {
			this.velY = 5;
			this.stun = 40;
			Sound.playAt("sword-swipe.ogg",this.x,this.y);
		}).
		onFrame(12,function() {
			if (!this.ground&&!this.lineGround&&this.y!=Level.level.height) {
				this.attackBoxes[0].time++;
				this.attackBoxes[0].frame--;
				this.animFrame--;
				this.animLock++;
				this.actionCooldown++;
				this.actionTick--;
			}
		});
	}
	static onlineProperties() {
		return super.onlineProperties().concat(["slot","attackHeld","held"]);
	}
}
initClass(Player,Entity);

class Enemy extends Entity {
	constructor(x,y,width,height,health,sheet,duckHeight) {
		super(x,y,width,height,duckHeight,health,sheet);
		this.canBeCarried = true; //overwrites
		this.thrownDamage = 1;
		this.direction = LEFT;
		this.target = null;//new to enemy
		this.post = null;
		this.paceTarget = null;
		this.standbyTick = 0;
		if (Game.mode!=GAME_EDITOR) this.setAnimation("invisible");
	}

	levelTest(blockBox,ignoreUIDs,customBoxTest,customLineTest) {
		/*
		Iterates over all loaded boxes and lines, and runs tests on them.
		Returns an object that contains the results of both tests.
		First test: to see if there is something intersects the blockBox,
			indicating that it is obstructing the Enemy. This includes solid/kill screen edges
		Second test: custom, defined by parameters
		If at any point the first test succeeds, the results are returned immediately,
			regardless of whether or not the second test has passed yet (will get false negatives)
		*/
		// Check for solid screen edges first
		let edge = Level.level.edge;
		if (edge.left == EDGE_SOLID || edge.left == EDGE_KILL) {
			if (blockBox.leftX() <= 0) return {blocked: true, custom: false};
		}
		else if (edge.right == EDGE_SOLID || edge.right == EDGE_KILL) {
			if (blockBox.rightX() >= Level.level.width) return {blocked: true, custom: false};
		}
		else if (edge.top == EDGE_SOLID || edge.top == EDGE_KILL) {
			if (blockBox.topY() <= 0) return {blocked: true, custom: false};
		}
		else if (edge.bottom == EDGE_SOLID || edge.bottom == EDGE_KILL) {
			if (blockBox.bottomY() >= Level.level.height) return {blocked: true, custom: false};
		}
		// now run the actual test
		if (!ignoreUIDs) ignoreUIDs = {};
		let customSuccess = false;
		let boxes = PhysicsBox.getLoaded();
		for (var i in boxes) {
			let box = boxes[i];
			if (box==this||ignoreUIDs[box.uid]) continue;
			if (box.intersect(blockBox)) return {blocked: true, custom: customSuccess};
			if (!customSuccess&&typeof customBoxTest=="function") customSuccess = customBoxTest(box);
		}
		let lines = Line.getLoaded();
		for (var i in lines) {
			let line = lines[i];
			if (ignoreUIDs[line.uid]) continue;
			if (line.direction==LINE_LEFT||line.direction==LINE_RIGHT) {
				if (line.intersect(blockBox)) return {blocked: true, custom: customSuccess};
			}
			if (!customSuccess&&typeof customBoxTest=="function") customSuccess = customLineTest(line);
		}
		return {blocked: false, custom: customSuccess};
	}
	walkingTest(frontBox,groundBox) {
		let test = this.levelTest(frontBox,null,function(box) {
			return box.intersect(groundBox);
		},
		function(line) {
			if (line.direction==LINE_UP) return line.intersect(groundBox);
			else return false;
		});
		return !test.blocked&&(test.custom || groundBox.y >= Level.level.height);
	}

	handleTarget() {
		this.faceTo(this.target);
		let dist = this.distanceTo(this.target);
		let distY = Math.abs(this.y-this.target.y);
		if (this.exclaim<=0) {
			let frontBox = new Box(this.calcXPosInFront(15/2),this.y-1,15,this.height-2);
			let jumpBox = new Box(this.calcXPosInFront(0),this.y,10,126); // 126 is current jump height. Todo: replace with jumpHeight()
			let searchUp = this.target.y<this.topY()-10;
			if (dist>30&&this.stun==0) {
				// follow
				if (!this.movementLocked) this.move(2.5);
				// jump
				if (this.isGrounded) {
					let ignores = {};
					ignores[this.target.uid] = true;
					let test = this.levelTest(frontBox,ignores,function(box) {
						return searchUp && (jumpBox.containsPoint(box.leftX(),box.topY()) || jumpBox.containsPoint(box.rightX(),box.topY()));
					},
					function(line) {
						return searchUp && (jumpBox.containsPoint(line.x,line.y) || jumpBox.containsPoint(line.x2,line.y2));
					});
					if (test.blocked||test.custom) this.jump();
				}
			}
			else {
				//attack
				if (this.target.intersect(frontBox)&&this.stun==0) this.runAction("attack");
			}
		}
		//forget
		if ((dist>200||distY>300)&&this.exclaim<=-120) {
			this.target = null;
			this.standbyTick = 0;
			this.post = this.x;
			this.paceTarget = this.x;
		}
	}
	chooseAnimation() {
		if (this.justSpawned) this.setAnimation("invisible");
		else if (!this.isGrounded&&this.heldBy==null) this.setAnimation("jump");
		else if (this.velX!=0&&this.heldBy==null) this.setAnimation("run");
		else this.setAnimation("stand");
	}
	neutralBehavior() {
		if (this.standbyTick>=240) {
			this.paceTarget = this.post+Math.floor(25+Math.round(Math.random()*40)+1)*(Math.random()<0.5? -1:1);
			if (this.paceTarget<0||this.paceTarget>Level.level.width) this.paceTarget = this.post;
			this.standbyTick = -1;
		}
		this.standbyTick += 1;
		if (this.paceTarget!=null&&Math.abs(this.x-this.paceTarget)>3) {
			this.faceTo(this.paceTarget);
			if (this.stun==0) {
				let frontBox = new Box(this.calcXPosInFront(1),this.y-1,2,this.height-2);
				let groundBox = new Box(this.calcXPosInFront(0.8),this.y+1,1.5,2);
				if (this.walkingTest(frontBox,groundBox)) this.move(1.5);
			}
		}
		else this.paceTarget = null;
	}
	findPlayers() {
		let allPlayers = Player.getAll();
		let closestDist = Infinity;
		for (var i in allPlayers) {
			let p = allPlayers[i];
			let distX = this.distanceTo(p);
			let dir = this.getDirTo(p);

			// if player is within x-range and enemy is facing them
			if (distX<=200&&dir==this.direction) {
				if (p.y>this.y-100&&p.y<this.y+100) { // if player is within y-range
					let trueDist = Math.sqrt(Math.pow(distX,2) + Math.pow(p.y-this.y,2));
					if (trueDist < closestDist) { // if player is closest found yet
						this.target = p; // player is new target
						this.exclaim = 30; // enemy is in alerted mode
					}
				}
			}
		}
	}

	update() {
		if ((isNaN(this.x)||isNaN(this.y) && !this.entrance && !this.exit)) this.respawn();
		if (this.justSpawned) {
			this.collisionType = C_WEAK;
			if (this.isGrounded) {
				this.justSpawned = false;
				this.collisionType = C_ENT;
				this.post = this.x;
				this.setAnimation("emerge",null,"full");
				this.stun = 25;
			}
		}
		else if (this.heldBy!=null) { //do nothing while held
			this.exclaim = -1;
			this.target = this.heldBy;
			this.stun = 120;
		}
		else {
			//counters
			this.exclaim -= 1;
			//choose which behavior to use based on whether or not target is around
			if (this.target!=null) {
				if (!PhysicsBox.has(this.target)) this.target = null; //lost target
				else this.handleTarget();
			}
			else {
				this.neutralBehavior();
				this.findPlayers();
			}
		}
		this.chooseAnimation();

		super.update();
	}

	drawTint() {
		if (devEnabled) {
			if (this.target==null) {
				c.fillStyle = "rgba(255,255,0,0.1)";
				c.fillRect(this.x-200,this.y-100,400,200);
			}
			else if (this.exclaim!=null&&this.exclaim<0) {
				c.fillStyle = "rgba(255,0,0,0.1)";
				c.fillRect(this.x-200,this.y-300,400,600);
			}
		}
	}
	drawDebug() {
		c.lineWidth = 1;
		c.strokeStyle = "hotpink";
		drawCircle(this.post,this.y,5);
		drawLine(this.post+75,this.y-5,this.post+75,this.y+5);
		drawLine(this.post-75,this.y-5,this.post-75,this.y+5);
		c.strokeStyle = "purple";
		if (this.paceTarget!=null) drawCircle(this.paceTarget,this.y,5);
		super.drawDebug();
	}
	drawElements() {
		if (this.exclaim!=null&&this.exclaim>=0) Images.drawImage("GUI/HUD_!.png",this.x-2,this.topY()-4,4,-16);
		else if (!this.justSpawned) super.drawElements();
	}

	static onInit() {
		this.prototype.particleColor = "#6a00d8";
		this.actions = {};
		this.defineAction("attack",18,30,false,false,false,function() {
			this.stun = 30;
			Sound.playAt("punch.ogg",this.x,this.y);
		}).addAttackBox(0,1);
	}
	static onlineProperties() {
		return super.onlineProperties().concat(["target","exclaim","post","paceTarget","justSpawned"]);
	}
}
initClass(Enemy,Entity);

class PaintMinion extends Enemy {
	constructor(x,y) {
		if (currentMonth==9 && (currentHour > 18 || currentHour < 7)) {
			// spoopy easter egg
			super(x,y,19,44,3,"Skeltal.json",38);
			this.particleColor = "gray";
		}
		else super(x,y,19,44,2,"PaintMinion.json",38); // normal
	}
}
initClass(PaintMinion,Enemy);

class PaintBlob extends Enemy {
	constructor(x,y) {
		super(x,y,26,22,1,"PaintBlob.json");
		this.idleTick = 0;
	}
	update() {
		super.update();
		if (!this.wasGrounded && this.isGrounded) {
			this.cancelAction();
			this.runAction("land");
		}

	}
	move(vel,dir) {
		if (this.isGrounded && !this.currentAction) {
			super.move(vel,dir);
			this.cancelAction();
			this.runAction("hop");
		}
	}
	jump() {
		if (!this.currentAction) super.jump();
	}
	neutralBehavior() {
		if (this.stun==0) {
			if (this.idleTick==0) {
				let frontBox = new Box(this.calcXPosInFront(1),this.y-1,2,this.height-2);
				let groundBox = new Box(this.calcXPosInFront(0.8),this.y+1,1.5,2);
				if (this.walkingTest(frontBox,groundBox) && !this.movementLocked) this.move(1.5);
				// else if (this.direction==LEFT) this.direction = RIGHT;
				// else this.direction = LEFT;
				else this.direction *= -1;
				this.idleTick = 120;
			}
			else this.idleTick--;
		}
	}
	chooseAnimation() {
		if (this.justSpawned) this.setAnimation("invisible");
		else if (!this.isGrounded) this.setAnimation("fall");
		else this.setAnimation("stand");
	}
	static onInit() {
		this.actions = {};
		this.defineAction("hop",20,20,true,false,false).onFrame(2,function() {
			this.velY -= 8;
			this.hopVelX = this.velX;
		}).onFrames(3,20,function() { this.velX = this.hopVelX });
		this.defineAction("land",10,10,true,true,false);
		let spray = function() {
			Particle.generate(this.x,this.y,0,30,4,10,false,this.particleColor,-90,90,10,2,false);
		};
		this.defineAction("attack",75,100,true,true,false).onFrame(75,function() {
			this.stun = 10;
		}).onFrame(15,spray).onFrame(60,spray).addAttackBox(0,1).addAttackBox(1,1);
	}
}
initClass(PaintBlob,Enemy);

class Skeltal extends Enemy {
	constructor(x,y) {
		super(x,y,19,44,3,"Skeltal.json",38);
	}
	static onInit() {
		this.prototype.particleColor = "gray";
	}
}
initClass(Skeltal,Enemy);

class Collectable extends Interactable {
	constructor(x,y,width,height) {
		super(x,y,width,height,void(0),Player);
	}
	onIntersect(player) {
		if (Game.onCollect(player,this)!=CANCEL) {
			this.affect(player);
			this.remove();
		}
	}
	affect(p) {}
}
initClass(Collectable,Interactable);

class PlusHeart extends Collectable {
	constructor(x,y,hp) {
		super(x,y,18,18);
		this.hp = hp==void(0)?0:hp;
		this.sheet = Animation.getSpritesheet("PlusHeart.json");
	}
	update() {
		this.setAnimation("static");
		if (Math.random()<(1/500)) this.setAnimation("heartbeat",null,"full");
		super.update();
	}
	affect(p) {
		p.heal(this.hp);
	}
	static onInit() {
		Animation.applyToClass(this);
	}
}
initClass(PlusHeart,Collectable);

class MaxHeart extends PlusHeart {
	constructor(x,y) {
		super(x,y);
		this.sheet = Animation.getSpritesheet("MaxHeart.json");
	}
	affect(p) {
		p.heal(p.maxHealth);
	}
}
initClass(MaxHeart,PlusHeart);

class GoldenHeart extends PlusHeart {
	constructor(x,y) {
		super(x,y);
		this.sheet = Animation.getSpritesheet("GoldenHeart.json");
	}
	affect(p) {
		p.maxHealth++;
		p.heal(p.maxHealth);
	}
}
initClass(GoldenHeart,PlusHeart);


class View extends _c_ {
	constructor(name,x,y,width,height,style,fill) {
		super();
		this.name = name;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.style = style;
		this.fill = fill;
		this.layer = null;
		this.visible = false;
		this.children = [];
		this.subviews = [];
		this.startElement = null;
		this.pathNodeCount = 0;
		this.onShowFunction = function() {};
		this.requireUserAction = false;
		G$.store(name,this);
	}
	show(src) {
		this.visible = true;
		this.onShow(src);
		for (var i in this.children) this.children[i].onViewShown();
		return this;
	}
	hide() {
		this.visible = false;
		return this;
	}
	showSubviews() {
		for (var i in this.subviews) {
			if (this.subviews[i].wasVisibleInBaseView) {
				delete this.subviews[i].wasVisibleInBaseView;
				this.subviews[i].visible = true;
				this.subviews[i].onShow();
			}
		}
		return this;
	}
	hideSubviews() {
		for (var i in this.subviews) {
			if (this.subviews[i].visible) {
				this.subviews[i].visible = false;
				this.subviews[i].wasVisibleInBaseView = true;
			}
		}
		return this;
	}
	onShow(src) {
		if (this.onShowFunction) {
			if (this.requireUserAction) return attemptUserAction(this.onShowFunction,src,this);
			this.onShowFunction();
			return true;
		}
		return false;
	}
	setOnShow(func,requireUserAction) {
		this.onShowFunction = func;
		this.requireUserAction = requireUserAction;
		return this;
	}
	open(src,keepOpen) {
		if (this.layer) console.log("View '"+this.name+"' is already open");
		else {
			if (!keepOpen&&View.focus>0) this.prevLayer = View.uiStack[View.focus].hide().hideSubviews();
			View.uiStack.push(this);
			this.layer = ++View.focus;
			this.show(src);
			guiStartElement = this.startElement;
			guiSelectedElement = guiSelectedElement? this.startElement : null;
		}
		return this;
	}
	openOnTop(src) {
		return this.open(src,true);
	}
	close() {
		if (this.layer==null) console.log("View '"+this.name+"' is already closed.");
		else {
			let top = View.uiStack.pop();
			if (this==top) {
				this.hide();
				for (var i = this.subviews.length-1; i >= 0; i--) this.subviews[i].closesub();
				View.focus--;
				this.layer = null;
				if (this.prevLayer) {
					this.prevLayer.show().showSubviews();
					this.prevLayer = null;
				}
				let newTop = View.uiStack[View.focus];
				if (newTop) {
					guiStartElement = newTop.startElement;
					guiSelectedElement = guiStartElement? newTop.startElement : null;
				}
				else guiStartElement = guiSelectedElement = null;
			}
			else { // close all layers on top to close this one
				View.uiStack.push(top);
				let i = View.uiStack.indexOf(this);
				while (View.uiStack.length > i) {
					View.uiStack[View.focus].close();
				}
			}
		}
		return this;
	}
	opensub(src) {
		// opens as a subview, not unfocusing the previous stuff
		if (this.layer) console.log("View '"+this.name+"' is already open");
		else {
			this.baseview = View.uiStack[View.focus];
			this.baseview.subviews.push(this);
			this.layer = View.focus;
			this.show(src);
		}
		return this;
	}
	closesub() {
		if (this.layer==null) console.log("View '"+this.name+"' is already closed.");
		else if (this.baseview) {
			if (guiSelectedElement&&guiSelectedElement.view==this) guiSelectedElement = this.baseview.startElement;
			this.baseview.subviews.splice(this.baseview.subviews.indexOf(this),1);
			this.layer = this.baseview = null;
			this.hide();
		}
		else console.log("'"+this.name+"' is open as a base View, not a subview.")
		return this;
	}
	subMoveToTop(src) {
		this.closesub();
		this.opensub(src);
	}
	drawHud() {
		if (!this.style||!this.visible) return;
		switch(this.style) {
			case "tint":
				c.fillStyle = this.fill;
				c.globalAlpha = 0.5;
				c.fillRect(this.x,this.y,this.width,this.height);
				c.globalAlpha = 1;
				break;
			case "window":
				Images.drawBorderedImage("GUI/Window.png",this.x,this.y,this.width,this.height,8,16,0,0);
		}
	}
	removeAllChildren() {
		for (var i = this.children.length-1; i >= 0; i--) this.children[i].remove();
	}
	remove() {
		this.hide();
		if (this.baseview) this.closesub();
		if (this.layer) this.close();
		this.removeAllChildren();
		G$.delete(this.name);
		super.remove();
	}
	static onInit() {
		this.uiStack = [null]; // layer "0" means don't draw
		this.focus = 0;
	}
}
initClass(View,{listType: "array"});

class GuiElement extends _c_ {
	constructor(name,viewName,x,y) {
		super();
		this.name = name;
		this.view = G$(viewName);
		this.view.children.push(this);
		this.x = x;
		this.y = y;
		this.visible = false;
		this.shouldDoDraws = true;
		this.neighbors = {up:null, right:null, down:null, left:null};
		G$.store(name,this);
		if (this.view.name&&this.view.visible) this.earlyOnViewShown = true;
	}
	show() { this.visible = true; return this; }
	hide() { this.visible = false; return this; }
	isVisible() { return this.visible&&this.view.visible; }
	drawHud() {
		if (this.isVisible()&&this.shouldDoDraws) this.drawGUI();
	}
	drawGUI() { }
	update() { }
	remove() {
		this.view.children.splice(this.view.children.indexOf(this),1);
		G$.delete(this.name);
		super.remove();
	}
	onViewShown() { }
	shouldDraw(bool) {
		this.shouldDoDraws = bool;
		return this;
	}
	up(name) {
		this.neighbors.up = name;
		return this;
	}
	down(name) {
		this.neighbors.down = name;
		return this;
	}
	left(name) {
		this.neighbors.left = name;
		return this;
	}
	right(name) {
		this.neighbors.right = name;
		return this;
	}
	untie() {
		let opposite = {up: "down", down: "up", left:"right", right:"left"};
		for (let dir in this.neighbors) {
			let neighbor = this.neighbors[dir];
			if (neighbor && neighbor[opposite[dir]]==this.name) neighbor[opposite[dir]] = null;
			this.neighbors[dir] = null;
		}
	}
	setAsStart() {
		this.view.startElement = this;
		if (this.view.visible) guiStartElement = this;
		return this;
	}
	select() {
		return guiSelectedElement = this;
	}
	selectDir(dir) {
		let neighbor = G$(this.neighbors[dir]);
		if (neighbor.isVisible&&neighbor.isVisible()&&typeof neighbor.select=="function"){
			let inverted = ["down","up","right","left"][["up","down","left","right"].indexOf(dir)];
			neighbor[inverted](this.name);
			return neighbor.select(dir);
		}
		else return this;
	}
	static pathHor(names) {
		// link a list of elements horizontally
		if (names.length<2) return;
		for (var i = 0; i < names.length; i++) {
			let b = G$(names[i]);
			if (i!=0) b.left(names[i-1]);
			if (i!=names.length-1) b.right(names[i+1]);
		}
	}
	static pathVert(names) {
		// link a list of elements vertically
		if (names.length<2) return;
		for (var i = 0; i < names.length; i++) {
			let b = G$(names[i]);
			if (i!=0) b.up(names[i-1]);
			if (i!=names.length-1) b.down(names[i+1]);
		}
	}
	static pathGrid(names2d) {
		// link a 2d grid of elements vertically and horizontally
		let transpose = [];
		for (var i = 0; i < names2d.length; i++) {
			this.pathHor(names2d[i]);
			for (var j = 0; j < names2d[i].length; j++) {
				if (!transpose[j]) transpose[j] = [];
				transpose[j][i] = names2d[i][j];
			}
		}
		for (var j = 0; j < transpose.length; j++) {
			this.pathVert(transpose[j]);
		}
	}
	static funnelTo(targetName,dir,sourceNames) {
		// link the target element to each source in the corresponding direction
		if (["up","down","left","right"].indexOf(dir)==-1) return;
		for (var i in sourceNames) {
			let source = G$(sourceNames[i]);
			source[dir](targetName);
		}
	}
}
initClass(GuiElement,{listType: "array"});

class PathNode extends GuiElement {
	constructor(name,viewName) {
		super(name,viewName,0,0);
		this.show();
	}
	select(srcDir) {
		if (srcDir) this.selectDir(srcDir);
	}
	static createIn(viewName) {
		let view = G$(viewName);
		return PathNode.create("_PathNode_:"+viewName+":"+(view.pathNodeCount++),viewName);
	}
	static tieHor(viewName,leftList,rightList) {
		let node = this.createIn(viewName);
		for (var i in leftList) {
			let elem = G$(leftList[i]);
			elem.right(node.name);
			if (i==0) node.left(elem.name);
		}
		for (var i in rightList) {
			let elem = G$(rightList[i]);
			elem.left(node.name);
			if (i==0) node.right(elem.name);
		}
		return node;
	}
	static tieVert(viewName,upList,downList) {
		let node = this.createIn(viewName);
		for (var i in upList) {
			let elem = G$(upList[i]);
			elem.down(node.name);
			if (i==0) node.up(elem.name);
		}
		for (var i in downList) {
			let elem = G$(downList[i]);
			elem.up(node.name);
			if (i==0) node.down(elem.name);
		}
		return node;
	}
}
initClass(PathNode,GuiElement);

class Button extends GuiElement {
	constructor(name,viewName,x,y,width,height,text) {
		super(name,viewName,x,y);
		this.width = width;
		this.height = height;
		this.text = text||"";
		this.mode = BUTTON_NO;
		this.onClickFunction = function() {};
		this.onViewShownFunction = function() {};
		this.requireUserAction = false;
		this.toggleState = 0;
		this.states = [];
		this.clickSource = null;
		this.hovered = false;
		this.heldDown = false;
		this.preventClick = 0;
		this.pressDelay = 0;
		this.on = false;
		this.radioGroupNames = [];
		this.radioGroupIndex = null;
		this.radioGroupStrict = false;
		this.useIcon = false;
		this.iconImg = null;
		this.iconX = this.iconY = 0;
		this.iconSize = 0;
	}
	setOnClick(func,requireUserAction) {
		this.onClickFunction = func;
		this.mode = BUTTON_NORMAL;
		this.requireUserAction = requireUserAction||false;
		return this;
	}
	setToggle(stateA,stateB) {
		var states = [...arguments];
		if (typeof states[states.length-1]=="boolean") {
			this.requireUserAction = states.pop();
		}
		this.states = states;
		this.mode = BUTTON_TOGGLE;
		return this;
	}
	callToggleState(i,src) {
		let state = this.states[i];
		if (typeof state == "function") {
			if (this.requireUserAction) return attemptUserAction(function() {
				state.call(this);
			},src,this);
			else {
				state.call(this);
				return true;
			}
		}
		return false;
	}
	setOnViewShown(func) {
		this.onViewShownFunction = func;
		if (this.earlyOnViewShown) {
			delete this.earlyOnViewShown;
			this.onViewShown();
		}
		return this;
	}
	setPressDelay(ticks) {
		this.pressDelay = ticks;
		return this;
	}
	setIcon(img,iconX,iconY,iconSize,iconPad) {
		if (img) {
			this.iconImg = img;
			this.iconX = iconX;
			this.iconY = iconY;
			this.iconSize = iconSize;
			this.iconPad = iconPad;
			this.useIcon = true;
		}
		else this.useIcon = false;
		return this;
	}
	setImage(img) {
		this.img = img;
		return this;
	}
	show() {
		this.visible = false;
		this.preventClick = 1;
		super.show();
		return this;
	}
	onViewShown() {
		this.preventClick = 1;
		this.hovered = false;
		if (this.onViewShownFunction) this.onViewShownFunction();
	}
	onClick(src,forceAction) {
		if (this.mode!=BUTTON_NO&&(forceAction||(this.isVisible()&&this.hovered&&this.preventClick==0))) {
			this.preventClick += this.pressDelay;
			this.clickSource = src;
			if (this.radioGroupNames.length>0) {
				for (var i in this.radioGroupNames) {
					if (i==this.radioGroupIndex) continue;
					G$(this.radioGroupNames[i]).on = false;
				}
				if (this.radioGroupStrict) this.on = true;
				else this.on = !this.on;
			}
			if (this.mode==BUTTON_TOGGLE) return this.callToggleState(this.toggleState,src);
			else if (this.requireUserAction) return attemptUserAction(this.onClickFunction,src,this);
			this.onClickFunction();
			return true;
		}
		return false;
	}
	checkCoord(x,y) {
		if (x>=this.x&&x<=this.x+this.width) {
			if (y>=this.y&&y<=this.y+this.height) {
				return true;
			}
		}
		return false;
	}
	checkMouse() {
		if (!this.isVisible()||viewLock) return;
		if (this.view.layer!=View.focus) {
			this.heldDown = false;
			return this.hovered = false;
		}
		let underPointer = this.checkCoord(Pointer.x,Pointer.y);
		if (underPointer) Button.buttonFound = true;
		let dp = Pointer.downPoint;
		if (underPointer&&(!dp||this.checkCoord(dp.x,dp.y))) {
			this.heldDown = (dp!=null);
			if (this.mode!=BUTTON_NO) Pointer.interactCursor = true;
			return this.hovered = true;
		}
		return this.hovered = false;
	}
	update() {
		if (this.preventClick>0) this.preventClick--;
	}
	drawGUI() {
		var x = 0, y = 0;
		let drawPressed = this.heldDown && this.hovered;
		let selected = (guiSelectedElement == this);
		if (drawPressed) y = 64;
		if (selected) y = 32;
		if (this.on) x = 32;
		if (this.mode==BUTTON_NO) x = 64;
		Images.drawBorderedImage(this.img,this.x,this.y,this.width,this.height,8,16,x,y);
		if (this.useIcon) Images.drawImage(this.iconImg,Math.floor(this.x+this.iconPad),Math.floor(this.y+this.iconPad)+(drawPressed?2:0),this.width-2*this.iconPad,this.height-2*this.iconPad,this.iconX*this.iconSize,this.iconY*this.iconSize,this.iconSize,this.iconSize);
		else {
			let font = ((this.hovered||selected)&&!Tap.active)?fontButtonBold:fontButton;
			font.draw(this.text,this.x+this.width/2,this.y+this.height/2+7+(drawPressed?2:0),this.width,CENTER);
		}
	}
	static onInit() {
		this.buttonFound = false;
		this.prototype.img = "GUI/Button_Blue.png";
	}
	static checkAll() {
		this.buttonFound = false;
		Pointer.interactCursor = false;
		this.callForAll("checkMouse");
		return this.buttonFound;
	}
	static underPointer() {
		return this.buttonFound;
	}
	static setRadioGroup(group,func,strict) {
		let names = [];
		for (var i in group) {
			let b = G$(group[i]);
			if (b instanceof Button) {
				names.push(group[i]);
				b.radioGroupNames = names;
				b.radioGroupStrict = strict;
				b.radioGroupIndex = names.length-1;
				b.setOnClick(func);
			}
		}
		return names;
	}
}
initClass(Button,GuiElement);

class TextInput extends Button {
	constructor(name,viewName,x,y,width,height,type,defaultValue,promptMsg,inputPattern) {
		super(name,viewName,x,y,width,height);
		this.setType(type); // type must be a TypeAnnotation (or a string that can be interpreted as one)
		this.defaultValue = this.type.validate(defaultValue);
		this.storedVal = this.defaultValue;
		this.promptMsg = promptMsg;
		this.inputPattern = inputPattern || /.+/; // default input
		this.typing = false;
		this.typingText = "";
		this.textTypeMode = 0;
		this.onInputChangeFunc = function() { };
		this.onNewCharFunc = function(char) { return char };
		this.setOnClick(function() {
			if (this.typing||G$("TextInput").visible) return;
			if (Key.isDown("18")) this.store(void(0));
			else if (this.type.is("boolean")) this.store(!this.val());
			else if (this.type.is("accessor")) {
				let thisInput = this, notes = this.type.getNotes();
				let strs = [], bases = [];
				for (var i in notes) {
					let split = notes[i].split("_");
					if (split.length>1) {
						bases[i] = split[0];
						strs[i] = split[1];
					}
					else strs[i] = notes[i];
				}
				buildSelector(strs,function(index,selection) {
					if (bases[index]!=void(0)) selection = bases[index] + "_" + selection;
					thisInput.store(selection);
				},null);
			}
			else {
				this.typing = true;
				this.textTypeMode = 1;
				this.typingText = ""+(this.storedVal!=null?this.storedVal:"");
				this.setTypingView();
			}
		});
	}
	setType(type) {
		if (typeof type == "string") type = TypeAnnotation.interpret(type);
		if (!(type instanceof TypeAnnotation)) return this;
		this.type = type;
		this.text = type.dataName;
		if (!type.is("number")) this.removeIncrementers();
		if (type.is("accessor")) Constants.storeList(type.getNotes());
		return this;
	}
	store(value) {
		let oldStoredVal = this.storedVal;
		this.storedVal = this.type.validate(value);
		if (this.onInputChangeFunc(this.storedVal)==CANCEL) this.storedVal = oldStoredVal;
		return this;
	}
	val(val) {
		if (val!=void(0)) {
			this.storedVal = val;
			return this;
		}
		return this.storedVal;
	}
	setOnInputChange(func) {
		this.onInputChangeFunc = func;
		return this;
	}
	setOnNewChar(func) {
		this.onNewCharFunc = func;
		return this;
	}
	drawGUI() {
		Images.drawBorderedImage("GUI/TextInput.png",this.x,this.y,this.width,this.height,8,16,0,0);
		if (this.typing) return;
		else {
			let text = "", font = fontInput;
			if (this.storedVal!==""&&this.storedVal!=null) {
				text = "" + this.storedVal;
				if (this.type.is("accessor")) {
					text = Constants.getKey(this.storedVal,this.type.getNotes()).split("_").pop();
				}
			}
			else {
				text = this.text || "";
				font = fontInputEmpty;
			}
			let fontCopy = Font.copy(font,{isBold:this.hovered||guiSelectedElement==this});
			fontCopy.draw(text,this.x+this.width/2,this.y+this.height/2+7,this.width,CENTER);
		}
	}
	setTypingView() {
		let selectionState = {start: guiStartElement, selected: guiSelectedElement};
		let x, y, w, h, textX, textY, textWidth, promptX, promptY, promptWidth;
		if (Tap.active) {
			x = y = 0;
			promptWidth = w = WIDTH;
			h = HEIGHT;
			textX = WIDTH/2;
			textY = 22;
			textWidth = WIDTH;
			promptX = 0;
			promptY = textY*2;
			$(canvas).hide();
			// if (this.type.is("number")) this.keyboard = $("#touchkeypad");
			//else
			this.keyboard = $("#touchkeyboard").attr("type","password");
			this.keyboard.val(this.typingText).attr("placeholder",this.promptMsg).show().focus();
		}
		else {
			x = this.x-5; y = this.y-5;
			promptWidth = fontInputDesc.measureWidth(this.promptMsg);
			w = Math.max(this.width,promptWidth)+10;
			h = this.height+10+22;
			textX = this.x+this.width/2;
			textY = this.y+this.height/2+7;
			textWidth = this.width;
			promptX = this.x;
			promptY = this.y+this.height+22;
		}
		View.create("TextInput",x,y,w,h,"tint","black").openOnTop().selectionState = selectionState;
		Button.create("TextInput:Cancel","TextInput",0,0,canvas.width,canvas.height).setOnClick(function() {
			this.textinput.onKeypress("Alt"); // press Alt key to cancel
		}).setImage("").show().textinput = this;
		TextElement.create("TextInput:TE","TextInput",textX,textY,fontInputSelect,this.typingText,textWidth,CENTER).show();
		TextElement.create("TextInput:NE","TextInput",promptX,promptY,fontInputDesc,this.promptMsg,promptWidth,LEFT).show();
	}
	removeTypingView() {
		let selState = G$("TextInput").selectionState;
		G$("TextInput:NE").remove();
		G$("TextInput:TE").remove();
		G$("TextInput").remove();
		guiStartElement = selState.start;
		guiSelectedElement = selState.selected;
		if (this.keyboard) {
			this.keyboard.val("").blur();
			this.keyboard = null;
		}
		this.preventClick++;
	}
	onKeypress(key) {
		if (!this.typing) return;
		switch (key) {
			case "Enter":
				this.typing = false;
				this.removeTypingView();
				let response = this.typingText;
				this.store(response);
				break;
			case "Alt":
				this.typing = false;
				this.removeTypingView();
				break;
			case "Backspace":
				if (this.typingText.length>0) {
					if (this.textTypeMode==1) {
						G$("TextInput:TE").text = this.typingText = "";
					}
					else {
						this.typingText = this.typingText.slice(0,this.typingText.length-1);
						G$("TextInput:TE").text = this.typingText;
					}
					if (this.keyboard) this.keyboard.val(this.typingText);
				}
				break;
			case "ArrowLeft":
			case "ArrowRight":
				if (this.textTypeMode==1) {
					G$("TextInput:TE").font = fontInputType;
					this.textTypeMode = 0;
				}
				break;
			default:
				if (key.length>1) return;
				if (typeof this.onNewCharFunc == "function") key = this.onNewCharFunc(key);

				if (this.textTypeMode==1) {
					this.typingText = key;
					G$("TextInput:TE").font = fontInputType;
					this.textTypeMode = 0;
				}
				else this.typingText += key;

				this.filterInput();
				G$("TextInput:TE").text = this.typingText;
				if (this.keyboard) this.keyboard.val(this.typingText).focus();
		}
	}
	filterInput() {
		if (typeof this.typingText == "string") {
			this.typingText = this.typingText.match(this.inputPattern);
			if (this.typingText) return this.typingText = this.typingText[0];
		}
		this.typingText = "";
	}
	update() {
		super.update();
		if (this.keyboard) {
			if (this.keyboard.attr("type")=="password") this.keyboard.attr("type","text");
			if (this.keyboard.val()!=this.typingText) {
				this.typingText = "";
				this.textTypeMode = 0;
				let val = this.keyboard.val();
				for (var i = 0; i < val.length; i++) {
					this.typingText += this.onNewCharFunc(val.charAt(i));
				}
				this.filterInput();
				this.keyboard[0].value = this.typingText;
			}
		}
	}
	createIncrementers(size,step,min,max) {
		if (this.type!="number"||this.incrementer||this.decrementer) return this;
		let valueSetter = function() {
			let value = this.targetInput.storedVal + this.step;
			if (isNaN(value)) value = 0;
			if (this.min!=void(0)) value = Math.max(this.min,value);
			if (this.max!=void(0)) value = Math.min(this.max,value);
			this.targetInput.storedVal = value;
			this.targetInput.onInputChangeFunc(value);
		}
		let decrementer = Button.create(this.name+"--",this.view.name,this.x,this.y,size,this.height,"-").setOnClick(valueSetter).show();
		this.x += size;
		this.width -= 2*size;
		let incrementer = Button.create(this.name+"++",this.view.name,this.x+this.width,this.y,size,this.height,"+").setOnClick(valueSetter).show();
		incrementer.targetInput = decrementer.targetInput = this;
		incrementer.step = decrementer.step = step;
		decrementer.step *= -1;
		incrementer.min = decrementer.min = min;
		incrementer.max = decrementer.max = max;
		incrementer.remove = decrementer.remove = function(caller) {
			if (caller==this.targetInput) this.protoMethod("remove");
		}
		this.incrementer = incrementer;
		this.decrementer = decrementer;
		return this;
	}
	removeIncrementers() {
		let size = 0;
		if (this.incrementer) {
			size = this.incrementer.width;
			this.incrementer.remove(this);
			delete this.incrementer;
		}
		if (this.decrementer) {
			size = this.decrementer.width;
			this.decrementer.remove(this);
			delete this.decrementer;
		}
		this.x -= size;
		this.width += 2*size;
		return this;
	}
	remove() {
		this.removeIncrementers();
		super.remove();
	}
	static keyboardScreen() {
		// TODO
	}
}
initClass(TextInput,Button);

class Slider extends Button {
	constructor(name,viewName,x,y,width,height,barLength) {
		super(name,viewName,x,y,width,height);
		this.anchorX = x;
		this.anchorY = y;
		this.barLength = barLength;
		this.value = 0;
		this.grip = null;
		this.onClickFunction = function() {};
	}
	setValue(val) {
		this.value = Math.max(0,Math.min(val,1));
		this.x = this.anchorX + val*this.barLength;
		return this;
	}
	setOnSlide(func) {
		this.onSlideFunction = func;
		this.mode = BUTTON_NORMAL;
		return this;
	}
	checkMouse() {
		if (!this.isVisible()||viewLock) return;
		if (!this.heldDown) {
			let tempX = this.x, tempY = this.y, tempWidth = this.width;
			this.x = this.anchorX;
			this.y = this.anchorY;
			this.width += this.barLength;
			super.checkMouse();
			this.x = tempX, this.y = tempY, this.width = tempWidth;
		}
		if (this.heldDown && Pointer.downPoint) {
			this.x = Math.max(this.anchorX,Math.min(Pointer.x-this.width/2,this.anchorX+this.barLength));
			this.value = (this.x-this.anchorX)/this.barLength;
			if (typeof this.onSlideFunction=="function") this.onSlideFunction();
		}
		else this.heldDown = false;
	}
	drawGUI() {
		let x = this.anchorX+this.width/2, y = this.anchorY+this.height/2;
		c.strokeStyle = "black";
		c.lineWidth = 5;
		drawLine(x,y,x+this.barLength,y);
		c.strokeStyle = "white";
		c.lineWidth = 3;
		drawLine(x+1,y,x+this.barLength-2,y);
		c.lineWidth = 1;
		super.drawGUI();
	}
}
initClass(Slider,Button);

class ProgressButton extends Button {
	constructor(name,viewName,x,y,width,height,mainText,subText) {
		super(name,viewName,x,y,width,height,mainText);
		this.subText = subText;
		this.progress = 0; // out of 1
		this.listeningFunc = null;
		this.onCompleteFunc = null;
		this.fillColor = "blue";
	}
	setProgress(amt) {
		this.progress = Math.min(Math.max(0,amt),1);
		if (amt>=1 && typeof this.onCompleteFunc == "function") this.onCompleteFunc();
		return this;
	}
	setListening(func) {
		this.listeningFunc = func;
		return this;
	}
	setOnComplete(func) {
		this.onCompleteFunc = func;
		return this;
	}
	setFillColor(color,backColor) {
		this.fillColor = color;
		if (backColor) this.backColor = backColor;
		return this;
	}
	setBackColor(backColor) {
		this.backColor = backColor;
	}
	update() {
		super.update();
		if (typeof this.listeningFunc == "function") this.setProgress(this.listeningFunc());
	}
	drawGUI() {
		let prog = Math.min(Math.max(0,this.progress),1);
		c.fillStyle = this.backColor;
		c.fillRect(this.x,this.y,this.width,this.height);
		c.fillStyle = this.fillColor;
		c.fillRect(this.x,this.y+this.height*(1-prog),this.width,prog*this.height);
		Images.drawBorderedImage(this.img,this.x,this.y,this.width,this.height,8,16,0,0);
		this.font.draw(this.text,this.x+this.width/2,this.y+this.height/2+7,this.width,CENTER);
		this.subfont.draw(this.subText,this.x+this.width/2,this.y+this.height*2/3+5,this.width,CENTER);
	}
	static onInit() {
		this.prototype.img = "GUI/ProgressButton.png";
		this.prototype.font = new Font("Fredoka One",30,false,"gray");
		this.prototype.subfont = new Font("Fredoka One",15,false,"gray");
		this.prototype.fillColor = "blue";
		this.prototype.backColor = "white";
	}
}
initClass(ProgressButton,Button);

class TextElement extends GuiElement {
	constructor(name,viewName,x,y,font,text,maxWidth,alignment) {
		super(name,viewName,x,y);
		this.text = text;
		this.font = font;
		this.maxWidth = maxWidth;
		this.alignment = alignment;
	}
	drawGUI() {
		this.font.draw(this.text,this.x,this.y,this.maxWidth,this.alignment);
	}
	setVar(val) {
		this.var = val;
		if (!this.baseText) this.baseText = this.text;
		let strs = this.baseText.split("{{var}}");
		this.text = strs.join(""+this.var);
		return this;
	}
}
initClass(TextElement,GuiElement);

class ImgElement extends GuiElement {
	constructor(name,viewName,x,y,img,width,height,fit) {
		super(name,viewName,x,y);
		this.width = width;
		this.height = height;
		this.img = img;
		this.fit = fit || IMAGE_STRETCH;
	}
	drawGUI() {
		switch(this.fit) {
			case IMAGE_STRETCH:
				Images.drawImage(this.img,this.x-this.width/2,this.y-this.height/2,this.width,this.height);
				break;
			case IMAGE_ZOOM:
				let img = Images.getImage(this.img);
				if (!img||img.width==0||img.height==0) return;
				let imgRatio = img.width/img.height;
				let x = this.x - this.width/2, y = this.y - this.height/2, width = this.width, height = this.height;
				if (imgRatio>width/height) {
					height = width/imgRatio;
					y = y + this.height/2 - height/2;
				}
				else {
					width = height*imgRatio;
					x = x + this.width/2 - width/2;
				}
				Images.drawImage(this.img,x,y,width,height);
		}
	}
}
initClass(ImgElement,GuiElement);


class Particle extends _c_ {
	constructor(x,y,id,size,duration,defyGravity,color,constVel) {
		super();
		this.x = x;
		this.y = y;
		this.id = id;
		this.size = size;
		this.velX = 0;
		this.velY = 0;
		this.timer = duration;
		this.defyGravity = defyGravity;
		this.color = color;
		this.constVel = constVel;
	}
	draw() {
		if (this.id==0||this.id==void(0)) {
			c.fillStyle = this.color;
			c.fillRect(this.x-this.size/2,this.y-this.size/2,this.size,this.size);
		}
		else {
			let cl = this.constructor;
			let clipX = cl.CLIP*(this.id%cl.ROW);
			let clipY = cl.CLIP*Math.floor(this.id/cl.ROW);
			Images.drawImage(cl.IMG,this.x-this.size/2,this.y-this.size/2,this.size,this.size,clipX,clipY,cl.CLIP,cl.CLIP);
		}
	}
	update() {
		//gravity
		if (!this.defyGravity) this.velY +=1;
		//calculate X
		if (this.velX!=0) {
			this.x += this.velX;
			if (!this.constVel) {
				if (Math.abs(this.velX)<0.5) this.velX = 0;
				else this.velX += this.velX>0? -0.5: 0.5;
			}
		}
		//calculate Y
		if (this.velY!=0) {
			this.y += this.velY;
			if (!this.constVel) {
				if (Math.abs(this.velY)<0.5) this.velY = 0;
				else this.velY += this.velY>0? -0.5: 0.5;
			}
		}
		if (this.timer--<0) this.remove();
	}
	static generate(x,y,id,amount,size,duration,defyGravity,color,angle,angleRadius,magnitude,magRadius,magIsConst) {
		if (fps<55) return;
		for (var i in arguments) if (arguments[i]==null) arguments[i] = 0;
		var angle = angle*Math.PI/180, angleRadius = angleRadius*Math.PI/180;
		while(amount-->0) {
			var particle = this.create(x,y,id,size,duration,defyGravity,color,magIsConst);
			var newAngle = angle + angleRadius*(Math.random()*2-1);
			var newMag = magnitude + magRadius*(Math.random()*2-1);
			particle.velX = Math.cos(newAngle)*newMag;
			particle.velY = Math.sin(newAngle)*newMag;
		}
		if (online&&Net.isHost()) Net.send({particle: [...arguments]});
	}

	static onInit() {
		this.prototype.drawLayer = 3;
		this.IMG = "Particles.png";
		this.CLIP = 16;
		this.ROW = 16;
	}
}
initClass(Particle,{drawable: true, listType: "array"});
