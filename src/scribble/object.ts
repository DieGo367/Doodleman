import * as Collision from "./collision.js";
import * as Shape from "./shape.js";
import { Engine } from "./engine.js";
import { AnimationComponent, AnimationManager } from "./animations.js";
import { ImageManager } from "./images.js";
import { LEFT, RIGHT, CENTER, DIR, COLOR, validate, never, isKeyOf } from "./util.js";
type CollisionComponent = Collision.CollisionComponent;

type JSONValue = string | number | boolean | JSONValue[] | {[key: string]: JSONValue} | null;
interface ActorDef {
	id: number;
	class: string;
	arguments?: (ActorDefArg | unknown)[]
}
function isActorDef(data: unknown): data is ActorDef {
	return validate(data, {
		id: "number",
		class: "string",
		"arguments?": Array
	}, console.warn);
}
interface ActorDefArg {
	name: string;
	input: number;
	type?: "number" | "boolean" | "string" | "option";
	options?: {[key: string]: JSONValue};
	remap?: unknown[]
}
export function isActorDefArg(data: unknown): data is ActorDefArg {
	return validate(data, {
		name: "string",
		input: "number",
		"type?": {"@": ["number", "boolean", "string", "option"]},
		"options?": {"*": ""},
		"remap?": Array
	});
}

type ActionPropTypes = "boolean"|"number"|"bigint"|"string"|"symbol"|"function"|"object";
type RealType<TypeName> = (
	TypeName extends "boolean"? boolean :
	TypeName extends "number"? number :
	TypeName extends "bigint"? bigint :
	TypeName extends "string"? string :
	TypeName extends "symbol"? symbol :
	TypeName extends "function"? (...args: any[]) => void :
	TypeName extends "object"? object :
	TypeName extends "undefined"? undefined :
	never
);

export type ObjectClass = {
	new (...args: any[]): GameObject;
};
type GameObjectTriggers = {
	[Property in keyof GameObject as 
		GameObject[Property] extends (e: Engine) => void ?
		Property :
		never
	]: GameObject[Property];
}

