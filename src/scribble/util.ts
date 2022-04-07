export const RIGHT = 1;
export const LEFT = -1;
export const CENTER = 0;
export const COLOR = {
	BACKDROP: "gray",
	LEVEL: "lightGray",
	DEBUG: {
		COLLISION: "limegreen",
		HITBOX: "red"
	}
};

class NeverError extends Error {
	name = "NeverError";
	constructor(value: never) {
		super(`Value ${value} was not never.`);
	}
}
export function never(value: never): never {
	throw new NeverError(value);
}

declare global {
	var OffscreenCanvas: {
		new (width: number, height: number): HTMLCanvasElement
	};
}
export function HiddenCanvas(width: number, height: number): HTMLCanvasElement {
	if ("OffscreenCanvas" in window) {
		return new OffscreenCanvas(width, height);
	}
	else {
		let canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas;
	}
}

const TAU = 2*Math.PI;
export const Angle = {
	position(angle: number, scale = 1) {
		return {x: Math.cos(angle) * scale, y: Math.sin(angle) * scale};
	},
	bound(angle: number): number {
		while (angle < 0) angle += TAU;
		while (angle >= TAU) angle -= TAU;
		return angle;
	},
	withinArc(angle: number, arc: {start: number, end: number}): boolean {
		let dAngle = arc.end - arc.start;
		if (dAngle >= TAU) return true;
		let start = Angle.bound(arc.start);
		let end = Angle.bound(arc.end);
		if (end > start)
			return start <= angle && angle <= end;
		else
			return angle <= end || start <= angle;
	}
}

