class _c_ {
  static create() {
    var newInstance = new this(...arguments);
		this.addInstance(newInstance);
		if (this.onCreate) this.onCreate.call(newInstance);
		return newInstance;
  }
  static addInstance(instance) {
    if (this.parent!=null) this.parent.addInstance(instance);
    this.classList.push(instance);
  }
  static removeInstance(instance) {
    if (this.parent!=null) this.parent.removeInstance(instance);
    this.classList.splice(this.classList.indexOf(instance),1);
  }
  static getAll() {
    var list = [];
		var all = [].concat(this.classList);
		for (var i in all) if (all[i]&&!all[i].deleted) list.push(all[i]);
		return list;
  }
  static killAll() {
    var list = [].concat(this.classList);
		var i = list.length;
		while (i-->0) {
			if (list[i]&&!list[i].deleted) list[i].remove();
		}
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
    var deletedFrom = this.constructor;
		for (var property in this) this[property] = undefined;
		this.deleted = true;
		this.constructor = deletedFrom;
		Garbage.add(this);
  }
  drawTint() {}
  draw() {}
  drawElements() {}
  drawHud() {}
  drawDebug() {}
  drawHighlighted() {}
}
function initClass(cl,arg) {
  cl.classList = [];
  var type = (typeof arg);
  if (type!="undefined") {
    switch(type) {
      case "boolean":
        if (arg) DrawableClassList.push(cl);
        break;
      case "function":
        cl.parent = arg;
    }
  }
}

var Box = class Box extends _c_ {
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
  topY() { return this.y-this.height }
  midY() { return this.y-(this.height/2) }
  containsPoint(x,y) {
  	if (x<=this.rightX()&&x>=this.leftX()) {
  		if (y<=this.y&&y>=this.topY()) {
  			return true;
  		}
  	}
  	return false;
  }
  intersect(rect) {
  	if (this.rightX()>=rect.leftX()&&this.leftX()<=rect.rightX()) {
  		if (this.y>=rect.topY()&&this.topY()<=rect.y) return true;
  	}
  	return false;
  }
  draw() {
    if (!this.isLoaded) return;
  	c.fillStyle = this.color;
  	if (this.color!=null) c.fillRect(Math.round(this.leftX()),Math.round(this.y),this.width,-(this.height));
  	if (this.sprite!=null) ImageFactory.drawImage(this.sprite,Math.round(this.leftX()),Math.round(this.topY()),this.width,this.height);
  }
  drawDebug() {
  	c.lineWidth = 1;
  	c.strokeStyle = this.hitBoxStroke;
  	c.strokeRect(this.x-this.halfW(),this.y,this.width,-this.height,this.hitBoxStroke);
  }
  drawHighlighted() {
    c.lineWidth = 5;
  	c.strokeStyle = "red";
  	c.strokeRect(this.x-this.halfW(),this.y,this.width,-this.height,this.hitBoxStroke);
  	this.draw(true);
  }
  update() { }
  setSectors() {
    if (!this.lockSectors||this.sectors[0]==null) {
      for (var i in this.sectors) Sectors.removeFromSector(this,this.sectors[i]);
      this.sectors = [];
      var sectorX = Math.floor(this.x/Sectors.size.width);
      var sectorY = Math.floor(this.y/Sectors.size.height);
      Sectors.addToSector(this,sectorX,sectorY);
      
      if (this.width>Sectors.size.width||this.height>Sectors.size.height) {
        var leftX = Math.floor(this.leftX()/Sectors.size.width);
        var rightX = Math.floor(this.rightX()/Sectors.size.width);
        var topY = Math.floor(this.topY()/Sectors.size.height);
        var bottomY = Math.floor(this.y/Sectors.size.height);
        for (var a = leftX; a <= rightX; a++) {
          for (var b = topY; b <= bottomY; b++) {
            if (a!=sectorX&&b!=sectorY) Sectors.addToSector(this,a,b);
          }
        }
      }
    }
    if (this.alwaysLoaded) this.isLoaded = true;
    else {
      this.isLoaded = false;
      for (var i in this.sectors) {
        if (Sectors.getSector(this.sectors[i]).loaded) {
          this.isLoaded = true;
          break;
        }
      }
    }
  }
  remove() {
    for (var i in this.sectors) {
      Sectors.removeFromSector(this,this.sectors[i]);
    }
    super.remove();
  }
}
initClass(Box,true);
Box.prototype.hitBoxStroke = "darkGray";
Box.prototype.drawLayer = 0;

