import { GameObject } from "./object.js";
import { EDGE } from "./level.js";
import { never, Angle } from "./util.js";
import { diff, dist, dot, mag, project, scale, sum, unit } from "./point_math.js";
import {
	type Shape, type Shaped, type Basic,
	POINT, type Point,
	CIRCLE, type Circle,
	BOX, type Box,
	ARC, type Arc,
	LINE, Line,
	POLYGON, type Polygon,
	left, right, top, bottom, center,
	polygonCenter, polygonAABB,
	access,
	isShape
} from "./shape.js";

type IDBoolMap = {[objectID: number]: boolean};
type Collider<Type extends Basic> = Shaped<Type> & {
	id: number;
	weight: number;
	lastX: number;
	lastY: number;
	collided: boolean;
	collisions: IDBoolMap;
	lastCollisions: IDBoolMap;
	isGrounded: boolean;
	grounds: IDBoolMap;
	lastGrounds: IDBoolMap;
	pushVector: {x: number, y: number, count: number};
	sweep?: Shape[];
}
// type helpers
function isIDBoolMap(obj: any): obj is IDBoolMap {
	return typeof obj === "object" && Object.keys(obj).every(key => typeof obj[key] === "boolean")
}
export function isCollider(obj: any): obj is Collider<Shape> {
	return typeof obj.id === "number"
		&& typeof obj.weight === "number"
		&& typeof obj.lastX === "number"
		&& typeof obj.lastY === "number"
		&& typeof obj.collided === "boolean"
		&& isIDBoolMap(obj.collisions)
		&& isIDBoolMap(obj.lastCollisions)
		&& typeof obj.isGrounded === "boolean"
		&& isIDBoolMap(obj.grounds)
		&& isIDBoolMap(obj.lastGrounds)
		&& typeof obj.pushVector === "object"
			&& typeof obj.pushVector.x === "number"
			&& typeof obj.pushVector.y === "number"
			&& typeof obj.pushVector.count === "number"
		&& (typeof obj.sweep === "undefined" || (obj.sweep instanceof Array && obj.sweep.every(item => isShape(item))))
		&& isShape(obj);
}

type Resolution = Point | false;
type SweepResolution = {a: Collider<Shape>, b: Collider<Shape>} | false;

// TODO: projection push cancel?
// TODO: chain pushing on lower levels?

export const EPS = 0.1;
export const NORMAL_FORCE_THRESH = 0.5;
export const SLOPE_THRESH = 0.8;
/**
 * Runs the entire collision detection and resolution process on a set of objects in a level.
 * @param objectMap Map of all the objects that collision should be checked for.
 * @param gravity Vector describing the x and y force of gravity.
 * @param level The data for the currently loaded level, used for its collision bounds.
 */
