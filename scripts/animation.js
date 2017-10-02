var ImageFactory = {
	imgData: {},
	initImageB64: function(name,b64) {
		this.imgData[name] = { img:new Image() };
		this.imgData[name].img.src = "data:image/png;base64, "+b64;
	},
	initImage: function(name,url) {
		this.imgData[name] = { img:new Image() };
		this.imgData[name].img.src = url;
	},
	getImage: function(imageName) {
		return this.imgData[imageName].img;
	},
	drawImage: function(imageName,x,y,width,height,clipX = 0,clipY = 0,clipWidth,clipHeight) {
		var img = this.getImage(imageName);
		if (img==null) return;
		if (clipWidth==null) clipWidth = img.width;
		if (clipHeight==null) clipHeight = img.height;
		c.drawImage(img,clipX,clipY,clipWidth,clipHeight,x,y,width,height);
	},
	drawRotatedImage: function(imageName,x,y,width,height,clipX = 0,clipY = 0,clipWidth,clipHeight,angle = 0) {
		var img = this.getImage(imageName);
		if (img==null) return;
		if (clipWidth==null) clipWidth = img.width;
		if (clipHeight==null) clipHeight = img.height;
		c.save();
		c.translate(x,y);
		c.rotate(angle*Math.PI/180);
		c.drawImage(img,clipX,clipY,clipWidth,clipHeight,-(width/2),-(height/2),width,height);
		c.restore();
	},
	drawBorderedImage: function(imageName,x,y,width,height,borderSize,center,offsetX = 0,offsetY = 0) {
		var ox = offsetX, oy = offsetY, bp = borderSize;
		this.drawImage(imageName,x,         y,          bp,bp,ox,          oy,          bp,bp);
		this.drawImage(imageName,x+width-bp,y,          bp,bp,ox+bp+center,oy,          bp,bp);
		this.drawImage(imageName,x,         y+height-bp,bp,bp,ox,          oy+bp+center,bp,bp);
		this.drawImage(imageName,x+width-bp,y+height-bp,bp,bp,ox+bp+center,oy+bp+center,bp,bp);

		this.drawImage(imageName,x+bp,      y,          width-(2*bp),bp,           ox+bp,       oy,          center,bp);
		this.drawImage(imageName,x+bp,      y+height-bp,width-(2*bp),bp,           ox+bp,       oy+bp+center,center,bp);
		this.drawImage(imageName,x,         y+bp,       bp,          height-(2*bp),ox,          oy+bp,       bp,center);
		this.drawImage(imageName,x+width-bp,y+bp,       bp,          height-(2*bp),ox+bp+center,oy+bp,       bp,center);

		this.drawImage(imageName,x+bp,y+bp,width-(2*bp),height-(2*bp),ox+bp,oy+bp,center,center);
	},
	drawImagePattern: function(imageName,x,y,width,height,scale) {
		var img = this.getImage(imageName);
		if (img==null) return;
		var pattern = c.createPattern(img,"repeat");
		c.fillStyle = pattern;
		c.save();
		c.scale(scale,scale);
		c.fillRect(x,y,width/scale,height/scale);
		c.restore();
	}
}

