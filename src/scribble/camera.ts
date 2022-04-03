import { Engine } from "./engine";
import { Point } from "./shape";

export class Camera {
	zoom = 1;
	snapDistance = 1;
	constructor(public engine: Engine, public x: number, public y: number, public width: number, public height: number) {}
	
	right(): number { return this.x + this.width/2; }
	left(): number { return this.x - this.width/2; }
	top(): number { return this.y + this.height/2; }
	bottom(): number { return this.y - this.height/2; }
	
	getRightLimit(): number { return this.engine.level.width - this.width/2; }
	getLeftLimit(): number { return 0 + this.width/2; }
	getTopLimit(): number { return this.engine.level.height - this.height/2; }
	getBottomLimit(): number { return 0 + this.height/2; }
	
	approachValue(axis: "x" | "y", goal: number, smoothing: number, lowerBound: number, upperBound: number) {
		let pos = Math.max(lowerBound, Math.min(this[axis], upperBound));
		if (goal != void(0)) {
			let boundedGoal = Math.max(lowerBound, Math.min(goal, upperBound));
			let diff = boundedGoal - pos;
			let step = diff / smoothing;
			if (Math.abs(diff) < this.snapDistance) this[axis] = boundedGoal;
			else this[axis] += step;
		}
	}

	approachX(goal: number, smoothing: number) {
		this.approachValue('x', goal, smoothing, this.getLeftLimit(), this.getRightLimit());
	}
	approachY(goal: number, smoothing: number) {
		this.approachValue('y', goal, smoothing, this.getBottomLimit(), this.getTopLimit());
	}
	approachPt(pt: Point, smoothing: number) {
		this.approachX(pt.x, smoothing);
		this.approachY(pt.y, smoothing);
	}
	
	reset() {
		let level = this.engine.level;
		this.x = level.camStart.x;
		this.y = level.camStart.y;
		this.zoom = 1/level.zoomScale;
	}
}