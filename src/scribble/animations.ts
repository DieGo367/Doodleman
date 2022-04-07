import { ResourceManager } from "./resource.js";
import { LEFT, RIGHT, CENTER, never } from "./util.js";
type DIR = typeof LEFT | typeof RIGHT | typeof CENTER;


interface Animation {
	row: number;
	col: number;
	frameCount: number;
	frameRate: number;
	data: {
		frame: AnimationFrameData;
		alpha: AnimationFrameData;
		[miscData: string]: AnimationFrameData;
	}
}
interface DataResponse {
	response: "data";
	[index: string]: JSONValue
}
interface ExpressionResponse {
	response: "expression";
	expression: "string";
}
interface KeyFrameResponse {
	response: "keyframes";
	[index: number]: JSONValue
}
type FrameDataResponse = DataResponse | ExpressionResponse | KeyFrameResponse;
type JSONValue = string | number | boolean | JSONValue[] | {[key: string]: JSONValue} | null;
type AnimationFrameData = FrameDataResponse | JSONValue;

export interface AnimationComponent {
	name: string;
	x: number;
	y: number;
	page?: number;
	current?: string;
	direction?: DIR;
	tick?: number;
	lock?: number | "full";
	previous?: string;
}

export class AnimationManager extends ResourceManager<AnimationSheet> {
	constructor(engine) {
		super(engine, "Animations");
	}
	async _request(src: string): Promise<AnimationSheet> {
		let data = await this.engine.requestData(src);
		return new AnimationSheet(src, data);
	}
	async loadAs(name: string, src: string): Promise<AnimationSheet> {
		let sheet = await super.loadAs(name, src);
		sheet.name = name;
		return sheet;
	}
	async loadList(list: string[]): Promise<AnimationSheet[]> {
		let results = await super.loadList(list);
		this.inheritance();
		return results;
	}
	inheritance() {
		for (let name in this.map) {
			let target = this.map[name];
			if (target.extends && !target.extended) target.extend(this.map);
		}
	}
	render(ctx: CanvasRenderingContext2D, x: number, y: number, component: AnimationComponent) {
		// get animation sheet
		let sheet = this.map[component.name];
		if (sheet) {
			// get relevant image
			let imgName = sheet.pages[component.page||0];
			let img = this.engine.images.get(imgName);
			if (img) {
				// find the current animation
				if (component.current == null) {
					component.current = sheet.defaultAnimation;
				}
				let anim = sheet.get(component.current);
				if (anim) {
					let frameX = 0, frameY = 0;

					// apply directional sheet offset
					if (sheet.hasDirection) {
						let offset = (
							component.direction == LEFT? sheet.sheetOffsets.left
							: (component.direction == RIGHT? sheet.sheetOffsets.right
							: sheet.sheetOffsets.right
						));
						frameX = offset.x;
						frameY = offset.y;
					}
					
					// position at correct frame in spritesheet
					frameX += sheet.spriteWidth * anim.col;
					frameY += sheet.spriteHeight * anim.row;

					// move corresponding amount of frames forward in the animation
					let frameIndex = Math.floor((component.tick||0) * anim.frameRate);
					let frame = this.getFrameData(frameIndex, anim, "frame");
					if (typeof frame === "number")
						frameX += frame * sheet.spriteWidth;
					
					// determine alpha value for frame
					let alpha = this.getFrameData(frameIndex, anim, "alpha");

					// draw image
					let globalAlpha = ctx.globalAlpha;
					if (typeof alpha === "number")
						ctx.globalAlpha *= alpha;
					ctx.drawImage(img,
						frameX, img.height - frameY,
						sheet.spriteWidth, -sheet.spriteHeight,
						Math.floor(x + component.x) + sheet.drawOffset.x,
						Math.floor(y + component.y) + sheet.drawOffset.y,
						sheet.spriteWidth, sheet.spriteHeight);
					ctx.globalAlpha = globalAlpha;
				}
				else console.warn("Missing animation: " + component.current);
			}
			else console.warn("Image "+imgName+" not found!");
		}
		else console.warn("Unknown animation file " + component.name);
	}
	set(component: AnimationComponent, animationName: string, direction?: DIR, lockTime?: number | "full"): boolean {
		if (component.lock > 0 || component.lock === "full") return false;
		if (direction !== undefined) component.direction = direction;
		if (component.current === animationName) return true;
		component.previous = component.current;
		component.current = animationName;
		component.tick = 0;
		if (lockTime !== undefined) {
			component.lock = lockTime;
		}
		return true;
	}
	getAnimation(component: AnimationComponent): Animation {
		let sheet = this.map[component.name];
		if (sheet) {
			if (component.current == void(0)) {
				component.current = sheet.defaultAnimation;
			}
			let anim = sheet.get(component.current);
			if (anim) return anim;
			else console.error("Missing animation: " + component.current);
		}
		else console.error("Unknown animation file " + component.name);
	}
	tick(component: AnimationComponent) {
		let anim = this.getAnimation(component);
		component.tick++;
		if (component.lock === "full") component.lock = anim.frameCount / anim.frameRate;
		if (component.lock > 0) component.lock--;
		if (Math.floor(component.tick * anim.frameRate) >= anim.frameCount) {
			component.tick = 0;
			component.previous = component.current;
		}
	}
	getFrameData(frameIndex: number, anim: Animation, key: string): unknown {
		let chain = key.split(".");
		if (!anim.data) throw new Error("Frame data not provided!");
		let value = anim.data as JSONValue;
		while (chain.length > 0) value = value[chain.shift()];
		return this.resolveDataValue(frameIndex, value);
	}
	resolveDataValue(frameIndex: number, value: AnimationFrameData): unknown {
		if (value instanceof Array) return value[frameIndex];
		else if (typeof value === "object" && "response" in value) return this.resolveDataResponse(frameIndex, value as FrameDataResponse);
		else return value;
	}
	resolveDataResponse(frameIndex: number, response: FrameDataResponse): unknown {
		switch(response.response) {
			case "expression":
				let validExpr = /^([0-9x\.+\-*/%() ]|floor\(|ceil\(|round\()+$/;
				if (validExpr.test(response.expression)) {
					let expr = response.expression.replace(/x/g, String(frameIndex));
					expr = expr.replace(/floor\(/g, "Math.floor(");
					expr = expr.replace(/ceil\(/g, "Math.ceil(");
					expr = expr.replace(/round\(/g, "Math.round(");
					return eval(expr);
				}
				else throw new Error(`Invalid expression: ${response.expression}`);

			case "keyframes":
				while (frameIndex >= 0) {
					let item = response[frameIndex];
					if (item !== void(0)) return JSON.parse(JSON.stringify(item));
					frameIndex--;
				}
				return;
			
			case "data":
				let resolved = {};
				for (let key in response) {
					if (key === "response") continue;
					resolved[key] = this.resolveDataValue(frameIndex, response[key]);
				}
				return resolved;
			
			default:
				never(response);
		}
	}
	getFrameDataFromComponent(component: AnimationComponent, key: string): unknown {
		let anim = this.getAnimation(component);
		let frameIndex = Math.floor((component.tick||0) * anim.frameRate);
		return this.getFrameData(frameIndex, anim, key);
	}
};

export class AnimationSheet {
	extends?: string;
	extended = false;
	pages?: string[];
	spriteWidth?: number;
	spriteHeight?: number;
	hasDirection?: boolean;
	sheetOffsets?: {
		left: {x: number, y: number};
		center: {x: number, y: number};
		right: {x: number, y: number};
	};
	drawOffset?: {x: number, y: number};
	animations?: {[actionName: string]: Animation};
	defaultAnimation?: string;
	constructor(public name, data) {
		Object.assign(this, data);
	}
	extend(map: {[name: string]: AnimationSheet}) {
		let source = map[this.extends];
		if (source) {
			if (source.extends && !source.extended) source.extend(map);
			for (let property in source) {
				if (typeof this[property] === "undefined") {
					this[property] = source[property];
				}
			}
			this.extended = true;
		}
		else console.warn("Couldn't extend animations from: "+this.extends);
	}
	get(animationName: string): Animation {
		if (this.animations[animationName]) return this.animations[animationName];
		return null;
	}
}