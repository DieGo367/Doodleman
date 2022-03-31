import * as Collision from "./collision.js";
import { RIGHT, COLOR } from "./util.js";
import { AnimationComponent } from "./animations.js";
import * as Shape from "./shape.js";

export class ObjectManager {
	map = {};
	nextID = 0;
	actorData = {};
	registeredClasses = {};
	minLayer = 0;
	maxLayer = 0;
	constructor(public engine) {
		this.registerClasses(Objects);
	}
	async loadActorData(url) {
		let data = await (await fetch(url)).json();
		for (let i = 0; i < data.length; i++) {
			let id = data[i].id;
			this.actorData[id] = data[i];
		}
	}
	add(object) {
		if (object instanceof GameObject) {
			object.id = this.nextID++;
			object.objectManager = this;
			this.map[object.id] = object;
			this.minLayer = Math.min(this.minLayer, object.drawLayer);
			this.maxLayer = Math.max(this.maxLayer, object.drawLayer);
		}
		else console.error("Not a GameObject!");
	}
	remove(target) {
		if (typeof target == "number") {
			delete this.map[target];
		}
		else if (target instanceof GameObject) {
			delete this.map[target.id];
		}
		else console.error("Not an id or GameObject!")
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
	attackUpdate() {
		this.triggerAll("updateHitboxes");
		this.triggerAll("updateHitDetection");
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
}

export class GameObject {
	collisions;
	grounds;
	velX = 0;
	velY = 0;
	id;
	objectManager;
	animator;
	feelsGravity;
	isGrounded;
	gravityScale;
	terminalVel;
	lastX;
	lastY;
	lastVelX;
	lastVelY;
	graphic;
	collision;
	drawLayer;
	constructor(public x, public y) {
		delete this.drawLayer;
		delete this.gravityScale;
		delete this.terminalVel;
	}
	static proto(this) {
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
	 * @param {Engine} engine 
	 */
	start(engine) {
		if (this.animator) engine.animations.tick(this.animator);
	}
	/**
	 * Handles intended object behavior this tick. Runs before attacks and collision.
	 * @param {Engine} engine 
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
	 * Update step dedicated to setting hitbox data. Runs after movement but before hit detection and collision.
	 * @param {Engine} engine 
	 */
	updateHitboxes(engine) {}
	/**
	 * Update step dedicated to attack hit detection. Runs after movement and hitbox updates, but before collision.
	 * @param {Engine} engine 
	 */
	updateHitDetection(engine) {}
	/**
	 * Final update step. Runs after collision. Track necessary values for next tick.
	 * @param {Engine} engine 
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
					Shape.fillShape(ctx, this.x, this.y, graphic);
				}
			}
		}
		if (this.animator) {
			animations.render(ctx, this.x, this.y, this.animator);
		}
	}
	drawElements() {}
	drawUI() {}
	drawDebug(ctx, _images, _animations) {
		ctx.fillStyle = "gray";
		ctx.globalAlpha = 0.5;
		ctx.beginPath();
		ctx.arc(this.x, this.y, 2.5, 0, 2 * Math.PI);
		ctx.fill();
		ctx.globalAlpha = 1;
		if (this.collision) {
			ctx.strokeStyle = COLOR.DEBUG.COLLISION;
			Collision.drawBounds(ctx, this.x, this.y, this.collision);
		}
	}
	drawHighlight() {}

	/**
	 * Updates the current animation of the object
	 * @param {string} animName Name of the animation to use
	 * @param {number} direction Direction to face the animation in
	 * @param {number} lockTime Time the animation should hold for without being overwritten
	 */
	animate(animName, direction, lockTime) {
		let component = this.animator;
		if (component.lock > 0 || component.lock === "full") return false;
		if (direction != void(0)) component.direction = direction;
		if (component.current === animName) return true;
		component.previous = component.current;
		component.current = animName;
		component.tick = 0;
		if (lockTime === "full" || typeof lockTime === "number") {
			component.lock = lockTime;
		}
		return true;
	}
	/**
	 * Get data from the current animation action based on the current animation tick
	 * @param {Engine} engine 
	 * @param {string} key Property name to access. Can be a property chain.
	 * Examples: "frame", "alpha", "position.x", "items.0.value" 
	 * @returns {*} The appropriate value from the animation file if it is found, else null.
	 */
	getFrameData(engine, key) {
		if (this.animator) return engine.animations.getFrameDataFromComponent(this.animator, key);
		else console.error("No AnimationComponent found. Can't get frame data.")
	}
}

export const Objects = {} as any;
Objects.Box = class Box extends GameObject {
	constructor(x, y, width, height, gfx) {
		super(x, y);
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animator = new AnimationComponent(width/2, 0, gfx);
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
			level: 0,
			x: 0, y: 0,
			width: width, height: height
		};
	}
};

Objects.Line = class Line extends GameObject {
	constructor(x, y, x2, y2, gfx) {
		super(x, y);
		let dx = x2 - x;
		let dy = y2 - y;
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animator = new AnimationComponent(dx/2, dy/2, gfx);
		}
		else this.graphic = {
			type: Shape.LINE,
			style: gfx,
			x: 0, y: 0,
			dx: dx, dy: dy
		};
		this.collision = {
			type: Shape.LINE,
			level: 0,
			x: 0, y: 0,
			dx: dx, dy: dy
		};
	}
}

Objects.Circle = class Circle extends GameObject {
	constructor(x, y, radius, gfx) {
		super(x, y);
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animator = new AnimationComponent(x, y - radius, gfx);
		}
		else this.graphic = {
			type: Shape.CIRCLE,
			style: gfx,
			x: 0, y: 0,
			radius: radius
		};
		this.collision = {
			type: Shape.CIRCLE,
			level: 0,
			x: 0, y: 0, radius: radius
		};
	}
}

