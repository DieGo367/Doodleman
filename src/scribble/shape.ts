import { scale, mag, sum, diff, dot } from "./point_math.js";
import { Angle, never } from "./util.js";

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

type Shaped<Type, Name> = Type & {type: Name};
export type Shape = (
	Shaped<Point, typeof POINT>
	| Shaped<Circle, typeof CIRCLE>
	| Shaped<Box, typeof BOX>
	| Shaped<Arc, typeof ARC>
	| Shaped<Line, typeof LINE>
	| Shaped<Polygon, typeof POLYGON>
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
export function Line(x: number, y: number, dx: number, dy: number): Line;
export function Line(a: Point, b: Point): Line;
export function Line(x: number | Point, y: number | Point, dx?: number, dy?: number): Line {
	if (typeof x === "number" && typeof y === "number")
		return {x: x, y: y, dx: dx, dy: dy};
	else if (typeof x === "object" && typeof y === "object")
		return {x: x.x, y: x.y, dx: y.x - x.x, dy: y.y - x.y};
	else throw new TypeError("Arguments must be of same type");
}
export function Polygon(x: number, y: number, points: Point[]): Polygon {
	return {x: x, y: y, points: points};
}

export function boxCenter(box: Box): Point {
	return {x: box.x + box.width/2, y: box.y + box.height/2};
}
export function arcCenter(arc: Arc): Point {
	let dAngle = arc.end - arc.start;
	let angle = arc.start + dAngle/2;
	return sum(arc, scale(Angle.position(angle), arc.radius));
}
export function lineCenter(line: Line): Point {
	return {x: line.x + line.dx/2, y: line.y + line.dy/2};
}
export function polygonCenter(poly: Polygon): Point {
	let avg = scale(sum(...poly.points), 1/poly.points.length);
	return sum(poly, avg);
}
export function center(shape: Shape): Point {
	if (shape.type === POINT || shape.type == CIRCLE) return Pt(shape);
	else if (shape.type === BOX) return boxCenter(shape);
	else if (shape.type === ARC) return arcCenter(shape);
	else if (shape.type === LINE) return lineCenter(shape);
	else if (shape.type === POLYGON) return polygonCenter(shape);
	else never(shape);
}

export function extrema(shape: Shape, direction: Point): Point {
	let pts: Point[] = [];
	let mid: Point;
	if (shape.type === POINT) return Pt(shape);
	else if (shape.type === CIRCLE) {
		let outward = scale(direction, shape.radius / mag(direction));
		return sum(shape, outward);
	}
	else if (shape.type === ARC) {
		let angle = Math.atan2(direction.y, direction.x);
		if (Angle.withinArc(angle, shape))
			return scale(direction, shape.radius / mag(direction));
		else {
			pts = [
				scale(Angle.position(shape.start), shape.radius),
				scale(Angle.position(shape.end), shape.radius)
			];
			let dAngle = shape.end - shape.start;
			mid = scale(Angle.position(shape.start + dAngle/2), shape.radius);
		}
	}
	else if (shape.type === BOX) {
		pts = [
			{x: 0, y: 0},
			{x: shape.width, y: 0},
			{x: 0, y: shape.height},
			{x: shape.width, y: shape.height}
		];
		mid = {x: shape.width/2, y: shape.height/2};
	}
	else if (shape.type === LINE) {
		pts = [
			{x: 0, y: 0},
			{x: shape.dx, y:  shape.dy}
		];
		mid = {x: shape.dx/2, y: shape.dy/2};
	}
	else if (shape.type === POLYGON) {
		pts = shape.points;
		mid = scale(sum(...shape.points), 1/shape.points.length);
	}
	else never(shape);

	let max = 0;
	let extrema: Point = null;
	for (let pt of pts) {
		let outward = diff(pt, mid);
		let dp = dot(outward, direction);
		if (dp > max) {
			max = dp;
			extrema = pt;
		}
	}
	return sum(shape, extrema);
}

export function left(shape: Shape): number {
	if (shape.type === POINT || shape.type === BOX) return shape.x;
	else if (shape.type === CIRCLE) return shape.x - shape.radius;
	else if (shape.type === ARC) return extrema(shape, Pt(-1,0)).x;
	else if (shape.type === LINE) return shape.x + (Math.min(shape.dx, 0));
	else if (shape.type === POLYGON) return polygonAABB(shape).x;
	else never(shape);
}
export function right(shape: Shape): number {
	if (shape.type === POINT) return shape.x;
	else if (shape.type === CIRCLE) return shape.x + shape.radius;
	else if (shape.type === BOX) return shape.x + shape.width;
	else if (shape.type === ARC) return extrema(shape, Pt(1,0)).x;
	else if (shape.type === LINE) return shape.x + (Math.max(0, shape.dx));
	else if (shape.type === POLYGON) {
		let aabb = polygonAABB(shape);
		return aabb.x + aabb.width;
	}
	else never(shape);
}
export function top(shape: Shape): number {
	if (shape.type === POINT) return shape.y;
	else if (shape.type === CIRCLE) return shape.y + shape.radius;
	else if (shape.type === BOX) return shape.y + shape.height;
	else if (shape.type === ARC) return extrema(shape, Pt(0,1)).y;
	else if (shape.type === LINE) return shape.y + (Math.max(0, shape.dy));
	else if (shape.type === POLYGON) {
		let aabb = polygonAABB(shape);
		return aabb.y + aabb.height;
	}
	else never(shape);
}
export function bottom(shape: Shape): number {
	if (shape.type === POINT || shape.type === BOX) return shape.y;
	else if (shape.type === CIRCLE) return shape.y - shape.radius;
	else if (shape.type === ARC) return extrema(shape, Pt(0,-1)).y;
	else if (shape.type === LINE) return shape.y + (Math.min(shape.dy, 0));
	else if (shape.type === POLYGON) return polygonAABB(shape).y;
	else never(shape);
}

export function polygonAABB(poly: Polygon): Box {
	let minX = 0;
	let minY = 0;
	let maxX = 0;
	let maxY = 0;
	for (let pt of poly.points) {
		if (pt.x < minX) minX = pt.x;
		if (pt.y < minY) minY = pt.y;
		if (pt.x > maxX) maxX = pt.x;
		if (pt.y > maxY) maxY = pt.y;
	}
	return {
		x: poly.x + minX,
		y: poly.y + minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
export function AABB(shape: Shape): Box {
	// TODO: other cases
	if (shape.type === POLYGON) return polygonAABB(shape);
	// fallback when unimplemented
	let l = left(shape);
	let r = right(shape);
	let t = top(shape);
	let b = bottom(shape);
	return Box(l, b, r-l, t-b);
}

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