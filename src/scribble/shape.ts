import { never } from "./util.js";

export const POINT = "point";
export const CIRCLE = "circle";
export const BOX = "box";
export const ARC = "arc";
export const LINE = "line";
export const POLYGON = "polygon";

export interface Point {
	x: number;
	y: number;
}
export interface Circle extends Point {
	radius: number;
}
export interface Box extends Point {
	width: number;
	height: number;
}
export interface Arc extends Circle {
	start: number;
	end: number;
}
export interface Line extends Point {
	dx: number;
	dy: number;
}
export interface Polygon extends Point {
	points: Point[];
}

export type Shape = (
	Point & {type: typeof POINT}
	| Circle & {type: typeof CIRCLE}
	| Box & {type: typeof BOX}
	| Arc & {type: typeof ARC}
	| Line & {type: typeof LINE}
	| Polygon & {type: typeof POLYGON}
)

export function Pt(x: number, y: number): Point;
export function Pt(array: number[]): Point;
export function Pt(point: Point): Point;
export function Pt(x: number | number[] | Point, y?: number): Point {
	if (x instanceof Array)
		return {x: x[0], y: x[1]};
	else if (typeof x === "object")
		return {x: x.x, y: x.y};
	else
		return {x: x, y: y};
}

export function Circle(x: number, y: number, radius: number): Circle {
	return {x: x, y: y, radius: radius};
}
export function Box(x: number, y: number, width: number, height: number): Box {
	return {x: x, y: y, width: width, height: height};
}
export function Arc(x: number, y: number, radius: number, start: number, end: number): Arc {
	return {x: x, y: y, radius: radius, start: start, end: end};
}
export function Line(x: number, y: number, dx: number, dy: number): Line {
	return {x: x, y: y, dx: dx, dy: dy};
}
export function Polygon(x: number, y: number, points: Point[]): Polygon {
	return {x: x, y: y, points: points};
}

// utility functions

export function flipX(shape: Shape) {
	shape.x *= -1;
	switch(shape.type) {
		case ARC:
			[shape.start, shape.end] = [Math.PI - shape.end, Math.PI - shape.start];
			break;
		case BOX:
			shape.x -= shape.width;
			break;
		case LINE:
			shape.dx *= -1;
			break;
		case POLYGON:
			shape.points = shape.points.map(pt => Pt(pt.x * -1, pt.y));
		case POINT:
		case CIRCLE:
			break;
		default:
			never(shape);
	}
}
export function flipY(shape: Shape) {
	shape.y *= -1;
	switch(shape.type) {
		case ARC:
			[shape.start, shape.end] = [0 - shape.end, 0 - shape.start];
			break;
		case BOX:
			shape.y -= shape.height;
			break;
		case LINE:
			shape.dy *= -1;
			break;
		case POLYGON:
			shape.points = shape.points.map(pt => Pt(pt.x, pt.y * -1));
		case POINT:
		case CIRCLE:
			break;
		default:
			never(shape);
	}
}

export function fill(ctx: CanvasRenderingContext2D, x: number, y: number, shape: Shape) {
	if (shape.type === POINT) {
		ctx.beginPath();
		ctx.arc(x + shape.x, y + shape.y, ctx.lineWidth, 0, Math.PI * 2);
		ctx.fill();
	}
	else if (shape.type === CIRCLE) {
		ctx.beginPath();
		ctx.arc(x + shape.x, y + shape.y, shape.radius, 0, Math.PI * 2);
		ctx.fill();
	}
	else if (shape.type === BOX) {
		ctx.fillRect(x + shape.x, y + shape.y, shape.width, shape.height);
	}
	else if (shape.type === ARC) {
		ctx.beginPath();
		ctx.arc(x + shape.x, y + shape.y, shape.radius, shape.start, shape.end);
		ctx.fill();
	}
	else if (shape.type === LINE) {
		let ss = ctx.strokeStyle;
		ctx.strokeStyle = ctx.fillStyle;
		ctx.beginPath();
		ctx.moveTo(x + shape.x, y + shape.y);
		ctx.lineTo(x + shape.x + shape.dx, y + shape.y + shape.dy);
		ctx.stroke();
		ctx.strokeStyle = ss;
	}
	else if (shape.type === POLYGON) {
		ctx.beginPath();
		ctx.moveTo(x + shape.x + shape.points[0].x, y + shape.y + shape.points[0].y);
		for (let i = 0; i < shape.points.length; i++) {
			let next = shape.points[(i + 1) % shape.points.length];
			ctx.lineTo(x + shape.x + next.x, y + shape.y + next.y);
		}
		ctx.fill();
	}
	else never(shape);
}
export function stroke(ctx: CanvasRenderingContext2D, x: number, y: number, shape: Shape) {
	if (shape.type === POINT) {
		ctx.beginPath();
		ctx.arc(x + shape.x, y + shape.y, ctx.lineWidth, 0, Math.PI * 2);
		ctx.stroke();
	}
	else if (shape.type === CIRCLE) {
		ctx.beginPath();
		ctx.arc(x + shape.x, y + shape.y, shape.radius, 0, Math.PI * 2);
		ctx.stroke();
	}
	else if (shape.type === BOX) {
		ctx.strokeRect(x + shape.x, y + shape.y, shape.width, shape.height);
	}
	else if (shape.type === ARC) {
		ctx.beginPath();
		ctx.arc(x + shape.x, y + shape.y, shape.radius, shape.start, shape.end);
		ctx.stroke();
	}
	else if (shape.type === LINE) {
		ctx.beginPath();
		ctx.moveTo(x + shape.x, y + shape.y);
		ctx.lineTo(x + shape.x + shape.dx, y + shape.y + shape.dy);
		ctx.stroke();
	}
	else if (shape.type === POLYGON) {
		ctx.beginPath();
		ctx.moveTo(x + shape.x + shape.points[0].x, y + shape.y + shape.points[0].y);
		for (let i = 0; i < shape.points.length; i++) {
			let next = shape.points[(i + 1) % shape.points.length];
			ctx.lineTo(x + shape.x + next.x, y + shape.y + next.y);
		}
		ctx.stroke();
	}
	else never(shape);
}