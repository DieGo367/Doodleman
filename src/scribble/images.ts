import { ResourceManager } from "./resource.js";
import { HiddenCanvas } from "./util.js";
import * as Shape from "./shape.js";
import { Engine } from "./engine.js";

type Drawable = Exclude<CanvasImageSource, SVGImageElement>;
interface ImageResource {
	default: {
		img: Drawable;
		patterns: {[scale: number]: CanvasPattern};
	};
	flipped: {
		img: Drawable;
		patterns: {[scale: number]: CanvasPattern};
	};
}

export class ImageManager extends ResourceManager<ImageResource> {
	useFlipped = false;
	constructor(engine: Engine, public ctx: CanvasRenderingContext2D) {
		super(engine, "Images");
	}
	img(name: string): Drawable {
		let imgRes = this.map[name];
		if (this.useFlipped) return imgRes.flipped.img;
		else return imgRes.default.img;
	}
	async loadAs(name: string, src: string): Promise<ImageResource> {
		this.loadingCount++;
		let img = await new Promise<HTMLImageElement>((resolve, reject) => {
			let img = new Image();
			img.onload = () => resolve(img);
			img.onerror = (err: string|Event) => reject(typeof err === "string"? err : err.type);
			img.src = src;
		});
		let resource = this.map[name] = {
			default: {
				img: img,
				patterns: {}
			},
			flipped: {
				img: this.makeFlipped(img),
				patterns: {}
			}
		}
		this.loadingCount--;
		return resource;
	}
	async loadB64(name: string, b64: string) { this.loadAs(name, `data:image/*;base64, ${b64}`) }
	makeFlipped(img: HTMLImageElement): HTMLCanvasElement {
		let canvas = HiddenCanvas(img.width, img.height);
		let ctx = canvas.getContext("2d")!;
		ctx.save();
		ctx.scale(1,-1);
		ctx.drawImage(img, 0, 0, img.width, -img.height);
		ctx.restore();
		return canvas;
	}
	flip() {
		this.useFlipped = !this.useFlipped;
	}
	draw(
		name: string, x: number, y: number, width: number, height: number,
		clipX = 0, clipY = 0, clipWidth?: number, clipHeight?: number
	) {
		let img = this.img(name);
		if (clipWidth === undefined) clipWidth = img.width;
		if (clipHeight === undefined) clipHeight = img.height;
		this.ctx.drawImage(img, clipX,clipY,clipWidth,clipHeight, x,y,width,height);
	}
	drawOverShape(name: string, x: number, y: number, shape: Shape.Shape) {
		let img = this.img(name);
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
		let resource = this.get(name);
		let current = this.useFlipped? resource.flipped : resource.default;
		let img = current.img;
		let patterns = current.patterns;
		if (!img || img.width === 0 || img.height === 0) return;
		if (!patterns[scale]) {
			let offscreen = HiddenCanvas(img.width*scale, img.height*scale);
			let ctx = offscreen.getContext("2d")!;
			ctx.drawImage(img, 0, 0, img.width*scale, img.height*scale);
			patterns[scale] = this.ctx.createPattern(offscreen, "repeat")!;
		}
		this.ctx.fillStyle = patterns[scale];
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