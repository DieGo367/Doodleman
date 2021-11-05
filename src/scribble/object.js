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
	triggerAll(method) {
		for (let id in this.map) {
			if (this.map.hasOwnProperty(id)) {
				if (this.map[id]) this.map[id][method](this.engine);
			}
		}
	}
	removeAll() {
		this.triggerAll("remove");
		this.minLayer = this.maxLayer = 0;
	}
	start() {
		this.triggerAll("start");
	}
	update() {
		this.triggerAll("update");
	}
	attack() {
		this.triggerAll("attack");
	}
	finish() {
		this.triggerAll("finish");
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
		for (let id in this.map) {
			if (this.map[id]) {
				let response = func(this.map[id], parseInt(id));
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
		this.gravityScale = 1;
		this.terminalVel = null;
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
	 * Handles intended object behavior this tick. Runs before attacks and collision.
	 * @param {Scribble.Engine} engine 
	 */
	update(engine) {
		if (this.feelsGravity && !this.isGrounded) {
			this.velX += engine.gravity.x * this.gravityScale;
			this.velY += engine.gravity.y * this.gravityScale;
			if (this.terminalVel != null) {
				if (this.velX > this.terminalVel) this.velX = this.terminalVel;
				if (this.velX < -this.terminalVel) this.velX = -this.terminalVel;
				if (this.velY > this.terminalVel) this.velY = this.terminalVel;
				if (this.velY < -this.terminalVel) this.velY = -this.terminalVel;
			}
			// TODO: do not apply additional gravity if any collision is in effect?
		}
		this.x += this.velX;
		this.y += this.velY;
	}
	/**
	 * Update step dedicated to attacks hit detection. Runs after movement and before collision.
	 * @param {Scribble.Engine} engine 
	 */
	attack(engine) {}
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
	 * @param {string} action Name of the animation to use
	 * @param {number} direction Direction to face the animation in
	 * @param {number} lockTime Time the animation should hold for without being overwritten
	 */
	animate(action, direction, lockTime) {
		let component = this.animation;
		if (component.lock > 0 || component.lock === "full") return false;
		if (direction != void(0)) component.direction = direction;
		if (component.animation === action) return true;
		component.previous = component.animation;
		component.animation = action;
		component.tick = 0;
		if (lockTime === "full" || typeof lockTime === "number") {
			component.lock = lockTime;
		}
		return true;
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
		this.activeAttacks = [];
		this.health = this.maxHealth;
	}
	static proto() {
		super.proto();
		this.drawLayer = 1;
		this.targetMoveSpeed = 5;
		this.moveAccel = 1;
		this.jumpAccel = 10;
		this.maxHealth = 10;
	}
	move(sign) {
		if (this.lockMovement) return;
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
		if (this.lockMovement) return;
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
	act(name) {
		if (this.actionLock > 0) return false;
		let action = this.constructor.actions[name];
		if (action) {
			this.currentAction = name;
			if (action.animation) this.animate(action.animation, null, action.animationLock);
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
			let result = action.tick(e, this, this.actionFrame);
			if (++this.actionFrame >= action.duration || result === false) {
				this.currentAction = null;
				action.finish(e, this);
			}
		}
		if (this.actionLock > 0) this.actionLock--;
	}

	/**
	 * Activate the hitbox of an attack
	 * @param {Scribble.Engine} engine
	 * @param {string} name Name of the attack's hitbox in the animation file.
	 * @param {Array} exclude List of ID's to ignore hit detection with.
	 * @param {function} callback Optional. Function to call when an entity is hit. If false is returned, damage is not applied.
	 */
	setAttack(name, duration, exclude, callback) {
		if (exclude && typeof exclude !== "Array") return console.error("Expected an array of IDs to exclude.");
		if (!exclude) exclude = [];
		exclude.push(this.id);
		this.activeAttacks.push({
			name: name,
			duration: duration,
			excludes: exclude,
			onHit: callback,
			tick: 0,
			hits: []
		});
	}
	attack(e) {
		for (let i = 0; i < this.activeAttacks.length; i++) {
			let attack = this.activeAttacks[i];
			if (attack) {
				// update the attack based on framedata
				let data = this.getFrameData(e, attack.name);
				if (!data) console.warn(`Missing attack data: ${attack.name}`);
				else if (data.shape) {
					attack.collision = attack.shape = Object.assign({}, data.shape);
					attack.damage = data.damage;
					if (this.animation.direction === Scribble.LEFT) Scribble.Collision.flipShapeX(attack.shape);
					attack.x = this.x;
					attack.y = this.y;
					// if the attack shape exists, check for all objects...
					engine.objects.forAllOfClass(Scribble.Entity, (obj, id) => {
						// check this object isn't excluded
						if (attack.excludes.indexOf(id) === -1) {
							// check the attack intersects the object
							if (Scribble.Collision.intersect(attack, obj)) {
								let doDamage = true;
								if (typeof attack.onHit === "function") doDamage = attack.onHit(obj, attack.damage) !== false;
								if (doDamage) obj.hurt(attack.damage, this);
								attack.hits.push(obj.id);
								attack.excludes.push(obj.id);
							}
						}
					});
				}
				else attack.shape = null;
				if (++attack.tick >= attack.duration) this.activeAttacks.splice(i--, 1);
			}
			else this.activeAttacks.splice(i--, 1);
		}
	}
	cancelAttack(name) {
		for (let i = 0; i < this.activeAttacks.length; i++) {
			let attack = this.activeAttacks[i];
			if (attack && attack.name === name) this.activeAttacks.splice(i--, 1);
		}
	}

	hurt(damage, attacker) {
		// probably make a hook for game here
		this.health -= damage;
		if (this.health <= 0) this.die(attacker);
	}

	die(attacker) {
		// probably make a hook for game here
		this.remove();
	}

	drawDebug(ctx) {
		super.drawDebug(ctx);
		for (let i = 0; i < this.activeAttacks.length; i++) {
			let attack = this.activeAttacks[i];
			if (attack && attack.shape) {
				ctx.strokeStyle = Scribble.COLOR.DEBUG.HITBOX;
				Scribble.Collision.drawBounds(ctx, this.x, this.y, attack.shape);
			}
		}
	}
};