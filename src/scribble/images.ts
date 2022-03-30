import { ResourceManager } from "./resource.js";
import { HiddenCanvas, SHAPE } from "./util.js";

export class ImageManager extends ResourceManager {
	constructor(engine) {
		super(engine, "Images");
		this.useFlipped = false;
	}
	get(name) {
		let img = super.get(name);
		if (this.useFlipped) return img.flipped;
		else return img;
	}
	async loadAs(name, src) {
		this.loadingCount++;
		let img = await new Promise((resolve, reject) => {
			let img = new Image();
			img.onload = () => resolve(img);
			img.onerror = err => reject(err.type);
			img.src = src;
		});
		this.map[name] = img;
		this.makeFlipped(img);
		this.loadingCount--;
	}
	loadB64 = (name, b64) => this.loadAs(name, `data:image/*;base64, ${b64}`)
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
	draw(name, x, y, width, height, clipX, clipY, clipWidth, clipHeight) {
		if (clipX==null) clipX = 0;
		if (clipY==null) clipY = 0;
		var img = this.get(name);
		if (img==null) return;
		if (clipWidth==null) clipWidth = img.width;
		if (clipHeight==null) clipHeight = img.height;
		this.ctx.drawImage(img, clipX,clipY,clipWidth,clipHeight, x,y,width,height);
	}
	drawOverShape(name, x, y, shape) {
		let img = this.get(name);

		if (shape.shape === SHAPE.BOX) {
			this.ctx.drawImage(img, x + shape.x, y + shape.y, shape.width, shape.height);
		}
		else if (shape.shape === SHAPE.CIRCLE) {
			this.ctx.drawImage(img, x + shape.x - shape.radius, y + shape.y - shape.radius, 2 * shape.radius, 2 * shape.radius);
		}
		else if (shape.shape === SHAPE.LINE) {
			this.ctx.drawImage(img, x + shape.x, y + shape.y, x + shape.x + shape.dx, y + shape.y + shape.dy);
		}
		else if (shape.shape === SHAPE.POLYGON) {
			let aabb = Collision.polyAABB(shape);
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
		let img = this.get(name);
		if (!img || img.width === 0 || img.height === 0) return;
		if (!img.patterns) img.patterns = {};
		if (!img.patterns[scale]) {
			let offscreen = HiddenCanvas(img.width*scale, img.height*scale);
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
}