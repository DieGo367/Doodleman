const Images = {
	imgData: {}, filter: null, loadingCount: 0,
	subCanvas: document.createElement("canvas"),
	sc: null,
	areLoaded: function() {
		return this.loadingCount == 0;
	},
	loadImageB64: function(name,b64) {
		this.imgData[name] = new Image();
		this.imgData[name].src = "data:image/png;base64, "+b64;
	},
	loadImage: function(name) {
		let img = this.imgData[name] = new Image();
		this.loadingCount++;
		return new Promise(function(resolve) {
			img.onload = function() {
				Images.loadingCount--;
				resolve(true);
			}
			img.onerror = function() {
				Images.loadingCount--;
				resolve(false);
			}
			img.src = "res/"+name;
		});
	},
	getImage: function(imageName) {
		let img = this.imgData[imageName];
		if (!img) return;
		if (this.filter) return this.getFilteredImage(imageName);
		else return this.imgData[imageName];
	},
	drawImage: function(imageName,x,y,width,height,clipX,clipY,clipWidth,clipHeight) {
		if (clipX==null) clipX = 0;
		if (clipY==null) clipY = 0;
		var img = this.getImage(imageName);
		if (img==null) return;
		if (clipWidth==null) clipWidth = img.width;
		if (clipHeight==null) clipHeight = img.height;
		c.drawImage(img,clipX,clipY,clipWidth,clipHeight,x,y,width,height);
	},
	drawRotatedImage: function(imageName,x,y,width,height,clipX,clipY,clipWidth,clipHeight,angle) {
		var img = this.getImage(imageName);
		if (img==null) return;
		if (clipX==null) clipX = 0;
		if (clipY==null) clipY = 0;
		if (clipWidth==null) clipWidth = img.width;
		if (clipHeight==null) clipHeight = img.height;
		if (angle==null) angle = 0;
		c.save();
		c.translate(x,y);
		c.rotate(angle*Math.PI/180);
		c.drawImage(img,clipX,clipY,clipWidth,clipHeight,-(width/2),-(height/2),width,height);
		c.restore();
	},
	drawBorderedImage: function(imageName,x,y,width,height,borderSize,center,offsetX,offsetY) {
		var ox = offsetX||0, oy = offsetY||0, bp = borderSize;
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
	drawImagePattern: function(imageName,x,y,width,height,scale,parallax) {
		let img = this.getImage(imageName);
		if (!img||!img.complete||img.width==0||img.height==0) return;
		if (!img.pattern) img.pattern = c.createPattern(img,"repeat");
		c.fillStyle = img.pattern;
		if (parallax==void(0)) parallax = 1;
		let dx = (x-x/parallax), dy = (y-y/parallax);
		c.save();
		c.scale(scale,scale);
		c.translate(dx/scale,dy/scale);
		c.fillRect((x-dx)/scale,(y-dy)/scale,width/scale,height/scale);
		c.restore();
	},
	setFilter: function(filter) {
		if (!this.sc) this.sc = this.subCanvas.getContext("2d");
		if (!filter||filter=="none") this.filter = this.sc.filter = "none";
		else this.filter = this.sc.filter = filter;
		if (this.filter=="none") this.filter = null;
		this.sc.filter = "none";
		return this.filter;
	},
	addFilteredLayer: function(filter) {
		let mainFilter = this.filter;
		if (mainFilter==null) return this.setFilter(filter);
		this.setFilter(filter);
		if (this.filter!=null) {
			return this.filter += ":" + mainFilter;
		}
	},
	removeFilteredLayer: function(filter) {
		if (this.filter==null) return;
		let filters = this.filter.split(":");
		if (filters.length<2) return this.setFilter("none");
		else return this.filter = filters.slice(1).join(":");
	},
	getFilteredImage: function(imageName) {
		let img = this.imgData[imageName];
		let filter = this.filter;
		if (!img||!img.complete||img.width==0||img.height==0) return;
		if (!img.filtered) img.filtered = {};
		let imgF = img.filtered[filter];
		if (!imgF) return this.filterImage(img,filter);
		else return imgF;
	},
	filterImage: function(img,filter) {
		this.subCanvas.width = img.width;
		this.subCanvas.height = img.height;
		let filters = filter.split(":");
		for (var i = filters.length-1; i >= 0; i--) {
			this.sc.filter = filters[i];
			this.sc.drawImage(img,0,0,img.width,img.height);
		}
		let imgF = new Image();
		imgF.src = this.subCanvas.toDataURL();
		img.filtered[filter] = imgF;
		return imgF;
	}
}


const Animation = {
	drawFromSheet: function(sheet,x,y,animationName,time,direction,entity,animPage) {
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
			var img = Images.getImage(sheet.pages[0]);
			if (frameX>img.width||frameY>img.height) {
				if (sheet.defaultAnimation&&sheet.defaultAnimation!=animationName) Animation.drawFromSheet(sheet,x,y,sheet.defaultAnimation,time,direction,entity);
				else Animation.drawMissing(entity);
			}
			else {
				var alpha = c.globalAlpha;
				c.globalAlpha *= frameAlpha;
				c.drawImage(Images.getImage(sheet.pages[animPage||0]),frameX,frameY,sheet.spriteWidth,sheet.spriteHeight,x+sheet.drawOffset.x,y+sheet.drawOffset.y,sheet.spriteWidth,-sheet.spriteHeight);
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
	spritesheets: {}, loadStatus: 1, appliedClasses: [],
	loadSpritesheet: function(name,sheet) {
		sheet.name = name;
		sheet.getAnimation = function(action) {
			for (var i in this.animations) {
				if (this.animations[i].action==action) return this.animations[i];
			}
			return;
		};
		Animation.spritesheets[name] = sheet;
	},
	getSpritesheet: function(name) {
		return this.spritesheets[name];
	},
	doInheritance: function(list) { //copy missing sheet properties from parents
		for (var i in list) {
			if (typeof list[i]!="string") continue;
			var sheet = Animation.getSpritesheet(list[i]);
			if (sheet&&sheet.extends) {
				var parent = Animation.getSpritesheet(sheet.extends);
				if (parent) {
					for (var p in parent) {
						if (sheet[p]===void(0)) sheet[p] = parent[p];
					}
				}
				else console.log("Couldn't extend animation: "+sheet.extends);
			}
		}
	},
	protoDraw: function() {
		if (!this.isLoaded) return;
		Animation.drawFromSheet(this.sheet,Math.floor(this.x),Math.floor(this.y),this.animCurrent,this.animFrame,this.direction,this,this.animPage);
	},
	protoAnimationTick: function() {
		if (paused&&!online) return;
		var animation = this.sheet.getAnimation(this.animCurrent);
		if (animation) {
			this.animFrame += 1;
			if (Math.floor(this.animFrame*animation.framerate)>=animation.frames.length) {
				this.animFrame = 0;
				this.animLock = 0;
				this.animPrevious = this.animCurrent;
			}
		}
		else if (this.animCurrent!="none") console.log("Missing animation: "+this.animCurrent);
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
		this.applyTo(cl.prototype);
		this.appliedClasses.push(cl);
	},
	update: function() {
		for (var i in this.appliedClasses) this.appliedClasses[i].callForAll("animationTick");
	}
}