var Animation = {
	drawFromSheet: function(sheet,x,y,animationName,time,direction,entity) {
		var animation = sheet.getAnimation(animationName);
		if (animationName=="none") {
			entity.setAnimation(sheet.defaultAnimation);
			animation = sheet.getAnimation(sheet.defaultAnimation);
		}
		if (animation) {
			var frameX = 0, frameY = 0;
			if (sheet.hasDirection) {
				var offset;
				switch(direction) {
					case LEFT:
						offset = sheet.leftOffset;
						break;
					case CENTER:
						offset = sheet.centerOffset;
						break;
					case RIGHT:
						offset = sheet.rightOffset;
				}
				if (offset) {
					frameX = offset.x;
					frameY = offset.y;
				}
			}
			frameX += sheet.spriteWidth*animation.x;
			frameY += sheet.spriteHeight*animation.y;
			var frameIndex = Math.floor(time*animation.framerate);
			var frame = animation.frames[frameIndex];
			if (frame>0) frameX += frame*sheet.spriteWidth;
			if (frameX>sheet.img.width||frameY>sheet.img.height) {
				if (sheet.defaultAnimation&&sheet.defaultAnimation!=animationName) Animation.drawFromSheet(sheet,x,y,sheet.defaultAnimation,time,direction,entity);
				else Animation.drawMissing(entity);
			}
			else c.drawImage(ImageFactory.getImage(sheet.img),frameX,frameY,sheet.spriteWidth,sheet.spriteHeight,x+sheet.displayOffset.x,y+sheet.displayOffset.y,sheet.spriteWidth,-sheet.spriteHeight);
		}
		else if (sheet.defaultAnimation&&sheet.defaultAnimation!=animationName) Animation.drawFromSheet(sheet,x,y,sheet.defaultAnimation,time,direction,entity);
		else Animation.drawMissing(entity);
	},
	drawMissing: function(entity) {
		if (sheet.errorColor) c.fillStyle = sheet.errorColor;
		else sheet.fillStyle = "hotpink";
		c.fillRect(entity.x-entity.halfW(),entity.y,entity.width,-entity.height);
	},
	createSpritesheet: function(img,spriteWidth,spriteHeight,errorColor,hasDirection,rOffsets,lOffsets,cOffsets,dispOffsets,animations,defaultAnimation) {
		if (!img||!errorColor) return;
		var sheet = {
			img: img, spriteWidth: 16, spriteHeight: 16, errorColor: errorColor,
			hasDirection: false,
			rightOffset: { x:0, y:0 },
			leftOffset: { x:0, y:0 },
			centerOffset: { x:0, y:0 },
			displayOffset: { x:0, y:0 },
			animations: [],
			defaultAnimation: defaultAnimation
		}
		sheet.getAnimation = function(name) {
			for (var i in this.animations) {
				if (this.animations[i].name==name) return this.animations[i];
			}
			return;
		};
		if (spriteWidth) sheet.spriteWidth = spriteWidth;
		if (spriteHeight) sheet.spriteHeight = spriteHeight;
		if (hasDirection) sheet.hasDirection = true;
		if (rOffsets) sheet.rightOffset.x = rOffsets[0], sheet.rightOffset.y = rOffsets[1];
		if (lOffsets) sheet.leftOffset.x = lOffsets[0], sheet.leftOffset.y = lOffsets[1];
		if (cOffsets) sheet.centerOffset.x = cOffsets[0], sheet.centerOffset.y = cOffsets[1];
		if (dispOffsets) sheet.displayOffset.x = dispOffsets[0], sheet.displayOffset.y = dispOffsets[1];
		if (!animations) return sheet;
		for (var i = 0; i<animations.length; i+=5) {
			var anim = { };
			anim.name = animations[i];
			anim.x = animations[i+1];
			anim.y = animations[i+2];
			anim.frames = animations[i+3];
			anim.framerate = animations[i+4];
			sheet.animations.push(anim);
		}
		return sheet;
	},
	protoDraw: function(preventTick) {
		if (!this.isLoaded) return;
		Animation.drawFromSheet(this.sheet,Math.floor(this.x),Math.floor(this.y),this.animCurrent,this.animFrame,this.direction,this);
		if (!paused) this.animFrame+=1;
		//if (preventTick) this.animFrame-=1;
		var animObj = this.sheet.getAnimation(this.animCurrent);
		if (!animObj) return console.log("Missing animation: "+this.animCurrent);
		if (Math.floor(this.animFrame*animObj.framerate)>=animObj.frames.length) {
			this.animFrame = 0;
			this.animLock = 0;
		}
	},
	protoSetAnimation: function(animation,direction,lockTime) {
		if (this.animLock>0) {
			this.animLock -= 1;
			return false;
		}
		if (direction!=null) this.direction = direction;
		if (this.animCurrent==animation) return true;
		this.animCurrent = animation;
		this.animFrame = 0;
		var animObj = this.sheet.getAnimation(this.animCurrent);
		switch(typeof lockTime) {
			case "string":
				if (lockTime=="full") {
					this.animLock = animObj.frames.length/animObj.framerate;
				}
				break;
			case "number":
				this.animLock = lockTime;
		}
		return true;
	},
	applyTo: function(obj,doSoft) {
		obj.animCurrent = "none";
		obj.animFrame = 0;
		obj.animLock = 0;
		if (!doSoft) obj.draw = Animation.protoDraw;
		obj.setAnimation = Animation.protoSetAnimation;
	},
	applyToClass: function(cl,doSoft) {
		Animation.applyTo(cl.prototype,doSoft);
	}
}


