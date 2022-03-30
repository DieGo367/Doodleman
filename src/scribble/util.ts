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
export const SHAPE = {
	POINT: "pt", ARC: "arc", BOX: "box", CIRCLE: "circle", LINE: "line", POLYGON: "polygon"
};

export function Pt(x, y?) {
	if (x.x !== void(0) && x.y !== void(0)) {
		this.x = x.x;
		this.y = x.y;
	}
	else if (x instanceof Array) {
		this.x = x[0];
		this.y = x[1];
	}
	else {
		this.x = x;
		this.y = y;
	}
}
export function Circle(x, y, radius) {
	this.x = x;
	this.y = y;
	this.radius = radius;
}
export function Box(x, y, width, height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}
export function Line(x, y, x2, y2) {
	this.x = x;
	this.y = y;
	this.x2 = x2;
	this.y2 = y2;
}
export function Polygon(x, y, points) {
	this.x = x;
	this.y = y;
	this.points = points.map(pt => new Pt(pt));
}
export function fillShape(ctx, x, y, shape) {
	if (shape.shape === SHAPE.BOX) {
		ctx.fillRect(x + shape.x, y + shape.y, shape.width, shape.height);
	}
	else if (shape.shape === SHAPE.CIRCLE) {
		ctx.beginPath();
		ctx.arc(x + shape.x, y + shape.y, shape.radius, 0, Math.PI * 2);
		ctx.fill();
	}
	else if (shape.shape === SHAPE.LINE) {
		ctx.strokeStyle = ctx.fillStyle;
		ctx.beginPath();
		ctx.moveTo(x + shape.x, y + shape.y);
		ctx.lineTo(x + shape.x + shape.dx, y + shape.y + shape.dy);
		ctx.stroke();
	}
	else if (shape.shape === SHAPE.POLYGON) {
		ctx.beginPath();
		ctx.moveTo(x + shape.x + shape.points[0].x, y + shape.y + shape.points[0].y);
		for (let i = 0; i < shape.points.length; i++) {
			let next = shape.points[(i + 1) % shape.points.length];
			ctx.lineTo(x + shape.x + next.x, y + shape.y + next.y);
		}
		ctx.fill();
	}
	else console.warn("Unknown drawing shape");
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