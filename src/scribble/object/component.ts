import { Point, Shape } from "../shape.js";
import { DIR, CENTER } from "../util.js";

export type Graphic = Shape & {
	style: string;
}
export type Animator = Point & {
	name: string;
	page: number;
	current: string;
	direction: DIR;
	tick: number;
	lock: number | "full";
	previous: string;
}
export type Collider = Shape & {
	id: number;
	relX: number;
	relY: number;
	weight: number;
	collided: boolean;
	collisions: {[objectID: number]: boolean};
	grounded: boolean;
	grounds: {[objectID: number]: boolean};
	prevX: number;
	prevY: number;
	prevCollided: boolean;
	prevCollisions: {[objectID: number]: boolean};
	prevGrounded: boolean;
	prevGrounds: {[objectID: number]: boolean};
	pushVector: {x: number, y: number, count: number};
	sweep?: Shape[];
}


export function graphic(style: string, shape: Shape): Graphic;
export function graphic<Type extends Shape>(style: string, shape: Type): Graphic & Type;
export function graphic(style: string, shape: Shape): Graphic {
	return {...shape, style: style};
}
export function animator(x: number, y: number, name: string, direction: DIR = CENTER): Animator {
	return {
		x: x, y: y,
		name: name,
		page: 0,
		current: "",
		direction: direction,
		tick: 0,
		lock: 0,
		previous: ""
	};
}
export function collider(weight: number, shape: Shape): Collider;
export function collider<Type extends Shape>(weight: number, shape: Type): Collider & Type;
export function collider(weight: number, shape: Shape): Collider {
	return {
		...shape,
		id: NaN,
		x: 0, y: 0,
		relX: shape.x, relY: shape.y,
		weight: weight,
		collided: false,
		collisions: {},
		grounded: false,
		grounds: {},
		prevX: 0, prevY: 0,
		prevCollided: false,
		prevCollisions: {},
		prevGrounded: false,
		prevGrounds: {},
		pushVector: {x: 0, y: 0, count: 0}
	};
}