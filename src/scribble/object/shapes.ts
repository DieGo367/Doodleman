import * as Shape from "../shape.js";

import Obj from "./instance.js";


export class Point extends Obj {
	constructor(x: number, y: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json")
			this.setAnimator(0, 0, gfx);
		else
			this.setGraphic(gfx, {
				type: Shape.POINT,
				x: 0, y: 0
			});
		this.setCollider(0, {
			type: Shape.POINT,
			x: 0, y: 0
		});
	}
}

export class Arc extends Obj {
	constructor(x: number, y: number, radius: number, start: number, end: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json")
			this.setAnimator(0, -radius, gfx);
		else
			this.setGraphic(gfx, {
				type: Shape.ARC,
				x: 0, y: 0,
				radius: radius,
				start: start, end: end
			});
		this.setCollider(0, {
			type: Shape.ARC,
			x: 0, y: 0,
			radius: radius,
			start: start, end: end
		});
	}
}

export class Box extends Obj {
	constructor(x: number, y: number, width: number, height: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.setAnimator(width/2, 0, gfx);
		}
		else
			this.setGraphic(gfx, {
				type: Shape.BOX,
				x: 0, y: 0,
				width: width,
				height: height
			});
		this.setCollider(0, {
			type: Shape.BOX,
			x: 0, y: 0,
			width: width, height: height
		});
	}
}

export class Line extends Obj {
	constructor(x: number, y: number, x2: number, y2: number, gfx: string) {
		super(x, y);
		let dx = x2 - x;
		let dy = y2 - y;
		if (gfx.slice(-5) === ".json") {
			this.setAnimator(dx/2, dy/2, gfx);
		}
		else
			this.setGraphic(gfx, {
				type: Shape.LINE,
				x: 0, y: 0,
				dx: dx, dy: dy
			});
		this.setCollider(0, {
			type: Shape.LINE,
			x: 0, y: 0,
			dx: dx, dy: dy
		});
	}
}

export class Circle extends Obj {
	constructor(x: number, y: number, radius: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.setAnimator(0, -radius, gfx);
		}
		else
			this.setGraphic(gfx, {
				type: Shape.CIRCLE,
				x: 0, y: 0,
				radius: radius
			});
		this.setCollider(0, {
			type: Shape.CIRCLE,
			x: 0, y: 0, radius: radius
		});
	}
}

export class Polygon extends Obj {
	constructor(x: number, y: number, vertices: Shape.Point[], gfx: string) {
		super(x, y);
		let aabb = Shape.polygonAABB({x: 0, y: 0, vertices: vertices});
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.setAnimator(aabb.x + aabb.width/2, aabb.y, gfx);
		}
		else
			this.setGraphic(gfx, {
				type: Shape.POLYGON,
				x: 0, y: 0,
				vertices: vertices
			});
		this.setCollider(0, {
			type: Shape.POLYGON,
			x: 0, y: 0,
			vertices: vertices
		});
	}
}