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
    if (this.listType=="array") this.classList.push(instance);
    else if (this.listType=="uid") this.classList[instance.uid] = instance;
  }
  static removeInstance(instance) {
    if (this.parent!=null) this.parent.removeInstance(instance);
    if (this.listType=="array") this.classList.splice(this.classList.indexOf(instance),1);
    else if (this.listType=="uid") delete this.classList[instance.uid];
  }
  static getAll() {
    let list = [];

    if (this.listType=="array") list = list.concat(this.classList);
    else if (this.listType=="uid") for (var c in this.classList) list.push(this.classList[c]);
    return list;
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
      cl.classList = [];
      break;
    case "uid":
      cl.classList = {};
  }
  if (typeof cl.onInit=="function") cl.onInit();
}

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
  constructor(x,y,width,height,color,sprite,targetClass,onIntersect,onStopIntersect) {
    super(x,y,width,height,color,sprite);
  	this.targetClass = targetClass;
  	this.onIntersect = onIntersect;
  	this.onStopIntersect = onStopIntersect;
  	this.touches = [];
  }
  update() {
    super.update();
  	var all = this.targetClass.getLoaded();
  	var newTouches = [];
  	for (var i in all) {
  		if (this.intersect(all[i])) {
  			newTouches.push(all[i]);
  			if (this.touches.indexOf(all[i])==-1) {
  				if (this.onIntersect) this.onIntersect(all[i]);
  			}
  		}
  		else if (this.touches.indexOf(all[i])!=-1) {
  			if (this.onStopIntersect) this.onStopIntersect(all[i]);
  		}
  	}
  	delete this.touches;
  	this.touches = newTouches;
  }
}
initClass(Interactable,Box);

class HarmBox extends Interactable {
  constructor(x,y,width,height,attacker,damage,duration,formulaX,formulaY,endCheck) {
  	super(x,y,width,height,void(0),void(0),Entity);
  	this.attacker = attacker;
  	this.damage = damage;
  	this.time = duration;
  	this.formulaX = formulaX;
  	this.formulaY = formulaY;
  	if (endCheck) this.endCheck = endCheck;
  	else this.endCheck = function() { return false; };
  	this.harmed = [];
  }
  update() {
  	if (this.attacker!=null&&Entity.classList[this.attacker.uid]) {
  		this.x = this.formulaX(this.attacker,this);
  		this.y = this.formulaY(this.attacker,this);
  	}
  	if (!this.endCheck(this.attacker,this)) {
  		super.update();
  		for (var i in this.touches) {
  			var v = this.touches[i];
  			if (v==this.attacker||this.harmed.indexOf(v)!=-1) continue;
  			v.hurt(this.damage,this.attacker!=null?this.attacker:this);
        if (this.onHurt) this.onHurt(v);
  			if (!v.dead) this.harmed.push(v);
  		}
  		this.time -= 1;
  		if (this.time<=0) {
  			this.remove();
  		}
  	}
  	else this.remove();
  }
  remove() {
  	if (Entity.getAll().indexOf(this.attacker)!=-1) {
  		this.attacker.setAnimation("stand");
  		this.attacker.attackBox = null;
  	}
  	super.remove();
  }

  static onInit() {
    this.prototype.hitBoxStroke = "red";
  }
}
initClass(HarmBox,Interactable);

class AttackBox extends HarmBox {
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
initClass(AttackBox,HarmBox);

class Door extends Interactable {
  constructor(x,y,linkId,destination) {
    super(x,y,32,55,void(0),void(0),Player);
  	this.linkId = linkId;
  	this.destination = destination;
  	this.doorOpen = false;
  	this.warpStep = 0;
  	this.player = null;
    this.sheet = Animation.getSpritesheet("Door.json");
  }
  static getFromLinkId(linkId) {
  	var allDoors = this.getAll();
  	for (var i in allDoors) {
  		if (allDoors[i].linkId==linkId) return allDoors[i];
  	}
  	return -1;
  }
  getLink() { return Door.getFromLinkId(this.destination); };

