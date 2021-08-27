Scribble.ObjectManager = class ObjectManager {
	constructor(engine) {
		this.engine = engine;
		this.map = {};
		this.nextID = 0;
		this.actorData = {};
		this.registeredClasses = {};
		this.registerClasses(Scribble.Objects);
		this.minLayer = this.maxLayer = 0;
	}
	async loadActorData(url) {
		let data = await (await fetch(url)).json();
		for (let i = 0; i < data.length; i++) {
			let id = data[i].id;
			this.actorData[id] = data[i];
		}
	}
	add(object) {
		if (object instanceof Scribble.Object) {
			object.id = this.nextID++;
			object.objectManager = this;
			this.map[object.id] = object;
			this.minLayer = Math.min(this.minLayer, object.drawLayer);
			this.maxLayer = Math.max(this.maxLayer, object.drawLayer);
		}
		else console.error("Not a Scribble.Object!");
	}
	remove(target) {
		if (typeof target == "number") {
			delete this.map[target];
		}
		else if (target instanceof Scribble.Object) {
			delete this.map[target.id];
		}
		else console.error("Not an id or Scribble.Object!")
	}
	removeAll() {
		for (let id in this.map) {
			this.map[id].remove();
		}
		this.minLayer = this.maxLayer = 0;
	}
	start() {
		for (let id in this.map) {
			this.map[id].start(this.engine);
		}
	}
	update() {
		for (let id in this.map) {
			this.map[id].update(this.engine);
		}
	}
	finish() {
		for (let id in this.map) {
			this.map[id].finish(this.engine);
		}
	}
	renderLayer(layer) {
		this.forAll(object => {
			if (object.drawLayer === layer) object.draw(this.engine.ctx, this.engine.images, this.engine.animations);
		});
	}
	renderDebug() {
		this.forAll(object => {
			object.drawDebug(this.engine.ctx, this.engine.images, this.engine.animations);
		});
	}
	forAll(func) {
		let i = 0;
		for (let id in this.map) {
			if (this.map[id]) {
				let response = func(this.map[id], i++);
				if (response === false) break;
			}
		}
	}
	forAllOfClass(classRef, func) {
		this.forAll((obj, id) => {
			if (obj instanceof classRef) {
				return func(obj, id);
			}
		});
	}
	registerClasses(classGroup) {
		for (let name in classGroup) {
			this.registerClass(name, classGroup[name]);
		}
	}
	registerClass(className, classDecl) {
		classDecl.proto.call(classDecl.prototype);
		this.registeredClasses[className] = classDecl;
	}
};

