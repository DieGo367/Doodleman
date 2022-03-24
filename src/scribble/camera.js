Scribble.Camera = class Camera {
	constructor(engine, x, y, width, height) {
		this.engine = engine;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.zoom = 1;
		this.snapDistance = 1;
	}
	
	right = () => this.x + this.width/2;
	left = () => this.x - this.width/2;
	top = () => this.y + this.height/2;
	bottom = () => this.y - this.height/2;
	
	getRightLimit = () => this.engine.level.width - this.width/2;
	getLeftLimit = () => 0 + this.width/2;
	getTopLimit = () => this.engine.level.height - this.height/2;
	getBottomLimit = () => 0 + this.height/2;
	
	approachValue(prop, goal, smoothing, lowerBound, upperBound) {
		let pos = Math.max(lowerBound, Math.min(this[prop], upperBound));
		if (goal != void(0)) {
			let boundedGoal = Math.max(lowerBound, Math.min(goal, upperBound));
			let diff = boundedGoal - pos;
			let step = diff / smoothing;
			if (Math.abs(diff) < this.snapDistance) this[prop] = boundedGoal;
			else this[prop] += step;
		}
	}

	approachX(goal, smoothing) {
		this.approachValue('x', goal, smoothing, this.getLeftLimit(), this.getRightLimit());
	}
	approachY(goal, smoothing) {
		this.approachValue('y', goal, smoothing, this.getBottomLimit(), this.getTopLimit());
	}
	approachPt(pt, smoothing) {
		this.approachX(pt.x, smoothing);
		this.approachY(pt.y, smoothing);
	}
	
	reset() {
		let level = this.engine.level;
		this.x = level.camStart.x;
		this.y = level.camStart.y;
		this.zoom = 1/level.zoomScale;
	}
};