var bAnims = [
	"stand", 0, 0, [0], 0.2,
	"crouch", 1, 0, [0], 0.2,
	"jump", 2, 0, [0], 0.2,
	"run", 0, 1, [0,1,2,3], 0.2,
	"attack", 0, 2, [0,1,2,3], 0.2
];
var pAnims = [...bAnims,
	"lift", 0, 3, [0,1,2], 0.2,
	"carry-stand", 0, 4, [0], 0.2,
	"carry-crouch", 1, 4, [0], 0.2,
	"carry-jump", 2, 4, [0], 0.2,
	"carry-run", 0, 5, [0,1,2,3], 0.2,
	"attack-charge", 0, 6, [0,1,2,3], 0.2,
	"attack-charge-air", 0, 7, [0,1,2,3], 0.2,
	"attack-upward", 0, 8, [0,1,2,3], 0.2
];
var DoodlemanSpritesheet = Animation.createSpritesheet("DoodlemanSprites",93,48,"blue",true,[0,19],[372,19],[0,19],[-46,2],pAnims,"stand");
var Redsheet = Animation.createSpritesheet("Redman",93,48,"red",true,[0,19],[372,19],[0,19],[-46,2],pAnims,"stand");
var Bluesheet = Animation.createSpritesheet("Blueman",93,48,"blue",true,[0,19],[372,19],[0,19],[-46,2],pAnims,"stand");
var Greensheet = Animation.createSpritesheet("Greenman",93,48,"green",true,[0,19],[372,19],[0,19],[-46,2],pAnims,"stand");
var Yellowsheet = Animation.createSpritesheet("Yellowman",93,48,"yellow",true,[0,19],[372,19],[0,19],[-46,2],pAnims,"stand");
var PaintMinionSpritesheet = Animation.createSpritesheet("PaintMinionSprites",57,44,"purple",true,[0,19],[228,19],[0,19],[-28,0],bAnims,"stand");
var BackgroundGuySpritesheet = Animation.createSpritesheet("BackgroundGuySprites",93,48,"yellow",true,[0,19],[372,19],[0,19],[-46,2],pAnims,"stand");
var yellowBlockAnimations = Animation.createSpritesheet("a",null,null,"yellow");

var doorSheet = Animation.createSpritesheet("Doors",72,59,"green",false,null,null,null,[-54,2],[
	"closed", 0, 0, [0], 0,
	"open", 0, 0, [6], 0,
	"opening", 0, 0, [0,1,2,3,4,5,6], 0.2,
	"closing", 0, 0, [6,5,4,3,2,1,0], 0.2
],"closed");

ImageFactory.initImage("DoodlemanSprites","res/Doodleman Spritesheet.png");
ImageFactory.initImage("Redman","res/Redman-sprites.png");
ImageFactory.initImage("Blueman","res/Blueman-sprites.png");
ImageFactory.initImage("Greenman","res/Greenman-sprites.png");
ImageFactory.initImage("Yellowman","res/Yellowman-sprites.png");
ImageFactory.initImage("PaintMinionSprites","res/Paint Minion Spritesheet.png");
ImageFactory.initImage("BG-Paper","res/paper.png");
ImageFactory.initImage("GUI-Hearts","res/GUI-HUD-Hearts new.png");
ImageFactory.initImage("GUI-Exclaim","res/GUI-HUD-!.png");
ImageFactory.initImage("GUI-Button","res/GUI-Button.png");
ImageFactory.initImage("GUI-Pointer","res/GUI-HUD-pointer.png");
ImageFactory.initImage("Box201","res/box201.png");
ImageFactory.initImage("Doors","res/Doors.png");
ImageFactory.initImage("GUI-Icons","res/GUI-IconsBigger.png");
ImageFactory.initImage("HelloWorld","res/helloworld.png");
ImageFactory.initImage("GUI-Controller","res/controlly.png");
ImageFactory.initImage("GUI-TouchButton","res/GUI-TouchButton.png")
