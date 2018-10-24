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
  remove() {
    this.constructor.removeInstance(this);
    if (this.uid!=void(0)) {
      if (uid==++uidDeleted) uid = uidDeleted = 0;
    }
		for (var property in this) delete this[property];
		this.deleted = true;
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


class Background extends _c_ {
  constructor(slot,imgName,drawLayer,scale,parallax) {
    super();
    this.slot = slot;
    this.imgName = imgName;
    this.drawLayer = drawLayer;
    this.scale = scale;
    this.parallax = parallax;
    if (!Background.slots[slot]) Background.slots[slot] = this;
    else this.slot = null;
  }
  setSlot(slot) {
    this.slot = slot;
  }
  draw() {
    let x = Math.max(0,Camera.leftPx());
    let y = Math.max(0,Camera.topPx());
    let width = Math.min(Level.level.width,Camera.rightPx()) - x;
    let height = Math.min(Level.level.height,Camera.bottomPx()) - y;
    Images.drawImagePattern(this.imgName,x,y,width,height,this.scale,this.parallax);
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
  constructor(slot,imgRaw,drawLayer,scale,parallax) {
    Images.loadImageB64("BGRaw:"+slot,imgRaw);
    super(slot,"BGRaw:"+slot,drawLayer,scale,parallax);
    this.imgRaw = imgRaw;
  }
  setSlot(slot) {
    super.setSlot(slot);
    Images.loadImageB64("BGRaw:"+slot,this.imgRaw);
    this.imgName = "BGRaw:"+slot;
  }
}
initClass(BackgroundB64,Background);


class Box extends _c_ {
  constructor(x,y,width,height,color,sprite) {
    super();
  	this.x = x;
  	this.y = y;
  	this.width = width;
  	this.height = height;
  	this.color = color;
  	this.sprite = sprite;
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
  	if (x<=this.rightX()&&x>=this.leftX()) {
  		if (y<=this.y&&y>=this.topY()) {
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
    c.fillStyle = this.color;
    if (this.color!=null) c.fillRect(Math.round(this.leftX()),Math.round(this.y),this.width,-(this.height));
    if (this.sprite!=null) Images.drawImage(this.sprite,Math.round(this.leftX()),Math.round(this.topY()),this.width,this.height);
  }
  drawDebug() {
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
}
initClass(Box,{drawable: true, listType: "uid"});

class Interactable extends Box {
  constructor(x,y,width,height,color,sprite,targetClass) {
    super(x,y,width,height,color,sprite);
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
  	}
  	delete this.touches;
  	this.touches = newTouches;
  }
}
initClass(Interactable,Box);

class HurtBox extends Interactable {
  constructor(x,y,width,height,attacker,damage,duration,formulaX,formulaY,endCheck) {
  	super(x,y,width,height,void(0),void(0),Entity);
  	this.attacker = attacker;
  	this.damage = damage;
  	this.time = duration;
  	this.formulaX = formulaX;
  	this.formulaY = formulaY;
  	if (endCheck) this.endCheck = endCheck;
  	else this.endCheck = function() { return false; };
  	this.harmed = {};
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
  remove() {
  	if (this.attacker&&Entity.has(this.attacker)) {
  		this.attacker.setAnimation("stand");
  		this.attacker.attackBox = null;
  	}
  	super.remove();
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
      if (widthVal!=null) this.width = widthVal;

      var frameVal = this.frames.x[frameIndex];
      if (frameVal==null) frameVal = this.frames.x[0];
      if (frameVal==null) return ent.x;
      return ent.x + ent.direction*frameVal;
    };
    var formulaY = function(ent) {
      var frameIndex = Math.floor(this.frame*this.framerate);
      this.frame++;

      var heightVal = this.frames.height[frameIndex];
      if (heightVal==null) heightVal = this.frames.height[0];
      if (heightVal!=null) this.height = heightVal;

      var frameVal = this.frames.y[frameIndex];
      if (!frameVal) frameVal = this.frames.y[0];
      if (!frameVal) return ent.y;
      return ent.y + frameVal;
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
    if (this.attacker!=null) this.attacker.completeAttack();
    super.remove();
  }
}
initClass(AttackBox,HurtBox);

class Entrance extends Interactable {
  constructor(x,y,width,height,color,sprite,targetClass,linkId,destination,preventEnter,preventExit) {
    super(x,y,width,height,color,sprite,targetClass);
    this.linkId = linkId;
    this.destination = destination;
    this.preventEnter = !!preventEnter;
    this.preventExit = !!preventExit;
    this.enterStep = 0;
    this.exitStep = 0;
    this.obj = null;
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
    this.obj = null;
    obj.exit = obj.entrance = null;
    // clear step counters
    this.exitStep = this.enterStep = 0;
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
  finishExit() {
    let obj = this.obj;
    this.forget();
    // find destination
    let dest = Entrance.findEntrance(this.destination,this.targetClass);
    if (dest) {
      // send the object into limbo first
      obj.x = obj.y = NaN;
      // then trigger the destination
      dest.useEntrance(obj);
    }
    else { // destination wasn't found
      obj.x = obj.y = 0;
    }
  }
  useEntrance(obj) {
    // store the objects and set step counter
    this.obj = obj;
    obj.entrance = this;
    this.enterStep = 1;
  }
  doEnterSteps() {
    this.finishEntrance();
  }
  finishEntrance() {
    // do warp
    this.obj.x = this.x;
    this.obj.y = this.y;
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
  constructor(x,y,linkId,destination,preventEnter,preventExit) {
    super(x,y,32,55,void(0),void(0),Player,linkId,destination,preventEnter,preventExit);
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
    let ctrl = player.ctrls.mostRecent();
    if (!ctrl.pressed("lookUp",0.8)) return false; // must press lookUp
    if (!player.isGrounded) return false; // must be on ground
    if (player.held||player.heldBy) return false; // can't be holding anything or be held by something
    if (Math.abs(this.y-player.y)>=2) return false; // must be within 2 vertical units from door
    // passed all the tests!
    return true;
  }
  forget() {
    if (this.doorOpen) this.closeDoor();
    this.obj.defyGravity = false;
    this.obj.collisionType = C_ENT;
    Collision.removeAllPairsWith(this.obj);
    this.obj.invulnerability = 0;
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
    player.invulnerability = 3;
    player.faceTo(this);
  }
  doExitSteps() {
    this.obj.invulnerability = 3;
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
    this.openDoor();
    player.x = this.x;
    player.y = this.y;
    player.defyGravity = true;
    player.collisionType = C_NONE;
    player.invulnerability = 3;
  }
  doEnterSteps() {
    this.obj.invulnerability = 3;
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
    super(x,y,width,height,void(0),void(0),Entity,void(0),void(0),false,true);
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

class PhysicsBox extends Box {
  constructor(x,y,width,height,color,sprite,defyPhysics,collisionType,canBeCarried,thrownDamage) {
  	super(x,y,width,height,color,sprite);
  	this.defyPhysics = defyPhysics;
    this.collisionType = collisionType;
  	this.canBeCarried = canBeCarried;
  	this.thrownDamage = thrownDamage;
  	this.spawnX = x;
  	this.spawnY = y;
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
  	this.x = this.spawnX;
  	this.y = this.spawnY;
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
  	var yDist = a.midY()-b.midY();  //+: a is above,      -: a is below

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
  constructor(x,y,width,height,color,sprite,collisionType,velX,velY) {
  	super(x,y,width,height,color,sprite,true,collisionType,false,false);
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

  update() { }
  draw() {
  	c.strokeStyle = this.stroke;
  	c.lineWidth = this.size;
  	if (this.stroke) drawLine(this.x,this.y,this.x2,this.y2);
  }
  drawDebug() {
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
    this.prototype.setSectors = Box.prototype.setSectors;
    this.prototype.remove = PhysicsBox.prototype.remove;
    this.prototype.lockSectors = true;
    this.prototype.collisionType = C_LINE;
    this.prototype.drawLayer = 0;
  }
}
initClass(Line,{drawable: true, listType: "uid"});


class Entity extends PhysicsBox {
  constructor(x,y,width,height,duckHeight,health,sheet) {
    super(x,y,width,height,void(0),void(0),false,C_ENT,false,false);
  	this.fullHeight = height;
  	this.duckHeight = duckHeight;
  	this.ducking = false;
  	this.health = health;
  	this.maxHealth = health;
  	this.dead = false;
  	this.sheet = Animation.getSpritesheet(sheet);
  	this.direction = RIGHT;
  	this.stun = 0;
  	this.invulnerability = 0;
    this.attackCooldown = 0;
    this.actionLocked = false;
    this.movementLocked = false;
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
  	if (this.invulnerability>0) return;
  	Particle.generate(this.x,this.midY(),0,8,4,10,true,this.particleColor?this.particleColor:"red",0,360,5,0);
    Sound.play("punch.ogg");
  	this.health -= damage;
  	if (this.health<=0) this.die(attacker);
  	else { //knockback
  		let deltaX = this.x - attacker.x;
  		let deltaY = this.y - attacker.y;
  		let angle = Math.atan2(deltaY,deltaX);
  		this.velX = Math.cos(angle)*10;
  		this.velY = Math.sin(angle)*10;
  		if (Math.abs(this.velY)<=0.5||this.isGrounded) this.velY -= 10;
      if (attacker instanceof PhysicsBox) {
        if (attacker.velX!=0) this.x += attacker.velX + (attacker.velX>0?1:-1);
        if (attacker.velY!=0) this.y += attacker.velY + (attacker.velY>0?1:-1);
      }
  		if (this instanceof Player) {
  			this.stun = 5;
  			this.invulnerability = 60;
  		}
  		else this.stun = 60;
  	}
  }

  update() {
  	if (this.stun>0) this.stun -= 1;
  	if (this.invulnerability>0) this.invulnerability -= 1;
  	super.update();
  }
  respawn() {
  	this.breakConnections();
    if (this.currentAttack!=null) this.completeAttack();
    this.animLock = 0;
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
  	if (this.attackBox!=null) this.attackBox.remove();
  }
  remove() {
  	this.breakConnections();
  	super.remove();
  }

  drawElements() {
  	var startX = Math.round(this.x-((8*this.health)-1));
  	for (var i = 0; i < this.health; i++) {
  		Images.drawImage("GUI-HUD-Hearts.png",startX+(16*i),Math.round(this.y-this.fullHeight-17),14,12,0,0,14,12);
  	}
  }

  static defineAttack(name,damage,duration,cooldown,lockMovement,lockActions,defyGravity,prep,onHurt,specialFrames,specialFuncs) {
    // defines an attack and stores it in this class's attack list
    if (!name) return;
    if (!this.attacks) this.attacks = [];
    this.attacks.push({ // default parameters provided as well
      name: name,
      damage: damage||0,
      duration: duration||0,
      cooldown: cooldown||0,
      lockMovement: lockMovement||false,
      lockActions: lockActions||false,
      defyGravity: defyGravity||false,
      prep: prep,
      onHurt: onHurt,
      specialFrames: specialFrames||[],
      specialFuncs: specialFuncs||[]
    });
  }
  static getAttack(name) { //returns attack obj from the class's (or parents') list of attack
    if (!name) return console.log("missing attack: "+name);
    if (!this.attacks) this.attacks = [];
    for (var i in this.attacks) {
      if (this.attacks[i].name==name) return this.attacks[i]; //found attack
    }
    if (this!=Entity) return this.parent.getAttack(name); //look for attack in parent class
  }
  activateAttack(name) { //creates attack boxes and sets player states
    if (this.attackCooldown!=0||this.direction==CENTER) return; //don't attack if you can't
    var attack = this.constructor.getAttack(name);
    if (attack) { //found valid attack
      var action = this.sheet.getAnimation(attack.name);
      if (action&&action.attack) { //found valid attack info from animation sheet
        if (attack.prep) attack.prep.call(this); //call special code for this attack
        //make attack box
        var a = action.attack;
        var box = this.attackBox = AttackBox.create(a.x[0],a.y[0],a.width,a.height,this,attack.damage,attack.duration,a,action.framerate);
        //apply extra methods
        if (attack.onHurt) box.onHurt = attack.onHurt;
        if (attack.specialFrames&&attack.specialFuncs) {
          box.specialFrames = attack.specialFrames;
          box.specialFuncs = attack.specialFuncs;
        }
        //set player states
        this.attackCooldown = attack.cooldown;
        if (attack.defyGravity) this.defyGravity = attack.defyGravity;
        this.actionLocked = attack.lockActions;
        this.movementLocked = attack.lockMovement;
        this.currentAttack = attack.name;
        this.setAnimation(attack.name,null,attack.duration);
      }
    }
  }
  completeAttack() { //resets player states back to normal when attack is finished
    var attack = this.constructor.getAttack(this.currentAttack);
    if (attack) {
      if (attack.defyGravity) this.defyGravity = this.constructor.prototype.defyGravity;
      this.actionLocked = false;
      this.movementLocked = false;
    }
    this.currentAttack = null;
  }

  static onInit() {
    Animation.applyToClass(this);
    this.prototype.draw = function(preventAnimTick) {
      if (this.invulnerability%2==1) return;
      else Animation.protoDraw.call(this,preventAnimTick);
    };
    this.prototype.drawLayer = 1;
    this.prototype.respawnsOnDeath = false;
    this.prototype.particleColor = null;
    this.attacks = [];
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
  	this.attackCooldown = 0;
  	this.attackHeld = 0;
    this.canUpAirAttack = true;
  }
  static onCreate() {
    this.ctrls = {
      key: new Ctrl(KEYBOARD,Player.keyIds[this.slot]),
      gp: new Ctrl(GAMEPAD,Player.gpIds[this.slot]),
      tap: new Ctrl(TOUCH,Player.tapIds[this.slot]),
      mostRecent: function() {
        var timestamps = [this.key.timestamp,this.gp.timestamp,this.tap.timestamp];
        var newest = Math.max(...timestamps);
        var mostRecent = [this.key,this.gp,this.tap][timestamps.indexOf(newest)];
        if (newest!=0&&this.tap.type!=NULLCTRL&&mostRecent.type!=TOUCH) Tap.tryDeactivate();
        return mostRecent;
      },
      selfDestructAll: function() {
        this.key.selfDestruct();
        this.gp.selfDestruct();
        this.tap.selfDestruct();
      }
    };
  }

  handleControls(pad) {
    if (pad.pressed("moveLeft")&&!pad.pressed("moveRight")&&!this.movementLocked) {
      if (this.attackBox!=null&&this.direction==RIGHT) this.velX = 0;
      else if (this.heldBy!=null) this.direction = LEFT;
      else this.move(4.5,LEFT);
    }
    if (pad.ready("jump")&&(this.isGrounded||this.heldBy!=null||this.multiJump)&&!this.actionLocked) {
      pad.use("jump");
      this.jump();
    }
    if (pad.pressed("moveRight")&&!pad.pressed("moveLeft")&&!this.movementLocked) {
      if (this.attackBox!=null&&this.direction==LEFT) this.velX = 0;
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
          if (this.isGrounded) this.activateAttack("attack-upward");
          else if (this.canUpAirAttack) this.activateAttack("attack-upward-air");
        }
        else if (pad.pressed("crouch",0.8)&&!this.isGrounded) this.activateAttack("attack-down-stab");
        else this.activateAttack("attack");
        pad.use("attack");
      }
      else if (!this.inLiftAnim) {
        if (pad.pressed("crouch",0.8)&&this.isGrounded) this.dropHeldObject();
        else this.throwHeldObject();
        pad.use("attack");
      }
    }
    else if (pad.pressed("attack")) this.attackHeld += 1;
    else {
      if (this.attackHeld>=chargeAttackReq&&this.held==null) {
        if (this.ducking) this.activateAttack("attack-upward");
        else this.activateAttack(this.isGrounded?"attack-charge":"attack-charge-air");
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
    var objs = PhysicsBox.getLoaded();
    for (var i in objs) {
      var box = objs[i];
      if (!box.canBeCarried) continue;
      if (box.heldBy||this.heldBy==box) continue;
      if (Math.abs(box.topY()-this.y)<=0.1&&this.rightX()>=box.leftX()&&this.leftX()<=box.rightX()) {
        this.held = box;
        box.heldBy = this;
        Collision.findPair(this,box).refresh();
        this.setAnimation("lift",null,15);
        this.defyGravity = true;
        this.movementLocked = true;
        this.velY = 0;
        this.inLiftAnim = true;
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
  dragHeldObject(velX,velY) {
    if (this.held!=null) { //reposition carried objects
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

  update() {
    //get this player's most recently updated controller to use for input
    var controller = this.ctrls.mostRecent();
    if (!controller) {
      controller = NullCtrl.ctrls[0]; //defaults to no input pressed
      console.log("missing controller");
    }

  	if (this.attackCooldown>0) this.attackCooldown -= 1;

    if (this.isGrounded) this.canUpAirAttack = true;

    //return player state to normal when lift animation is complete
    if (this.inLiftAnim&&(this.animCurrent!="lift")) {
      this.inLiftAnim = false;
      this.defyGravity = false;
      this.movementLocked = false;
    }

    //if not stunned, run controls
  	if (this.stun==0&&!this.usingEntrance()) this.handleControls(controller);

  	this.chooseAnimation(controller);

  	var tempVelX = this.velX, tempVelY = this.velY;
  	super.update();
  	this.dragHeldObject(tempVelX,tempVelY);
  }
  die() {
  	this.lives -= 1;
  	if (this.lives<=0) this.respawnsOnDeath = false;
  	super.die();
  }
  remove() {
    this.ctrls.selfDestructAll();
    Player.clearFromSlot(this);
    super.remove();
  }
  respawn() {
    this.direction = this.spawnDirection;
    this.attackHeld = 0;
  	super.respawn();
  }

  drawHud() {
  	var playerNumber = Player.getAll().indexOf(this);
  	Images.drawImage(this.sheet.pages[this.animPage],10,10+(24*playerNumber),19,19,0,0,19,19);
  	c.font = "bold 20px Arial";
  	c.fillStyle = "black";
  	c.fillText("/ "+this.lives,35,27+(24*playerNumber));
  }
  drawElements() {
  	if (this.attackHeld>=chargeAttackReq&&!this.held) Images.drawImage("GUI-HUD-!.png",this.x-2,this.topY()-4,4,-16);
  	else super.drawElements();
  }

  static setSlot(slot,player) {
  	if (!this.slots[slot]&&Game.mode!=GAME_EDITOR) this.slots[slot] = player;
  }
  static clearFromSlot(player) {
  	if (this.slots[player.slot]==player) {
  		this.slots[player.slot] = null;
  	}
  }
  static relinkCtrls() {
    var all = this.getAll();
    for (var i in all) {
      var p = all[i], slot = p.slot;
      p.ctrls.selfDestructAll();
      p.ctrls.key = new Ctrl(KEYBOARD,Player.keyIds[slot]);
      p.ctrls.gp = new Ctrl(GAMEPAD,Player.gpIds[slot]);
      p.ctrls.tap = new Ctrl(TOUCH,Player.tapIds[slot]);
    }
  }
  static changeControlSlots(slot,type,index) {
  	if (slot==void(0)||type==void(0)||index==void(0)) return;
  	if (type<1) return;
  	let ids = [null,"keyIds","gpIds","tapIds"][type];
  	this[ids][slot] = index=="None"?null:index;
  	this.relinkCtrls();
  }

  static onInit() {
    this.prototype.drawLayer = 2;
    this.prototype.respawnsOnDeath = true;
    this.prototype.lives = 5;
    this.prototype.deaths = 0;
    this.prototype.multiJump = false;
    this.attacks = [];
    this.slots = [null,null,null,null];
    this.keyIds = [0,1,null,null];
    this.gpIds = [null,null,null,null];
    this.tapIds = [0,null,null,null];
    this.defineAttack("attack",1,20,30);
    this.defineAttack("attack-charge",2,20,30,true,true,true,function() {
      this.move(10);
      this.velY = 0;
    });
    this.defineAttack("attack-charge-air",2,20,30,true,true,true,function() {
      this.move(10);
      this.velY = 0;
    });
    this.defineAttack("attack-upward",1,20,30,true);
    this.defineAttack("attack-upward-air",1,20,30,false,true,true,function() {
      this.velY = -6;
      this.move(5);
      this.canUpAirAttack = false;
    },
    function() {
      this.attacker.canUpAirAttack = true;
    });
    this.defineAttack("attack-down-stab",1,30,60,true,true,false,function() {
      this.velY = -7;
    },null,
    [4,11],[function() {
      this.velY = 5;
      this.stun = 40;
    },
    function() {
      if (!this.ground&&!this.lineGround&&this.y!=Level.level.height) {
        this.attackBox.time++;
        this.attackBox.frame--;
        this.animFrame--;
        this.animLock++;
        this.attackCooldown++;
      }
    }]);
  }
}
initClass(Player,Entity);

class Enemy extends Entity {
  constructor(x,y,width,height,health,sheet,duckHeight) {
    super(x,y,width,height,duckHeight,health,sheet);
    this.canBeCarried = true; //overwrites
    this.thrownDamage = 1;
  	this.attackCooldown = 0;//also in player
  	this.target = null;//new to enemy
  	this.post = x;
  	this.paceTarget = x;
  	this.standbyTick = 0;
  }

  levelTest(blockBox,ignoreUIDs,customBoxTest,customLineTest) {
    /*
    Iterates over all loaded boxes and lines, and runs tests on them.
    Returns an object that contains the results of both tests.
    First test: to see if there is something intersects the blockBox,
      indicating that it is obstructing the Enemy
    Second test: custom, defined by parameters
    If at any point the first test succeeds, the results are returned immediately,
      regardless of whether or not the second test has passed yet (will get false negatives)
    */
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
        this.move(2.5);
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
        if (this.target.intersect(frontBox)&&this.stun==0) this.activateAttack("attack");
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
    if (this.attackBox!=null) this.setAnimation("attack");
  	else if (!this.isGrounded&&this.heldBy==null) this.setAnimation("jump");
  	else if (this.velX!=0&&this.heldBy==null) this.setAnimation("run");
  	else this.setAnimation("stand");
  }
  doRandomPacing() {
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

        let test = this.levelTest(frontBox,{},function(box) {
          return box.intersect(groundBox);
        },
        function(line) {
          if (line.direction==LINE_UP) return line.intersect(groundBox);
          else return false;
        });
        if (!test.blocked&&test.custom) this.move(1.5);
      }
    }
    else this.paceTarget = null;
  }
  findPlayers() {
    var allPlayers = Player.getAll();
    for (var i in allPlayers) {
      var p = allPlayers[i];
      var distX = this.distanceTo(p);
      var dir = this.getDirTo(p);

      //if player is within x-range and enemy is facing them
      if (distX<=200&&dir==this.direction) {
        if (p.y>this.y-100&&p.y<this.y+100) { //if player is within y-range
          this.target = p; //player is new target
          this.exclaim = 30; //enemy is in alerted mode
          break;
        }
      }
    }
  }

  update() {
  	if (this.heldBy!=null) { //do nothing while held
  		this.exclaim = -1;
  		this.target = this.heldBy;
  		this.stun = 120;
  	}
  	else {
      //counters
  		this.exclaim -= 1;
  		if (this.attackCooldown>0) this.attackCooldown -= 1;

      //choose which behavior to use based on whether or not target is around
  		if (this.target!=null) {
  			if (!PhysicsBox.has(this.target)) this.target = null; //lost target
  			else this.handleTarget();
  		}
  		else {
        this.doRandomPacing();
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
  	if (this.exclaim!=null&&this.exclaim>=0) Images.drawImage("GUI-HUD-!.png",this.x-2,this.topY()-4,4,-16);
    else super.drawElements();
  }

  static onInit() {
    this.prototype.particleColor = "#6a00d8";
    this.attacks = [];
    this.defineAttack("attack",1,18,30,false,false,false,function() { this.stun = 30; });
  }
}
initClass(Enemy,Entity);

class PaintMinion extends Enemy {
  constructor(x,y) {
    super(x,y,19,44,2,"PaintMinion.json",38);
  }
}
initClass(PaintMinion,Enemy);

class Skeltal extends Enemy {
  constructor(x,y) {
    super(x,y,19,44,3,"Skeltal.json",38);
  }
  static onInit() {
    this.prototype.particleColor = "gray";
  }
}
initClass(Skeltal,Enemy);


class View extends _c_ {
  constructor(name,layer,x,y,width,height,style,fill) {
    super();
    this.name = name;
    this.layer = layer;
  	this.x = x;
  	this.y = y;
  	this.width = width;
  	this.height = height;
  	this.style = style;
  	this.fill = fill;
  	this.visible = false;
  	this.children = [];
    this.onShowFunction = function() {};
    this.requireUserAction = false;
    G$.store(name,this);
  }
  show(src) {
  	this.visible = true;
  	Pointer.focusLayer = this.layer;
    this.onShow(src);
  	for (var i in this.children) this.children[i].onViewShown();
  	return this;
  }
  hide() {
    this.visible = false;
    if (this.layer>0)
    Pointer.focusLayer = this.layer-1;
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
  			Images.drawBorderedImage("GUI-Button.png",this.x,this.y,this.width,this.height,8,16,0,96);
  	}
  }
  removeAllChildren() {
    for (var i = this.children.length-1; i >= 0; i--) this.children[i].remove();
  }
  remove() {
    this.hide();
    this.removeAllChildren();
    G$.delete(this.name);
    super.remove();
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
  	this.neighbors = {up:null, right:null, down:null, left:null};
    G$.store(name,this);
    if (this.view.name&&this.view.visible) this.earlyOnViewShown = true;
  }
  show() { this.visible = true; return this; }
  hide() { this.visible = false; return this; }
  isVisible() { return this.visible&&this.view.visible; }
  drawHud() {
  	if (this.isVisible()) this.customDraw();
  }
  customDraw() { }
  update() { }
  remove() {
    this.view.children.splice(this.view.children.indexOf(this),1);
    G$.delete(this.name);
    super.remove();
  }
  onViewShown() { }
  setNeighbors(up,right,down,left) {
    this.neighbors = {up:up, right:right, down:down, left:left};
  }
  selectNeighbor(dir) {
    var selected = this.neighbors[dir];
  	if (!selected) return;
  	if (typeof selected=="object") {
  		for (var i in selected) {
  			if (!selected[i]) continue;
  			if (selected[i].isVisible()) {
  				Pointer.move(selected[i].x,selected[i].y);
  				return;
  			}
  		}
  	}
  	else if (selected.isVisible()) Pointer.move(selected.x,selected.y);
  }
}
initClass(GuiElement,{listType: "array"});

class Button extends GuiElement {
  constructor(name,viewName,x,y,width,height,text) {
    super(name,viewName,x,y);
  	this.width = width;
  	this.height = height;
  	this.text = text||"";
    this.mode = BUTTON_NO;
    this.isCloseButton = false;
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
  setClose(bool) {
    this.isCloseButton = bool;
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
  	if (forceAction||(this.isVisible()&&this.hovered&&this.preventClick==0&&this.mode!=BUTTON_NO)) {
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
  	if (this.view.layer!=Pointer.focusLayer) {
      this.heldDown = false;
  		return this.hovered = false;
  	}
    let dp = Pointer.downPoint;
  	if (this.checkCoord(Pointer.x,Pointer.y)&&(!dp||this.checkCoord(dp.x,dp.y))) {
			selectedElement = this;
      this.heldDown = (dp!=null);
			return this.hovered = true;
  	}
  	return this.hovered = false;
  }
  update() {
    if (this.preventClick>0) this.preventClick--;
  }
  customDraw() {
  	var x = 0, y = 0;
  	// if (this.hovered) y += 32;
    let drawPressed = this.heldDown && this.hovered;
    if (drawPressed) y += 64;
  	if (this.on) x+= 32;
    if (this.mode==BUTTON_NO) x = 32*3;
    if (this.isCloseButton) x = 32*2;
  	Images.drawBorderedImage("GUI-Button.png",this.x,this.y,this.width,this.height,8,16,x,y);
  	if (this.useIcon) Images.drawImage(this.iconImg,Math.floor(this.x+this.iconPad),Math.floor(this.y+this.iconPad)+(drawPressed?2:0),this.width-2*this.iconPad,this.height-2*this.iconPad,this.iconX*this.iconSize,this.iconY*this.iconSize,this.iconSize,this.iconSize);
  	else {
      let font = (this.hovered&&!Tap.active)?fontButtonBold:fontButton;
      font.draw(this.text,this.x+this.width/2,this.y+this.height/2+7+(drawPressed?2:0),this.width,CENTER);
  	}
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
  constructor(name,viewName,x,y,width,height,type,defaultValue,placeholder,promptMsg) {
    super(name,viewName,x,y,width,height,placeholder);
    this.setType(type); //supported: string, number, boolean, accessor
    this.defaultValue = defaultValue;
    this.storedVal = (defaultValue===void(0)? "" : defaultValue);
    this.promptMsg = promptMsg;
    this.typing = false;
    this.typingText = "";
    this.textTypeMode = 0;
    this.onInputChangeFunc = function() { };
    this.setOnClick(function() {
      if (this.typing||G$("TextInput").visible) return;
      if (Key.isDown("18")) {
        this.storedVal = void(0);
        this.onInputChangeFunc();
      }
      else if (this.type=="boolean") {
        this.storedVal = !this.storedVal;
        this.onInputChangeFunc(this.storedVal);
      }
      else if (this.type=="accessor") {
        if (!this.typeData) return;
        let thisInput = this;
        let strs = [], base = null;
        for (var i in this.typeData) {
          let split = this.typeData[i].split("_");
          if (split.length>1) {
            if (!base) base = split[0];
            strs[i] = split[1];
          }
          else strs[i] = this.typeData[i];
        }
        buildSelector(strs,function(index,selection) {
          if (base!=null) selection = base + "_" + selection;
          thisInput.storedVal = selection;
          thisInput.onInputChangeFunc(thisInput.accessValue(selection));
        },null,this.view.layer+1);
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
    let split = type.split(":");
    if (split.length>1) {
      this.type = split[0];
      this.setTypeData(split[1].split(","));
    }
    else {
      this.type = type;
      this.setTypeData([]);
    }
  }
  setTypeData(data) {
    this.typeData = data;
    if (this.type=="accessor") Constants.storeList(data);
  }
  accessValue(accessorStr) {
    return Constants.read(accessorStr?accessorStr:this.storedVal);
  }
  toAccessorString(val) {
    return Constants.getKey(val,this.typeData);
  }
  storeAccessor(val) {
    this.storedVal = this.toAccessorString(val);
    return this;
  }
  setOnInputChange(func) {
    this.onInputChangeFunc = func;
    return this;
  }
  customDraw() {
    Images.drawBorderedImage("GUI-Button.png",this.x,this.y,this.width,this.height,8,16,32,96);
    if (this.typing) return;
    else {
      let text = "", font = fontInput;
      if (this.storedVal!==""&&this.storedVal!=null) {
        text = "" + this.storedVal;
        if (this.type=="accessor") {
          text = text.split("_");
          text = text[text.length-1];
        }
      }
      else {
        text = this.text || "";
        font = fontInputEmpty;
      }
      let fontCopy = Font.copy(font,{isBold:this.hovered});
      fontCopy.draw(text,this.x+this.width/2,this.y+this.height/2+7,this.width,CENTER);
    }
  }
  setTypingView() {
    let tw = fontInputDesc.measureWidth(this.promptMsg);
    View.create("TextInput",this.view.layer+1,this.x-5,this.y-5,Math.max(this.width,tw)+10,this.height+10+22,"tint","black").show();
    TextElement.create("TextInput:TE","TextInput",this.x+this.width/2,this.y+this.height/2+7,fontInputSelect,this.typingText,this.width,CENTER).show();
    TextElement.create("TextInput:NE","TextInput",this.x,this.y+this.height+22,fontInputDesc,this.promptMsg,tw,LEFT).show();
  }
  removeTypingView() {
    G$("TextInput").hide();
    G$("TextInput:NE").remove();
    G$("TextInput:TE").remove();
    G$("TextInput").remove();
  }
  onKeypress(keycode) {
    if (!this.typing) return;

    switch (keycode) {
      case 13: // Enter key
        this.typing = false;
        this.removeTypingView();
        let response = this.typingText;
        if (this.type=="number"&&!isNaN(parseFloat(response))) response = parseFloat(response);
        if (!this.type || typeof response == this.type) {
          if (response==="") response = null;
          this.storedVal = response;
          this.onInputChangeFunc(response);
        }
        break;
      case 32: // Space key
        this.typing = false;
        this.removeTypingView();
        break;
      case 8: // Backspace key
        if (this.typingText.length>0) {
          if (this.textTypeMode==1) {
            G$("TextInput:TE").text = this.typingText = "";
          }
          else {
            this.typingText = this.typingText.slice(0,this.typingText.length-1);
            G$("TextInput:TE").text = this.typingText;
          }
        }
        break;
      case 37: //left arrow key
      case 39: //right arrow key
        if (this.textTypeMode==1) {
          G$("TextInput:TE").font = fontInputType;
          this.textTypeMode = 0;
        }
        break;
      default:
        let ogKeycode = keycode;
        if (keycode>95&&keycode<106) keycode -= 48; //numpad numbers
        if (keycode>188&&keycode<191) keycode -= 80;
        if (keycode>108&&keycode<111) keycode -= 64; //numpad - and .
        if((keycode>47&&keycode<58) || (keycode>64&&keycode<91) || (keycode>44&&keycode<47)) {
          let char = String.fromCharCode(keycode);
          if (keycode>64&&keycode<91&&!Key.isDown(16)) char = char.toLowerCase();
          if (ogKeycode==51&&Key.isDown(16)) char = '#';

          if (this.textTypeMode==1) {
            G$("TextInput:TE").text = this.typingText = char;
            G$("TextInput:TE").font = fontInputType;
            this.textTypeMode = 0;
          }
          else {
            this.typingText += char;
            G$("TextInput:TE").text = this.typingText;
          }
        }
    }
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
    }
    else this.heldDown = false;
  }
  customDraw() {
    let x = this.anchorX+this.width/2, y = this.anchorY+this.height/2;
    c.strokeStyle = "black";
    c.lineWidth = 5;
    drawLine(x,y,x+this.barLength,y);
    c.strokeStyle = "white";
    c.lineWidth = 3;
    drawLine(x+1,y,x+this.barLength-2,y);
    c.lineWidth = 1;
    super.customDraw();
  }
}
initClass(Slider,Button);

class TextElement extends GuiElement {
  constructor(name,viewName,x,y,font,text,maxWidth,alignment) {
    super(name,viewName,x,y);
    this.text = text;
  	this.font = font;
    this.maxWidth = maxWidth;
    this.alignment = alignment;
  }
  customDraw() {
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
  customDraw() {
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
  constructor(x,y,id,size,duration,defyGravity,color) {
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
  }
  draw() {
    c.fillStyle = this.color;
  	c.fillRect(this.x-this.size/2,this.y-this.size/2,this.size,this.size);
  }
  update() {
    //gravity
  	if (!this.isGrounded&&this.velY<50&&!this.defyGravity) this.velY +=1;
  	//calculate X
  	if (this.velX!=0) {
  		this.x += this.velX;
  		if (Math.abs(this.velX)<0.5) this.velX = 0;
  		else this.velX += this.velX>0? -0.5: 0.5;
  	}
  	//calculate Y
  	if (this.velY!=0) {
  		this.y += this.velY;
  		if (Math.abs(this.velY)<0.5) this.velY = 0;
  		else this.velY += this.velY>0? -0.5: 0.5;
  	}
  	if (this.timer--<0) this.remove();
  }
  static generate(x,y,id,amount,size,duration,defyGravity,color,angle,angleRadius,magnitude,magRadius) {
    for (var i in arguments) if (arguments[i]==null) arguments[i] = 0;
  	var angle = angle*Math.PI/180, angleRadius = angleRadius*Math.PI/180;
  	while(amount-->0) {
  		var particle = this.create(x,y,id,size,duration,defyGravity,color);
  		var newAngle = angle + angleRadius*(Math.random()*2-1);
  		var newMag = magnitude + magRadius*(Math.random()*2-1);
  		particle.velX = Math.cos(newAngle)*newMag;
  		particle.velY = Math.sin(newAngle)*newMag;
  	}
  }

  static onInit() {
    this.prototype.drawLayer = 3;
  }
}
initClass(Particle,{drawable: true, listType: "array"});
