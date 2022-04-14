export const RIGHT = 1;
export const LEFT = -1;
export const CENTER = 0;
export type DIR = (typeof LEFT | typeof RIGHT | typeof CENTER);
export const COLOR = {
	BACKDROP: "gray",
	LEVEL: "lightGray",
	DEBUG: {
		COLLISION: "limegreen",
		HITBOX: "red"
	}
};

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

class NeverError extends Error {
	name = "NeverError";
	constructor(value: never) {
		super(`Value ${value} was not never.`);
	}
}
export function never(value: never): never {
	throw new NeverError(value);
}

export interface indexable { [key: string|number|symbol]: unknown }
export function isIndexable(data: unknown): data is indexable {
	return typeof data === "object" && data !== null;
}
export function isKeyOf<Type>(obj: Type, key: keyof indexable): key is keyof Type {
	return isIndexable(obj) && typeof obj[key] !== "undefined";
}

type SpecialValidationObject = (
	// tests
	{"=": unknown}							// equality
	| {"@": unknown[] | indexable}			// contained in array or keys of object
	| {"=>": (target: unknown) => boolean}	// passes a function test

	// containers
	| {"[]": Validation}					// is an Array instance, and each item passes Validation
	| {"*": Validation}						// is indexable, and each item passes Validation

	// logic
	| {"&": Validation[]}					// passes all Validations
	| {"|": Validation[]}					// passes at least one Validation
	| {"!": Validation}						// does not pass this Validation
)
type ValidationObject = SpecialValidationObject | {
	[propNames: string]: Validation			// standard property tests
}
function validationObjectIsSpecial(obj: ValidationObject): obj is SpecialValidationObject {
	let keys = Object.keys(obj);
	return keys.length === 1 && ["=","@","=>","[]","*","&","|","!"].includes(keys[0]);
}
export type Validation = string | Validation[] | {new(...args: any[]): any} | ValidationObject;
export function validate(data: unknown, validation: Validation, log = (msg: string) => {}, prefix = "{}"): boolean {
	if (typeof validation === "string") {
		// primitive typeof checks
		if (validation === "") return true;
		let types = validation.split("|");
		if (types.includes(typeof data)) return true;
		else {
			log(`${prefix} > expected ${validation}, but got ${typeof data}.`);
			return false;
		}
	}
	else if (validation instanceof Array) {
		// tuple check
		if (data instanceof Array) {
			if (data.length != validation.length) {
				log(`${prefix} > expected tuple of length ${validation.length}, but got ${data.length}.`);
				return false;
			}
			for (let i = 0; i < data.length; i++) {
				if (!validate(data[i], validation[i] as Validation, log, `${prefix}[${i}]`))
					return false;
			}
			return true;
		}
		else {
			log(`${prefix} > expected a tuple, but it was not an Array instance. Got (${data}).`);
			return false;
		}
	}
	else if (typeof validation === "function") {
		// instanceof check
		if (data instanceof validation) return true;
		else {
			log(`${prefix} > expected an instance of ${validation.name}, but got (${data}).`);
			return false;
		}
	}
	else if (typeof validation === "object") {
		// validation object
		if (validationObjectIsSpecial(validation)) {
			// special validation rules object
			if ("=" in validation) {
				if (data === validation["="]) return true;
				else {
					log(`${prefix} > expected value ${JSON.stringify(validation["="])}, but got (${data}).`);
					return false;
				}
			}
			if ("@" in validation) {
				let options = validation["@"];
				if (options instanceof Array) {
					if (options.includes(data)) return true;
					else {
						log(`${prefix} > expected value to be one of ${JSON.stringify(options)}, but got (${data}).`);
						return false;
					}
				}
				else {
					if (typeof data === "number" || typeof data === "string" || typeof data === "symbol") {
						if (isKeyOf(options, data)) return true;
					}
					let keys = Object.keys(options);
					keys = keys.filter(key => typeof (options as indexable)[key] !== undefined);
					log(`${prefix} > expected value to be one of ${JSON.stringify(keys)}, but got (${data}).`);
					return false;
				}
			}
			else if ("=>" in validation) {
				if (validation["=>"](data)) return true;
				else {
					log(`${prefix} > did not pass test function ${validation["=>"].name}.`);
					return false;
				}
			}
			else if ("[]" in validation) {
				if (data instanceof Array) {
					for (let i = 0; i < data.length; i++) {
						if (!validate(data[i], validation["[]"], log, `${prefix}[${i}]`))
							return false;
					}
					return true;
				}
				else {
					log(`${prefix} > expected an Array instance, but got (${data}).`);
					return false;
				}
			}
			else if ("*" in validation) {
				if (isIndexable(data)) {
					for (let property of Object.keys(data)) {
						if (!validate(data[property], validation["*"], log, `${prefix}.${property}`))
							return false;
					}
					return true;
				}
				else {
					log(`${prefix} > expected an object, but got (${data}).`);
					return false;
				}
			}
			else if ("&" in validation) {
				for (let v of validation["&"]) {
					if (!validate(data, v, log, prefix))
						return false;
				}
				return true;
			}
			else if ("|" in validation) {
				for (let v of validation["|"]) {
					if (validate(data, v))
						return true;
				}
				log(`${prefix} > did not pass any of the Validation options in the list.`);
				return false;
			}
			else if ("!" in validation) {
				if (!validate(data, validation["!"])) return true;
				else {
					log(`${prefix} > passed a Validation rule that was expected to fail.`);
					return false;
				}
			}
			else never(validation);
		}
		else if (Object.keys(validation).length > 0) {
			// standard property rules object
			if (isIndexable(data)) {
				for (let propNames of Object.keys(validation)) {
					for (let property of propNames.split(",")) {
						if (property.endsWith("?")) {
							property = property.slice(0, property.length-1);
							if (typeof data[property] === "undefined") continue;
						}
						if (!validate(data[property], validation[propNames], log, `${prefix}.${property}`))
							return false;
					}
				}
			}
			else {
				log(`${prefix} > expected an object, but got (${data}).`);
				return false;
			}
		}
		// empty object
		return true;
	}
	else never(validation);
}