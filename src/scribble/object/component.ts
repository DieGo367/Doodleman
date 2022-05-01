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
	weight: number;
	// collided: boolean;
	// collisions: {[objectID: number]: boolean};
	// grounded: boolean;
	// grounds: {[objectID: number]: boolean};
}


export function graphic(shape: Shape, style: string): Graphic {
	return {...shape, style: style};
}
export function animator(position: Point, name: string, direction: DIR = CENTER): Animator {
	return {
		...position,
		name: name,
		page: 0,
		current: "",
		direction: CENTER,
		tick: 0,
		lock: 0,
		previous: ""
	};
}
export function collider(shape: Shape, weight: number): Collider {
	return {...shape, weight: weight};
}