  checkPlayers() {
  	var linked = this.getLink();
  	if (this.player||this.doorOpen||this.animCurrent!="closed"||linked==-1||linked.player!=null) return;
  	for (var i in this.touches) {
  		var p = this.touches[i];
      var pad = p.ctrls.mostRecent();
  		if (pad.pressed("lookUp",0.8)&&p.isGrounded&&p.held==null&&Math.abs(this.y-p.y)<2&&p.door==null) {
  			this.player = p;
  			p.door = this;
  			p.doorEnterTick = 30;
  			p.doorWaitStep = 1;
  			p.velX = 0;
  			p.velY = 0;
  			p.defyGravity = true;
  			this.setAnimation("opening",null,"full");
  			this.doorOpen = true;
  			this.warpStep = 1;
  			return;
  		}
  	}
  }
  receivePlayer(p) {
  	p.x = this.x;
  	p.y = this.y;
  	p.door = this;
  	p.direction = RIGHT;
  	this.player = p;
  	this.warpStep = 4;
  	this.setAnimation("opening",null,"full");
  	this.doorOpen = true;
  }
  forgetPlayer() {
  	this.player.defyGravity = false;
  	this.player.door = null;
  	this.player.doorWaitStep = 0;
  	this.player = null;
  	this.animLock = 0;
  	this.setAnimation("closing",null,"full");
  	this.doorOpen = 0;
  	this.warpStep = 0;
  }

  doWarp() {
  	var door = this.getLink();
  	if (door!=-1&&door.player==null) {
  		door.receivePlayer(this.player);
  		this.player = null;
  		return true;
  	}
  	else return false;
  }

  update() {
  	super.update();
  	this.checkPlayers();
  	if ((this.player&&this.player.door==this)/*&&this.doorOpen&&this.animCurrent!="closed"*/) {
  		switch (this.warpStep) {
  			case 1:
  				if (this.animLock==0) this.warpStep = 2;
  				break;
  			case 2:
  				if (this.player.doorWaitStep==3) {
  					this.setAnimation("closing",null,"full");
  					this.doorOpen = false;
  					this.warpStep = 3;
  				}
  				break;
  			case 3:
  				if (this.animCurrent=="closed") {
  					if (this.doWarp()) this.warpStep = 0;
  				}
  				break;


  			case 4:
  				if (this.animCurrent=="open") {
  					this.player.doorEnterTick = 30;
  					this.player.doorWaitStep = 4;
  					this.warpStep = 5;
  				}
  				break;
  			case 5:
  				if (this.player.doorWaitStep==5) this.forgetPlayer();
  		}
  	}
    if (this.doorOpen) this.setAnimation("open");
    else this.setAnimation("closed");
  }

