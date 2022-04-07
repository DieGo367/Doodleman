import { ResourceManager } from "./resource.js";
import { HiddenCanvas } from "./util.js";
import * as Shape from "./shape.js";
import { Engine } from "./engine.js";

interface ExtendedImage extends HTMLImageElement {
	flipped?: HTMLCanvasElement;
	patterns?: {[scale: number]: CanvasPattern};
}
interface ExtendedCanvas extends HTMLCanvasElement {
	patterns?: {[scale: number]: CanvasPattern};
}
type Drawable = ExtendedImage | ExtendedCanvas;

export class ImageManager extends ResourceManager<Drawable> {
	useFlipped = false;
	ctx: CanvasRenderingContext2D;
	constructor(engine: Engine) {
		super(engine, "Images");
	}
	get(name: string): Drawable {
		let img = super.get(name);
		if (img instanceof HTMLImageElement && this.useFlipped) return img.flipped;
		else return img;
	}
	async loadAs(name: string, src: string): Promise<Drawable> {
		this.loadingCount++;
		let img = await new Promise<HTMLImageElement>((resolve, reject) => {
			let img = new Image();
			img.onload = () => resolve(img);
			img.onerror = (err: Event) => reject(err.type);
			img.src = src;
		});
		this.map[name] = img;
		this.makeFlipped(img);
		this.loadingCount--;
		return img;
	}
	async loadB64(name: string, b64: string) { this.loadAs(name, `data:image/*;base64, ${b64}`) }
	makeFlipped(img: ExtendedImage) {
		img.flipped = document.createElement("canvas");
		img.flipped.width = img.width;
		img.flipped.height = img.height;
		let ctx = img.flipped.getContext("2d");
		ctx.save();
		ctx.scale(1,-1);
		ctx.drawImage(img, 0, 0, img.width, -img.height);
		ctx.restore();
	}
	flip() {
		this.useFlipped = !this.useFlipped;
	}
	draw(
		name: string, x: number, y: number, width: number, height: number,
		clipX = 0, clipY = 0, clipWidth?: number, clipHeight?: number
	) {
		let img = this.get(name);
		if (clipWidth !== undefined) clipWidth = img.width;
		if (clipHeight !== undefined) clipHeight = img.height;
		this.ctx.drawImage(img, clipX,clipY,clipWidth,clipHeight, x,y,width,height);
	}
	drawOverShape(name: string, x: number, y: number, shape: Shape.Shape) {
		let img = this.get(name);
		let aabb = Shape.AABB(shape);
		this.ctx.drawImage(img, x + aabb.x, y + aabb.y, aabb.width, aabb.height);
	}
	/**
	 * Fills a rectangle using an image as a canvas pattern.
	 * @param name Name of the image to draw
	 * @param x Starting coordinate x (left)
	 * @param y Starting coordinate y (top)
	 * @param width 
	 * @param height 
	 * @param scale Image size. Bigger values -> more zoomed in
	 * @param parallax Level of parallax effect. 1 = standard, higher values -> slower scroll
	 * @param offsetX Amount to additionally scroll x value with parallax effects
	 * @param offsetY Amount to additionally scroll y value with parallax effects
	 * @param shiftX Amount to translate the image horizontally before anything else is applied
	 * @param shiftY Amount to translate the image vertically before anything else is applied
	 */
	drawPattern(
		name: string, x: number, y: number, width: number, height: number,
		scale = 1, parallax = 1, offsetX = 0, offsetY = 0, shiftX = 0, shiftY = 0
	) {
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