export function run(objectMap: {[id: number]: GameObject}, gravity: Point, level) {
	// create a map of buckets for objects of different collision weight levels
	let bucketMap = {} as {[weight: number]: Collider<Shape>[]};
	// list of the weight levels we have made buckets for
	let mapLevels = [] as number[];

	for (let id in objectMap) {
		let obj = objectMap[id];
		// check that the object provides a collider
		if (obj.collision) {
			let shape = getCollider(obj);
			// add the shape to the bucket for its collision weight level
			if (!bucketMap[shape.weight]) {
				bucketMap[shape.weight] = [];
				mapLevels.push(shape.weight);
			}
			bucketMap[shape.weight].push(shape);
		}
	}

	let processedShapes = [] as Collider<Shape>[];
	// sort the weight levels in ascending order
	mapLevels.sort();
	for (let level of mapLevels) {
		let bucket = bucketMap[level];
		// for each shape in the current bucket
		for (let i = 0; i < bucket.length; i++) {
			let shape = bucket[i];
			// collide with shapes from lower collision levels
			for (let lowerShape of processedShapes) {
				collisionCheck(shape, lowerShape, gravity);
			}
			// collide with shapes from the same collision level (same bucket)
			if (level !== Infinity) for (let j = i+1; j < bucket.length; j++) {
				collisionCheck(shape, bucket[j], gravity);
			}
		}
		// add the shapes from this bucket to the processed shapes list
		processedShapes = processedShapes.concat(bucket);
		// for all processed shapes, resolve the current push vector
		for (let i = 0; i < processedShapes.length; i++) {
			let shape = processedShapes[i];
			let owner = objectMap[shape.id];
			if (owner) {
				if (shape.pushVector.count === 0) continue;
				owner.x += shape.pushVector.x;
				owner.y += shape.pushVector.y;
				shape.x += shape.pushVector.x / shape.pushVector.count;
				shape.y += shape.pushVector.y / shape.pushVector.count;
				shape.pushVector = {x: 0, y: 0, count: 0};
			}
			else {
				processedShapes.splice(i, 1);
				i--;
			}
		}
	}
	
	// resolve each shape's other variables
	for (let i = 0; i < processedShapes.length; i++) {
		let shape = processedShapes[i];
		let owner = objectMap[shape.id];
		if (owner) {
			levelBoundCheck(shape, owner, level, gravity);
			owner.collided = shape.collided;
			owner.isGrounded = shape.isGrounded;
			owner.collisions = shape.collisions;
			owner.grounds = shape.grounds;
			if (shape.isGrounded) {
				// TODO move this to once per owner, not once for each shape collider
				let gravityLine = {x: 0, y: 0, dx: gravity.x, dy: gravity.y};
				let proj = project({x: owner.velX, y: owner.velY}, gravityLine);
				owner.velX -= proj.x;
				owner.velY -= proj.y;
			}
		}
		else {
			processedShapes.splice(i, 1);
			i--;
		}
	}
}
export function getCollider(obj: GameObject): Collider<Shape> {
	// make a copy of the collider shape, with helper structures for the collision process
	let shape: Partial<Collider<Shape>> = access(obj, "collision");
	shape.id = obj.id;
	shape.lastX = shape.x;
	if (typeof obj.lastX === "number") shape.lastX += obj.lastX - obj.x;
	shape.lastY = shape.y;
	if (typeof obj.lastY === "number") shape.lastY += obj.lastY - obj.y;
	shape.collided = false;
	shape.isGrounded = false;
	shape.collisions = {};
	shape.grounds = {};
	shape.lastCollisions = obj.collisions || {};
	shape.lastGrounds = obj.grounds || {};
	shape.pushVector = {x: 0, y: 0, count: 0};
	if (isCollider(shape)) return shape;
	else {
		console.log(shape);
		throw new Error("Improper collider!");
	}
}
// the entire collision check process, including detection, push vector creation, and ground detection
export function collisionCheck(a: Collider<Shape>, b: Collider<Shape>, gravity: Point) {
	if (a.weight === Infinity && b.weight === Infinity) return;
	// discreteCollision(a, b, gravity);
	continuousCollision(a, b, gravity);
}
export function discreteCollision(a: Collider<Shape>, b: Collider<Shape>, gravity: Point) {
	if (intersect(a, b)) {
		let push = resolve(a, b);
		if (push) {
			a.collided = true;
			b.collided = true;
			a.collisions[b.id] = true;
			b.collisions[a.id] = true;
			let resolution = resolvePush(a, b, push);
			collisionBasedGrounding(a, b, resolution, gravity);
		}
		else if (push === false) {
			a.collisions[b.id] = false;
			b.collisions[a.id] = false;
		}
		else console.error("No proper resolution given!");
	}
}
export function continuousCollision(a: Collider<Shape>, b: Collider<Shape>, gravity: Point) {
	// if collided last frame, just use discrete collision
	if (a.lastCollisions[b.id] || b.lastCollisions[a.id]) {
		discreteCollision(a, b, gravity);
	}
	else if (sweepCheck(a, b)) {
		let resolution;
		resolution = bisectionMethod(a, b);
		if (resolution) {
			a.collided = true;
			b.collided = true;
			a.collisions[b.id] = true;
			b.collisions[a.id] = true;
			collisionBasedGrounding(a, b, resolution, gravity);
		}
		else if (resolution === false) {
			a.collisions[b.id] = false;
			b.collisions[a.id] = false;
		}
		else console.error("No proper resolution given!");
	}
}
export function sweepCheck(a: Collider<Shape>, b: Collider<Shape>): boolean {
	// motion check
	let ax = a.x - a.lastX;
	let ay = a.y - a.lastY;
	let bx = b.x - b.lastX;
	let by = b.y - b.lastY;
	let motion = {x: ax - bx, y: ay - by};
	if (motion.x === 0 && motion.y === 0) return intersect(a, b);
	// actual sweep check
	let shapesA = getSweepingShapes(a);
	let shapesB = getSweepingShapes(b);
	for (let i = 0; i < shapesA.length; i++) {
		let shapeA = shapesA[i];
		for (let j = 0; j < shapesB.length; j++) {
			let shapeB = shapesB[j];
			if (intersect(shapeA, shapeB)) return true;
		}
	}
	return false;
}
export function getSweepingShapes(shape: Collider<Shape>): Shape[] {
	if (shape.sweep) return shape.sweep;
	let dx = shape.x - shape.lastX;
	let dy = shape.y - shape.lastY;
	if (shape.type === POINT) {
		return shape.sweep = [{type: LINE, x: shape.lastX, y: shape.lastY, dx: dx, dy: dy}];
	}
	else if (shape.type === ARC) {
		let start = Angle.position(shape.start, shape.radius);
		let end = Angle.position(shape.end, shape.radius);
		return shape.sweep = [
			// current and last
			{type: ARC, x: shape.x, y: shape.y, radius: shape.radius, start: shape.start, end: shape.end},
			{type: ARC, x: shape.lastX, y: shape.lastY, radius: shape.radius, start: shape.start, end: shape.end},
			// lines from last to current endpoints
			{type: LINE, x: shape.lastX + start.x, y: shape.lastY + start.y, dx: dx, dy: dy},
			{type: LINE, x: shape.lastX + end.x, y: shape.lastY + end.y, dx: dx, dy: dy},
		];
	}
	else if (shape.type === BOX) {
		return shape.sweep = [
			// current and last
			{type: BOX, x: shape.x, y: shape.y, width: shape.width, height: shape.height},
			{type: BOX, x: shape.lastX, y: shape.lastY, width: shape.width, height: shape.height},
			// draw lines from last to current corner positions
			{type: LINE, x: shape.lastX, y: shape.lastY, dx: dx, dy: dy},
			{type: LINE, x: shape.lastX + shape.width, y: shape.lastY, dx: dx, dy: dy},
			{type: LINE, x: shape.lastX, y: shape.lastY + shape.height, dx: dx, dy: dy},
			{type: LINE, x: shape.lastX + shape.width, y: shape.lastY + shape.height, dx: dx, dy: dy}
		];
	}
	else if (shape.type === CIRCLE) {
		let dmag = Math.sqrt(dx*dx + dy*dy);
		let shiftX = dx / dmag * shape.radius;
		let shiftY = dy / dmag * shape.radius;
		return shape.sweep = [
			// current and last
			{type: CIRCLE, x: shape.x, y: shape.y, radius: shape.radius},
			{type: CIRCLE, x: shape.lastX, y: shape.lastY, radius: shape.radius},
			// line from last to current center
			{type: LINE, x: shape.lastX, y: shape.lastY, dx: dx, dy: dy},
			// lines that form a "cylinder" shape with the two end circles
			{type: LINE, x: shape.lastX + shiftY, y: shape.lastY - shiftX, dx: dx, dy: dy},
			{type: LINE, x: shape.lastX - shiftY, y: shape.lastY + shiftX, dx: dx, dy: dy},
		];
	}
	else if (shape.type === LINE) {
		return shape.sweep = [
			// current and last
			{type: LINE, x: shape.x, y: shape.y, dx: shape.dx, dy: shape.dy},
			{type: LINE, x: shape.lastX, y: shape.lastY, dx: shape.dx, dy: shape.dy},
			// lines from last to current endpoints
			{type: LINE, x: shape.lastX, y: shape.lastY, dx: dx, dy: dy},
			{type: LINE, x: shape.lastX + shape.dx, y: shape.lastY + shape.dy, dx: dx, dy: dy},
		];
	}
	else if (shape.type === POLYGON) {
		shape.sweep = [
			// current and last
			{type: POLYGON, x: shape.x, y: shape.y, vertices: shape.vertices.slice()},
			{type: POLYGON, x: shape.lastX, y: shape.lastY, vertices: shape.vertices.slice()}
		];
		// lines from last to current vertices
		for (let i = 0; i < shape.vertices.length; i++) {
			let pt = shape.vertices[i];
			shape.sweep.push({
				type: LINE, x: shape.lastX + pt.x, y: shape.lastY + pt.y, dx: dx, dy: dy
			});
		}
		return shape.sweep;
	}
	else never(shape);
}
export function bisectionMethod(a: Collider<Shape>, b: Collider<Shape>): SweepResolution {
	// velocities
	let velA = {x: a.x - a.lastX, y: a.y - a.lastY};
	let velB = {x: b.x - b.lastX, y: b.y - b.lastY};
	// testing objects
	let testA = Object.assign({}, a);
	let testB = Object.assign({}, b);
	// loop vars
	let granularity = Math.max(mag(velA), mag(velB));
	let scalar = 0.5;
	let offset = 0;
	let collisionScalar: number = null;
	// simple check for collision at final position
	if (intersect(a, b)) collisionScalar = 1;
	// the loop
	while (granularity >= 1) {
		// move testing objs to test position
		let testVelA = scale(velA, offset+scalar);
		let testVelB = scale(velB, offset+scalar);
		testA.x = a.lastX + testVelA.x;
		testA.y = a.lastY + testVelA.y;
		testB.x = b.lastX + testVelB.x;
		testB.y = b.lastY + testVelB.y;
		// if we intersect, mark the collision, then move half a step back in time
		if (intersect(testA, testB)) {
			collisionScalar = offset+scalar;
			scalar *= 0.5;
			granularity /= 2;
		}
		else {
			// no intersection, and none was found before
			if (collisionScalar === null) {
				offset += scalar; // shift forward
				if (offset+scalar >= 1) { // if we've reached the end of time
					// reset to a lower granularity
					offset = 0;
					scalar *= 0.5;
					granularity /= 2;
				}
			}
			// no intersection, but we've found one previously
			else {
				// move half a step forward in time
				offset += scalar;
				scalar *= 0.5;
				granularity /= 2;
			}
		}
	}
	// no collision detected, must've been an initial collision
	if (collisionScalar === null) return null;
	// determine how much a and b need to be adjusted back to reach point of collision
	let correctionA = scale(velA, collisionScalar - 1);
	let correctionB = scale(velB, collisionScalar - 1);
	// move testing objs to detected point of collision
	testA.x = a.x + correctionA.x;
	testA.y = a.y + correctionA.y;
	testB.x = b.x + correctionB.x;
	testB.y = b.y + correctionB.y;
	// resolve the pushback at the point of collision
	let pushbackA = resolve(testA, testB);
	if (!pushbackA) return false;
	let resolved = resolvePush(testA, testB, pushbackA);
	// handle long-distance correction according to collision weight level
	if (a.weight === b.weight) {
		a.pushVector.x += correctionA.x;
		a.pushVector.y += correctionA.y;
		b.pushVector.x += correctionB.x;
		b.pushVector.y += correctionB.y;
	}
	else if (a.weight > b.weight) {
		b.pushVector.x += correctionB.x - correctionA.x;
		b.pushVector.y += correctionB.y - correctionA.y;
	}
	else {
		a.pushVector.x += correctionA.x - correctionB.x;
		a.pushVector.y += correctionA.y - correctionB.y;
	}
	return resolved;
}
export function resolvePush(a: Collider<Shape>, b: Collider<Shape>, force: Point): Exclude<SweepResolution, false> {
	// resolved copies
	let resA = Object.assign({}, a);
	let resB = Object.assign({}, b);
	// do the actual push force sum
	if (a.weight === b.weight) {
		a.pushVector.x += force.x / 2;
		a.pushVector.y += force.y / 2;
		a.pushVector.count++;
		b.pushVector.x -= force.x / 2;
		b.pushVector.y -= force.y / 2;
		b.pushVector.count++;
		resA.x += force.x / 2;
		resA.y += force.y / 2;
		resB.x -= force.x / 2;
		resB.y -= force.y / 2;
	}
	else if (a.weight > b.weight) {
		b.pushVector.x -= force.x;
		b.pushVector.y -= force.y;
		b.pushVector.count++;
		resB.x -= force.x;
		resB.y -= force.y;
	}
	else {
		a.pushVector.x += force.x;
		a.pushVector.y += force.y;
		a.pushVector.count++;
		resA.x += force.x;
		resA.y += force.y;
	}
	return {a: resA, b: resB};
}
export function collisionBasedGrounding(a: Collider<Shape>, b: Collider<Shape>, resolution: Exclude<SweepResolution, false>, gravity: Point) {
	if (gravity.x === 0 && gravity.y === 0) return;
	if (shapeGroundedOn(resolution.a, resolution.b, gravity)) {
		a.grounds[b.id] = true;
		a.isGrounded = true;
	}
	if (shapeGroundedOn(resolution.b, resolution.a, gravity)) {
		b.grounds[a.id] = true;
		b.isGrounded = true;
	}
}
export function shapeGroundedOn(a: Collider<Shape>, b: Collider<Shape>, gravity: Point): boolean {
	let bottoms = getShapeBottoms(a, gravity);
	let tops = getShapeTops(b, gravity);
	for (let bottom of bottoms) {
		for (let top of tops) {
			if (intersect(bottom, top)) return true;
			else if (a.lastGrounds[b.id] && b.type === LINE) return true;
		}
	}
	return false;
}
export function getShapeBottoms(shape: Shape, gravity: Point): Shape[] {
	if (shape.type === POINT) {
		return [{x: shape.x, y: shape.y, type: POINT}];
	}
	else if (shape.type === ARC) {
		// angle in radians of the slope threshold
		let theta = Math.acos(SLOPE_THRESH);
		// angle in which gravity takes place
		let gravAngle = Math.atan2(gravity.y, gravity.x);
		if (gravAngle < 0) gravAngle += 2*Math.PI;
		// starting and ending positions of the arc, which are +-theta from the gravity angle
		let start = gravAngle - theta;
		if (start < 0) start += 2*Math.PI;
		let end = gravAngle + theta;
		if (end >= 2*Math.PI) end -= 2*Math.PI;

		if (Angle.withinArc(start, shape) && Angle.withinArc(end, shape))
			return [{x: shape.x, y: shape.y, radius: shape.radius, start: start, end: end, type: ARC}];
		else if (Angle.withinArc(start, shape))
			return [{x: shape.x, y: shape.y, radius: shape.radius, start: start, end: shape.end, type: ARC}];
		else if (Angle.withinArc(end, shape))
			return [{x: shape.x, y: shape.y, radius: shape.radius, start: shape.start, end: end, type: ARC}];
		else {
			let arcStart = Angle.position(shape.start, shape.radius);
			let arcEnd = Angle.position(shape.start, shape.radius);
			let gravityPoint = scale(gravity, shape.radius/mag(gravity));
			let startDist = dist(arcStart, gravityPoint);
			let endDist = dist(arcEnd, gravityPoint);
			let results = [] as Point[];
			if (startDist <= endDist) results.push(arcStart);
			if (endDist <= startDist) results.push(arcEnd);
			return results.map(pt => Object.assign(pt, {type: POINT} as Shaped<Point>))
		}
	}
	else if (shape.type === BOX) {
		let bottoms = [];
		let sides = [
			{x: shape.x, y: shape.y, dx: 0, dy: shape.height, type: LINE},
			{x: shape.x, y: shape.y+shape.height, dx: shape.width, dy: 0, type: LINE},
			{x: shape.x+shape.width, y: shape.y+shape.height, dx: 0, dy: -shape.height, type: LINE},
			{x: shape.x+shape.width, y: shape.y, dx: -shape.width, dy: 0, type: LINE}
		];
		for (let i = 0; i < sides.length; i++) {
			let side = sides[i];
			let normal = {x: -side.dy, y: side.dx};
			if (dot(normal, gravity) > 0) {
				let dp = dot(unit({x: side.dx, y: side.dy}), unit(gravity));
				if (Math.abs(dp) <= SLOPE_THRESH) bottoms.push(side);
			}
		}
		return bottoms;
	}
	else if (shape.type === CIRCLE) {
		// angle in radians of the slope threshold
		let theta = Math.acos(SLOPE_THRESH);
		// angle in which gravity takes place
		let gravAngle = Math.atan2(gravity.y, gravity.x);
		if (gravAngle < 0) gravAngle += 2*Math.PI;
		// starting and ending positions of the arc, which are +-theta from the gravity angle
		let start = gravAngle - theta;
		if (start < 0) start += 2*Math.PI;
		let end = gravAngle + theta;
		if (end >= 2*Math.PI) end -= 2*Math.PI;
		return [{x: shape.x, y: shape.y, radius: shape.radius, start: start, end: end, type: ARC}];
	}
	else if (shape.type === LINE) {
		// get bottommost endpoint, or both
		let dp = dot({x: shape.dx, y: shape.dy}, gravity);
		if (dp < -EPS) return [{x: shape.x, y: shape.y, type: POINT}];
		else if (dp > EPS) return [{x: shape.x+shape.dx, y: shape.y+shape.dy, type: POINT}];
		else return [
			{x: shape.x, y: shape.y, type: POINT},
			{x: shape.x+shape.dx, y: shape.y+shape.dy, type: POINT}
		];
	}
	else if (shape.type === POLYGON) {
		let bottoms = [];
		for (let i = 0; i < shape.vertices.length; i++) {
			let v1 = sum(shape, shape.vertices[i]);
			let v2 = sum(shape, shape.vertices[(i + 1) % shape.vertices.length]);
			let edge = Line(v1, v2) as Shaped<Line>;
			edge.type = LINE;
			let normal = {x: -edge.dy, y: edge.dx};
			if (dot(normal, gravity) > 0) {
				let dp = dot(unit({x: edge.dx, y: edge.dy}), unit(gravity));
				if (Math.abs(dp) <= SLOPE_THRESH) bottoms.push(edge);
			}
		}
		return bottoms;
	}
	else never(shape);
}
export function getShapeTops(shape: Shape, gravity: Point): Shape[] {
	if (shape.type === POINT) {
		return [{x: shape.x, y: shape.y, type: POINT}];
	}
	else if (shape.type === ARC) {
		// angle in radians of the slope threshold
		let theta = Math.acos(SLOPE_THRESH);
		// angle opposite to which gravity takes place
		let gravAngle = Math.atan2(-gravity.y, -gravity.x);
		if (gravAngle < 0) gravAngle += 2*Math.PI;
		// starting and ending positions of the arc, which are +-theta from the gravity angle
		let start = gravAngle - theta;
		if (start < 0) start += 2*Math.PI;
		let end = gravAngle + theta;
		if (end >= 2*Math.PI) end -= 2*Math.PI;

		if (Angle.withinArc(start, shape) && Angle.withinArc(end, shape))
			return [{x: shape.x, y: shape.y, radius: shape.radius, start: start, end: end, type: ARC}];
		else if (Angle.withinArc(start, shape))
			return [{x: shape.x, y: shape.y, radius: shape.radius, start: start, end: shape.end, type: ARC}];
		else if (Angle.withinArc(end, shape))
			return [{x: shape.x, y: shape.y, radius: shape.radius, start: shape.start, end: end, type: ARC}];
		else {
			let arcStart = Angle.position(shape.start, shape.radius);
			let arcEnd = Angle.position(shape.start, shape.radius);
			let gravityPoint = scale(gravity, shape.radius/mag(gravity));
			let startDist = dist(arcStart, gravityPoint);
			let endDist = dist(arcEnd, gravityPoint);
			let results = [] as Point[];
			if (startDist <= endDist) results.push(arcStart);
			if (endDist <= startDist) results.push(arcEnd);
			return results.map(pt => Object.assign(pt, {type: POINT} as Shaped<Point>))
		}
	}
	else if (shape.type === BOX) {
		let tops = [];
		let sides = [
			{x: shape.x, y: shape.y, dx: 0, dy: shape.height, type: LINE},
			{x: shape.x, y: shape.y+shape.height, dx: shape.width, dy: 0, type: LINE},
			{x: shape.x+shape.width, y: shape.y+shape.height, dx: 0, dy: -shape.height, type: LINE},
			{x: shape.x+shape.width, y: shape.y, dx: -shape.width, dy: 0, type: LINE}
		];
		for (let i = 0; i < sides.length; i++) {
			let side = sides[i];
			let normal = {x: -side.dy, y: side.dx};
			if (dot(normal, gravity) < 0) {
				let dp = dot(unit({x: side.dx, y: side.dy}), unit(gravity));
				if (Math.abs(dp) <= SLOPE_THRESH) tops.push(side);
			}
		}
		return tops;
	}
	else if (shape.type === CIRCLE) {
		// angle in radians of the slope threshold
		let theta = Math.acos(SLOPE_THRESH);
		// angle opposite to which gravity takes place
		let gravAngle = Math.atan2(-gravity.y, -gravity.x);
		if (gravAngle < 0) gravAngle += 2*Math.PI;
		// starting and ending positions of the arc, which are +-theta from the gravity angle
		let start = gravAngle - theta;
		if (start < 0) start += 2*Math.PI;
		let end = gravAngle + theta;
		if (end >= 2*Math.PI) end -= 2*Math.PI;
		return [{x: shape.x, y: shape.y, radius: shape.radius, start: start, end: end, type: ARC}];
	}
	else if (shape.type === LINE) {
		let normal = {x: -shape.dy, y: shape.dx};
		if (dot(normal, gravity) < 0) {
			let list = [];
			// get topmost endpoint, or both
			let dp = dot({x: shape.dx, y: shape.dy}, gravity);
			if (dp < -EPS) list.push({x: shape.x+shape.dx, y: shape.y+shape.dy, type: POINT});
			else if (dp > EPS) list.push({x: shape.x, y: shape.y, type: POINT});
			else {
				list.push({x: shape.x+shape.dx, y: shape.y+shape.dy, type: POINT});
				list.push({x: shape.x, y: shape.y, type: POINT});
			}
			// get full line, as long as it's slope is within the threshold
			let unitDot = dot(unit({x: shape.dx, y: shape.dy}), unit(gravity));
			if (Math.abs(unitDot) <= SLOPE_THRESH) list.push({x: shape.x, y: shape.y, dx: shape.dx, dy: shape.dy, type: LINE});
			return list;
		}
		return [];
	}
	else if (shape.type === POLYGON) {
		let tops = [];
		for (let i = 0; i < shape.vertices.length; i++) {
			let v1 = sum(shape, shape.vertices[i]);
			let v2 = sum(shape, shape.vertices[(i + 1) % shape.vertices.length]);
			let edge = Line(v1, v2) as Shaped<Line>;
			edge.type = LINE;
			let normal = {x: -edge.dy, y: edge.dx};
			if (dot(normal, gravity) < 0) {
				let dp = dot(unit({x: edge.dx, y: edge.dy}), unit(gravity));
				if (Math.abs(dp) <= SLOPE_THRESH) tops.push(edge);
			}
		}
		return tops;
	}
	else never(shape);
}
export function levelBoundCheck(shape, owner, level, gravity) {
	let l = left(shape);
	let r = right(shape);
	let b = bottom(shape);
	let t = top(shape);
	resolveBound(shape, owner, 'x', l, r, -1, level.edge.left, 0, level.width, gravity);
	resolveBound(shape, owner, 'x', r, l, 1, level.edge.right, level.width, 0, gravity);
	resolveBound(shape, owner, 'y', b, t, -1, level.edge.bottom, 0, level.height, gravity);
	resolveBound(shape, owner, 'y', t, b, 1, level.edge.top, level.height, 0, gravity);
}
export function resolveBound(
	shape: Collider<Shape>, owner: GameObject, axis: "x" | "y",
	shapeFront: number, shapeBack: number, direction: number,
	borderType: EDGE, borderPos: number,
	warpPos: number, gravity: Point
) {
	if (borderType === EDGE.SOLID) {
		if (shapeFront * direction >= borderPos * direction) {
			let dp = borderPos - shapeFront;
			owner[axis] += dp;
			shape.collided = true;
			// check grounding
			if (gravity.x !== 0 || gravity.y !== 0) {
				let normal = {x: 0, y: 0};
				normal[axis] = -direction;
				if (dot(normal, gravity) < 0) {
					let segment = {x: normal.y, y: -normal.x};
					let dp = dot(unit(segment), unit(gravity));
					if (Math.abs(dp) <= SLOPE_THRESH) shape.isGrounded = true;
				}
			}
		}
	}
	else if (borderType === EDGE.WRAP) {
		if (shapeBack * direction >= borderPos * direction) {
			let dp = warpPos - shapeFront;
			owner[axis] += dp;
		}
	}
}
// small helpers
export function reshapeCollider(collider: Collider<Shape>, modify: object): Collider<Shape> {
	let copy: Partial<Collider<Shape>> = {
		id: collider.id,
		weight: collider.weight,
		x: collider.x, y: collider.y,
		lastX: collider.lastX, lastY: collider.lastY,
		collided: collider.collided,
		collisions: collider.collisions,
		lastCollisions: collider.lastCollisions,
		isGrounded: collider.isGrounded,
		grounds: collider.grounds,
		lastGrounds: collider.lastGrounds,
		pushVector: collider.pushVector
	};
	Object.assign(copy, modify);
	if (isCollider(copy)) return copy;
}
export function boxAsPolygon(box: Collider<Box>): Collider<Polygon> {
	return reshapeCollider(box, {
		type: POLYGON,
		vertices: [
			{x: 0, y: 0},
			{x: 0, y: box.height},
			{x: box.width, y: box.height},
			{x: box.width, y: 0}
		]
	}) as Collider<Polygon>;
}
export function lineEnds(line: Line): [Point, Point] {
	return [{x: line.x, y: line.y}, {x: line.x + line.dx, y: line.y + line.dy}];
}
export function lineSidePassCheck(line: Collider<Line>, shape: Collider<Shape>): boolean {
	// return result from last collision, if it exists
	let prevResult = line.lastCollisions[shape.id];
	if (typeof prevResult === "boolean") return prevResult;

	// // find the net movement between the shape and line
	// let movement = diff(
	// 	{x: shape.x - shape.lastX, y: shape.y - shape.lastY},
	// 	{x: line.x - line.lastX, y: line.y - line.lastY}
	// );
	// // dot it against the line's normal vector
	// let normal = {x: -line.dy, y: line.dx};
	// let dp = dot(movement, normal);

	// // if moved against the line's push direction (or no movement)
	// if (dp <= 0) {
		// check whether the object was on the correct side last frame
		let mid = center(shape);
		let lastMid = sum(diff(mid, shape), {x: shape.lastX, y: shape.lastY});
		let sideTest = (lastMid.x - line.lastX)*line.dy - (lastMid.y - line.lastY)*line.dx;
		return sideTest <= 0;
	// }
}
export function arcPassCheck(arc, shape): boolean {
	// return result from last collision, if it exists
	let prevResult = arc.lastCollisions[shape.id];
	if (typeof prevResult === "boolean") return prevResult;
	// check whether the object was on the correct side last frame
	let mid = center(shape);
	let lastMid = sum(diff(mid, shape), {x: shape.lastX, y: shape.lastY});
	return dist(arc, lastMid) >= arc.radius;
}
export function reverse(resolution: Resolution) {
	if (resolution) return scale(resolution, -1);
	else return resolution;
}
export function ZERO(): {x: 0, y: 0} { return {x: 0, y: 0}; }