Scribble.Object = class {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.velX = 0;
		this.velY = 0;
	}
	static proto() {
		this.drawLayer = 0;
	}
	remove() {
		this.objectManager.remove(this.id);
	}
	static onlineProperties = ["x", "y", "id", "drawLayer"];
	
	/**
	 * First update step. Runs before the main update. Animations tick here.
	 * @param {Scribble.Engine} engine 
	 */
	start(engine) {
		if (this.animation) engine.animations.tick(this.animation);
	}
	/**
	 * Handles intended object behavior this tick. Runs before collision.
	 * @param {Scribble.Engine} engine 
	 */
	update(engine) {
		if (this.feelsGravity && !this.isGrounded) {
			this.velX += engine.gravity.x;
			this.velY += engine.gravity.y;
			// TODO: do not apply additional gravity if any collision is in effect?
		}
		this.x += this.velX;
		this.y += this.velY;
	}
	/**
	 * Final update step. Runs after collision. Track necessary values for next tick.
	 * @param {Scribble.Engine} engine 
	 */
	finish(engine) {
		if (this.feelsGravity && this.isGrounded) {
			this.velX *= engine.friction;
			this.velY *= engine.friction;
			if (Math.abs(this.velX) < engine.frictionSnap) this.velX = 0;
			if (Math.abs(this.velY) < engine.frictionSnap) this.velY = 0;
		}
		this.lastX = this.x;
		this.lastY = this.y;
		this.lastVelX = this.velX;
		this.lastVelY = this.velY;
	}

	drawTint() {}
	draw(ctx, images, animations) {
		if (this.graphic) {
			let graphic = this.graphic;
			if (typeof graphic.style === "string") {
				if (graphic.style.indexOf('.') != -1) {
					images.drawOverShape(graphic.style, this.x, this.y, graphic);
				}
				else {
					ctx.fillStyle = graphic.style || "rgba(0,0,0,0)";
					Scribble.fillShape(ctx, this.x, this.y, graphic);
				}
			}
		}
		if (this.animation) {
			animations.render(ctx, this.x, this.y, this.animation);
		}
	}
	drawElements() {}
	drawUI() {}
	drawDebug(ctx) {
		ctx.fillStyle = "gray";
		ctx.globalAlpha = 0.5;
		ctx.beginPath();
		ctx.arc(this.x, this.y, 2.5, 0, 2 * Math.PI);
		ctx.fill();
		ctx.globalAlpha = 1;
		if (this.collision) {
			ctx.strokeStyle = Scribble.COLOR.DEBUG.COLLISION;
			Scribble.Collision.drawBounds(ctx, this.x, this.y, this.collision);
		}
	}
	drawHighlight() {}

	/**
	 * Updates the current animation of the object
	 * @param {Scribble.Engine} engine 
	 * @param {string} action Name of the animation to use
	 * @param {number} direction Direction to face the animation in
	 * @param {number} lockTime Time the animation should hold for without being overwritten
	 */
	animate(engine, action, direction, lockTime) {
		if (this.animation) {
			engine.animations.set(this.animation, action, direction, lockTime);
		}
	}
	/**
	 * Get data from the current animation action based on the current animation tick
	 * @param {Scribble.Engine} engine 
	 * @param {string} key Property name to access. Can be a property chain.
	 * Examples: "frame", "alpha", "position.x", "items.0.value" 
	 * @returns {*} The appropriate value from the animation file if it is found, else null.
	 */
	getFrameData(engine, key) {
		if (this.animation) return engine.animations.getFrameDataFromComponent(this.animation, key);
		else console.error("No animation object found. Can't get frame data.")
	}
};

Scribble.Objects = {};
Scribble.Objects.Box = class Box extends Scribble.Object {
	constructor(x, y, width, height, gfx) {
		super(x, y);
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animation = {
				x: width/2, y: 0,
				name: gfx
			};
		}
		else this.graphic = {
			shape: Scribble.SHAPE.BOX,
			style: gfx,
			x: 0, y: 0,
			width: width,
			height: height
		};
		this.collision = {
			type: Scribble.SHAPE.BOX,
			level: 0,
			x: 0, y: 0,
			width: width, height: height
		};
	}
};

Scribble.Objects.Line = class Line extends Scribble.Object {
	constructor(x, y, x2, y2, gfx) {
		super(x, y);
		let dx = x2 - x;
		let dy = y2 - y;
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animation = {
				x: dx/2, y: dy/2,
				name: gfx
			};
		}
		else this.graphic = {
			shape: Scribble.SHAPE.LINE,
			style: gfx,
			x: 0, y: 0,
			dx: dx, dy: dy
		};
		this.collision = {
			type: Scribble.SHAPE.LINE,
			level: 0,
			x: 0, y: 0,
			dx: dx, dy: dy
		};
	}
}

Scribble.Objects.Circle = class Circle extends Scribble.Object {
	constructor(x, y, radius, gfx) {
		super(x, y);
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animation = {
				x: x, y: y - radius,
				name: gfx
			};
		}
		else this.graphic = {
			shape: Scribble.SHAPE.CIRCLE,
			style: gfx,
			x: 0, y: 0,
			radius: radius
		};
		this.collision = {
			type: Scribble.SHAPE.CIRCLE,
			level: 0,
			x: 0, y: 0, radius: radius
		};
	}
}

Scribble.Objects.Polygon = class Polygon extends Scribble.Object {
	constructor(x, y, points, gfx) {
		super(x, y);
		let pts = points.map(pt => new Scribble.Pt(pt));
		let aabb = Scribble.Collision.polyAABB({x: 0, y: 0, points: pts});
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animation = {
				x: aabb.x + aabb.width/2, y: aabb.y,
				name: gfx
			};
		}
		else this.graphic = {
			shape: Scribble.SHAPE.POLYGON,
			style: gfx,
			x: 0, y: 0,
			points: pts
		};
		this.collision = {
			type: Scribble.SHAPE.POLYGON,
			level: 0,
			x: 0, y: 0,
			points: pts
		};
	}
}