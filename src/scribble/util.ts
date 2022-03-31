export const RIGHT = 1;
export const LEFT = -1;
export const CENTER = 0;
export const EDGE = {
	NONE: 0,
	SOLID: 1,
	WRAP: 2,
	KILL: 3
};
export const TERRAIN = {
	BOX: 0,
	LINE: 1,
	CIRCLE: 2,
	POLYGON: 3
};
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
	var OffscreenCanvas;
}
export function HiddenCanvas(width, height) {
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