// detection and resolution
export function intersect(a: Shape, b: Shape): boolean {
	return Intersect.shapeShape(a, b);
}
export const Intersect = {
	shapeShape(a: Shape, b: Shape): boolean {
		if (b.type === POINT) return Intersect.shapePt(a, b);
		else if (b.type === ARC) return Intersect.shapeArc(a, b);
		else if (b.type === CIRCLE) return Intersect.shapeCircle(a, b);
		else if (b.type === BOX) return Intersect.shapeBox(a, b);
		else if (b.type === LINE) return Intersect.shapeLine(a, b);
		else if (b.type === POLYGON) return Intersect.shapePolygon(a, b);
		else never(b);
	},
	shapePt(shape: Shape, pt: Point): boolean {
		if (shape.type === POINT) return Intersect.ptPt(shape, pt);
		else if (shape.type === ARC) return Intersect.ptArc(pt, shape);
		else if (shape.type === CIRCLE) return Intersect.ptCircle(pt, shape);
		else if (shape.type === BOX) return Intersect.ptBox(pt, shape);
		else if (shape.type === LINE) return Intersect.ptLine(pt, shape);
		else if (shape.type === POLYGON) return Intersect.ptPolygon(pt, shape);
		else never(shape);
	},
	shapeArc(shape: Shape, arc: Arc): boolean {
		if (shape.type === POINT) return Intersect.ptArc(shape, arc);
		else if (shape.type === ARC) return Intersect.arcArc(shape, arc);
		else if (shape.type === CIRCLE) return Intersect.arcCircle(arc, shape);
		else if (shape.type === BOX) return Intersect.arcBox(arc, shape);
		else if (shape.type === LINE) return Intersect.arcLine(arc, shape);
		else if (shape.type === POLYGON) return Intersect.arcPolygon(arc, shape);
		else never(shape);
	},
	shapeCircle(shape: Shape, circle: Circle): boolean {
		if (shape.type === POINT) return Intersect.ptCircle(shape, circle);
		else if (shape.type === ARC) return Intersect.arcCircle(shape, circle);
		else if (shape.type === CIRCLE) return Intersect.circleCircle(shape, circle);
		else if (shape.type === BOX) return Intersect.circleBox(circle, shape);
		else if (shape.type === LINE) return Intersect.circleLine(circle, shape);
		else if (shape.type === POLYGON) return Intersect.circlePolygon(circle, shape);
		else never(shape);
	},
	shapeBox(shape: Shape, box: Box): boolean {
		if (shape.type === POINT) return Intersect.ptBox(shape, box);
		else if (shape.type === ARC) return Intersect.arcBox(shape, box);
		else if (shape.type === CIRCLE) return Intersect.circleBox(shape, box);
		else if (shape.type === BOX) return Intersect.boxBox(shape, box);
		else if (shape.type === LINE) return Intersect.boxLine(box, shape);
		else if (shape.type === POLYGON) return Intersect.boxPolygon(box, shape);
		else never(shape);
	},
	shapeLine(shape: Shape, line: Line): boolean {
		if (shape.type === POINT) return Intersect.ptLine(shape, line);
		else if (shape.type === ARC) return Intersect.arcLine(shape, line);
		else if (shape.type === CIRCLE) return Intersect.circleLine(shape, line);
		else if (shape.type === BOX) return Intersect.boxLine(shape, line);
		else if (shape.type === LINE) return Intersect.lineLine(shape, line);
		else if (shape.type === POLYGON) return Intersect.linePolygon(line, shape);
		else never(shape);
	},
	shapePolygon(shape: Shape, poly: Polygon): boolean {
		if (shape.type === POINT) return Intersect.ptPolygon(shape, poly);
		else if (shape.type === ARC) return Intersect.arcPolygon(shape, poly);
		else if (shape.type === CIRCLE) return Intersect.circlePolygon(shape, poly);
		else if (shape.type === BOX) return Intersect.boxPolygon(shape, poly);
		else if (shape.type === LINE) return Intersect.linePolygon(shape, poly);
		else if (shape.type === POLYGON) return Intersect.polygonPolygon(shape, poly);
		else never(shape);
	},
	ptPt(a: Point, b: Point): boolean {
		return a.x === b.x && a.y === b.y;
	},
	ptArc(pt: Point, arc: Arc): boolean {
		let distance = dist(pt, arc);
		if (arc.radius - EPS <= distance && distance <= arc.radius) {
			let angle = Math.atan2(pt.y - arc.y, pt.x - arc.x);
			if (angle < 0) angle += 2*Math.PI;
			let end = arc.end - arc.start;
			if (end < 0) end += 2*Math.PI;
			angle -= arc.start;
			if (angle < 0) angle += 2*Math.PI;
			return angle < end;
		}
		return false;
	},
	ptCircle(pt: Point, circle: Circle): boolean {
		return dist(pt, circle) <= circle.radius;
	},
	ptBox(pt: Point, box: Box): boolean {
		return (pt.x >= box.x && pt.x <= box.x + box.width
			&& pt.y >= box.y && pt.y <= box.y + box.height);
	},
	ptLine(pt: Point, line: Line): boolean {
		let endpoint1 = {x: line.x, y: line.y};
		let endpoint2 = {x: line.x + line.dx, y: line.y + line.dy};
		let length = dist(endpoint1, endpoint2);
		let distA = dist(pt, endpoint1);
		let distB = dist(pt, endpoint2);
		return distA + distB <= length + EPS;
		// let proj = project(pt, line);
		// return dist(pt, proj) <= EPS;
	},
	ptPolygon(pt: Point, poly: Polygon): boolean {
		let collided = false;
		let aabb = polygonAABB(poly);
		if (Intersect.ptBox(pt, aabb)) {
			for (let i = 0; i < poly.vertices.length; i++) {
				let v1 = sum(poly, poly.vertices[i]);
				let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);

				// Jordan Curve Theorem. I don't understand it yet but the algorithm works
				if (((v1.y >= pt.y && v2.y < pt.y) || (v1.y < pt.y && v2.y >= pt.y))
					&& (pt.x < (v2.x - v1.x)*(pt.y - v1.y) / (v2.y - v1.y) + v1.x)) {
						collided = !collided;
				}
			}
		}
		return collided;
	},
	arcArc(a: Arc, b: Arc): boolean {
		if (!Intersect.circleCircle(a, b)) return false;
		let difference = diff(b, a);
		let diffNormal = {x: -difference.y, y: difference.x};
		let d = mag(difference);
		if (d === 0) {
			if (Math.abs(a.radius-b.radius) > EPS) return false;
			if (a.start < b.start) return b.start <= a.end;
			return a.start <= b.end; 
		}
		else {
			// angle using law of cosines
			let cosTheta = (d*d + a.radius*a.radius - b.radius*b.radius) / 2*d*a.radius;
			let theta = Math.acos(cosTheta);
			let sinTheta = Math.sin(theta)
			// the point between both intersection points of the two circles, and between the two circle centers
			let center = scale(difference, a.radius*cosTheta/d);
			// the "height" of the intersection points above and below the diff line
			let height = scale(diffNormal, a.radius*sinTheta/d);
			// the intersection points
			let p1 = sum(center, height);
			if (Intersect.ptArc(p1, a) && Intersect.ptArc(p1, b)) return true;
			let p2 = diff(center, height);
			return Intersect.ptArc(p2, a) && Intersect.ptArc(p2, b);
		}
	},
	arcCircle(arc: Arc, circle: Circle): boolean {
		return Intersect.arcArc(
			arc,
			{x: circle.x, y: circle.y, radius: circle.radius, start: 0, end: 2*Math.PI}
		);
	},
	arcBox(arc: Arc, box: Box): boolean {
		if (!Intersect.circleBox(arc, box)) return false;
		let down = {x: box.x, y: box.y, dx: box.width, dy: 0};
		let left = {x: box.x, y: box.y, dx: 0, dy: box.height};
		let up = {x: box.x, y: box.y + box.height, dx: box.width, dy: 0};
		let right = {x: box.x + box.width, y: box.y, dx: 0, dy: box.height};
		let arcStart = {x: arc.x + arc.radius*Math.cos(arc.start), y: arc.y + arc.radius*Math.sin(arc.start)};
		return (Intersect.arcLine(arc, down)
			|| Intersect.arcLine(arc, left)
			|| Intersect.arcLine(arc, up)
			|| Intersect.arcLine(arc, right)
			|| Intersect.ptBox(arcStart, box));
	},
	arcLine(arc: Arc, line: Line): boolean {
		if (!Intersect.circleLine(arc, line)) return false;
		// project arc center onto line
		let ppt = project(arc, line);
		let difference = diff(ppt, arc);
		let diffNormal = {x: -difference.y, y: difference.x};
		let d = mag(difference);
		let height;
		if (d === 0) {
			let segment = {x: line.dx, y: line.dy};
			height = scale(segment, arc.radius / mag(segment));
		}
		else {
			let sinTheta = Math.sqrt(arc.radius*arc.radius - d*d) / arc.radius;
			height = scale(diffNormal, arc.radius*sinTheta/d);
		}
		let p1 = sum(ppt, height);
		if (Intersect.ptArc(p1, arc) && Intersect.ptLine(p1, line)) return true;
		let p2 = diff(ppt, height);
		return Intersect.ptArc(p2, arc) && Intersect.ptLine(p2, line);
	},
	arcPolygon(arc: Arc, poly: Polygon): boolean {
		for (let i = 0; i < poly.vertices.length; i++) {
			let v1 = sum(poly, poly.vertices[i]);
			let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
			let edge = Line(v1, v2);
			if (Intersect.arcLine(arc, edge)) return true;
		}
		let arcStart = {x: arc.x + arc.radius*Math.cos(arc.start), y: arc.y + arc.radius*Math.sin(arc.start)};
		return Intersect.ptPolygon(arcStart, poly);
	},
	circleCircle(a: Circle, b: Circle): boolean {
		return dist(a, b) <= a.radius + b.radius;
	},
	circleBox(circle: Circle, box: Box): boolean {
		let target = {x: circle.x, y: circle.y};

		if (circle.x < box.x) target.x = box.x;
		else if (circle.x > box.x + box.width) target.x = box.x + box.width;
		if (circle.y < box.y) target.y = box.y;
		else if (circle.y > box.y + box.height) target.y = box.y + box.height;
		
		return Intersect.ptCircle(target, circle);
	},
	circleLine(circle: Circle, line: Line): boolean {
		let end1 = {x: line.x, y: line.y};
		let end2 = {x: line.x + line.dx, y: line.y + line.dy};
		if (Intersect.ptCircle(end1, circle) || Intersect.ptCircle(end2, circle)) return true;

		let target = project(circle, line);

		if (!Intersect.ptLine(target, line)) return false;
		return Intersect.ptCircle(target, circle);
	},
	circlePolygon(circle: Circle, poly: Polygon): boolean {
		let aabb = polygonAABB(poly);
		if (Intersect.circleBox(circle, aabb)) {
			for (let i = 0; i < poly.vertices.length; i++) {
				let v1 = sum(poly, poly.vertices[i]);
				let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
				let edge = Line(v1, v2);
				if (Intersect.circleLine(circle, edge)) return true;
			}
			return Intersect.ptPolygon(circle, poly);
		}
		else return false;
	},
	boxBox(a: Box, b: Box): boolean {
		return (a.x <= b.x + b.width && b.x <= a.x + a.width
			&& a.y <= b.y + b.height && b.y <= a.y + a.height);
	},
	boxLine(box: Box, line: Line): boolean {
		let down = {x: box.x, y: box.y, dx: box.width, dy: 0};
		let left = {x: box.x, y: box.y, dx: 0, dy: box.height};
		let up = {x: box.x, y: box.y + box.height, dx: box.width, dy: 0};
		let right = {x: box.x + box.width, y: box.y, dx: 0, dy: box.height};

		return (Intersect.lineLine(down, line)
			|| Intersect.lineLine(left, line)
			|| Intersect.lineLine(up, line)
			|| Intersect.lineLine(right, line)
			|| Intersect.ptBox(line, box));
	},
	boxPolygon(box: Box, poly: Polygon): boolean {
		let aabb = polygonAABB(poly);
		if (Intersect.boxBox(box, aabb)) {
			for (let i = 0; i < poly.vertices.length; i++) {
				let v1 = sum(poly, poly.vertices[i]);
				let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
				let edge = Line(v1, v2);
				if (Intersect.boxLine(box, edge)) return true;
			}
			return Intersect.ptPolygon(box, poly);
		}
		else return false;
	},
	lineLine(a: Line, b: Line): boolean {
		let denom = (b.dy*a.dx) - (b.dx*a.dy);
		if (Math.abs(denom) <= EPS) {
			// hijack to test parallel line collision
			if (Intersect.ptLine({x: a.x, y: a.y}, b)
				|| Intersect.ptLine({x: a.x+a.dx, y: a.y+a.dy}, b)
				|| Intersect.ptLine({x: b.x, y: b.y}, a)
				|| Intersect.ptLine({x: b.x+b.dx, y: b.y+b.dy}, a)) {
				return true;
			}
		}
		let ua = ((b.dx)*(a.y-b.y) - (b.dy)*(a.x-b.x)) / denom;
		let ub = ((a.dx)*(a.y-b.y) - (a.dy)*(a.x-b.x)) / denom;
		let spec = EPS * 0.01;
		return (ua >= -spec && ua <= 1+spec && ub >= -spec && ub <= 1+spec);
	},
	linePolygon(line: Line, poly: Polygon): boolean {
		let aabb = polygonAABB(poly);
		if (Intersect.boxLine(aabb, line)) {
			for (let i = 0; i < poly.vertices.length; i++) {
				let v1 = sum(poly, poly.vertices[i]);
				let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
				let edge = Line(v1, v2);
				if (Intersect.lineLine(line, edge)) return true;
			}
			return Intersect.ptPolygon(line, poly);
		}
		else return false;
	},
	polygonPolygon(a: Polygon, b: Polygon): boolean {
		let aBound = polygonAABB(a);
		let bBound = polygonAABB(b);
		if (Intersect.boxBox(aBound, bBound)) {
			for (let i = 0; i < a.vertices.length; i++) {
				let v1 = sum(a, a.vertices[i]);
				let v2 = sum(a, a.vertices[(i + 1) % a.vertices.length]);
				let edge = Line(v1, v2);
				if (Intersect.linePolygon(edge, b)) return true;
			}
			return Intersect.ptPolygon(b, a) || Intersect.ptPolygon(a, b);
		}
		else return false;
	}
};
export function resolve(a: Collider<Shape>, b: Collider<Shape>): Resolution {
	return Resolve.shapeShape(a, b);
}
export const Resolve = {
	shapeShape(a: Collider<Shape>, b: Collider<Shape>): Resolution {
		if (b.type === POINT) return Resolve.shapePt(a, b);
		else if (b.type === ARC) return Resolve.shapeArc(a, b);
		else if (b.type === CIRCLE) return Resolve.shapeCircle(a, b);
		else if (b.type === BOX) return Resolve.shapeBox(a, b);
		else if (b.type === LINE) return Resolve.shapeLine(a, b);
		else if (b.type === POLYGON) return Resolve.shapePolygon(a, b);
		else never(b);
	},
	shapePt(shape: Collider<Shape>, pt: Collider<Point>): Resolution {
		if (shape.type === POINT) return Resolve.ptPt(shape, pt);
		else if (shape.type === ARC) return reverse(Resolve.ptArc(pt, shape));
		else if (shape.type === CIRCLE) return reverse(Resolve.ptCircle(pt, shape));
		else if (shape.type === BOX) return reverse(Resolve.ptBox(pt, shape));
		else if (shape.type === LINE) return reverse(Resolve.ptLine(pt, shape));
		else if (shape.type === POLYGON) return reverse(Resolve.ptPolygon(pt, shape));
		else never(shape);
	},
	shapeArc(shape: Collider<Shape>, arc: Collider<Arc>): Resolution {
		if (shape.type === POINT) return Resolve.ptArc(shape, arc);
		else if (shape.type === ARC) return Resolve.arcArc(shape, arc);
		else if (shape.type === CIRCLE) return reverse(Resolve.arcCircle(arc, shape));
		else if (shape.type === BOX) return reverse(Resolve.arcBox(arc, shape));
		else if (shape.type === LINE) return reverse(Resolve.arcLine(arc, shape));
		else if (shape.type === POLYGON) return reverse(Resolve.arcPolygon(arc, shape));
		else never(shape);
	},
	shapeCircle(shape: Collider<Shape>, circle: Collider<Circle>): Resolution {
		if (shape.type === POINT) return Resolve.ptCircle(shape, circle);
		else if (shape.type === ARC) return Resolve.arcCircle(shape, circle);
		else if (shape.type === CIRCLE) return Resolve.circleCircle(shape, circle);
		else if (shape.type === BOX) return reverse(Resolve.circleBox(circle, shape));
		else if (shape.type === LINE) return reverse(Resolve.circleLine(circle, shape));
		else if (shape.type === POLYGON) return reverse(Resolve.circlePolygon(circle, shape));
		else never(shape);
	},
	shapeBox(shape: Collider<Shape>, box: Collider<Box>): Resolution {
		if (shape.type === POINT) return Resolve.ptBox(shape, box);
		else if (shape.type === ARC) return Resolve.arcBox(shape, box);
		else if (shape.type === CIRCLE) return Resolve.circleBox(shape, box);
		else if (shape.type === BOX) return Resolve.boxBox(shape, box);
		else if (shape.type === LINE) return reverse(Resolve.boxLine(box, shape));
		else if (shape.type === POLYGON) return reverse(Resolve.boxPolygon(box, shape));
		else never(shape);
	},
	shapeLine(shape: Collider<Shape>, line: Collider<Line>): Resolution {
		if (shape.type === POINT) return Resolve.ptLine(shape, line);
		else if (shape.type === ARC) return Resolve.arcLine(shape, line);
		else if (shape.type === CIRCLE) return Resolve.circleLine(shape, line);
		else if (shape.type === BOX) return Resolve.boxLine(shape, line);
		else if (shape.type === LINE) return Resolve.lineLine(shape, line);
		else if (shape.type === POLYGON) return reverse(Resolve.linePolygon(line, shape));
		else never(shape);
	},
	shapePolygon(shape: Collider<Shape>, poly: Collider<Polygon>): Resolution {
		if (shape.type === POINT) return Resolve.ptPolygon(shape, poly);
		else if (shape.type === ARC) return Resolve.arcPolygon(shape, poly);
		else if (shape.type === CIRCLE) return Resolve.circlePolygon(shape, poly);
		else if (shape.type === BOX) return Resolve.boxPolygon(shape, poly);
		else if (shape.type === LINE) return Resolve.linePolygon(shape, poly);
		else if (shape.type === POLYGON) return Resolve.polygonPolygon(shape, poly);
		else never(shape);
	},
	ptPt(_a: Collider<Point>, _b: Collider<Point>): Resolution {
		return ZERO();
	},
	ptArc(_pt: Collider<Point>, _arc: Collider<Arc>): Resolution {
		return ZERO();
	},
	ptCircle(pt: Collider<Point>, circle: Collider<Circle>): Resolution {
		let difference = diff(pt, circle);
		let distance = mag(difference);
		let proj = scale(difference, circle.radius/distance);
		return diff(proj, pt);
	},
	ptBox(pt: Collider<Point>, box: Collider<Box>): Resolution {
		let xInBox = pt.x - box.x;
		let yInBox = pt.y - box.y;
		let diagSlope = box.height / box.width;

		let testBLtoTR = yInBox - (diagSlope * xInBox);
		let inTopLeftHalf = testBLtoTR > 0;
		let inBottomRightHalf = testBLtoTR < 0;

		let testTLtoBR = yInBox - (box.height - diagSlope * xInBox);
		let inTopRightHalf = testTLtoBR > 0;
		let inBottomLeftHalf = testTLtoBR < 0;

		// in top triangle
		if (inTopLeftHalf && inTopRightHalf) {
			return {x: 0, y: box.height - yInBox};
		}
		// in bottom triangle
		if (inBottomLeftHalf && inBottomRightHalf) {
			return {x: 0, y: -yInBox};
		}
		// in left triangle
		if (inTopLeftHalf && inBottomLeftHalf) {
			return {x: -xInBox, y: 0};
		}
		// in right triangle
		if (inTopRightHalf && inBottomRightHalf) {
			return {x: box.width - xInBox, y: 0};
		}

		// center of box case
		if (!(inTopLeftHalf || inTopRightHalf || inBottomLeftHalf || inBottomRightHalf)) {
			return {x: 0, y: 0};
		}

		// landed directly on a diagonal somewhere
		return {
			x: (inTopRightHalf || inBottomRightHalf ? box.width : 0) - xInBox,
			y: (inTopLeftHalf || inTopRightHalf ? box.height : 0) - yInBox
		}
	},
	ptLine(_pt: Collider<Point>, _line: Collider<Line>): Resolution {
		return ZERO();
	},
	ptPolygon(pt: Collider<Point>, poly: Collider<Polygon>): Resolution {
		let minVert;
		let minVertDist = Infinity;

		let minEdgeProjection;
		let minEdgeDist = Infinity;

		for (let i = 0; i < poly.vertices.length; i++) {
			let v1 = sum(poly, poly.vertices[i]);
			let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
			let edge = Line(v1, v2);
			let target = project(pt, edge);

			// record edge distance if point projects onto the line, to find the closest
			if (Intersect.ptLine(target, edge)) {
				let edgeDist = dist(target, pt);
				if (edgeDist < minEdgeDist) {
					minEdgeProjection = target;
					minEdgeDist = edgeDist;
				}
			}

			// record distance from vertex to find the closest
			let vertDist = dist(v1, pt);
			if (vertDist < minVertDist) {
				minVert = v1;
				minVertDist = vertDist;
			}
		}

		// move out to closest edge if one is found
		if (minEdgeProjection) {
			return diff(minEdgeProjection, pt);
		}
		// point may have been on a diagonal, try moving to a vertex
		else if (minVert) {
			return diff(minVert, pt);
		}
		// assumed to be in the dead center of the polygon
		else return ZERO();
	},
	arcArc(a: Collider<Arc>, b: Collider<Arc>): Resolution {
		if (arcPassCheck(a, b) || arcPassCheck(b, a)) {
			let d = diff(b, a);
			let angleFromA = Math.atan2(d.y, d.x);
			let angleFromB = Math.atan2(-d.y, -d.x);
			if (Angle.withinArc(angleFromA, a) && Angle.withinArc(angleFromB, b))
				return Resolve.circleCircle(a as unknown as Collider<Circle>, b as unknown as Collider<Circle>);
			else
				throw new Error("Unimplemented case! I haven't figured this out yet!")
		}
		else return false;
	},
	arcCircle(arc: Collider<Arc>, circle: Collider<Circle>): Resolution {
		if (!arcPassCheck(arc, circle)) return false;
		let d = diff(circle, arc);
		let angle = Math.atan2(d.y, d.x);
		if (Angle.withinArc(angle, arc)) {
			return Resolve.circleCircle(arc as unknown as Collider<Circle>, circle);
		}
		else {
			// try with arc endpoints
			let start = Angle.position(arc.start, arc.radius);
			let end = Angle.position(arc.end, arc.radius);
			let startDist = diff(circle, start);
			let endDist = diff(circle, end);
			if (startDist !== endDist) {
				let target = startDist < endDist? start : end;
				let difference = diff(target, circle);
				let distance = mag(difference);
				let proj = scale(difference, circle.radius/distance);
				return diff(proj, target);
			}
			else {
				// weird even case
				let midAngle = arc.start + (arc.start - arc.end)/2;
				let unitPos = Angle.position(midAngle);
				let bisector = Line(circle.x, circle.y, unitPos.x, unitPos.y);
				let crossing = project(start, bisector);
				let arcCenter = sum(arc, Angle.position(midAngle, arc.radius));
				let almostAtChordMid = scale(crossing, circle.radius / mag(crossing));
				let smidge = diff(arcCenter, crossing);
				let chordMid = diff(almostAtChordMid, smidge);
				return chordMid;
			}
		}
	},
	arcBox(arc: Collider<Arc>, box: Collider<Box>): Resolution {
		return Resolve.arcPolygon(arc, boxAsPolygon(box));
	},
	arcLine(arc: Collider<Arc>, line: Collider<Line>): Resolution {
		if (arcPassCheck(arc, line) || lineSidePassCheck(line, arc)) {
			// project arc center onto line
			let ppt = project(arc, line);
			let difference = diff(ppt, arc);

			// if the arc faces the line, resolve with simple circle-line collision
			let angleToProjection = Math.atan2(difference.y, difference.x);
			if (Angle.withinArc(angleToProjection, arc)) {
				return Resolve.circleLine(arc as unknown as Collider<Circle>, line);
			}

			// continue to find the intersection points
			// let diffNormal = {x: -difference.y, y: difference.x};
			// let d = mag(difference);
			// let height;
			// if (d === 0) {
			// 	let segment = {x: line.dx, y: line.dy};
			// 	height = scale(segment, arc.radius / mag(segment));
			// }
			// else {
			// 	let sinTheta = Math.sqrt(arc.radius*arc.radius - d*d) / arc.radius;
			// 	height = scale(diffNormal, arc.radius*sinTheta/d);
			// }
			// let p1 = sum(ppt, height);
			// let p1Hits = Intersect.ptArc(p1, arc) && Intersect.ptLine(p1, line);
			// let p2 = diff(ppt, height);
			// let p2Hits = Intersect.ptArc(p2, arc) && Intersect.ptLine(p2, line);

			// if two intersections
			// if (p1Hits && p2Hits) {
				// get furthest distance inward of an arc endpoint and push it out
				// project the ends against the normal
				let lineNormal = {x: line.x, y: line.y, dx: -line.dy, dy: line.dx};
				let dist1 = dist(lineNormal, project(Angle.position(arc.start, arc.radius), lineNormal));
				let dist2 = dist(lineNormal, project(Angle.position(arc.end, arc.radius), lineNormal));
				// furthest dist
				let overlap = Math.min(dist1, dist2);
				return scale(lineNormal, overlap / mag(lineNormal));
			// }
		}
		return false;
	},
	arcPolygon(arc: Collider<Arc>, poly: Collider<Polygon>): Resolution {
		if (arcPassCheck(arc, poly)) {
			// setup flags and storage to check if endpoints should trigger
			let start = Angle.position(arc.start, arc.radius);
			let end = Angle.position(arc.end, arc.radius);
			let startCollides = Intersect.ptPolygon(start, poly);
			let endCollides = Intersect.ptPolygon(end, poly);
			let startMinDist = Infinity, starttarget = null;
			let endMinDist = Infinity, endtarget = null;
			
			let correction = {x: 0, y: 0};
			let hits = 0;
			
			let mid = polygonCenter(poly);
			for (let i = 0; i < poly.vertices.length; i++) {
				let pt = sum(poly, poly.vertices[i]);
				// use diagonal collision
				let diag = Line(mid, pt);
				if (Intersect.arcLine(arc, diag)) {
					// let target = project(pt, line);
					let targetDiff = diff(arc, pt);
					let target = scale(targetDiff, arc.radius/mag(targetDiff));
					correction = sum(correction, diff(target, pt));
					hits++;
				}
				// check endpoint collision
				let pt2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
				let edge = Line(pt, pt2);
				if (startCollides) {
					let target = project(start, edge);
					let distance = dist(start, target);
					if (distance < startMinDist) {
						starttarget = target;
						startMinDist = distance;
					}
				}
				if (endCollides) {
					let target = project(end, edge);
					let distance = dist(end, target);
					if (distance < endMinDist) {
						endtarget = target;
						endMinDist = distance;
					}
				}
			}
			// finish endpoint checks
			if (starttarget) {
				correction = sum(correction, diff(start, starttarget));
				hits++;
			}
			if (endtarget) {
				correction = sum(correction, diff(end, endtarget));
				hits++;
			}

			if (hits > 0) {
				return scale(correction, -1);
			}
		}
		else return false;
	},
	circleCircle(a: Collider<Circle>, b: Collider<Circle>): Resolution {
		let distance = dist(a, b);
		let overlap = a.radius + b.radius - distance;
		let push = scale(diff(a, b), overlap / distance);
		return push;
	},
	circleBox(circle: Collider<Circle>, box: Collider<Box>): Resolution {
		// y axis projection check
		if (circle.y >= box.y && circle.y <= box.y + box.height) {
			let boxmid = box.x + box.width/2;
			let spacing = circle.radius + box.width/2;
			let overlap = 0;
			if (circle.x < boxmid) {
				overlap = spacing - Math.abs(boxmid - circle.x);
			}
			else if (circle.x > boxmid) {
				overlap = Math.abs(boxmid - circle.x) - spacing;
			}
			let push = {x: -overlap, y: 0};
			return push;
		}
		// x axis projection check
		else if (circle.x >= box.x && circle.x <= box.x + box.width) {
			let boxmid = box.y + box.height/2;
			let spacing = circle.radius + box.height/2;
			let overlap = 0;
			if (circle.y < boxmid) {
				overlap = spacing - Math.abs(boxmid - circle.y);
			}
			else if (circle.y > boxmid) {
				overlap = Math.abs(boxmid - circle.y) - spacing;
			}
			let push = {x: 0, y: -overlap};
			return push;
		}
		// corner checks
		else {
			let corner;
			if (circle.x < box.x && circle.y < box.y)
				corner = {x: box.x, y: box.y};
			else if (circle.x < box.x && circle.y > box.y + box.height)
				corner = {x: box.x, y: box.y + box.height};
			else if (circle.x > box.x + box.width && circle.y < box.y)
				corner = {x: box.x + box.width, y: box.y};
			else if (circle.x > box.x + box.width && circle.y > box.y + box.height)
				corner = {x: box.x + box.width, y: box.y + box.height};
			
			corner.radius = 0;
			return Resolve.circleCircle(circle, corner);
		}
	},
	circleLine(circle: Collider<Circle>, line: Collider<Line>, skipCheck?): Resolution {
		if (skipCheck || lineSidePassCheck(line, circle)) {
			let target = project(circle, line);
			let [u, v] = lineEnds(line);
			if (!Intersect.ptLine(target, line)) {
				if (Intersect.ptCircle(u, circle)) target = u;
				else if (Intersect.ptCircle(v, circle)) target = v;
			}
			(target as Circle).radius = 0;
			return Resolve.circleCircle(circle, target as Collider<Circle>);
		}
		else return false;
	},
	circlePolygon(circle: Collider<Circle>, poly: Collider<Polygon>): Resolution {
		let minVert;
		let minVertDist = Infinity;

		for (let i = 0; i < poly.vertices.length; i++) {
			let v1 = sum(poly, poly.vertices[i]);
			let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
			let edge = Line(v1, v2);

			// if collided with an edge
			if (Intersect.circleLine(circle, edge)) {
				let target = project(circle, edge);

				// collide with the line if the circle center projects onto the line
				if (Intersect.ptLine(target, edge)) {
					return Resolve.circleLine(circle, edge as Collider<Line>, true);
				}

				// record distance from vertex to find the closest
				let vertDist = dist(v1, circle);
				if (vertDist < minVertDist) {
					minVert = v1;
					minVertDist = vertDist;
				}
			}
		}

		// since the center did not project onto any edges, this is a vertex collision
		if (minVert) {
			minVert.radius = 0;
			return Resolve.circleCircle(circle, minVert);
		}
	},
	boxBox(a: Collider<Box>, b: Collider<Box>): Resolution {
		let correctionA = {x: 0, y: 0};
		let solved = false;

		// overlap of each side of b
		let overlapL = a.x + a.width - b.x;
		let overlapR = b.x + b.width - a.x;
		let overlapB = a.y + a.height - b.y;
		let overlapT = b.y + b.height - a.y;

		// for each side of b, check if crossed over this time step
		// left side
		if (a.x + a.width > b.x && a.lastX + a.width < b.lastX) {
			correctionA.x = -overlapL;
			solved = true;
		}
		// right side
		else if (a.x < b.x + b.width && a.lastX > b.lastX + b.width) {
			correctionA.x = overlapR;
			solved = true;
		}
		// bottom side
		if (a.y + a.height > b.y && a.lastY + a.height < b.lastY) {
			correctionA.y = -overlapB;
			solved = true;
		}
		// top side
		else if (a.y < b.y + b.height && a.lastY > b.lastY + b.height) {
			correctionA.y = overlapT;
			solved = true;
		}
		
		if (!solved) {
			// solve based on smallest overlap
			let overlapX = Math.min(overlapL, overlapR);
			let overlapY = Math.min(overlapB, overlapT);
			if (overlapX <= overlapY) correctionA.x = overlapX * (a.x < b.x? -1 : 1);
			if (overlapY <= overlapX) correctionA.y = overlapY * (a.y < b.y? -1 : 1);
		}

		return correctionA;
	},
	boxLine(box: Collider<Box>, line: Collider<Line>): Resolution {
		if (lineSidePassCheck(line, box)) {
			let overlap = {x: 0, y: 0};
			let oDist = 0;

			// first, check box corners
			let corners = [
				{radius: EPS, x: box.x, y: box.y},
				{radius: EPS, x: box.x + box.width, y: box.y},
				{radius: EPS, x: box.x + box.width, y: box.y + box.height},
				{radius: EPS, x: box.x, y: box.y + box.height}
			];
			let hit = false;
			let normal = {x: -line.dy, y: line.dx};
			for (let i = 0; i < corners.length; i++) {
				let corner = corners[i];
				let target = project(corner, line);
				let aligned = Intersect.ptLine(target, line);
				let pastLine = dot(diff(corner, line), normal) <= 0;
				if (aligned && pastLine || Intersect.circleLine(corner, line)) {
					let distance = dist(corner, target);
					if (distance >= oDist) {
						overlap = diff(target, corner);
						oDist = distance;
						hit = true;
					}
				}
			}
			// TODO: ignore endpoint if gravity exists, and the endpoint is the furthest in the direction of gravity (or both if tied)
			if (!hit) {
				// otherwise, project the segment end that is closest to the center
				// outward to the closest side
				let mid = {x: box.x + box.width/2, y: box.y + box.height/2};
				let sides = [
					{x: box.x, y: box.y, dx: box.width, dy: 0},
					{x: box.x, y: box.y, dx: 0, dy: box.height},
					{x: box.x, y: box.y + box.height, dx: box.width, dy: 0},
					{x: box.x + box.width, y: box.y, dx: 0, dy: box.height}
				];
				let [u, v] = lineEnds(line);
				let end = u;
				if (dist(v, mid) < dist(u, mid)) {
					end = v;
				}
				let minDist = Infinity;
				for (let i = 0; i < sides.length; i++) {
					let target = project(end, sides[i]);
					let distance = dist(end, target);
					if (distance < minDist) {
						overlap = diff(end, target);
						minDist = distance;
					}
				}
			}
			return overlap;
		}
		else return false;
	},
	boxPolygon(box: Collider<Box>, poly: Collider<Polygon>): Resolution {
		// just turn the box into a polygon and let that handle it
		return Resolve.polygonPolygon(boxAsPolygon(box), poly);
	},
	lineLine(a: Collider<Line>, b: Collider<Line>): Resolution {
		if (lineSidePassCheck(a, b) || lineSidePassCheck(b, a)) {
			// find intersection point
			let ma = a.dy / a.dx;
			let mb = b.dy / b.dx;
			let intersect = {} as Point;
			if (ma === Infinity) {
				if (mb === Infinity) return false;
				else {
					intersect.x = a.x;
					intersect.y = mb * (intersect.x - b.x) + b.y;
				}
			}
			else if (mb === Infinity) {
				intersect.x = b.x;
				intersect.y = ma * (intersect.x - a.x) + a.y;
			}
			else {
				intersect.x = (b.y - a.y + a.x*ma - b.x*mb) / (ma - mb);
				intersect.y = ma * (intersect.x - a.x) + a.y;
			}

			// find the closest endpoint on each line
			let a1 = {x: a.x, y: a.y};
			let a2 = {x: a.x + a.dx, y: a.y + a.dy};
			let distA1 = dist(a1, intersect);
			let distA2 = dist(a2, intersect);
			let ptA = intersect;
			if (distA1 < distA2) ptA = a1;
			else if (distA2 < distA1) ptA = a2;
			let b1 = {x: b.x, y: b.y};
			let b2 = {x: b.x + b.dx, y: b.y + b.dy};
			let distB1 = dist(b1, intersect);
			let distB2 = dist(b2, intersect);
			let ptB = intersect;
			if (distB1 < distB2) ptB = b1;
			else if (distB2 < distB1) ptB = b2;

			// calculate the offset required to resolve collision, from the perspective of both lines
			let projA = project(ptA, b);
			let correctionA = diff(projA, ptA);
			let projB = project(ptB, a);
			let correctionB = diff(projB, ptB);
			
			// choose the smallest of the two corrections
			let trueCorrection = correctionA;
			if (Math.sqrt((correctionB.x*correctionB.x) + (correctionB.y*correctionB.y)) < Math.sqrt((correctionA.x*correctionA.x) + (correctionA.y*correctionA.y))) {
				trueCorrection = {
					x: -correctionB.x,
					y: -correctionB.y
				};
			}

			return trueCorrection;
		}
		else return false;
	},
	linePolygon(line: Collider<Line>, poly: Collider<Polygon>): Resolution {
		if (lineSidePassCheck(line, poly)) {
			// setup flags and storage to check if endpoints should trigger
			let end1 = {x: line.x, y: line.y};
			let end2 = {x: line.x + line.dx, y: line.y + line.dy};
			let end1Collides = Intersect.ptPolygon(end1, poly);
			let end2Collides = Intersect.ptPolygon(end2, poly);
			let end1MinDist = Infinity, end1target = null;
			let end2MinDist = Infinity, end2target = null;
			
			let correction = {x: 0, y: 0};
			let hits = 0;
			
			let mid = polygonCenter(poly);
			for (let i = 0; i < poly.vertices.length; i++) {
				let pt = sum(poly, poly.vertices[i]);
				// use diagonal collision
				let diag = Line(mid, pt);
				if (Intersect.lineLine(line, diag)) {
					let target = project(pt, line);
					correction = sum(correction, diff(target, pt));
					hits++;
				}
				// check endpoint collision
				let pt2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
				let edge = Line(pt, pt2);
				if (end1Collides) {
					let target = project(end1, edge);
					let distance = dist(end1, target);
					if (distance < end1MinDist) {
						end1target = target;
						end1MinDist = distance;
					}
				}
				if (end2Collides) {
					let target = project(end2, edge);
					let distance = dist(end2, target);
					if (distance < end2MinDist) {
						end2target = target;
						end2MinDist = distance;
					}
				}
			}
			// finish endpoint checks
			if (end1target) {
				correction = sum(correction, diff(end1, end1target));
				hits++;
			}
			if (end2target) {
				correction = sum(correction, diff(end2, end2target));
				hits++;
			}

			if (hits > 0) {
				return scale(correction, -1);
			}
		}
		else return false;
	},
	polygonPolygon(a: Collider<Polygon>, b: Collider<Polygon>): Resolution {
		// find polygon midpoints
		let midA = polygonCenter(a);
		let midB = polygonCenter(b);
		
		// do diagonals for each
		let correction = {x: 0, y: 0};
		let hits = 0;
		for (let i = 0; i < a.vertices.length; i++) {
			let pt = sum(a, a.vertices[i]);
			let diag = Line(midA, pt);
			for (let j = 0; j < b.vertices.length; j++) {
				let end1 = sum(b, b.vertices[j]);
				let end2 = sum(b, b.vertices[(j + 1) % b.vertices.length]);
				let edge = Line(end1, end2);
				if (Intersect.lineLine(diag, edge)) {
					let target = project(pt, edge);
					correction = sum(correction, diff(target, pt));
					hits++;
				}
			}
		}
		for (let i = 0; i < b.vertices.length; i++) {
			let pt = sum(b, b.vertices[i]);
			let diag = Line(midB, pt);
			for (let j = 0; j < a.vertices.length; j++) {
				let end1 = sum(a, a.vertices[j]);
				let end2 = sum(a, a.vertices[(j + 1) % a.vertices.length]);
				let edge = Line(end1, end2);
				if (Intersect.lineLine(diag, edge)) {
					let target = project(pt, edge);
					correction = diff(correction, diff(target, pt));
					hits++;
				}
			}
		}

		if (hits > 0) {
			correction.x /= hits;
			correction.y /= hits;
			return correction;
		}
	}
};