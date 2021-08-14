Scribble.Images = class Images {
	constructor(engine) {
		this.engine = engine;
		this.map = {};
		this.loadingCount = 0;
		this.useFlipped = false;
	}
	load(filename) {
		this.loadingCount++;
		let img = new Image();
		img.onload = () => {
			this.makeFlipped(img);
			this.loadingCount--;
			if (this.loadingCount == 0 && this.onLoadFunc) {
				this.onLoadFunc();
				this.onLoadFunc = null;
			}
		};
		img.src = filename;
		this.map[filename] = img;
	}
	loadB64(name, b64) {
		this.loadingCount++;
		let img = new Image();
		img.onload = () => {
			this.makeFlipped(img);
			this.loadingCount--;
			if (this.loadingCount == 0 && this.onLoadFunc) {
				this.onLoadFunc();
				this.onLoadFunc = null;
			}
		};
		img.src = "data:image/*;base64, "+b64;
		this.map[name] = img;
	}
	loadAll(list, callback) {
		if (callback) {
			if (typeof callback == "function") this.onLoadFunc = callback;
		}
		for (let i = 0; i < list.length; i++) {
			this.load(list[i]);
		}
	}
	makeFlipped(img) {
		img.flipped = document.createElement("canvas");
		img.flipped.width = img.width;
		img.flipped.height = img.height;
		img.flippedCtx = img.flipped.getContext("2d");
		img.flippedCtx.save();
		img.flippedCtx.scale(1,-1);
		img.flippedCtx.drawImage(img, 0, 0, img.width, -img.height);
		img.flippedCtx.restore();
	}
	flip() {
		this.useFlipped = !this.useFlipped;
	}
	getPattern(img) {
		if (img.pattern) return img.pattern;
		else return img.pattern = this.ctx.createPattern(img, "repeat");
	}
	hasImage(name) {
		return !!this.map[name];
	}
	getImage(name) {
		let img = this.map[name];
		if (!img) {
			console.warn("Unknown image "+name);
			return null;
		}
		else {
			// if (this.filter) return this.getFilteredImage(name);
			if (this.useFlipped) return img.flipped;
			else return img;
		}
	}
	draw(name, x, y, width, height, clipX, clipY, clipWidth, clipHeight) {
		if (clipX==null) clipX = 0;
		if (clipY==null) clipY = 0;
		var img = this.getImage(name);
		if (img==null) return;
		if (clipWidth==null) clipWidth = img.width;
		if (clipHeight==null) clipHeight = img.height;
		this.ctx.drawImage(img, clipX,clipY,clipWidth,clipHeight, x,y,width,height);
	}
	drawOverShape(name, x, y, shape) {
		let img = this.getImage(name);

		if (shape.shape === Scribble.SHAPE.BOX) {
			this.ctx.drawImage(img, x + shape.x, y + shape.y, shape.width, shape.height);
		}
		else if (shape.shape === Scribble.SHAPE.CIRCLE) {
			this.ctx.drawImage(img, x + shape.x - shape.radius, y + shape.y - shape.radius, 2 * shape.radius, 2 * shape.radius);
		}
		else if (shape.shape === Scribble.SHAPE.LINE) {
			this.ctx.drawImage(img, x + shape.x, y + shape.y, x + shape.x + shape.dx, y + shape.y + shape.dy);
		}
		else if (shape.shape === Scribble.SHAPE.POLYGON) {
			let aabb = Scribble.Collision.polyAABB(shape);
			this.ctx.drawImage(img, x + aabb.x, y + aabb.y, aabb.width, aabb.height);
		}
		else console.warn("Unknown drawing shape");
	}
	/**
	 * Fills a rectangle using an image as a canvas pattern.
	 * @param {string} name Name of the image to draw
	 * @param {number} x Starting coordinate x (left)
	 * @param {number} y Starting coordinate y (top)
	 * @param {number} width 
	 * @param {number} height 
	 * @param {number} scale Image size. Bigger = zoomed in
	 * @param {number} parallax Level of parallax effect. 1 = standard, higher values = slower scroll
	 * @param {number} offsetX Amount to additionally scroll x value with parallax effects
	 * @param {number} offsetY Amount to additionally scroll y value with parallax effects
	 * @param {number} shiftX Amount to translate the image horizontally before anything else is applied
	 * @param {number} shiftY Amount to translate the image vertically before anything else is applied
	 */
	drawPattern(name, x, y, width, height, scale, parallax, offsetX, offsetY, shiftX, shiftY) {
		let img = this.getImage(name);
		if (!img || img.width === 0 || img.height === 0) return;
		if (!img.patterns) img.patterns = {};
		if (!img.patterns[scale]) {
			let offscreen = Scribble.HiddenCanvas(img.width*scale, img.height*scale);
			let ctx = offscreen.getContext("2d");
			ctx.drawImage(img, 0, 0, img.width*scale, img.height*scale);
			img.patterns[scale] = this.ctx.createPattern(offscreen, "repeat");
		}
		this.ctx.fillStyle = img.patterns[scale];
		if (parallax == void(0)) parallax = 1;
		if (offsetX == void(0)) offsetX = 0;
		if (offsetY == void(0)) offsetY = 0;
		if (shiftX == void(0)) shiftX = 0;
		if (shiftY == void(0)) shiftY = 0;
		this.ctx.save();
		this.ctx.translate(shiftX, shiftY);
		x -= shiftX;
		y -= shiftY;
		this.ctx.translate(x-x/parallax, y-y/parallax);
		this.ctx.translate(-offsetX/parallax, -offsetY/parallax);
		this.ctx.fillRect((x+offsetX)/parallax, (y+offsetY)/parallax, width, height);
		this.ctx.restore();
	}
};