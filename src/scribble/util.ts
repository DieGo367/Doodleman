export const RIGHT = 1;
export const LEFT = -1;
export const CENTER = 0;
export enum EDGE {
	NONE,
	SOLID,
	WRAP,
	KILL
};
export enum TERRAIN {
	BOX,
	LINE,
	CIRCLE,
	POLYGON
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