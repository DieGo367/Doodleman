import Engine from "../engine.js";
import ImageManager from "../images.js";
import AnimationManager from "../animations.js";
import * as Shape from "../shape.js";
import { CENTER, COLOR, DIR } from "../util.js";

import ObjMap from "./map.js";
import { Graphic, Animator, Collider, collider, graphic, animator } from "./component.js";

export default class Obj {
	id: number | null = null;
	objMap: ObjMap | null = null;
	isActor = false;
	velX = 0;
	velY = 0;
	prevX: number;
	prevY: number;
	prevVelX = 0;
	prevVelY = 0;
	drawLayer = 0;
	feelsGravity = false;
	gravityScale = 1;
	terminalVel: number = Infinity;
	graphic?: Graphic;
	animator?: Animator;
	collider?: Collider;
	constructor(public x: number, public y: number) {
		this.prevX = x;
		this.prevY = y;
	}
	remove() {
		if (this.objMap && this.id !== null) {
			this.objMap.remove(this.id);
			this.id = this.objMap = null;
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
		if (this.feelsGravity && !this.collider?.grounded) {
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
		if (this.feelsGravity && this.collider?.grounded) {
			this.velX *= engine.friction;
			this.velY *= engine.friction;
			if (Math.abs(this.velX) < engine.frictionSnap) this.velX = 0;
			if (Math.abs(this.velY) < engine.frictionSnap) this.velY = 0;
		}
		this.prevX = this.x;
		this.prevY = this.y;
		this.prevVelX = this.velX;
		this.prevVelY = this.velY;
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
		if (this.collider) {
			ctx.strokeStyle = COLOR.DEBUG.COLLISION;
			Shape.stroke(ctx, 0, 0, this.collider);
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

	setGraphic(style: string, shape: Shape.Shape) {
		this.graphic = graphic(style, shape);
	}
	setAnimator(x: number, y: number, name: string, direction: DIR = CENTER) {
		this.animator = animator(x, y, name, direction);
	}
	setCollider(weight: number, shape: Shape.Shape) {
		this.collider = collider(weight, shape);
	}
}