export class ObjectManager {
	map = {} as {[id: number]: GameObject};
	nextID = 0;
	actorData = {} as ActorDef[];
	registeredClasses = {} as {[className: string]: ObjectClass};
	minLayer = 0;
	maxLayer = 0;
	constructor(public engine: Engine) {
		this.registerClasses(Objects);
	}
	async loadActorData(url: string) {
		let data: unknown = await (await fetch(url)).json();
		if (data instanceof Array) {
			for (let entry of data as unknown[]) {
				if (isActorDef(entry)) {
					let id = entry.id;
					this.actorData[id] = entry;
				}
				else console.warn("An Actor data entry was not loaded.");
			}
		}
		else throw new Error("Actor data was not an array.");
	}
	add(object: GameObject) {
		object.id = this.nextID++;
		object.objectManager = this;
		this.map[object.id] = object;
		this.minLayer = Math.min(this.minLayer, object.drawLayer);
		this.maxLayer = Math.max(this.maxLayer, object.drawLayer);
	}
	remove(target: number | GameObject) {
		if (typeof target == "number") {
			delete this.map[target];
		}
		else if (target instanceof GameObject) {
			if (target.id !== null)
				delete this.map[target.id];
		}
		else never(target);
	}
	triggerAll(method: keyof GameObjectTriggers) {
		for (let id in this.map) {
			let obj = this.map[id];
			if (obj instanceof GameObject) {
				obj[method](this.engine);
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
	renderLayer(layer: number) {
		this.forAll(object => {
			if (object.drawLayer === layer) object.draw(this.engine.ctx, this.engine.images, this.engine.animations);
		});
	}
	renderDebug() {
		this.forAll(object => {
			object.drawDebug(this.engine.ctx, this.engine.images, this.engine.animations);
		});
	}
	forAll(func: (object: GameObject, id: number) => boolean | void) {
		for (let id in this.map) {
			if (this.map[id]) {
				let response = func(this.map[id], parseInt(id));
				if (response === false) break;
			}
		}
	}
	forAllOfClass<Class extends ObjectClass>(classRef: Class, func: (object: InstanceType<Class>, id: number) => boolean | void) {
		this.forAll((obj, id) => {
			if (obj instanceof classRef) {
				return func(obj as InstanceType<Class>, id);
			}
		});
	}
	registerClasses(classGroup: {[className: string]: ObjectClass}) {
		for (let name in classGroup) {
			this.registeredClasses[name] = classGroup[name];
		}
	}
	registerClass(className: string, classDecl: ObjectClass) {
		this.registeredClasses[className] = classDecl;
	}
}

type GraphicsComponent = Shape.Shape & {
	style: string;
}

export class GameObject {
	id: number | null = null;
	objectManager: ObjectManager | null = null;
	isActor = false;
	velX = 0;
	velY = 0;
	lastX: number;
	lastY: number;
	lastVelX = 0;
	lastVelY = 0;
	drawLayer = 0;
	feelsGravity = false;
	gravityScale = 1;
	terminalVel: number = Infinity;
	graphic?: GraphicsComponent;
	animator?: AnimationComponent;
	collision?: CollisionComponent;
	collided = false;
	collisions: {[objectID: number]: boolean} = {};
	isGrounded = false;
	grounds: {[objectID: number]: boolean} = {};
	constructor(public x: number, public y: number) {
		this.lastX = x;
		this.lastY = y;
	}
	remove() {
		if (this.objectManager && this.id !== null) {
			this.objectManager.remove(this.id);
			this.id = this.objectManager = null;
		}
	}
	static onlineProperties = ["x", "y", "id", "drawLayer"];
	
	/**
	 * First update step. Runs before the main update. Animations tick here.
	 */
	start(engine: Engine) {
		if (this.animator) engine.animations.tick(this.animator);
	}
	/**
	 * Handles intended object behavior this tick. Runs before attacks and collision.
	 */
	update(engine: Engine) {
		if (this.feelsGravity && !this.isGrounded) {
			this.velX += engine.gravity.x * this.gravityScale;
			this.velY += engine.gravity.y * this.gravityScale;
			if (this.velX > this.terminalVel) this.velX = this.terminalVel;
			if (this.velX < -this.terminalVel) this.velX = -this.terminalVel;
			if (this.velY > this.terminalVel) this.velY = this.terminalVel;
			if (this.velY < -this.terminalVel) this.velY = -this.terminalVel;
			// TODO: do not apply additional gravity if any collision is in effect?
		}
		this.x += this.velX;
		this.y += this.velY;
	}
	/**
	 * Update step dedicated to setting hitbox data. Runs after movement but before hit detection and collision.
	 */
	updateHitboxes(engine: Engine) {}
	/**
	 * Update step dedicated to attack hit detection. Runs after movement and hitbox updates, but before collision.
	 */
	updateHitDetection(engine: Engine) {}
	/**
	 * Final update step. Runs after collision. Track necessary values for next tick.
	 */
	finish(engine: Engine) {
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
	draw(ctx: CanvasRenderingContext2D, images: ImageManager, animations: AnimationManager) {
		if (this.graphic) {
			let graphic = this.graphic;
			if (graphic.style.indexOf('.') != -1) {
				images.drawOverShape(graphic.style, this.x, this.y, graphic);
			}
			else {
				ctx.fillStyle = graphic.style || "rgba(0,0,0,0)";
				Shape.fill(ctx, this.x, this.y, graphic);
			}
		}
		if (this.animator) {
			animations.render(ctx, this.x, this.y, this.animator);
		}
	}
	drawElements() {}
	drawUI() {}
	drawDebug(ctx: CanvasRenderingContext2D, _images: ImageManager, _animations: AnimationManager) {
		ctx.fillStyle = "gray";
		ctx.globalAlpha = 0.5;
		ctx.beginPath();
		ctx.arc(this.x, this.y, 2.5, 0, 2 * Math.PI);
		ctx.fill();
		ctx.globalAlpha = 1;
		if (this.collision) {
			ctx.strokeStyle = COLOR.DEBUG.COLLISION;
			Shape.stroke(ctx, this.x, this.y, this.collision);
		}
	}
	drawHighlight() {}

	/**
	 * Updates the current animation of the object
	 * @param animName Name of the animation to use
	 * @param direction Direction to face the animation in
	 * @param lockTime Time the animation should hold for without being overwritten
	 */
	animate(animName: string, direction?: DIR, lockTime?: number | "full") {
		let component = this.animator;
		if (!component) return false;
		if (component.lock === undefined) component.lock = 0;
		if (component.lock > 0 || component.lock === "full") return false;
		if (direction != undefined) component.direction = direction;
		if (component.current === animName) return true;
		component.previous = component.current;
		component.current = animName;
		component.tick = 0;
		if (lockTime !== undefined) component.lock = lockTime;
		return true;
	}
	/**
	 * Get data from the current animation action based on the current animation tick
	 * @param engine 
	 * @param key Property name to access. Can be a property chain.
	 * Examples: "frame", "alpha", "position.x", "items.0.value" 
	 * @returns The appropriate value from the animation file if it is found, else null.
	 */
	getFrameData(engine: Engine, key: string): unknown {
		if (this.animator) return engine.animations.getFrameDataFromComponent(this.animator, key);
		else console.error("No AnimationComponent found. Can't get frame data.")
	}
}

class Point extends GameObject {
	declare graphic: GraphicsComponent & Shape.Shaped<Shape.Point>;
	declare collision: Collision.CollisionComponent & Shape.Shaped<Shape.Point>;
	constructor(x: number, y: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = {name: gfx, x: 0, y: 0};
		}
		else this.graphic = {
			type: Shape.POINT,
			style: gfx,
			x: 0, y: 0
		};
		this.collision = {
			type: Shape.POINT,
			weight: 0,
			x: 0, y: 0
		};
	}
};

class Arc extends GameObject {
	declare graphic: GraphicsComponent & Shape.Shaped<Shape.Arc>;
	declare collision: Collision.CollisionComponent & Shape.Shaped<Shape.Arc>;
	constructor(x: number, y: number, radius: number, start: number, end: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = {name: gfx, x: 0, y: 0};
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

class Box extends GameObject {
	declare graphic: GraphicsComponent & Shape.Shaped<Shape.Box>;
	declare collision: Collision.CollisionComponent & Shape.Shaped<Shape.Box>;
	constructor(x: number, y: number, width: number, height: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = {name: gfx, x: width/2, y: 0};
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

class Line extends GameObject {
	declare graphic: GraphicsComponent & Shape.Shaped<Shape.Line>;
	declare collision: Collision.CollisionComponent & Shape.Shaped<Shape.Line>;
	constructor(x: number, y: number, x2: number, y2: number, gfx: string) {
		super(x, y);
		let dx = x2 - x;
		let dy = y2 - y;
		if (gfx.slice(-5) === ".json") {
			this.animator = {name: gfx, x: dx/2, y: dy/2};
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

class Circle extends GameObject {
	declare graphic: GraphicsComponent & Shape.Shaped<Shape.Circle>;
	declare collision: Collision.CollisionComponent & Shape.Shaped<Shape.Circle>;
	constructor(x: number, y: number, radius: number, gfx: string) {
		super(x, y);
		if (gfx.slice(-5) === ".json") {
			this.animator = {name: gfx, x: 0, y: -radius};
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

class Polygon extends GameObject {
	declare graphic: GraphicsComponent & Shape.Shaped<Shape.Polygon>;
	declare collision: Collision.CollisionComponent & Shape.Shaped<Shape.Polygon>;
	constructor(x: number, y: number, vertices: Shape.Point[], gfx: string) {
		super(x, y);
		let aabb = Shape.polygonAABB({x: 0, y: 0, vertices: vertices});
		if (typeof gfx === "string" && gfx.slice(-5) === ".json") {
			this.animator = {name: gfx, x: aabb.x + aabb.width/2, y: aabb.y};
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

interface HitboxData {
	damage: number;
	knockback: Shape.Point;
	shape: Shape.Shape;
	selfDamaging?: boolean;
	onHit?: string;
}
interface Hitbox extends HitboxData {
	x: number;
	y: number;
	hits: number[];
	updated?: boolean;
}
function isHitboxData(data: any): data is HitboxData {
	return typeof data === "object"
		&& typeof data.damage === "number"
		&& typeof data.knockback === "object"
			&& typeof data.knockback.x === "number"
			&& typeof data.knockback.y === "number"
		&& (typeof data.selfDamaging === "boolean"
			|| typeof data.selfDamaging === "undefined")
		&& (typeof data.onHit === "string"
			|| typeof data.onHit === "undefined")
		&& Shape.isShape(data.shape);
}

class Entity extends GameObject {
	drawLayer = 1;
	health: number;
	maxHealth = 10;
	moved = false;
	moveDir: DIR = RIGHT;
	lastMoveDir: DIR = RIGHT;
	lockMovement = false;
	moveSpeed = 0;
	targetMoveSpeed = 5;
	moveAccel = 1;
	jumpAccel = 1;
	direction: DIR = RIGHT;
	lockDirection = false;
	currentAction: string | null = null;
	actionLock = 0;
	actionFrame = 0;
	hitboxes = {} as {[name: string]: Hitbox};

	constructor(x: number, y: number) {
		super(x, y);
		this.health = this.maxHealth;
	}
	move(sign: number) {
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
	movementUpdate(engine: Engine) {
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
			if (ground && ground.collision && ground.collision.type === Shape.LINE) {
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
	update(engine: Engine) {
		this.movementUpdate(engine);
		this.actionsUpdate(engine);
		super.update(engine);
	}
	finish(engine: Engine) {
		if (this.feelsGravity && !this.moved) {
			if (this.isGrounded) this.moveSpeed *= engine.friction;
			else this.moveSpeed *= engine.airResistance;
			if (this.moveSpeed < engine.frictionSnap) this.moveSpeed = 0;
		}
		this.moved = false;
		this.lastMoveDir = this.moveDir;
		this.moveDir = CENTER;
		super.finish(engine);
	}
	
	act(name: string) {
		if (this.actionLock > 0) return false;
		
		this.currentAction = name;
		let cooldown = this.getActionProperty("Cooldown", "number");
		let init = this.getActionProperty("Init", "function");

		this.actionFrame = 0;
		this.actionLock = cooldown;
		init();
	}
	getActionProperty<TypeName extends ActionPropTypes>(property: string, type: TypeName): RealType<TypeName> {
		let fullName = `${this.currentAction}${property}`;
		if (isKeyOf(this, fullName)) {
			if (typeof this[fullName] === type) return this[fullName] as unknown as RealType<TypeName>;
			else throw new TypeError(`${fullName} is not a ${type}`);
		}
		else throw new TypeError(`${fullName} is undefined.`);
	}
	cancelAction(e: Engine) {
		if (this.currentAction != null) {
			this.actionLock = 0;
			this.getActionProperty("Finish", "function")(e);
		}
	}
	actionsUpdate(e: Engine) {
		if (this.currentAction != null) {
			let tick = this.getActionProperty("Tick", "function");
			let finish = this.getActionProperty("Finish", "function");
			let duration = this.getActionProperty("Duration", "number");
			
			let result: unknown = tick(e, this.actionFrame);
			if (++this.actionFrame >= duration || result === false) {
				this.currentAction = null;
				finish(e);
			}
		}
		if (this.actionLock > 0) this.actionLock--;
	}

	updateHitboxes(e: Engine) {
		let hitboxesData = this.getFrameData(e, "hitboxes");
		if (typeof hitboxesData == "object") for (let hitboxName in hitboxesData) {
			let hitboxData = this.getFrameData(e, `hitboxes.${hitboxName}`);
			if (isHitboxData(hitboxData)) {
				let hitbox = this.hitboxes[hitboxName];
				if (!hitbox) {
					hitbox = this.hitboxes[hitboxName] = {
						x: this.x, y: this.y,
						hits: [],
						damage: 0,
						knockback: {x: 0, y: 0},
						shape: {x: 0, y: 0, type: Shape.POINT}
					};
				}
				Object.assign(hitbox, hitboxData);
				hitbox.updated = true;
				hitbox.x = this.x;
				hitbox.y = this.y;
				if (this.animator && this.animator.direction === LEFT) {
					Shape.flipX(hitbox.shape);
					if (hitbox.knockback) hitbox.knockback.x *= -1;
				}
			}
		}
	}
	updateHitDetection(engine: Engine) {
		for (let hitboxName in this.hitboxes) {
			let hitbox = this.hitboxes[hitboxName];
			if (!hitbox.updated) delete this.hitboxes[hitboxName];
			else {
				engine.objects.forAllOfClass(Entity, (obj: Entity, id: number) => {
					if (id === this.id && !hitbox.selfDamaging) return;
					// check this object isn't excluded
					if (hitbox.hits.indexOf(id) === -1) {
						// check the hitbox intersects the object
						if (Collision.intersect(Shape.access(hitbox, "shape"), Shape.access(obj, "collision"))) {
							obj.hurt(hitbox.damage, hitbox.knockback, this);
							let methodName = hitbox.onHit;
							if (typeof methodName == "string" && isKeyOf(this, methodName)) {
								let method = this[methodName];
								if (typeof method === "function")
									method(obj, hitbox.damage, hitbox.knockback);
							}
							hitbox.hits.push(id);
						}
					}
				});
				delete hitbox.updated;
			}
		}
	}

	hurt(damage: number, knockback: Shape.Point, attacker: Entity) {
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

	die(_attacker: Entity) {
		// probably make a hook for game here
		this.remove();
	}

	drawDebug(ctx: CanvasRenderingContext2D, i: ImageManager, a: AnimationManager) {
		super.drawDebug(ctx, i, a);
		for (let hitboxName in this.hitboxes) {
			let hitbox = this.hitboxes[hitboxName];
			if (hitbox && hitbox.shape) {
				ctx.strokeStyle = COLOR.DEBUG.HITBOX;
				Shape.stroke(ctx, this.x, this.y, hitbox.shape);
			}
		}
	}
};

export const Objects = {
	Point: Point,
	Arc: Arc,
	Box: Box,
	Line: Line,
	Circle: Circle,
	Polygon: Polygon,
	Entity: Entity
};