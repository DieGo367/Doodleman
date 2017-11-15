var ImageFactory = {
	imgData: {},
	initImageB64: function(name,b64) {
		this.imgData[name] = new Image();
		this.imgData[name].src = "data:image/png;base64, "+b64;
	},
	initImage: function(name,url) {
		this.imgData[name] = new Image();
		this.imgData[name].src = url;
	},
	loadImage: function(name) {
		this.imgData[name] = new Image();
		this.imgData[name].src = "res/"+name;
	},
	getImage: function(imageName) {
		return this.imgData[imageName];
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
	drawFromSheet: function(sheet,x,y,animationName,time,direction,entity,animPage=0) {
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
						offset = sheet.sheetOffsets.left;
						break;
					case CENTER:
						offset = sheet.sheetOffsets.center;
						break;
					case RIGHT:
						offset = sheet.sheetOffsets.right;
				}
				if (offset) {
					frameX = offset.x;
					frameY = offset.y;
				}
			}
			frameX += sheet.spriteWidth*animation.col;
			frameY += sheet.spriteHeight*animation.row;
			var frameIndex = Math.floor(time*animation.framerate);
			var frame = animation.frames[frameIndex];
			if (frame>0) frameX += frame*sheet.spriteWidth;
			if (animation.alphas) {
				var frameAlpha = animation.alphas[frameIndex];
				if (frameAlpha==null) frameAlpha = animation.alphas[0]!=null?animation.alphas[0]:1;
			}
			else var frameAlpha = 1;
			var img = ImageFactory.getImage(sheet.pages[0]);
			if (frameX>img.width||frameY>img.height) {
				if (sheet.defaultAnimation&&sheet.defaultAnimation!=animationName) Animation.drawFromSheet(sheet,x,y,sheet.defaultAnimation,time,direction,entity);
				else Animation.drawMissing(entity);
			}
			else {
				var alpha = c.globalAlpha;
				c.globalAlpha *= frameAlpha;
				c.drawImage(ImageFactory.getImage(sheet.pages[animPage]),frameX,frameY,sheet.spriteWidth,sheet.spriteHeight,x+sheet.drawOffset.x,y+sheet.drawOffset.y,sheet.spriteWidth,-sheet.spriteHeight);
				c.globalAlpha = alpha;
			}
		}
		else if (sheet.defaultAnimation&&sheet.defaultAnimation!=animationName) Animation.drawFromSheet(sheet,x,y,sheet.defaultAnimation,time,direction,entity);
		else Animation.drawMissing(entity);
	},
	drawMissing: function(entity) {
		var sheet = entity.sheet;
		if (sheet.errorColor) c.fillStyle = sheet.errorColor;
		else sheet.fillStyle = "hotpink";
		c.fillRect(entity.x-entity.halfW(),entity.y,entity.width,-entity.height);
	},
	spritesheets: {}, loadStatus: 1,
	loadSpritesheet: function(name) {
		this.loadStatus += 1;
		$.get("animations/"+name,function(data) {
			var sheet = JSON.parse(data);
			sheet.getAnimation = function(action) {
				for (var i in this.animations) {
					if (this.animations[i].action==action) return this.animations[i];
				}
				return;
			};
			Animation.spritesheets[name] = sheet;
			Animation.loadStatus -= 1;
		});
	},
	getSpritesheet: function(name) {
		return this.spritesheets[name];
	},
	protoDraw: function() {
		if (!this.isLoaded) return;
		Animation.drawFromSheet(this.sheet,Math.floor(this.x),Math.floor(this.y),this.animCurrent,this.animFrame,this.direction,this,this.animPage);
	},
	protoAnimationTick: function() {
		if (paused) return;
		var animation = this.sheet.getAnimation(this.animCurrent);
		if (!animation) return console.log("Missing animation: "+this.animCurrent);
		this.animFrame += 1;
		if (Math.floor(this.animFrame*animation.framerate)>=animation.frames.length) {
			this.animFrame = 0;
			this.animLock = 0;
			this.animPrevious = this.animCurrent;
		}
	},
	protoSetAnimation: function(animation,direction,lockTime) {
		if (this.animLock>0) {
			this.animLock -= 1;
			return false;
		}
		if (direction!=null) this.direction = direction;
		if (this.animCurrent==animation) return true;
		this.animPrevious = this.animCurrent;
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
	protoSetAnimationPage: function(pageIndex) {
		this.animPage = pageIndex;
	},
	applyTo: function(obj) {
		obj.animCurrent = "none";
		obj.animPrevious = "none";
		obj.animFrame = 0;
		obj.animLock = 0;
		obj.animPage = 0;
		obj.draw = Animation.protoDraw;
		obj.animationTick = Animation.protoAnimationTick;
		obj.setAnimation = Animation.protoSetAnimation;
		obj.setAnimationPage = Animation.protoSetAnimationPage;
	},
	applyToClass: function(cl) {
		Animation.applyTo(cl.prototype);
	}
}


$.get("animations/_list_.json", function(data) {
	var list = JSON.parse(data);
	for (var i in list) {
		if (typeof list[i]=="string") Animation.loadSpritesheet(list[i]);
	}
	Animation.loadStatus -= 1;
});

$.get("res/_list_.json", function(data) {
	var list = JSON.parse(data);
	for (var i in list) {
		if (typeof list[i]=="string") ImageFactory.loadImage(list[i]);
	}
});
// ImageFactory.initImage("DoodlemanSprites","res/Doodleman Spritesheet.png");
// ImageFactory.initImage("Redman","res/Redman-sprites.png");
// ImageFactory.initImage("Blueman","res/Blueman-sprites.png");
// ImageFactory.initImage("Greenman","res/Greenman-sprites.png");
// ImageFactory.initImage("Yellowman","res/Yellowman-sprites.png");
// ImageFactory.initImage("PaintMinionSprites",spoopy==false?"res/Paint Minion Spritesheet.png":"res/Skeltal Spritesheet.png");
// ImageFactory.initImage("BG-Paper","res/paper.png");
// ImageFactory.initImage("GUI-Hearts","res/GUI-HUD-Hearts new.png");
// ImageFactory.initImage("GUI-Exclaim","res/GUI-HUD-!.png");
// ImageFactory.initImage("GUI-Button","res/GUI-Button.png");
// ImageFactory.initImage("GUI-Pointer","res/GUI-HUD-pointer.png");
// ImageFactory.initImage("Box201","res/box201.png");
// ImageFactory.initImage("Doors","res/Doors.png");
// ImageFactory.initImage("GUI-Icons","res/GUI-IconsBigger.png");
// ImageFactory.initImage("HelloWorld","res/helloworld.png");
// ImageFactory.initImage("GUI-Controller","res/controlly.png");
// ImageFactory.initImage("GUI-TouchButton","res/GUI-TouchButton.png")
