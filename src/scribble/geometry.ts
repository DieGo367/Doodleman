import { type Point, type Line } from "./shape.js";

// Point utility functions

export function dist(a: Point, b: Point): number {
	let dx = b.x - a.x;
	let dy = b.y - a.y;
	return Math.sqrt((dx*dx) + (dy*dy));
}
export function sum(...pts: Point[]): Point {
	let sum = {x: 0, y: 0};
	for (let pt of pts) {
		sum.x += pt.x;
		sum.y += pt.y;
	}
	return sum;
}
export function diff(a: Point, b: Point): Point {
	return {
		x: a.x - b.x,
		y: a.y - b.y
	};
}
export function dot(a: Point, b: Point): number {
	return (a.x * b.x) + (a.y * b.y);
}
export function scale (pt: Point, n: number): Point {
	return {x: pt.x * n, y: pt.y * n}
}
export function mag(pt: Point): number {
	return Math.sqrt(pt.x*pt.x + pt.y*pt.y);
}
export function unit(pt: Point): Point {
	let n = 1 / Math.sqrt(pt.x*pt.x + pt.y*pt.y);
	return {x: pt.x * n, y: pt.y * n}
}
export function rescale(pt: Point, n: number): Point {
	let n2 = n / Math.sqrt(pt.x*pt.x + pt.y*pt.y);
	return {x: pt.x * n2, y: pt.y * n2};
}
export function project(pt: Point, line: Line): Point {
	let end1 = {x: line.x, y: line.y};
	let end2 = {x: line.x + line.dx, y: line.y + line.dy};
	let length = dist(end1, end2);
	let dp = (((pt.x - end1.x)*(end2.x - end1.x)) + ((pt.y - end1.y)*(end2.y - end1.y))) / (length*length);
	return {
		x: end1.x + (dp * (end2.x - end1.x)),
		y: end1.y + (dp * (end2.y - end1.y))
	};
}

const TAU = 2*Math.PI;
export function anglePos(angle: number, scale = 1) {
	return {x: Math.cos(angle) * scale, y: Math.sin(angle) * scale};
}
export function angleBound(angle: number): number {
	while (angle < 0) angle += TAU;
	return angle % TAU;
}
export function angleWithinArc(angle: number, arc: {start: number, end: number}): boolean {
	let dAngle = arc.end - arc.start;
	if (dAngle >= TAU) return true;
	if (dAngle === 0) return angleBound(angle) === angleBound(arc.start);
	let test = angleBound(angle);
	let start = angleBound(arc.start);
	let end = angleBound(arc.end);
	if (end > start)
		return start <= test && test <= end;
	else
		return test <= end || start <= test;
}