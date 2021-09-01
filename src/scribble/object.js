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

Scribble.Entity = Scribble.Objects.Entity = class extends Scribble.Object {
	constructor(x, y) {
		super(x, y);
		this.moveSpeed = 0;
		this.moveDir = 1;
		this.lastMoveDir = 1;
		this.moved = false;
		this.actions = this.constructor.actions;
	}
	static proto() {
		super.proto();
		this.drawLayer = 1;
		this.targetMoveSpeed = 5;
		this.moveAccel = 1;
		this.jumpAccel = 10;
	}
	move(sign) {
		if (this.moved && this.moveDir != sign) {
			this.moveDir = this.lastMoveDir;
			this.moveSpeed -= this.moveAccel;
		}
		else {
			this.moveSpeed += this.moveAccel;
			if (this.moveSpeed > this.targetMoveSpeed) this.moveSpeed = this.targetMoveSpeed;
			this.moveDir += sign;
			this.moved = true;
		}
	}
	movementUpdate(engine) {
		// use movement speed
		if (!this.moved) this.moveDir = this.lastMoveDir;
		this.x += this.moveSpeed * this.moveDir;
		for (let id in this.grounds) {
			if (!this.grounds[id]) continue;
			let ground = engine.objects.map[id];
			if (ground && ground.collision.type === Scribble.SHAPE.LINE) {
				let angle = Math.atan(ground.collision.dy / ground.collision.dx);
				// engine.debug.print(angle);
				// if moving down the slope
				if (angle * this.moveDir < 0) {
					this.y -= Math.abs(angle) * (this.moveSpeed + this.velX) * 1.1;
				}
			}
		}
		this.direction = this.moveDir;
	}
	jump() {
		this.velY += this.jumpAccel;
	}
	update(engine) {
		this.movementUpdate(engine);
		this.actionsUpdate(engine);
		super.update(engine);
	}
	finish(engine) {
		if (this.feelsGravity && !this.moved) {
			if (this.isGrounded) this.moveSpeed *= engine.friction;
			else this.moveSpeed *= engine.airResistance;
			if (this.moveSpeed < engine.frictionSnap) this.moveSpeed = 0;
		}
		this.moved = false;
		this.lastMoveDir = this.moveDir;
		this.moveDir = 0;
		super.finish(engine);
	}
	
	static actions = {}
	/**
	 * Defines a new routine or ability for a class.
	 * @param {string} name Name of the new action
	 * @param {number} duration Amount of ticks the action should take.
	 * @param {number} cooldown Additional time after action duration that new actions should still be prevented
	 * @param {function} tick Runs every game tick while the action is running. If returns false, cancel the action early.
	 * @param {function} finish Runs when the action is completed or canceled.
	 * @param {string} animationName Name of the animation to trigger at the start of the action.
	 * @param {number} animationLock How long to lock the animation for. Defaults to action duration.
	 */
	static defineAction(name, duration, cooldown, tick, finish, animationName, animationLock) {
		this.actions[name] = {
			tick: tick,
			finish: finish,
			duration: duration,
			lock: duration + cooldown,
			animation: animationName,
			animationLock: animationLock != null? animationLock : duration
		};
	}
	act(e, name) {
		if (this.actionLock > 0) return false;
		let action = this.constructor.actions[name];
		if (action) {
			this.currentAction = name;
			this.animate(e, action.animation, null, action.animationLock);
			this.actionFrame = 0;
			this.actionLock = action.lock;
			return true;
		}
		else {
			console.error(`Unknown action: ${name}.`);
			return false;
		}
	}
	cancelAction(e) {
		if (this.currentAction != null) {
			let action = this.constructor.actions[this.currentAction];
			action.finish(e);
			this.actionLock = 0;
		}
	}
	actionsUpdate(e) {
		if (this.currentAction != null) {
			let action = this.constructor.actions[this.currentAction];
			let result = action.tick(e, this.actionFrame);
			if (++this.actionFrame >= action.duration || result === false) {
				this.currentAction = null;
				action.finish(e);
			}
		}
		if (this.actionLock > 0) this.actionLock--;
	}
};