  static onInit() {
    Animation.applyToClass(this);
    this.prototype.drawLayer = -1;
    this.prototype.lockSectors = true;
  }
}
initClass(Door,Interactable);


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
  	if (this.defyPhysics||this.heldBy) return;
  	this.ground = null;
  	this.lineGround = null;
  	//bottom of screen
  	if (Level.level.edge.bottom==EDGE_SOLID&&this.y>=Level.level.height) {
  		this.isGrounded = true;
  		this.cSides.d = true;
  	}
  }
  groundDragLoop(b,loops) {
  	if (PhysicsBox.getAll().indexOf(b)==-1&&Line.getAll().indexOf(b)==-1) return this.ground = null;
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

    //prepare values for collision detection
    //store change in position during this update
    this.dx = this.x-oldX, this.dy = this.y-oldY;
    //clear values relating to change in position
    this.prevX = oldX, this.prevY = oldY;
    //clear values relating to ground and side detection
  	this.isGrounded = false;
  	this.cSidesPrev = this.cSides;
  	this.cSides = {u:0,r:0,d:0,l:0};
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
    if (this.valueAt(x,'x')==y || this.valueAt(y,'y')==x) {
      if (this.leftX()<=x && x<=this.rightX()) {
        if (this.topY()<=y && y<=this.bottomY()) return true;
      }
    }
    return false;
  }
  hitboxContainsPoint(x,y) {
    let yRespectX = this.valueAt(x,'x');
    let xRespectY = this.valueAt(y,'y');
    if (this.hasPoint(x,yRespectX) || this.hasPoint(xRespectY,y)) return true;
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
      ca = [chosenVals[2],chosenVals[3]];
      cb = [chosenVals[4],chosenVals[5]];

      //choose one
      let angle = line.angle();
      if (angle<Infinity&&Math.abs(toDegrees(angle))!=90) {
        if (angle>0) fp = ca;
        else if (angle<0) fp = cb;
      }
    }
    else fp = [chosenVals[0],chosenVals[1]]; //mid-point detection

    //given our focus point(s), check if they collide with the line
    if (fp!=null) { //single focus point
      //a line segment based on box's movement and our focus point
      let b1 = [fp[0]-dx, fp[1]-dy];
      let b2 = fp;
      //check if the points cross the line
      if (Line.pointsCrossLine(b1,b2,line)) cross = true;
    }
    else { //two focus points
      //line segments based on box's movement and our corner points
      let ca1 = [ca[0]-dx,ca[1]-dy];
      let ca2 = ca;
      let cb1 = [cb[0]-dx,cb[1]-dy];
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
      let dfp = [fp[0]-box.x,fp[1]-box.y];

      //per each line direction
      //if the focus point is on the 'push' side of the line, then collide
      switch(line.direction) {
        case LINE_LEFT:
          if (fp[0]>=line.valueAt(fp[1],'y')) {
            box.x = line.valueAt(fp[1],'y')-dfp[0];
            if (box.velX>0) box.velX = 0;
            box.cSides.r = C_LINE;
          }
          break;
        case LINE_RIGHT:
          if (fp[0]<=line.valueAt(fp[1],'y')) {
            box.x = line.valueAt(fp[1],'y')-dfp[0];
            if (box.velX<0) box.velX = 0;
            box.cSides.l = C_LINE;
          }
          break;
        case LINE_UP:
          if (fp[1]>=line.valueAt(fp[0],'x')) {
            box.y = line.valueAt(fp[0],'x')-dfp[1];
            if (box.velY>0) box.velY = 0;
            box.cSides.d = C_LINE;
            box.isGrounded = true;
            box.lineGround = line;
          }
          break;
        case LINE_DOWN:
          if (fp[1]<=line.valueAt(fp[0],'x')) {
            box.y = line.valueAt(fp[0],'x')-dfp[1];
            if (box.velY<0) box.velY = 0;
            box.cSides.u = C_LINE;
          }
      }
    }
    else if (line.useBoxCorners) {
      //figure out which directions should be solid
      let dirs = {u:true, d:true, l:true, r:true};
      let angle = line.angle();
      switch (line.direction) {
        case LINE_UP:
          dirs.d = false;
           dirs.r = 0.5;
           dirs.l = 0.5;
          break;
        case LINE_DOWN:
          dirs.u = false;
           dirs.l = 0.5;
           dirs.r = 0.5;
          break;
        case LINE_LEFT:
          dirs.r = false;
           dirs.d = 0.5;
           dirs.u = 0.5;
          break;
        case LINE_RIGHT:
          dirs.l = false;
           dirs.u = 0.5;
           dirs.d = 0.5;
          break;
      }

      let allEndpoints = this.getAllEndpoints();
      //check if passing line's endpoints
      this.collideEndpoint(line,box,line.x,line.y,dirs,allEndpoints);
      this.collideEndpoint(line,box,line.x2,line.y2,dirs,allEndpoints);
    }
  }
  static pointsCrossLine(p1,p2,line) {
    //a line segment based on the line
    let l1 = [line.x, line.y];
    let l2 = [line.x2, line.y2];

    if (line.hasPoint(p1[0],p1[1])) return true; //previous location on line
    else if (line.hasPoint(p2[0],p2[1])) return true; //current location on line
    else if (Line.segmentsIntersect(p1,p2,l1,l2)) return true; //locations pass pass through line
    else return false;
  }
  static segmentsIntersect(p1,p2,q1,q2) {
    //check orientations of the points
    let oPQ1 = Line.pointOrientation(p1,p2,q1);
    let oPQ2 = Line.pointOrientation(p1,p2,q2);
    let oQP1 = Line.pointOrientation(q1,q2,p1);
    let oQP2 = Line.pointOrientation(q1,q2,p2);

    //the general case
    if (oPQ1!=oPQ2 && oQP1!=oQP2) return true;

    //special cases
    if (oPQ1==ORIENT_LIN&&Line.colinearPointIsOnSegment(p1,q1,p2)) return true;
    if (oPQ2==ORIENT_LIN&&Line.colinearPointIsOnSegment(p1,q2,p2)) return true;
    if (oQP1==ORIENT_LIN&&Line.colinearPointIsOnSegment(q1,p1,q2)) return true;
    if (oQP1==ORIENT_LIN&&Line.colinearPointIsOnSegment(q1,p2,q2)) return true;

    //doesn't pass any test
    return false;
  }
  static pointOrientation(a,b,c) {
    //use the diferences in slope from a to b to c to determine their orientation
    let slopeDiff = (b[1]-a[1])*(c[0]-b[0]) - (c[1]-b[1])*(b[0]-a[0]);
    if (slopeDiff==0) return ORIENT_LIN;
    else if (slopeDiff>0) return ORIENT_CW;
    else return ORIENT_CCW;
  }
  static colinearPointIsOnSegment(s1,c,s2) {
    //given that c is colinear with s1 and s2, checks if c is on the segment s
    if (Math.min(s1[0],s2[0]) <= c[0] && c[0] <= Math.max(s1[0],s2[0])) {
      if (Math.min(s1[1],s2[1]) <= c[1] && c[1] <= Math.max(s1[1],s2[1])) {
        return true;
      }
    }
    return false;
  }

  static collideEndpoint(line,box,x,y,directions,endpoints) {
    let doSpecial = true;
    let foundMatch = false;
    for (var i in endpoints) {
      let ep = endpoints[i];
      if (ep.x!=x||ep.y!=y) continue;
      if (ep.direction==line.direction) {
        if (!foundMatch) foundMatch = true;
        else {
          doSpecial = false;
          break;
        }
      }
    }
    let dirs = clone(directions);
    for (var i in dirs) if (dirs[i]==0.5) {
      dirs[i] = doSpecial;
    }

    if (box.containsPoint(box.x,y)) {
      if (dirs.l && box.prevX+box.halfW()<= x && x <=box.rightX()) {
        box.x = x-box.halfW();
        if (box.velX>0) box.velX = 0;
        box.cSides.r = C_LINE;
        // console.log("l")
      }
      if (dirs.r && box.leftX()<= x && x <=box.prevX-box.halfW()) {
        box.x = x+box.halfW();
        if (box.velX<0) box.velX = 0;
        box.cSides.l = C_LINE;
        // console.log("r")
      }
    }
    if (box.containsPoint(x,box.y)) {
      if (dirs.u && box.prevY<= y && y <=box.y) {
        box.y = y;
        if (box.velY>0) box.velY = 0;
        box.cSides.d = C_LINE;
        box.isGrounded = true;
        //don't add lineGround because we don't want angle-walking on the end of the line anyway
        // console.log("u")
      }
      if (dirs.d && box.topY()<= y && y <=box.prevY-box.height) {
        box.y = y+box.height;
        if (box.velY<0) box.velY = 0;
        box.cSides.u = C_LINE;
        // console.log("d")
      }
    }
  }
  static getAllEndpoints() {
    let lines = this.getAll();
    let points = [];
    for (var i in lines) {
      let l = lines[i];
      if (l.direction==void(0)) continue;
      points.push({x: l.x, y: l.y, direction: l.direction});
      points.push({x: l.x2, y: l.y2, direction: l.direction});
    }
    return points;
  }

  static onInit() {
    this.prototype.setSectors = Box.prototype.setSectors;
    this.prototype.remove = PhysicsBox.prototype.remove;
    this.prototype.lockSectors = true;
    this.prototype.collisionType = C_LINE;
    this.prototype.drawLayer = -2;
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
  	this.doorEnterTick = 0;
  	this.doorWaitStep = 0;
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
        if (this.tap.type!=NULLCTRL&&mostRecent.type!=TOUCH) Tap.active = false;
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
      if (this.door&&this.doorEnterTick<30) this.setAnimation("run");
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
  doorActions() {
    switch(this.doorWaitStep) {
      case 1:
      this.faceTo(this.door);
      if (this.door.warpStep==2&&this.door.doorOpen) this.doorWaitStep = 2;
      break;
      case 2:
      this.faceTo(this.door);
      if (this.distanceTo(this.door)>4.5) this.move(1.5);
      else {
        this.move(this.distanceTo(this.door)/2);
        if (this.doorEnterTick>0) {
          this.doorEnterTick--;
        }
        else this.doorWaitStep = 3;
      }
      break;
      case 4:
      if (this.doorEnterTick>0) {
        this.doorEnterTick--;
      }
      else this.doorWaitStep = 5;
    }
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
      var throwHurt = HarmBox.create(throwing.x,throwing.y+5,throwing.width+10,throwing.height+10,throwing,throwing.thrownDamage,1000,xFunct,yFunct,function(thrownObj,harm) {
        return (thrownObj.velX==0&&thrownObj.velY==0)||thrownObj.isGrounded;
      });
      throwHurt.harmed.push(this);
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

  	if (this.door) this.doorActions();

  	if (this.attackCooldown>0) this.attackCooldown -= 1;

    if (this.isGrounded) this.canUpAirAttack = true;

    //return player state to normal when lift animation is complete
    if (this.inLiftAnim&&(this.animCurrent!="lift")) {
      this.inLiftAnim = false;
      this.defyGravity = false;
      this.movementLocked = false;
    }

    //if not stunned, run controls
  	if (this.stun==0&&!this.door) this.handleControls(controller);

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
  breakConnections() {
  	if (this.door) this.door.forgetPlayer();
  	super.breakConnections();
  }
  remove() {
    this.ctrls.selfDestructAll();
    Player.clearFromSlot(this);
    super.remove();
  }
  respawn() {
  	if (this.door) this.door.forgetPlayer();
    this.direction = this.spawnDirection;
    this.attackHeld = 0;
  	super.respawn();
  }

  draw(preventAnimTick) {
  	if (this.door) {
  		if (this.doorWaitStep==2) c.globalAlpha = this.doorEnterTick/30;
  		else if (this.doorWaitStep==4) c.globalAlpha = 1-this.doorEnterTick/30;
  		else if (this.doorWaitStep==3) c.globalAlpha = 0;
  	}
  	super.draw(preventAnimTick);
  	c.globalAlpha = 1;
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

  handleTarget() {
    this.faceTo(this.target);
    let dist = this.distanceTo(this.target);
    let distY = Math.abs(this.y-this.target.y);
    if (this.exclaim<=0) {
      let frontBox = new Box(this.calcXPosInFront(15/2),this.y-1,15,this.height-2);
      if (dist>30) {
        //follow
        if (!this.stun) this.move(2.5);
        //jump
        let isBlocked = false, objs = PhysicsBox.getLoaded();
        for (var i in objs) {
          let box = objs[i];
          if (box==this||box==this.target) continue; //self and target should't trigger a jump
          if (box.collisionType==C_LINE&&(box.line.direction==LINE_UP||box.line.direction==LINE_DOWN)) continue; //don't trigger jump from lines
          if (box.intersect(frontBox)) isBlocked = true;
        }
        if (isBlocked&&this.isGrounded&&this.stun==0) this.jump();
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
    var dist = Math.abs(this.x-this.paceTarget);
    var frontBox = new Box(this.calcXPosInFront(1),this.y-1,2,this.height-2);
    var isBlocked = false, allEnem = Enemy.getLoaded();
    for (var j in allEnem) {
      if (allEnem[j]==this) continue;
      if (allEnem[j].intersect(frontBox)) isBlocked = true;
    }
    if (this.paceTarget!=null&&dist>3) {
      this.faceTo(this.paceTarget);
      if (!isBlocked&&this.stun==0) this.move(1.5);
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
  			if (PhysicsBox.getAll().indexOf(this.target)==-1) this.target = null; //lost target
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
    G$.store(name,this);
  }
  show() {
  	this.visible = true;
  	Pointer.focusLayer = this.layer;
  	for (var i in this.children) this.children[i].onViewShown();
  	return this;
  }
  hide() {
    this.visible = false;
    if (this.layer>0)
    Pointer.focusLayer = this.layer-1;
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
  remove() {
    this.hide();
    for (var i = this.children.length-1; i >= 0; i--) this.children[i].remove();
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
  onClick(ctrl) {
  	if (this.isVisible()&&this.hovered&&this.preventClick==0&&this.mode!=BUTTON_NO) {
      this.preventClick += this.pressDelay;
  		this.clickSource = ctrl;
      var func;
      if (this.mode==BUTTON_TOGGLE) func = this.states[this.toggleState];
      if (this.radioGroupNames.length>0) {
        for (var i in this.radioGroupNames) {
          if (i==this.radioGroupIndex) continue;
          G$(this.radioGroupNames[i]).on = false;
        }
        if (this.radioGroupStrict) this.on = true;
        else this.on = !this.on;
      }
  		if (this.requireUserAction) {
        if (func) return attemptUserAction(func,ctrl);
  			else return attemptUserAction(this.onClickFunction,ctrl);
  		}
  		else {
        if (func) func.call(this,ctrl);
  			else this.onClickFunction(ctrl);
  			return true;
  		}
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
  		if (this.hovered) this.hovered = false;
  		return;
  	}
  	if (this.checkCoord(Pointer.x,Pointer.y)) {
			if (!this.hovered) {
				this.hovered = true;
				selectedElement = this;
			}
			return;
  	}
  	if (this.hovered) this.hovered = false;
  }
  update() {
    if (this.preventClick>0) this.preventClick--;
  }
  customDraw() {
  	var x = 0, y = 0;
  	if (this.hovered) y += 32;
  	if (this.on) x+= 32;
    if (this.mode==BUTTON_NO) x = 32*3;
    if (this.isCloseButton) x = 32*2;
  	Images.drawBorderedImage("GUI-Button.png",this.x,this.y,this.width,this.height,8,16,x,y);
  	if (this.useIcon) Images.drawImage(this.iconImg,Math.floor(this.x+this.iconPad),Math.floor(this.y+this.iconPad),this.width-2*this.iconPad,this.height-2*this.iconPad,this.iconX*this.iconSize,this.iconY*this.iconSize,this.iconSize,this.iconSize);
  	else {
      let font = this.hovered?fontButtonBold:fontButton;
      font.draw(this.text,this.x+this.width/2,this.y+this.height/2+7,this.width,CENTER);
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
        buildSelector(this.typeData,function(index,selection) {
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
      if (this.storedVal!==""&&this.storedVal!=null) text = "" + this.storedVal;
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
}
initClass(TextElement,GuiElement);

class ImgElement extends GuiElement {
  constructor(name,viewName,x,y,img,width,height) {
    super(name,viewName,x,y);
  	this.width = width;
  	this.height = height;
  	this.img = img;
  }
  customDraw() {
  	Images.drawImage(this.img,this.x-this.width/2,this.y-this.height/2,this.width,this.height);
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
