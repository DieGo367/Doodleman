import { Engine } from "../engine.js";
import { ImageManager } from "../images.js";
import { AnimationManager } from "../animations.js";
import * as Shape from "../shape.js";
import * as Collision from "../collision.js";
import { DIR, LEFT, CENTER, RIGHT, COLOR, isKeyOf } from "../util.js";

import GameObject from "./instance.js";

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

export default class Entity extends GameObject {
	drawLayer = 1;
	health: number;
	maxHealth: number;
	static health = 10;
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
		this.health = this.maxHealth = (this.constructor as typeof Entity).health;
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