var Interactable = class Interactable extends Box {
  constructor(x,y,width,height,color,sprite,targetClass,onIntersect,onStopIntersect) {
    super(x,y,width,height,color,sprite);
  	this.targetClass = targetClass;
  	this.onIntersect = onIntersect;
  	this.onStopIntersect = onStopIntersect;
  	this.touches = [];
  }
  update() {
    super.update();
  	var all = this.targetClass.getAll();
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

var HarmBox = class HarmBox extends Interactable {
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
  remove() {
  	if (Entity.getAll().indexOf(this.attacker)!=-1) {
  		this.attacker.setAnimation("stand");
  		this.attacker.attackBox = null;
  	}
  	super.remove();
  }
  update() {
  	if (this.attacker!=null&&Entity.getAll().indexOf(this.attacker!=-1)) {
  		this.x = this.formulaX(this.attacker,this);
  		this.y = this.formulaY(this.attacker,this);
  	}
  	if (!this.endCheck(this.attacker,this)) {
  		super.update();
  		for (var i in this.touches) {
  			var v = this.touches[i];
  			if (v==this.attacker||this.harmed.indexOf(v)!=-1) continue;
  			v.hurt(this.damage,this.attacker!=null?this.attacker:this);
  			if (!v.dead) this.harmed.push(v);
  		}
  		this.time -= 1;
  		if (this.time<=0) {
  			this.remove();
  		}
  	}
  	else this.remove();
  }
}
HarmBox.prototype.hitBoxStroke = "red";

var Door = class Door extends Interactable {
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
  checkPlayers() {
  	var linked = this.getLink();
  	if (this.player||this.doorOpen||this.animCurrent!="closed"||linked==-1||linked.player!=null) return;
  	for (var i in this.touches) {
  		var p = this.touches[i];
      var pad = p.ctrls.mostRecent();
  		if (pad.pressed("lookUp")&&p.isGrounded&&p.held==null&&Math.abs(this.y-p.y)<2&&p.door==null) {
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
  doWarp() {
  	var door = this.getLink();
  	if (door!=-1&&door.player==null) {
  		door.receivePlayer(this.player);
  		this.player = null;
  		return true;
  	}
  	else return false;
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
}
initClass(Door,Interactable);
Animation.applyToClass(Door);
Door.prototype.drawLayer = -1;
Door.prototype.lockSectors = true;


var PhysicsBox = class PhysicsBox extends Box {
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
  preCollision() {
  	if (this.defyPhysics||this.heldBy) return;
  	this.ground = null;
  	this.lineGround = null;
  	//bottom of screen
  	if (this.y>=Level.height) {
  		this.y = Level.height;
  		this.velY = 0;
  		this.isGrounded = true;
  		this.cSides.d = true;
  	}
  }
  groundDragLoop(b,loops) {
  	if (PhysicsBox.getAll().indexOf(b)==-1) return this.ground = null;
  	this.x += b.dx;
  	if (loops>=10) console.log("Ground drag limit");
  	else if (b.ground!=null) this.groundDragLoop(b.ground,loops+1);
  }
  doGroundDrag() {
  	if (this.defyPhysics||this.heldBy) return;
  	if (this.ground!=null) this.groundDragLoop(this.ground,0);
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
      if (this.lineGround&&this.lineGround.hitbox&&this.intersect(this.lineGround.hitbox)&&!this.ground) {
        this.x += Math.cos(this.lineGround.angle())*this.velX;
      }
  		else this.x += this.velX;
  		if (Math.abs(this.velX)<0.5) this.velX = 0;
  		else this.velX += this.velX>0? -0.5: 0.5;
  	}
  	//calculate Y
  	if (this.lineGround&&this.lineGround.hitbox&&!this.ground) {
  		if (this.x<=this.lineGround.hitbox.rightX()&&this.x>=this.lineGround.hitbox.leftX()&&this.intersect(this.lineGround.hitbox)) this.y = this.lineGround.valueAt(this.x,'x');
  	}
  	if (this.velY!=0) {
  		this.y += this.velY;
  		if (Math.abs(this.velY)<0.5) this.velY = 0;
  		else this.velY += this.velY>0? -0.5: 0.5;

  	}
  	//wrap screen edge
  	if (this.x<-this.width) this.x = Level.width+this.width;
  	else if (this.x>Level.width+this.width) this.x = -this.width;
  	//clear values for collision detection
  	this.dx = this.x-oldX, this.dy = this.y-oldY;
  	this.isGrounded = false;
  	this.cSidesPrev = this.cSides;
  	this.cSides = {u:0,r:0,d:0,l:0};
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
}
initClass(PhysicsBox,Box);
PhysicsBox.prototype.hitBoxStroke = "limeGreen";
PhysicsBox.prototype.defyGravity = false;

var MovingPlatform = class MovingPlatform extends PhysicsBox {
  constructor(x,y,width,height,color,sprite,collisionType,velX,velY) {
  	super(x,y,width,height,color,sprite,true,collisionType,false,false);
  	this.velX = this.dx = velX;
  	this.velY = this.dy = velY;
  }
  update() {
  	this.x += this.velX;
  	this.y += this.velY;
  	if (this.x<-this.width/2) this.x = Level.width+this.width/2;
  	else if (this.x>Level.width+this.width/2) this.x = -this.width/2;
  }
}
initClass(MovingPlatform,PhysicsBox);


var Line = class Line extends _c_ {
  constructor(x,y,x2,y2,size,stroke) {
    super();
  	this.x = x;
  	this.y = y;
  	this.x2 = x2;
  	this.y2 = y2;
  	this.size = size;
  	this.stroke = stroke;
  }
  rightX() { return Math.max(this.x,this.x2); }
  leftX() { return Math.min(this.x,this.x2); }
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
  draw() {
  	c.strokeStyle = this.stroke;
  	c.lineWidth = this.size;
  	if (this.stroke) drawLine(this.x,this.y,this.x2,this.y2);
  }
  drawDebug() {
  	c.lineWidth = 1;
  	c.strokeStyle = this.hitBoxStroke;
  	drawLine(this.x,this.y,this.x2,this.y2);
  }
  drawHighlighted() {
  	c.lineWidth = 5;
  	c.strokeStyle = "red";
  	drawLine(this.x,this.y,this.x2,this.y2);
  	this.draw(true);
  }
  update() { }
}
initClass(Line,true);
Line.prototype.hitBoxStroke = "darkGray";
Line.prototype.drawLayer = -2;

var SolidLine = class SolidLine extends Line {
  constructor(x,y,x2,y2,size,stroke,direction) {
    super(x,y,x2,y2,size,stroke);
  	this.direction = direction;
  }
  static onCreate() {
  	var mag = Math.abs(this.slope())
    var hitboxY = this.bottomY();
    var hitboxWidth = Math.abs(this.x-this.x2);
    var hitboxHeight = Math.abs(this.y-this.y2);
  	if (mag<0.25) {
      hitboxY += 15;
      hitboxHeight += 30;
    }
  	else if (1/mag<0.25||this.slope()==Infinity) hitboxWidth += 30;
    this.hitbox = SolidLineHitBox.create(this.midX(),hitboxY,hitboxWidth,hitboxHeight,this);
  }
  pushOut(box) {
  	if (box.collisionType>=C_INFINIMASS||box.defyPhysics||box.heldBy||!this.hitbox.intersect(box)) return;
  	if (this.hitbox.rightX()>=this.x&&this.hitbox.leftX()<=this.x&&this.hitbox.topY()<=this.y&&this.hitbox.y>=this.y) {
  		switch(this.direction) {
  			case LINE_LEFT:
  				if (box.rightX()>=this.valueAt(box.midY(),'y')) {
  					box.x = this.valueAt(box.midY(),'y')-box.halfW();
  					if (box.velX>0) box.velX = 0;
  					box.cSides.r = C_LINE;
  				}
  				break;
  			case LINE_RIGHT:
  				if (box.leftX()<=this.valueAt(box.midY(),'y')) {
  					box.x = this.valueAt(box.midY(),'y')+box.halfW();
  					if (box.velX<0) box.velX = 0;
  					box.cSides.l = C_LINE;
  				}
  				break;
  			case LINE_UP:
  				if (box.y>=this.valueAt(box.x,'x')) {
  					box.y = this.valueAt(box.x,'x');
  					if (box.velY>0) box.velY = 0;
  					box.cSides.d = C_LINE;
  					box.isGrounded = true;
  					box.lineGround = this;
  				}
  				break;
  			case LINE_DOWN:
  				if (box.topY()<=this.valueAt(box.x,'x')) {
  					if (box.velY<0) box.velY = 0;
  					box.y = this.valueAt(box.x,'x')+box.height;
  					box.cSides.u = C_LINE;
  				}
  		}
  	}
  }
  drawDebug() {
  	this.hitbox.drawDebug();
  	super.drawDebug();
  }
  remove() {
  	this.hitbox.remove(true);
  	super.remove();
  }
  static testBehavior(a,b) {
  	switch(a.line.direction) {
  		case LINE_UP:
  			if (b.y>=a.line.valueAt(b.x,'x')) return false;
  			break;
  		case LINE_DOWN:
  			if (b.topY()<=a.line.valueAt(b.x,'x')) return false;
  			break;
  		case LINE_LEFT:
  			if (b.rightX()>=a.line.valueAt(b.y,'y')) return false;
  			break;
  		case LINE_RIGHT:
  			if (b.leftX()<=a.line.valueAt(b.y,'y')) return false;
  			break;
  	}
  	return true;
  }
}
initClass(SolidLine,Line);
SolidLine.prototype.hitBoxStroke = "limeGreen";
SolidLine.prototype.drawLayer = 0;

var SolidLineHitBox = class SolidLineHitBox extends PhysicsBox {
  constructor(x,y,width,height,line) {
    super(x,y,width,height,null,null,true,C_LINE,false);
    this.line = line;
  }
  remove(fromLine) {
    if (this.line&&this.line!=null&&!fromLine) this.line.remove();
    super.remove();
  }
}
SolidLineHitBox.prototype.hitBoxStroke = "lightBlue";
SolidLineHitBox.prototype.lockSectors = true;
SolidLineHitBox.prototype.isTerrain = true;


var Entity = class Entity extends PhysicsBox {
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
  }
  distanceTo(target) {
  	if (typeof target=="object") return Math.abs(this.x-target.x);
  	else return Math.abs(this.x-target)
  }
  getDirTo(target) {
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
  		var deltaX = this.x - attacker.x;
  		var deltaY = this.y - attacker.y;
  		var angle = Math.atan2(deltaY,deltaX);
  		this.velX = Math.cos(angle)*10;
  		this.velY = Math.sin(angle)*10;
  		if (Math.abs(this.velY)<=0.5||this.isGrounded) this.velY -= 10;
  		if (this instanceof Player) {
  			this.stun = 5;
  			this.invulnerability = 60;
  		}
  		else this.stun = 60;
  	}
  }
  die(attacker) {
  	if (this.respawnsOnDeath) {
  		this.health = this.maxHealth;
  		this.respawn();
  	}
  	else {
  		this.dead = true;
  		this.remove();
  	}
  }
  update() {
  	if (this.stun>0) this.stun -= 1;
  	if (this.invulnerability>0) this.invulnerability -= 1;
  	super.update();
  }
  drawElements() {
  	var startX = Math.round(this.x-((8*this.health)-1));
  	for (var i = 0; i < this.health; i++) {
  		ImageFactory.drawImage("GUI-HUD-Hearts.png",startX+(16*i),Math.round(this.y-this.fullHeight-17),14,12,0,0,14,12);
  	}
  }
  remove() {
  	this.breakConnections();
  	super.remove();
  }
  respawn() {
  	this.breakConnections();
  	super.respawn();
  }
  breakConnections() {
  	if (this.held!=null) {
  		this.held.velX = this.velX;
  		this.held.velY = this.velY;
  		this.held.heldBy = null;
  		this.held = null;
  	}
  	if (this.attackBox!=null) this.attackBox.remove();
  }
}
initClass(Entity,PhysicsBox);
Animation.applyToClass(Entity);
Entity.prototype.draw = function(preventAnimTick) {
  if (this.invulnerability%2==1) return;
  else Animation.protoDraw.call(this,preventAnimTick);
};
Entity.prototype.drawLayer = 1;
Entity.prototype.respawnsOnDeath = false;
Entity.prototype.particleColor = null;

var chargeAttackReq = 40;
var Player = class Player extends Entity {
  constructor(x,y,width,height,duckHeight,health,sheet,slot) {
    super(x,y,width,height,duckHeight,health,sheet);
    this.canBeCarried = true;
    this.thrownDamage = 0;
    this.alwaysLoaded = true;
  	this.slot = slot; //new for players
  	if (slot!=null) Player.setSlot(slot,this);
  	this.attackCoolDown = 0;
  	this.attackHeld = 0;
  	this.doorEnterTick = 0;
  	this.doorWaitStep = 0;
  }
  static onCreate() {
    this.ctrls = {
      key: new Ctrl(Player.keyMaps[this.slot]),
      gp: new Ctrl(Player.gpMaps[this.slot],Player.gpIds[this.slot]),
      tap: new Ctrl(Player.tapMaps[this.slot]),
      mostRecent: function() {
        var timestamps = [this.key.timestamp,this.gp.timestamp,this.tap.timestamp];
        var newest = Math.max(...timestamps);
        var mostRecent = [this.key,this.gp,this.tap][timestamps.indexOf(newest)];
        if (this.tap.type!="NullCtrl"&&mostRecent.type!="touch") Tap.active = false;
        return mostRecent;
      },
      selfDestructAll: function() {
        this.key.selfDestruct();
        this.gp.selfDestruct();
        this.tap.selfDestruct();
      }
    };
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
  update() {
    var pad = this.ctrls.mostRecent();
    if (!pad) {
      pad = nullController;
      console.log("missing controller");
    }

  	if (this.door) this.doorActions();
  	if (this.attackCoolDown>0) this.attackCoolDown -= 1;
  	if (this.inChargeAttack&&(this.animCurrent!="attack-charge"&&this.animCurrent!="attack-charge-air")) {
  		this.inChargeAttack = false;
  		this.defyGravity = false;
  	}
  	if (this.inUpAttack&&(this.animCurrent!="attack-upward")) this.inUpAttack = false;
  	if (this.stun==0&&!this.door) { //if not stunned
  		//controls
  		if (pad.pressed("moveLeft")&&!pad.pressed("moveRight")&&!this.inChargeAttack&&!this.inUpAttack) {
  			if (this.attackBox!=null&&this.direction==RIGHT) this.velX = 0;
  			else if (this.heldBy!=null) this.direction = LEFT;
  			else this.move(4.5,LEFT);
  		}
  		if (pad.ready("jump")&&(this.isGrounded||this.heldBy!=null||this.multiJump)&&!this.inChargeAttack) { pad.use("jump"); this.jump(); }
  		if (pad.pressed("moveRight")&&!pad.pressed("moveLeft")&&!this.inChargeAttack&&!this.inUpAttack) {
  			if (this.heldBy==null) this.velX = 4.5;
  			if (this.attackBox==null) {
  				this.direction = RIGHT;
  			}
  			else if (this.direction==LEFT) {
  				if (this.velX>0) this.velX = 0;
  			}
  		}
  		if (pad.pressed("crouch")&&this.isGrounded&&!this.inChargeAttack) {
  			this.velX = 0;
  			if (!this.ducking) this.duck(true);
  			if (pad.ready("attack")&&this.held==null&&this.animLock==0) {
  				var allPBox = PhysicsBox.getAll();
  				for (var j in allPBox) {
  					var thisBox = allPBox[j];
  					if (!thisBox.canBeCarried) continue;
  					if (thisBox.heldBy||this.heldBy==thisBox) continue;
  					if (thisBox.topY()==this.y&&this.rightX()>=thisBox.leftX()&&this.leftX()<=thisBox.rightX()) {
  						this.held = thisBox;
  						thisBox.heldBy = this;
              Collision.findPair(this,thisBox).refresh();
  						pad.use("attack");
  						this.setAnimation("lift",null,15);
  						break;
  					}
  				}
  			}
  		}
  		else if (this.ducking) this.duck(false);
  		if (pad.ready("attack")) {
  			if (this.held==null) {
  				if (this.isGrounded&&pad.pressed("lookUp")) this.upAttack();
  				else this.attack();
  			}
  			else if (pad.pressed("crouch")&&this.isGrounded) {
  				var drop = this.held;
  				drop.x = this.calcXPosInFront(drop.halfW());
  				drop.y = this.midY();
  				drop.heldBy = null;
  				this.held = null;
          Collision.findPair(this,drop).refresh();
  			}
  			else {
  				var throwing = this.held;
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
  			pad.use("attack");
  		}
  		else if (pad.pressed("attack")) {
  			this.attackHeld += 1;
  		}
  		else {
  			if (this.attackHeld>=chargeAttackReq&&this.held==null) {
  				if (this.ducking) this.upAttack();
  				else this.chargeAttack();
  			}
  			this.attackHeld = 0;
  		}
  	}
  	//animation
  	if (this.held==null) {
  		if (this.door&&this.doorEnterTick<30) this.setAnimation("run");
  		else if (!this.isGrounded&&this.heldBy==null&&!this.lineGround) this.setAnimation("jump");
  		else if (this.velX!=0&&this.heldBy==null) this.setAnimation("run");
  		else if (pad.pressed("crouch")) this.setAnimation("crouch");
  		else this.setAnimation("stand");
  	}
  	else {
  		if (!this.isGrounded&&this.heldBy==null&&!this.lineGround) this.setAnimation("carry-jump");
  		else if (this.velX!=0) this.setAnimation("carry-run");
  		else if (pad.pressed("crouch")) this.setAnimation("carry-crouch");
  		else this.setAnimation("carry-stand");
  	}
  	//apply physics
  	var tempVelX = this.velX, tempVelY = this.velY;
  	super.update();
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
      this.held.velX = tempVelX;
  		this.held.velY = tempVelY;
  	}
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
  	ImageFactory.drawImage(this.sheet.pages[this.animPage],10,10+(24*playerNumber),19,19,0,0,19,19);
  	c.font = "bold 20px Arial";
  	c.fillStyle = "black";
  	c.fillText("/ "+this.lives,35,27+(24*playerNumber));
  }
  drawElements() {
  	if (this.attackHeld>=chargeAttackReq&&!this.held) ImageFactory.drawImage("GUI-HUD-!.png",this.x-2,this.topY()-4,4,-16);
  	else super.drawElements();
  }
  attack() {
  	if (this.attackCoolDown!=0||this.direction==CENTER) return;
  	var formulaX = function(player,harmbox) { return player.calcXPosInFront(harmbox.halfW()); };
  	var formulaY = function(player) { return player.y; };
  	this.attackBox = HarmBox.create(this.calcXPosInFront(/*this.width*3/8*/9),this.midY()+(this.height/2),/*this.width*3/4*/18,this.height*3/4,this,1,20,formulaX,formulaY);
  	this.attackCoolDown = 30;
  	this.setAnimation("attack",null,20);
  }
  chargeAttack() {
  	if (this.attackCoolDown!=0||this.direction==CENTER) return;
  	this.move(10);
  	var formulaX = function(player,harmbox) { return player.calcXPosInFront(harmbox.halfW()); };
  	var formulaY = function(player) { return player.y-player.height/4; };
  	this.attackBox = HarmBox.create(this.calcXPosInFront(34/2),this.y-this.height/4,34,this.height/2,this,2,20,formulaX,formulaY);
  	this.attackCoolDown = 30;
  	this.inChargeAttack = true;
  	this.defyGravity = true;
  	this.velY = 0;
  	this.setAnimation(this.isGrounded?"attack-charge":"attack-charge-air",null,20);
  }
  upAttack() {
  	if (this.attackCoolDown!=0||this.direction==CENTER) return;
  	var formulaX = function(player) { return player.x; };
  	var formulaY = function(player) { return player.topY()+18; };
  	this.attackBox = HarmBox.create(this.x,this.topY()+18,73,22,this,1,20,formulaX,formulaY);
  	this.attackCoolDown = 30;
  	this.inUpAttack = true;
  	this.setAnimation("attack-upward",null,20);
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
  remove() {
  	this.ctrls.selfDestructAll();
  	Player.clearFromSlot(this);
  	super.remove();
  }
  respawn() {
  	if (this.door) this.door.forgetPlayer();
  	super.respawn();
  }

  static setSlot(slot,player) {
  	if (!this.slots[slot]) this.slots[slot] = player;
  }
  static clearFromSlot(player) {
  	if (this.slots[player.slot]==player) {
  		this.slots[player.slot] = null;
  		if (multiplayer) this.respawnButtons[player.slot].show();
  		else G$("RespawnP1Button").show();
  	}
  }
  static relinkCtrls() {
    var all = this.getAll();
    for (var i in all) {
      var p = all[i], slot = p.slot;
      p.ctrls.selfDestructAll();
      p.ctrls.key = new Ctrl(Player.keyMaps[slot]);
      p.ctrls.gp = new Ctrl(Player.gpMaps[slot],Player.gpIds[slot]);
      p.ctrls.tap = new Ctrl(Player.tapMaps[slot]);
    }
  }
}
initClass(Player,Entity);
Player.prototype.drawLayer = 2;
Player.prototype.respawnsOnDeath = true;
Player.prototype.lives = 5;
Player.prototype.deaths = 0;
Player.prototype.multiJump = false;
Player.slots = [null,null,null,null];
Player.respawnButtons = [];
Player.keyMaps = [wasd,ijkl,null,null];
Player.gpMaps = [null,null,null,null];
Player.gpIds = [0,1,null,null];
Player.tapMaps = [tscr,null,null,null];
Player.globalGPCtrls = [null,null,null,null];

var Enemy = class Enemy extends Entity {
  constructor(x,y,width,height,health,sheet,duckHeight) {
    super(x,y,width,height,duckHeight,health,sheet);
    this.canBeCarried = true; //overwrites
    this.thrownDamage = 1;
  	this.attackCoolDown = 0;//also in player
  	this.target = null;//new to enemy
  	this.post = x;
  	this.paceTarget = x;
  	this.standbyTick = 0;
  }
  attack() {
  	if (this.attackCoolDown!=0) return;
  	if (this.direction==RIGHT) var attackX = this.rightX();
  	else if (this.direction==LEFT) var attackX = this.leftX();
  	else return;
  	var formulaX = function(enemy,harmbox) { return enemy.direction==RIGHT? enemy.rightX()+harmbox.halfW():enemy.leftX()-harmbox.halfW(); };
  	var formulaY = function(enemy) { return enemy.midY()+10; };
  	this.attackBox = HarmBox.create(attackX,this.midY()+10,this.width*3/4,10,this,1,18,formulaX,formulaY);
  	this.attackCoolDown = 30;
  	this.stun = 30;
  	this.setAnimation("attack");
  }
  update() {
  	//AI
  	if (this.heldBy!=null) {
  		this.exclaim = -1;
  		this.target = this.heldBy;
  		this.stun = 120;
  	}
  	else {
  		this.exclaim -= 1;
  		if (this.attackCoolDown>0) this.attackCoolDown -= 1;
  		if (this.target!=null) {
  			if (PhysicsBox.getAll().indexOf(this.target)==-1) this.target = null;
  			else {
  				this.faceTo(this.target);
  				var dist = this.distanceTo(this.target);
  				var distY = Math.abs(this.y-this.target.y);
  				if (this.exclaim<=0) {
  					var frontBox = new Box(this.calcXPosInFront(15/2),this.y-1,15,this.height-2);
  					if (dist>30) {
  						//follow
  						if (!this.stun) this.move(2.5);
  						//jump
  						var isBlocked = false, allPBox = PhysicsBox.getAll();
  						for (var j in allPBox) {
                var b = allPBox[j]
  							if (b==this||b==this.target) continue;
                if (b.collisionType==C_LINE&&(b.line.direction==LINE_UP||b.line.direction==LINE_DOWN)) continue;
  							if (allPBox[j].intersect(frontBox)) isBlocked = true;
  						}
  						if (isBlocked&&this.isGrounded&&this.stun==0) this.jump();
  					}
  					else {
  						//attack
  						if (this.target.intersect(frontBox)&&this.stun==0) this.attack();
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
  		}
  		else {
  			//random pacing
  			if (this.standbyTick>=240) {
  				this.paceTarget = this.post+Math.floor(25+Math.round(Math.random()*40)+1)*(Math.random()<0.5? -1:1);
  				if (this.paceTarget<0||this.paceTarget>Level.width) this.paceTarget = this.post;
  				this.standbyTick = -1;
  			}
  			this.standbyTick += 1;
  			var dist = Math.abs(this.x-this.paceTarget);
  			var frontBox = new Box(this.calcXPosInFront(1),this.y-1,2,this.height-2);
  			var isBlocked = false, allEnem = Enemy.getAll();
  			for (var j in allEnem) {
  				if (allEnem[j]==this) continue;
  				if (allEnem[j].intersect(frontBox)) isBlocked = true;
  			}
  			if (this.paceTarget!=null&&dist>3) {
  				this.faceTo(this.paceTarget);
  				if (!isBlocked&&this.stun==0) this.move(1.5);
  			}
  			else this.paceTarget = null;
  			//find players
  			var allPlayers = Player.getAll();
  			for (var j in allPlayers) {
  				var distPX = this.distanceTo(allPlayers[j]);
  				var py = allPlayers[j].y;
  				var dir = this.getDirTo(allPlayers[j]);
  				if (distPX<=200&&dir==this.direction) {
  					if (py>this.y-100&&py<this.y+100) {
  						this.target = allPlayers[j];
  						this.exclaim = 30;
  						break;
  					}
  				}
  			}
  		}
  	}
  	//animation
  	if (this.attackBox!=null) this.setAnimation("attack");
  	else if (!this.isGrounded&&this.heldBy==null) this.setAnimation("jump");
  	else if (this.velX!=0&&this.heldBy==null) this.setAnimation("run");
  	else this.setAnimation("stand");

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
  	if (this.exclaim!=null&&this.exclaim>=0) ImageFactory.drawImage("GUI-HUD-!.png",this.x-2,this.topY()-4,4,-16);
    else super.drawElements();
  }
}
initClass(Enemy,Entity);
Enemy.prototype.particleColor = "#6a00d8";

var PaintMinion = class PaintMinion extends Enemy {
  constructor(x,y) {
    super(x,y,19,44,2,"PaintMinion.json",38);
  }
}
initClass(PaintMinion,Enemy);


var View = class View extends _c_ {
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
    Pointer.focusLayer-=1;
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
  			ImageFactory.drawBorderedImage("GUI-Button.png",this.x,this.y,this.width,this.height,8,16,0,96);
  	}
  }
}
initClass(View);

var GuiElement = class GuiElement extends _c_ {
  constructor(name,viewName,x,y) {
    super();
    this.name = name;
    this.view = G$(viewName);
    this.view.children.push(this);
  	this.x = x;
  	this.y = y;
  	this.visible = false;
  	this.neighbors = {up:null, right:null, down:null, left:null};
  }
  show() { this.visible = true; return this; }
  hide() { this.visible = false; return this; }
  isVisible() { return this.visible&&this.view.visible; }
  drawHud() {
  	if (this.isVisible()) this.customDraw();
  }
  customDraw() { };
  update() { };
  onViewShown() { };
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
initClass(GuiElement);

var Button = class Button extends GuiElement {
  constructor(name,viewName,x,y,width,height,text="") {
    super(name,viewName,x,y);
  	this.width = width;
  	this.height = height;
  	this.text = text;
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
  	this.useIcon = false;
  	this.iconImg = null;
  	this.iconX = this.iconY = 0;
  	this.iconSize = 0;
  }
  setOnClick(func,requireUserAction=false) {
    this.onClickFunction = func;
    this.mode = BUTTON_NORMAL;
    this.requireUserAction = requireUserAction;
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
  		if (this.requireUserAction) {
        if (func) return attemptUserAction(func,ctrl);
  			else return attemptUserAction(this.onClickFunction,ctrl);
  		}
  		else {
        if (func) func(ctrl);
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
  	ImageFactory.drawBorderedImage("GUI-Button.png",this.x,this.y,this.width,this.height,8,16,x,y);
  	if (this.useIcon) ImageFactory.drawImage(this.iconImg,Math.floor(this.x+this.iconPad),Math.floor(this.y+this.iconPad),this.width-2*this.iconPad,this.height-2*this.iconPad,this.iconX*this.iconSize,this.iconY*this.iconSize,this.iconSize,this.iconSize);
  	else {
  		c.font = this.hovered?"bold 20px Catamaran, sans-serif":"20px Catamaran, sans-serif";
  		var metrics = c.measureText(this.text);
  		drawStrokedText(this.text,this.x+this.width/2-metrics.width/2,this.y+this.height/2+7,"white","black",2,8);
  	}
  }
}
initClass(Button,GuiElement);

var TextElement = class TextElement extends GuiElement {
  constructor(name,viewName,x,y,text,font="Times New Roman",size=10,isBold=false,color="black",alignment=LEFT,hasShadow=false,shadowColor="darkGray",shadowDistance=3,hasBorder=false,borderColor="white",borderSize=2,borderSteps=8) {
    super(name,viewName,x,y);
    this.text = text;
  	this.font = font;
  	this.size = size;
  	this.isBold = isBold;
  	this.color = color;
  	this.alignment = alignment;
  	this.hasShadow = hasShadow;
  	this.shadowColor = shadowColor;
  	this.shadowDistance = shadowDistance;
  	this.hasBorder = hasBorder;
  	this.borderColor = borderColor;
  	this.borderSize = borderSize;
  	this.borderSteps = borderSteps;
  }
  customDraw() {
  	c.font = (this.isBold?"bold ":"")+this.size+"px "+this.font;
  	if (this.hasShadow) {
  		c.fillStyle = this.shadowColor;
  		this.drawText(this.shadowDistance,true);
  	}
  	c.fillStyle = this.color;
  	this.drawText(0,false);
  }
  drawText(yOffset,isShadow) {
  	var metrics = c.measureText(this.text);
  	var xOffset;
  	switch(this.alignment) {
  		case LEFT:
  			xOffset = 0;
  			break;
  		case CENTER:
  			xOffset = -metrics.width/2;
  			break;
  		case RIGHT:
  			xOffset = -metrics.width;
  	}
  	if (this.hasBorder) drawStrokedText(this.text,this.x+xOffset,this.y+yOffset,isShadow?this.shadowColor:this.color,isShadow?this.shadowColor:this.borderColor,this.borderSize,this.borderSteps);
  	else c.fillText(this.text,this.x+xOffset,this.y+yOffset);
  }
}
initClass(TextElement,GuiElement);

var ImgElement = class ImgElement extends GuiElement {
  constructor(name,viewName,x,y,img,width,height) {
    super(name,viewName,x,y);
  	this.width = width;
  	this.height = height;
  	this.img = img;
  }
  customDraw() {
  	ImageFactory.drawImage(this.img,this.x-this.width/2,this.y-this.height/2,this.width,this.height);
  }
}
initClass(ImgElement,GuiElement);


var Particle = class Particle extends _c_ {
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
}
initClass(Particle,true);
Particle.prototype.drawLayer = 3;