Objects.Polygon = class Polygon extends GameObject {
	constructor(x, y, points, gfx) {
		super(x, y);
		let pts = points.map(pt => Shape.Pt(pt));
		let aabb = Collision.polyAABB({x: 0, y: 0, points: pts});
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animator = new AnimationComponent(aabb.x + aabb.width/2, aabb.y, gfx);
		}
		else this.graphic = {
			type: Shape.POLYGON,
			style: gfx,
			x: 0, y: 0,
			points: pts
		};
		this.collision = {
			type: Shape.POLYGON,
			level: 0,
			x: 0, y: 0,
			points: pts
		};
	}
}

Objects.Entity = class Entity extends GameObject {
	moveSpeed = 0;
	moveDir = 1;
	lastMoveDir = 1;
	moved = false;
	health;
	maxHealth;
	hitboxes = {};
	lockMovement;
	moveAccel;
	targetMoveSpeed;
	lockDirection;
	direction;
	jumpAccel;
	actionLock;
	currentAction;
	actionFrame;

	constructor(x, y) {
		super(x, y);
		delete this.maxHealth;
		delete this.drawLayer;
		delete this.targetMoveSpeed;
		delete this.moveAccel;
		delete this.jumpAccel;
		this.health = this.maxHealth;
	}
	static proto(this) {
		super.proto();
		this.drawLayer = 1;
		this.targetMoveSpeed = 5;
		this.moveAccel = 1;
		this.jumpAccel = 10;
		this.maxHealth = 10;
	}
	move(sign) {
		if (!this.lockMovement) {
			if (this.moveDir * sign >= 0) { // same sign or 0 involved
				this.moveSpeed += this.moveAccel;
				if (this.moveSpeed > this.targetMoveSpeed) this.moveSpeed = this.targetMoveSpeed;
			}
			else {
				this.moveSpeed -= this.moveAccel;
			}
		}
		if (!this.lockDirection) {
			this.moveDir += sign;
			this.moved = this.moveDir !== 0;
		}
	}
	movementUpdate(engine) {
		if (this.lockMovement) {
			this.moveDir = this.lastMoveDir;
			return;
		}
		// use movement speed
		if (!this.moved) this.moveDir = this.lastMoveDir;
		this.x += this.moveSpeed * this.moveDir;
		for (let id in this.grounds) {
			if (!this.grounds[id]) continue;
			let ground = engine.objects.map[id];
			if (ground && ground.collision.type === Shape.LINE) {
				let angle = Math.atan(ground.collision.dy / ground.collision.dx);
				// engine.debug.print(angle);
				// if moving down the slope
				if (angle * this.moveDir < 0) {
					this.y -= Math.abs(angle) * (this.moveSpeed + this.velX) * 1.1;
				}
			}
		}
		if (!this.lockDirection) this.direction = this.moveDir;
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
	
	act(name) {
		if (this.actionLock > 0) return false;
		this.currentAction = name;
		this.actionFrame = 0;
		this.actionLock = this.getActionProperty("Cooldown");
		let init = this.getActionProperty("Init");
		init();
	}
	getActionProperty(property) {
		let fullName = `${this.currentAction}${property}`;
		let prop = this[fullName];
		if (prop !== void(0)) return prop;
		else throw new Error(`${fullName} is undefined.`);
	}
	cancelAction(e) {
		if (this.currentAction != null) {
			let finish = this.getActionProperty("Finish");
			finish(e);
			this.actionLock = 0;
		}
	}
	actionsUpdate(e) {
		if (this.currentAction != null) {
			let tick = this.getActionProperty("Tick");
			let finish = this.getActionProperty("Finish");
			let result = tick(e, this.actionFrame);
			let duration = this.getActionProperty("Duration");
			if (++this.actionFrame >= duration || result === false) {
				this.currentAction = null;
				finish(e);
			}
		}
		if (this.actionLock > 0) this.actionLock--;
	}

	updateHitboxes(e) {
		let hitboxesData = this.getFrameData(e, "hitboxes");
		if (hitboxesData) for (let hitboxName in hitboxesData) {
			let hitbox = this.hitboxes[hitboxName];
			let hitboxData = this.getFrameData(e, `hitboxes.${hitboxName}`);
			if (!hitboxData.shape) continue;
			if (!hitbox) {
				hitbox = this.hitboxes[hitboxName] = {};
				hitbox.hits = [];
			}
			
			Object.assign(hitbox, hitboxData);
			hitbox.updated = true;
			hitbox.x = this.x;
			hitbox.y = this.y;
			if (this.animator.direction !== RIGHT) {
				Collision.flipShapeX(hitbox.shape);
				if (hitbox.knockback) hitbox.knockback.x *= -1;
			}
		}
	}
	updateHitDetection(engine) {
		for (let hitboxName in this.hitboxes) {
			let hitbox = this.hitboxes[hitboxName];
			if (!hitbox.updated) delete this.hitboxes[hitboxName];
			else {
				engine.objects.forAllOfClass(Objects.Entity, (obj, id) => {
					if (id === this.id && !hitbox.selfDamaging) return;
					// check this object isn't excluded
					if (hitbox.hits.indexOf(id) === -1) {
						// check the hitbox intersects the object
						hitbox.collision = hitbox.shape;
						if (Collision.intersect(hitbox, obj)) {
							obj.hurt(hitbox.damage, hitbox.knockback, this);
							if (hitbox.onHit) this[hitbox.onHit](obj, hitbox.damage, hitbox.knockback);
							hitbox.hits.push(id);
						}
					}
				});
				delete hitbox.updated;
			}
		}
	}

	hurt(damage, knockback, attacker) {
		// probably make a hook for game here
		this.health -= damage;
		if (this.health <= 0) return this.die(attacker);
		if (knockback) {
			this.x += knockback.x;
			this.y += knockback.y;
			this.velX += knockback.x;
			this.velY += knockback.y;
		}
	}

	die(attacker) {
		// probably make a hook for game here
		this.remove();
	}

	drawDebug(ctx, i, a) {
		super.drawDebug(ctx, i, a);
		for (let hitboxName in this.hitboxes) {
			let hitbox = this.hitboxes[hitboxName];
			if (hitbox && hitbox.shape) {
				ctx.strokeStyle = COLOR.DEBUG.HITBOX;
				Collision.drawBounds(ctx, this.x, this.y, hitbox.shape);
			}
		}
	}
};