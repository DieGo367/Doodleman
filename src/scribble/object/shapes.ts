import * as Shape from "../shape.js";

import GameObject from "./instance.js";
import { graphic, collider, animator } from "./component.js"


export class Point extends GameObject {
	constructor(x: number, y: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = animator({x: 0, y: 0}, gfx);
		}
		else this.graphic = graphic({
			type: Shape.POINT,
			x: 0, y: 0
		}, gfx);
		this.collision = collider({
			type: Shape.POINT,
			x: 0, y: 0
		}, 0);
	}
};

export class Arc extends GameObject {
	constructor(x: number, y: number, radius: number, start: number, end: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = animator({x: 0, y: -radius}, gfx);
		}
		else this.graphic = {
			type: Shape.ARC,
			style: gfx,
			x: 0, y: 0,
			radius: radius,
			start: start, end: end
		};
		this.collision = {
			type: Shape.ARC,
			weight: 0,
			x: 0, y: 0,
			radius: radius,
			start: start, end: end
		};
	}
};

export class Box extends GameObject {
	constructor(x: number, y: number, width: number, height: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = animator({x: width/2, y: 0}, gfx);
		}
		else this.graphic = {
			type: Shape.BOX,
			style: gfx,
			x: 0, y: 0,
			width: width,
			height: height
		};
		this.collision = {
			type: Shape.BOX,
			weight: 0,
			x: 0, y: 0,
			width: width, height: height
		};
	}
};

export class Line extends GameObject {
	constructor(x: number, y: number, x2: number, y2: number, gfx: string) {
		super(x, y);
		let dx = x2 - x;
		let dy = y2 - y;
		if (gfx.slice(-5) === ".json") {
			this.animator = animator({x: dx/2, y: dy/2}, gfx);
		}
		else this.graphic = {
			type: Shape.LINE,
			style: gfx,
			x: 0, y: 0,
			dx: dx, dy: dy
		};
		this.collision = {
			type: Shape.LINE,
			weight: 0,
			x: 0, y: 0,
			dx: dx, dy: dy
		};
	}
};

export class Circle extends GameObject {
	constructor(x: number, y: number, radius: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = animator({x: 0, y: -radius}, gfx);
		}
		else this.graphic = {
			type: Shape.CIRCLE,
			style: gfx,
			x: 0, y: 0,
			radius: radius
		};
		this.collision = {
			type: Shape.CIRCLE,
			weight: 0,
			x: 0, y: 0, radius: radius
		};
	}
};

export class Polygon extends GameObject {
	constructor(x: number, y: number, vertices: Shape.Point[], gfx: string) {
		super(x, y);
		let aabb = Shape.polygonAABB({x: 0, y: 0, vertices: vertices});
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animator = animator({x: aabb.x + aabb.width/2, y: aabb.y}, gfx);
		}
		else this.graphic = {
			type: Shape.POLYGON,
			style: gfx,
			x: 0, y: 0,
			vertices: vertices
		};
		this.collision = {
			type: Shape.POLYGON,
			weight: 0,
			x: 0, y: 0,
			vertices: vertices
		};
	}
};