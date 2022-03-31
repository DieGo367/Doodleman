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
	if (!pt) return pt;
	return {x: pt.x * n, y: pt.y * n}
}
export function mag(pt: Point): number {
	return Math.sqrt(pt.x*pt.x + pt.y*pt.y);
}
export function unit(pt: Point): Point {
	return scale(pt, 1/mag(pt));
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