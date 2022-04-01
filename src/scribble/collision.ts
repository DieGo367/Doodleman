import { GameObject } from "./object.js";
import { EDGE } from "./util.js";
import { diff, dist, dot, mag, project, scale, sum, unit } from "./point_math.js";
import {
	POINT, type Point,
	CIRCLE, type Circle,
	BOX, type Box,
	ARC, type Arc,
	LINE, Line,
	POLYGON, type Polygon,
	left, right, top, bottom, center,
	polygonCenter, polygonAABB
} from "./shape.js";

type Vector = Point;
type Resolution = Vector | false;
type Collider<Type> = Type & {
	lastX: number;
	lastY: number;
	pushVector: Vector;
	weight: number;
}

// TODO: projection push cancel?
// TODO: chain pushing on lower levels?

export const EPS = 0.1;
export const NORMAL_FORCE_THRESH = 0.5;
export const SLOPE_THRESH = 0.8;
/**
 * Runs the entire collision detection and resolution process on a set of objects in a level.
 * @param {Object} objectMap Map of all the objects that collision should be checked for.
 * @param {Object} gravity Vector describing the x and y force of gravity.
 * @param {Object} level The data for the currently loaded level, used for its collision bounds.
 */
export function run(objectMap, gravity, level) {
	// create a map of buckets for objects of different collision weight levels
	let bucketMap = {};
	// list of the weight levels we have made buckets for
	let mapLevels = [];

	for (let id in objectMap) {
		let obj = objectMap[id];
		if (obj instanceof GameObject) {
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
			if (!obj.collisions) obj.collisions = {};
			if (!obj.grounds) obj.grounds = {};
		}
	}

	let processedShapes = [];
	// sort the weight levels in ascending order
	mapLevels.sort();
	for (let i = 0; i < mapLevels.length; i++) {
		let level = mapLevels[i];
		let bucket = bucketMap[level];
		// for each shape in the current bucket
		for (let j = 0; j < bucket.length; j++) {
			let shape = bucket[j];
			// collide with shapes from lower collision levels
			for (let k = 0; k < processedShapes.length; k++) {
				collisionCheck(shape, processedShapes[k], gravity);
			}
			// collide with shapes from the same collision level (same bucket)
			if (level !== Infinity) for (let k = j+1; k < bucket.length; k++) {
				collisionCheck(shape, bucket[k], gravity);
			}
		}
		// add the shapes from this bucket to the processed shapes list
		processedShapes = processedShapes.concat(bucket);
		// for all processed shapes, resolve the current push vector
		for (let j = 0; j < processedShapes.length; j++) {
			let shape = processedShapes[j];
			if (shape.pushVector.count === 0) continue;
			shape.owner.x += shape.pushVector.x;
			shape.owner.y += shape.pushVector.y;
			shape.x += shape.pushVector.x / shape.pushVector.count;
			shape.y += shape.pushVector.y / shape.pushVector.count;
			shape.pushVector = {x: 0, y: 0, count: 0};
		}
	}
	
	// resolve each shape's other variables
	for (let i = 0; i < processedShapes.length; i++) {
		let shape = processedShapes[i];
		levelBoundCheck(shape, level, gravity);
		shape.owner.collided = shape.hit;
		shape.owner.isGrounded = shape.feltNormalForce;
		shape.owner.collisions = shape.collisions;
		shape.owner.grounds = shape.grounds;
		if (shape.feltNormalForce) {
			// TODO move this to once per owner, not once for each shape collider
			let gravityLine = {x: 0, y: 0, dx: gravity.x, dy: gravity.y};
			let proj = project({x: shape.owner.velX, y: shape.owner.velY}, gravityLine);
			shape.owner.velX -= proj.x;
			shape.owner.velY -= proj.y;
		}
	}
}
/**
 * Get the collider of a Scribble Object, for testing collisions with other colliders.
 * @param {GameObject} obj 
 * @returns {Collider} A collider object that is ready for collision tests.
 */