type primitiveName = "undefined" | "boolean" | "number" | "bigint" | "string" | "symbol" | "function" | "object";
export interface ValidationRule {
	test: (string | number)[] | "*";
	optional?: boolean;
	then?: ValidationRule[];
	is?: primitiveName | ValidationRule[] | {new(...args: any[]): any};
	equals?: any;
	in?: any[];
	keyOf?: any;
	arrayOf?: primitiveName | ValidationRule[] | {new(...args: any[]): any};
	mapOf?: primitiveName | ValidationRule[] | {new(...args: any[]): any};
	either?: (primitiveName | ValidationRule[] | {new(...args: any[]): any})[];
}
export function validate(data: unknown, format: ValidationRule[], warn = true, prefix = "{}"): boolean {
	let fail = (msg: string) => {
		if (warn) console.warn(`${prefix} > ${msg}`);
	}
	if (typeof data !== "object") {
		fail(`Root value "${data}" was not an object.`);
		return false;
	}
	for (let rule of format) {
		if (rule.test === "*") rule.test = Object.keys(data);
		for (let prop of rule.test) {
			if (!(prop in data) && !rule.optional) {
				fail(`Missing property "${prop}".`);
				return false;
			}
		}
		if ("is" in rule) {
			if (typeof rule.is === "string") {
				for (let prop of rule.test) {
					if (!(rule.optional && typeof data[prop] === undefined)) {
						if (typeof data[prop] !== rule.is) {
							fail(`Expected property "${prop}" to have type "${rule.is}", but got "${typeof data[prop]}".`);
							return false;
						}
					}
				}
			}
			else if (rule.is instanceof Array) {
				for (let prop of rule.test) {
					if (!(rule.optional && typeof data[prop] === undefined)) {
						if (!validate(data[prop], rule.is, warn, `${prefix}.${prop}`))
							return false;
					}
				}
			}
			else {
				for (let prop of rule.test) {
					if (!(rule.optional && typeof data[prop] === undefined)) {
						if (!(data[prop] instanceof rule.is)) {
							fail(`Expected property "${prop}" to be an instance of "${rule.is.name}".`);
							return false;
						}
					}
				}
			}
		}
		if ("equals" in rule) for (let prop of rule.test) {
			if (!(rule.optional && typeof data[prop] === undefined)) {
				if (data[prop] !== rule.equals) {
					fail(`Expected property "${prop}" to be (${JSON.stringify(rule.equals)}), but got (${JSON.stringify(data[prop])}).`);
					return false;
				}
			}
		}
		if ("in" in rule) for (let prop of rule.test) {
			if (!(rule.optional && typeof data[prop] === undefined)) {
				if (!rule.in.includes(data[prop])) {
					fail(`Expected property "${prop}" to be one of ${JSON.stringify(rule.in)}, but got (${JSON.stringify(data[prop])}).`);
					return false;
				}
			}
		}
		if ("keyOf" in rule) for (let prop of rule.test) {
			if (!(rule.optional && typeof data[prop] === undefined)) {
				let keys = Object.keys(rule.keyOf);
				if (!keys.includes(String(data[prop]))) {
					fail(`Expected property "${prop}" to be one of ${JSON.stringify(keys)}, but got (${JSON.stringify(data[prop])}).`);
					return false;
				}
			}
		}
		if ("arrayOf" in rule) for (let prop of rule.test) {
			if (!(rule.optional && typeof data[prop] === undefined)) {
				let target: unknown = data[prop];
				if (target instanceof Array) {
					if (typeof rule.arrayOf === "string") {
						for (let item of target as unknown[]) {
							if (typeof item !== rule.arrayOf) {
								fail(`Not all items of array "${prop}" were of type "${rule.arrayOf}". (Found "${typeof item}")`);
								return false;
							}
						}
					}
					else if (rule.arrayOf instanceof Array){
						let rules = rule.arrayOf;
						if (!target.every((item: unknown, i) => validate(item, rules, warn, `${prefix}.${prop}.${i}`)))
							return false;
					}
					else {
						for (let item of target as unknown[]) {
							if (!(item instanceof rule.arrayOf)) {
								fail(`Not all items of array "${prop}" were instances of ${rule.arrayOf.name}.`);
								return false;
							}
						}
					}
				}
				else {
					fail(`Property ${prop} was not an array.`);
					return false;
				}
			}
		}
		if ("mapOf" in rule) for (let prop of rule.test) {
			if (!(rule.optional && typeof data[prop] === undefined)) {
				let target: unknown = data[prop];
				if (typeof target === "object") {
					if (typeof rule.mapOf === "string") {
						for (let key in target) {
							let item: unknown = target[key];
							if (typeof item !== rule.mapOf) {
								fail(`Not all items of object "${prop}" were of type "${rule.mapOf}". (Found "${typeof item}")`);
								return false;
							}
						}
					}
					else if (rule.mapOf instanceof Array) {
						for (let key in target) {
							let item: unknown = target[key];
							if (!validate(item, rule.mapOf, warn, `${prefix}.${prop}`))
								return false;
						}
					}
					else {
						for (let key in target) {
							let item: unknown = target[key];
							if (!(item instanceof rule.mapOf)) {
								fail(`Not all items of object "${prop}" were instances of ${rule.mapOf.name}.`);
								return false;
							}
						}
					}
				}
				else {
					fail(`Property "${prop}" was not an object.`);
					return false;
				}
			}
		}
		if ("either" in rule) for (let prop of rule.test) {
			if (!(rule.optional && typeof data[prop] === undefined)) {
				let passed = false;
				for (let subTest of rule.either) {
					if (typeof subTest === "string") {
						if (typeof data[prop] === subTest) passed = true;
					}
					else if (subTest instanceof Array) {
						if (validate(data[prop], subTest, warn, `${prefix}.${prop}`)) passed = true;
					}
					else {
						if (data[prop] instanceof subTest) passed = true;
					}
				}
				if (!passed) {
					fail(`Property "${prop}" did not match any of its given "either" tests.`);
					return false;
				}
			}
		}
		if ("then" in rule) for (let prop of rule.test) {
			if (typeof data[prop] !== undefined) {
				if (!validate(data, rule.then, warn, `${prefix}#`))
					return false;
			}
		}
	}
	return true;
}