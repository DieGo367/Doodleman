import Engine from "./engine.js";
import ResourceManager from "./resource.js";
import { LEFT, RIGHT, CENTER, DIR, never, isIndexable, isKeyOf, validate } from "./util.js";

import { Components } from "./object/mod.js";
type Animator = Components.Animator;


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
export type AnimationFrameData = FrameDataResponse | JSONValue;

interface AnimationSheetData {
	pages: string[];
	spriteWidth: number;
	spriteHeight: number;
	hasDirection?: boolean;
	sheetOffsets?: {
		left: {x: number, y: number};
		center: {x: number, y: number};
		right: {x: number, y: number};
	}
	drawOffset?: {x: number, y: number};
	animations: {[actionName: string]: Animation};
	defaultAnimation?: string;
}
function isAnimationSheetData(data: unknown): data is AnimationSheetData {
	return validate(data, {
		pages: {"[]": "string"},
		"spriteWidth,spriteHeight": "number",
		"hasDirection?": "boolean",
		"sheetOffsets?": {
			"left,center,right": {"x,y": "number"}
		},
		"drawOffset?": {"x,y": "number"},
		animations: {"*": "object"},
		"defaultAnimation?": "string"
	}, console.warn);
}

export default class AnimationManager extends ResourceManager<AnimationSheet> {
	constructor(engine: Engine) {
		super(engine, "Animations");
	}
	async _request(src: string): Promise<AnimationSheet> {
		let data = await this.engine.requestData(src);
		if (isIndexable(data))
			return new AnimationSheet(src, data);
		else throw new Error(`Failed to load animation sheet ${src}`);
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
	render(ctx: CanvasRenderingContext2D, x: number, y: number, component: Animator) {
		// get animation sheet
		let sheet = this.map[component.name];
		if (sheet) {
			// get relevant image
			let sheetData = sheet.data;
			if (sheetData) {
				let imgName = sheetData.pages[component.page||0];
				let img = this.engine.images.img(imgName);
				if (img) {
					// find the current animation
					if (component.current === "") {
						component.current = sheetData.defaultAnimation ?? Object.keys(sheetData.animations)[0] ?? "";
					}
					let anim = sheet.get(component.current);
					if (anim) {
						let frameX = 0, frameY = 0;
	
						// apply directional sheet offset
						if (sheetData.hasDirection) {
							if (sheetData.sheetOffsets) {
								let offset = (
									component.direction == LEFT? sheetData.sheetOffsets.left
									: (component.direction == RIGHT? sheetData.sheetOffsets.right
									: sheetData.sheetOffsets.right
								));
								frameX = offset.x;
								frameY = offset.y;
							}
							else console.warn("Sheet offsets not defined for " + component.name);
						}
						
						// position at correct frame in spritesheet
						frameX += sheetData.spriteWidth * anim.col;
						frameY += sheetData.spriteHeight * anim.row;
	
						// move corresponding amount of frames forward in the animation
						let frameIndex = Math.floor(component.tick * anim.frameRate);
						let frame = this.getFrameData(frameIndex, anim, "frame");
						if (typeof frame === "number")
							frameX += frame * sheetData.spriteWidth;
						
						// determine alpha value for frame
						let alpha = this.getFrameData(frameIndex, anim, "alpha");
	
						// draw image
						let offset = sheetData.drawOffset || {x: 0, y: 0};
						let globalAlpha = ctx.globalAlpha;
						if (typeof alpha === "number")
							ctx.globalAlpha *= alpha;
						ctx.drawImage(img,
							frameX, img.height - frameY,
							sheetData.spriteWidth, -sheetData.spriteHeight,
							Math.floor(x + component.x) + offset.x,
							Math.floor(y + component.y) + offset.y,
							sheetData.spriteWidth, sheetData.spriteHeight);
						ctx.globalAlpha = globalAlpha;
					}
					else console.warn("Missing animation: " + component.current);
				}
				else console.warn("Image "+imgName+" not found!");
			}
			else console.warn("Sheet data was not initialized for " + component.name);
		}
		else console.warn("Unknown animation file " + component.name);
	}
	set(component: Animator, animationName: string, direction?: DIR, lockTime?: number | "full"): boolean {
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
	getAnimation(component: Animator): Animation | null {
		let sheet = this.map[component.name];
		if (sheet) {
			if (sheet.data) {
				if (component.current === "") {
					component.current = sheet.data.defaultAnimation || Object.keys(sheet.data.animations)[0];
				}
				let anim = sheet.get(component.current);
				if (anim) return anim;
				else console.error("Missing animation: " + component.current);
			}
			else console.error("Sheet data uninitialized for " + component.name);
		}
		else console.error("Unknown animation file " + component.name);
		return null;
	}
	tick(component: Animator) {
		let anim = this.getAnimation(component);
		if (anim) {
			component.tick++;
			if (component.lock === "full") component.lock = anim.frameCount / anim.frameRate;
			if (component.lock > 0) component.lock--;
			if (Math.floor(component.tick * anim.frameRate) >= anim.frameCount) {
				component.tick = 0;
				component.previous = component.current;
			}
		}
	}
	getFrameData(frameIndex: number, anim: Animation, key: string): unknown {
		let chain = key.split(".");
		if (!anim.data) throw new Error("Frame data not provided!");
		let value = anim.data as JSONValue;
		while (chain.length > 0) {
			if (isIndexable(value))
				value = value[chain.shift()!];
			else
				throw new Error(`Couldn't reach ${chain.shift()} after getting value ${value}`);
		}
		return this.resolveDataValue(frameIndex, value);
	}
	resolveDataValue(frameIndex: number, value: AnimationFrameData): unknown {
		if (value instanceof Array) return value[frameIndex];
		else if (isIndexable(value) && "response" in value) return this.resolveDataResponse(frameIndex, value as FrameDataResponse);
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
				let resolved: {[key: string]: unknown} = {};
				for (let key in response) {
					if (key === "response") continue;
					resolved[key] = this.resolveDataValue(frameIndex, response[key]);
				}
				return resolved;
			
			default:
				never(response);
		}
	}
	getFrameDataFromComponent(component: Animator, key: string): unknown {
		let anim = this.getAnimation(component);
		if (anim) {
			let frameIndex = Math.floor(component.tick * anim.frameRate);
			return this.getFrameData(frameIndex, anim, key);
		}
		return null;
	}
};

export class AnimationSheet {
	extends?: string;
	extended = false;
	rawData: {[key: string]: unknown;}
	data?: AnimationSheetData;
	constructor(public name: string, data: {[key: string]: unknown}) {
		this.rawData = {...data};
		if (typeof this.rawData.extends === "string")
			this.extends = this.rawData.extends;
		else this.initData(this.rawData);
	}
	initData(rawData: {[key: string]: unknown}) {
		if (isAnimationSheetData(rawData)) this.data = rawData;
		else console.warn("Invalid data in animation sheet: "+this.name);
	}
	extend(map: {[name: string]: AnimationSheet}) {
		if (!this.extends) throw new Error("Sheet does not extend any others");
		let source = map[this.extends];
		if (source) {
			if (source.extends && !source.extended) source.extend(map);
			this.initData({...source.data, ...this.rawData});
			this.extended = true;
		}
		else console.warn("Couldn't extend animations from: "+this.extends);
	}
	get(animationName: string): Animation | null {
		if (!this.data) throw new Error("Animation data not initialized!");
		if (this.data.animations[animationName]) return this.data.animations[animationName];
		return null;
	}
}