export function getCollider(obj) {
	// make a copy of the collider shape, with helper structures for the collision process
	let shape: any = {
		owner: obj,
		hit: false,
		pushVector: {x: 0, y: 0, count: 0},
		feltNormalForce: false,
		collisions: {},
		grounds: {}
	};
	Object.assign(shape, obj.collision);
	shape.lastX = shape.x + (obj.lastX == null? obj.x : obj.lastX);
	shape.lastY = shape.y + (obj.lastY == null? obj.y : obj.lastY);
	shape.x += obj.x;
	shape.y += obj.y;
	return shape;
}
/**
 * Tests whether two objects intersect. Must have coordinates and a "collision" object.
 */
export function intersect(a, b) {
	let shapeA = getCollider(a);
	let shapeB = getCollider(b);
	let func = intersectFuncMap[shapeA.type][shapeB.type];
	if (typeof func === "function") return func(shapeA, shapeB);
	else console.error(`Missing intersect function for collision of ${shapeA.type} with ${shapeB.type}`);
}
// the entire collision check process, including detection, push vector creation, and ground detection
export function collisionCheck(a, b, gravity) {
	if (a.weight === Infinity && b.weight === Infinity) return;
	if (typeof a.type != "string" || typeof b.type != "string") return console.warn("Expected a string collision type.");
	// discreteCollision(a, b, gravity);
	continuousCollision(a, b, gravity);
}
export function discreteCollision(a, b, gravity) {
	let intersect = intersectFuncMap[a.type][b.type];
	let resolve = resolveFuncMap[a.type][b.type];
	if (intersect(a, b)) {
		let push = resolve(a, b);
		if (push) {
			a.hit = true;
			b.hit = true;
			a.collisions[b.owner.id] = true;
			b.collisions[a.owner.id] = true;
			let resolution = resolvePush(a, b, push);
			collisionBasedGrounding(a, b, resolution, gravity);
		}
		else if (push === false) {
			a.collisions[b.owner.id] = false;
			b.collisions[a.owner.id] = false;
		}
		else console.error("No proper resolution given!");
	}
}
export function continuousCollision(a, b, gravity) {
	// if collided last frame, just use discrete collision
	if (a.owner.collisions[b.owner.id] || b.owner.collisions[a.owner.id]) {
		discreteCollision(a, b, gravity);
	}
	else if (sweepCheck(a, b)) {
		let resolution;
		resolution = bisectionMethod(a, b);
		if (resolution) {
			a.hit = true;
			b.hit = true;
			a.collisions[b.owner.id] = true;
			b.collisions[a.owner.id] = true;
			collisionBasedGrounding(a, b, resolution, gravity);
		}
		else if (resolution === false) {
			a.collisions[b.owner.id] = false;
			b.collisions[a.owner.id] = false;
		}
		else if (resolution != null) console.error("No proper resolution given!");
	}
}
export function sweepCheck(a, b) {
	// motion check
	let ax = a.x - a.lastX;
	let ay = a.y - a.lastY;
	let bx = b.x - b.lastX;
	let by = b.y - b.lastY;
	let motion = {x: ax - bx, y: ay - by};
	if (motion.x === 0 && motion.y === 0) return intersectFuncMap[a.type][b.type](a, b);
	// actual sweep check
	let shapesA = getSweepingShapes(a);
	let shapesB = getSweepingShapes(b);
	for (let i = 0; i < shapesA.length; i++) {
		let shapeA = shapesA[i];
		for (let j = 0; j < shapesB.length; j++) {
			let shapeB = shapesB[j];
			let intersect = intersectFuncMap[shapeA.type][shapeB.type];
			if (intersect(shapeA, shapeB)) return true;
		}
	}
	return false;
}
export function getSweepingShapes(shape) {
	if (shape.sweepingShapes) return shape.sweepingShapes;
	let dx = shape.x - shape.lastX;
	let dy = shape.y - shape.lastY;
	if (shape.type === BOX) {
		return shape.sweepingShapes = [
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
		return shape.sweepingShapes = [
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
		return shape.sweepingShapes = [
			// current and last
			{type: LINE, x: shape.x, y: shape.y, dx: shape.dx, dy: shape.dy},
			{type: LINE, x: shape.lastX, y: shape.lastY, dx: shape.dx, dy: shape.dy},
			// lines from last to current endpoints
			{type: LINE, x: shape.lastX, y: shape.lastY, dx: dx, dy: dy},
			{type: LINE, x: shape.lastX + shape.dx, y: shape.lastY + shape.dy, dx: dx, dy: dy},
		];
	}
	else if (shape.type === POLYGON) {
		shape.sweepingShapes = [
			// current and last
			{type: POLYGON, x: shape.x, y: shape.y, vertices: shape.vertices.slice()},
			{type: POLYGON, x: shape.lastX, y: shape.lastY, vertices: shape.vertices.slice()}
		];
		// lines from last to current vertices
		for (let i = 0; i < shape.vertices.length; i++) {
			let pt = shape.vertices[i];
			shape.sweepingShapes.push({
				type: LINE, x: shape.lastX + pt.x, y: shape.lastY + pt.y, dx: dx, dy: dy
			});
		}
		return shape.sweepingShapes;
	}
	else console.error("Unknown shape type: " + shape.type);
}
export function bisectionMethod(a, b) {
	let intersect = intersectFuncMap[a.type][b.type];
	let resolve = resolveFuncMap[a.type][b.type];
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
	let collisionScalar = null;
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
	if (!pushbackA) return pushbackA;
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
export function resolvePush(a, b, force) {
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
export function reverseResolution(resol: Resolution) {
	if (resol) return scale(resol, -1);
	else return resol;
}
export function collisionBasedGrounding(a, b, resolution, gravity) {
	if (gravity.x === 0 && gravity.y === 0) return;
	if (shapeGroundedOn(resolution.a, resolution.b, gravity)) {
		a.grounds[b.owner.id] = true;
		a.feltNormalForce = true;
	}
	if (shapeGroundedOn(resolution.b, resolution.a, gravity)) {
		b.grounds[a.owner.id] = true;
		b.feltNormalForce = true;
	}
}
export function shapeGroundedOn(a, b, gravity) {
	let bottoms = getShapeBottoms(a, gravity);
	let tops = getShapeTops(b, gravity);
	for (let i = 0; i < bottoms.length; i++) {
		let bottom = bottoms[i];
		for (let j = 0; j < tops.length; j++) {
			let top = tops[j];
			try {
				if (intersectFuncMap[bottom.type][top.type](bottom, top)) return true;
				else if (a.owner.grounds[b.owner.id] && b.type === LINE) return true;
			}
			catch(e) {
				console.log(bottom, top, e);
			}
		}
	}
	return false;
}
export function getShapeBottoms(shape, gravity) {
	if (shape.type === BOX) {
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
			let edge: any = Line(v1, v2);
			edge.type = LINE;
			let normal = {x: -edge.dy, y: edge.dx};
			if (dot(normal, gravity) > 0) {
				let dp = dot(unit({x: edge.dx, y: edge.dy}), unit(gravity));
				if (Math.abs(dp) <= SLOPE_THRESH) bottoms.push(edge);
			}
		}
		return bottoms;
	}
	else console.error("Unknown shape type: " + shape.type);
}
export function getShapeTops(shape, gravity) {
	if (shape.type === BOX) {
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
			let edge: any = Line(v1, v2);
			edge.type = LINE;
			let normal = {x: -edge.dy, y: edge.dx};
			if (dot(normal, gravity) < 0) {
				let dp = dot(unit({x: edge.dx, y: edge.dy}), unit(gravity));
				if (Math.abs(dp) <= SLOPE_THRESH) tops.push(edge);
			}
		}
		return tops;
	}
	else console.error("Unknown shape type: " + shape.type);
}

export const intersectFuncMap = {
	point: {
		point: (a, b) => Intersect.ptPt(a, b),
		arc: (pt, arc) => Intersect.ptArc(pt, arc),
		circle: (pt, circle) => Intersect.ptCircle(pt, circle),
		box: (pt, box) => Intersect.ptBox(pt, box),
		line: (pt, line) => Intersect.ptLine(pt, line),
		polygon: (pt, poly) => Intersect.ptPolygon(pt, poly)
	},
	arc: {
		point: (arc, pt) => Intersect.ptArc(pt, arc),
		arc: (a, b) => Intersect.arcArc(a, b),
		circle: (arc, circle) => Intersect.arcCircle(arc, circle),
		box: (arc, box) => Intersect.arcBox(arc, box),
		line: (arc, line) => Intersect.arcLine(arc, line),
		polygon: (arc, poly) => Intersect.arcPolygon(arc, poly)
	},
	circle: {
		point: (circle, pt) => Intersect.ptCircle(pt, circle),
		arc: (circle, arc) => Intersect.arcCircle(arc, circle),
		circle: (a, b) => Intersect.circleCircle(a, b),
		box: (circle, box) => Intersect.circleBox(circle, box),
		line: (circle, line) => Intersect.circleLine(circle, line),
		polygon: (circle, poly) => Intersect.circlePolygon(circle, poly)
	},
	box: {
		point: (box, pt) => Intersect.ptBox(pt, box),
		arc: (box, arc) => Intersect.arcBox(arc, box),
		circle: (box, circle) => Intersect.circleBox(circle, box),
		box: (a, b) => Intersect.boxBox(a, b),
		line: (box, line) => Intersect.boxLine(box, line),
		polygon: (box, poly) => Intersect.boxPolygon(box, poly)
	},
	line: {
		point: (line, pt) => Intersect.ptLine(pt, line),
		arc: (line, arc) => Intersect.arcLine(arc, line),
		circle: (line, circle) => Intersect.circleLine(circle, line),
		box: (line, box) => Intersect.boxLine(box, line),
		line: (a, b) => Intersect.lineLine(a, b),
		polygon: (line, poly) => Intersect.linePolygon(line, poly)
	},
	polygon: {
		point: (poly, pt) => Intersect.ptPolygon(pt, poly),
		arc: (poly, arc) => Intersect.arcPolygon(arc, poly),
		circle: (poly, circle) => Intersect.circlePolygon(circle, poly),
		box: (poly, box) => Intersect.boxPolygon(box, poly),
		line: (poly, line) => Intersect.linePolygon(line, poly),
		polygon: (a, b) => Intersect.polygonPolygon(a, b)
	}
};
export const resolveFuncMap = {
	circle: {
		circle: (a, b) => Resolve.circleCircle(a, b),
		box: (circle, box) => Resolve.circleBox(circle, box),
		line: (circle, line) => Resolve.circleLine(circle, line),
		polygon: (circle, poly) => Resolve.circlePolygon(circle, poly)
	},
	box: {
		circle: (box, circle) => reverseResolution(Resolve.circleBox(circle, box)),
		box: (a, b) => Resolve.boxBox(a, b),
		line: (box, line) => Resolve.boxLine(box, line),
		polygon: (box, poly) => Resolve.boxPolygon(box, poly)
	},
	line: {
		circle: (line, circle) => reverseResolution(Resolve.circleLine(circle, line)),
		box: (line, box) => reverseResolution(Resolve.boxLine(box, line)),
		line: (a, b) => Resolve.lineLine(a, b),
		polygon: (line, poly) => Resolve.linePolygon(line, poly)
	},
	polygon: {
		circle: (poly, circle) => reverseResolution(Resolve.circlePolygon(circle, poly)),
		box: (poly, box) => reverseResolution(Resolve.boxPolygon(box, poly)),
		line: (poly, line) => reverseResolution(Resolve.linePolygon(line, poly)),
		polygon: (a, b) => Resolve.polygonPolygon(a, b)
	}
};
export function levelBoundCheck(shape, level, gravity) {
	let l = left(shape);
	let r = right(shape);
	let b = bottom(shape);
	let t = top(shape);
	resolveBound(shape, 'x', l, r, -1, level.edge.left, 0, level.width, gravity);
	resolveBound(shape, 'x', r, l, 1, level.edge.right, level.width, 0, gravity);
	resolveBound(shape, 'y', b, t, -1, level.edge.bottom, 0, level.height, gravity);
	resolveBound(shape, 'y', t, b, 1, level.edge.top, level.height, 0, gravity);
}
export function resolveBound(shape, axis, shapeFront, shapeBack, direction, borderType, borderPos, warpPos, gravity) {
	if (borderType === EDGE.SOLID) {
		if (shapeFront * direction >= borderPos * direction) {
			let dp = borderPos - shapeFront;
			shape.owner[axis] += dp;
			shape.hit = true;
			// check grounding
			if (gravity.x !== 0 || gravity.y !== 0) {
				let normal = {x: 0, y: 0};
				normal[axis] = -direction;
				if (dot(normal, gravity) < 0) {
					let segment = {x: normal.y, y: -normal.x};
					let dp = dot(unit(segment), unit(gravity));
					if (Math.abs(dp) <= SLOPE_THRESH) shape.feltNormalForce = true;
				}
			}
		}
	}
	else if (borderType === EDGE.WRAP) {
		if (shapeBack * direction >= borderPos * direction) {
			let dp = warpPos - shapeFront;
			shape.owner[axis] += dp;
		}
	}
}
// small helpers
export function lineEnds(line) {
	if (line.ends) return line.ends;
	else return line.ends = [{x: line.x, y: line.y}, {x: line.x + line.dx, y: line.y + line.dy}];
}
export function lineSidePassCheck(line, shape) {
	// return result from last collision, if it exists
	let prevResult = line.owner.collisions[shape.owner.id];
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

// detection and resolution


export const Intersect = {
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
			{x: circle.x, y: circle.y, radius: circle.radius, start: 0, end:0}
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
			let ptA = sum(a, a.vertices[0]);
			let ptB = sum(b, b.vertices[0]);
			return Intersect.ptPolygon(ptB, a) || Intersect.ptPolygon(ptA, b);
		}
		else return false;
	}
};
export const Resolve = {
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
			let target: any = project(circle, line);
			let [u, v] = lineEnds(line);
			if (!Intersect.ptLine(target, line)) {
				if (Intersect.ptCircle(u, circle)) target = u;
				else if (Intersect.ptCircle(v, circle)) target = v;
			}
			target.radius = 0;
			return Resolve.circleCircle(circle, target);
		}
		else return false;
	},
	circlePolygon(circle: Collider<Circle>, poly: Collider<Polygon>): Resolution {
		let minVert;
		let minVertDist = Infinity;

		for (let i = 0; i < poly.vertices.length; i++) {
			let v1 = sum(poly, poly.vertices[i]);
			let v2 = sum(poly, poly.vertices[(i + 1) % poly.vertices.length]);
			let edge: any = Line(v1, v2);

			// if collided with an edge
			if (Intersect.circleLine(circle, edge)) {
				let target = project(circle, edge);

				// collide with the line if the circle center projects onto the line
				if (Intersect.ptLine(target, edge)) {
					return Resolve.circleLine(circle, edge, true);
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
			let corners: any[] = [
				{x: box.x, y: box.y},
				{x: box.x + box.width, y: box.y},
				{x: box.x + box.width, y: box.y + box.height},
				{x: box.x, y: box.y + box.height}
			];
			let hit = false;
			let normal = {x: -line.dy, y: line.dx};
			for (let i = 0; i < corners.length; i++) {
				let corner = corners[i];
				corner.radius = EPS;
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
		let bpoly = {
			x: box.x, y: box.y,
			lastX: box.lastX, lastY: box.lastY,
			vertices: [
				{x: 0, y: 0},
				{x: 0, y: box.height},
				{x: box.width, y: box.height},
				{x: box.width, y: 0}
			],
			pushVector: box.pushVector,
			weight: box.weight
		};
		return Resolve.polygonPolygon(bpoly, poly);
	},
	lineLine(a: Collider<Line>, b: Collider<Line>): Resolution {
		if (lineSidePassCheck(a, b) || lineSidePassCheck(b, a)) {
			// find intersection point
			let ma = a.dy / a.dx;
			let mb = b.dy / b.dx;
			let intersect: any = {};
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