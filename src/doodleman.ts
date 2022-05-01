import * as Scribble from './scribble.js';
declare global {
	var collisionLevel: number;
}

class DoodlemanGame extends Scribble.Game {
	follow: Scribble.GameObject | null = null;
	mouseX = 0;
	mouseY = 0;
	init() {
		// called when first loaded
		this.engine.setSpeed(1000/60);
		this.engine.setGravity(0, -0.6);
		this.engine.setFriction(0.7, 0.1);
		this.engine.setAirResistance(0.92);
		this.engine.loadActorData("data/actors.json").then(() => {
			this.engine.registerClasses(DMOs);
			let url = new URL(window.location.href);
			let level = url.searchParams.get("level");
			if (level) this.engine.levels.open("levels/"+level+".json");
			else this.engine.levels.open("levels/1st Platformy Level.json");
		});
		document.addEventListener("mousemove", e => this.onmousemove(e));
		document.addEventListener("click", e => this.onclick(e));

		document.addEventListener("keydown", e => {
			if (e.code === "Backslash") this.engine.debug.toggle();
		})
	}
	tick() {
		// logic performed every tick
		if (this.engine.input.keyEventDown("KeyF")) {
			this.engine.setFullscreen(!document.fullscreenElement);
		}
		if (this.engine.input.keyEventDown("F9")) {
			this.engine.debug.frameStepper = !this.engine.debug.frameStepper;
		}
		if (this.engine.input.keyEventDown("Enter") || this.engine.input.keyEventDown("NumpadEnter")) {
			this.engine.debug.frameCanStep = true;
		}
		if (this.engine.input.keyEventDown("Backquote")) {
			this.engine.levels.openFromData(this.engine.level);
		}

		// logic performed when unpaused
		if (this.engine.canUpdate()) {
			if (this.follow) {
				if (this.follow.graphic) {
					if (this.follow.collided) this.follow.graphic.style = "red";
					else this.follow.graphic.style = "blue";
				}
				// this.follow.x = this.followX;
				// this.follow.y = this.followY;
				if (this.engine.input.key("KeyW")) this.follow.y += 5;
				if (this.engine.input.key("KeyA")) this.follow.x -= 5;
				if (this.engine.input.key("KeyS")) this.follow.y -= 5;
				if (this.engine.input.key("KeyD")) this.follow.x += 5;
				if (this.follow.collision) {
					this.follow.collision.weight = window.collisionLevel;
					if (this.follow.graphic) {
						let coll = Scribble.Collision.getCollider(this.follow);
						let ss = Scribble.Collision.getShapeTops(coll, this.engine.gravity);
						for (let i = 0; i < ss.length; i++) {
							const shape = ss[i];
							if (Scribble.Collision.Intersect.shapePt(shape, this.engine.input.cursorPos()))
								this.follow.graphic.style = "green";
						}
					}
				}
			}
	
			let focus = {x: 0, y: 0};
			let playerCount = 0;
			this.engine.objects.forAllOfClass(Doodleman, player => {
				playerCount++;
				focus.x += player.x;
				focus.y += player.y;
			});
			if (playerCount > 0) {
				focus.x /= playerCount;
				focus.y /= playerCount;
				this.engine.camera.approachPt(focus, 10);
			}
			else {
				if (this.engine.input.key("ArrowUp")) this.engine.camera.y += 5;
				if (this.engine.input.key("ArrowLeft")) this.engine.camera.x -= 5;
				if (this.engine.input.key("ArrowDown")) this.engine.camera.y -= 5;
				if (this.engine.input.key("ArrowRight")) this.engine.camera.x += 5;
			}
		}
	}
	onRenderUI(ctx: CanvasRenderingContext2D) {
		// graphics drawn every window animation frame
		super.onRenderUI(ctx);
		ctx.fillStyle = "gray";
		ctx.globalAlpha = 0.5;
		ctx.beginPath();
		ctx.arc(this.mouseX, this.mouseY, 5, 0, 2 * Math.PI);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
	onLevelLoad() {
		this.engine.objects.forAllOfClass(SpawnPoint, (spawn: SpawnPoint) => {
			if (spawn.slot === 0) {
				let p = Doodleman.fromSpawnPoint(spawn);
				this.engine.objects.add(p);
				return false;
			}
		});
	}
	onmousemove(event: MouseEvent) {
		let rect = this.engine.canvas.getBoundingClientRect();
		this.mouseX = event.pageX - rect.left;
		this.mouseY = event.pageY - rect.top;
		this.mouseX *= this.engine.width/rect.width;
		this.mouseY *= this.engine.height/rect.height;
	}
	onclick(event: MouseEvent) {
		let rect = this.engine.canvas.getBoundingClientRect();
		if (this.follow && this.follow.collision && this.follow.collision.type === Scribble.Shape.LINE) {
			let x2 = event.pageX - rect.left;
			let y2 = this.engine.canvas.height - (event.pageY - rect.top);
			let dx = x2 - this.follow.x;
			let dy = y2 - this.follow.y;
			this.follow.collision.dx = dx;
			this.follow.collision.dy = dy;
			if (this.follow.graphic && this.follow.graphic.type === Scribble.Shape.LINE) {
				this.follow.graphic.dx = dx;
				this.follow.graphic.dy = dy;
			}
		}
		if (event.pageX - rect.left < 0) this.engine.levels.openFromFile();
	}
	tempTestBlocks(as = Scribble.Shape.CIRCLE) {
		this.engine.levels.clear();
		this.engine.objects.add(new Scribble.Objects.Box(400, 200, 100, 150, "black"));
		this.engine.objects.add(new Scribble.Objects.Line(10, 250, 300, 290, "black")); 
		this.engine.objects.add(new Scribble.Objects.Circle(205, 115, 40, "black")); 
		this.engine.objects.add(new Scribble.Objects.Polygon(350, 90, [
			{x: 20, y:70}, {x: 100, y:80}, {x: 140, y:30}, {x: 150, y:0}, {x: 100, y:-60}
		], "black"));
		this.engine.objects.add(new Scribble.Objects.Point(576, 143, "black"));
		this.engine.objects.add(new Scribble.Objects.Arc(576, 40, 50, Math.PI/2, Math.PI, "black"));
		if (as === Scribble.Shape.CIRCLE)
			this.follow = new Scribble.Objects.Circle(0, 0, 40, "blue");
		else if (as === Scribble.Shape.BOX)
			this.follow = new Scribble.Objects.Box(0, 0, 40, 50, "blue");
		else if (as === Scribble.Shape.LINE)
			this.follow = new Scribble.Objects.Line(0, 0, 40, 40, "blue");
		else if (as === Scribble.Shape.POLYGON)
			this.follow = new Scribble.Objects.Polygon(60, 70, [{x:10, y: -70}, {x:11, y: -100}, {x:-15, y: -150}, {x:-60, y: -115}, {x:-70, y: -105}, {x:-75, y: -97}, {x:-80, y: -70}, {x:-70, y: -25}, {x:-60, y: -20}, {x:-35, y: -3}], "blue");
		else if (as === Scribble.Shape.POINT)
			this.follow = new Scribble.Objects.Point(0, 0, "blue");
		else if (as === Scribble.Shape.ARC)
			this.follow = new Scribble.Objects.Arc(0, 0, 50, 0, Math.PI/2, "blue");
		window.collisionLevel = 0;
		if (this.follow)
			this.engine.objects.add(this.follow);
	}
}


class Doodleman extends Scribble.Objects.Entity {
	drawLayer = 2;
	feelsGravity = true;
	terminalVel = 10;
	normalMoveSpeed = 6;
	slowMoveSpeed = 3;
	targetMoveSpeed = this.normalMoveSpeed;
	moveAccel = 0.5;
	jumpAccel = 11;
	jumpCancelTime = 10;
	jumpCancelAccel = 3;
	static health = 4;
	knockBack = {x: 7, y: 5};
	jumpFrame = 0;
	kickDiving = false;
	airAttacks = 2;
	crouching = false;
	keys = { left: false, right: false, up: false, down: false };
	constructor(x: number, y: number, public slot: number, public direction: Scribble.DIR) {
		super(x, y);
		this.collision = {
			type: Scribble.Shape.BOX,
			weight: 0,
			x: -19/2, y: 0,
			width: 19, height: 44
		};
		this.animator = {name: "animations/Doodleman.json", x: 0, y: 0};
	}
	update(engine: Scribble.Engine) {
		if (this.jumpFrame > 0) {
			this.jumpFrame++;
		}
		if (this.isGrounded) {
			// TODO: move these to on grounded when it exists
			this.jumpFrame = 0;
			this.kickDiving = false;
			this.lockDirection = false;
			this.airAttacks = 2;
			this.gravityScale = 1;
			this.targetMoveSpeed = this.normalMoveSpeed;
		}
		this.controls(engine);
		super.update(engine);
		engine.debug.print("X: " + Math.round(this.x) + ", Y: " + Math.round(this.y));
	}
	finish(engine: Scribble.Engine) {
		this.chooseAnimation();
		super.finish(engine);
	}
	controls(engine: Scribble.Engine) {
		// left/right movement
		if (engine.input.key("KeyD")) this.move(1);
		if (engine.input.key("KeyA")) this.move(-1);

		// jumping and jump canceling
		if (this.jumpFrame > 0 && this.jumpFrame <= this.jumpCancelTime) {
			if (!engine.input.key("Space")) this.cancelJump();
		}
		if (engine.input.keyPress("Space") && this.canJump()) this.jump();

		// crouching
		if (this.isGrounded && engine.input.key("KeyS")) {
			this.moveSpeed = 0;
			this.crouching = true;
		}
		else this.crouching = false;

		// attacks
		this.keys = {
			left: !!engine.input.key("KeyA"),
			right: !!engine.input.key("KeyD"),
			up: !!engine.input.key("KeyW"),
			down: !!engine.input.key("KeyS")
		};
		if (engine.input.mousePress(0)) {
			if (this.isGrounded) this.act("attack");
			else if (this.airAttacks > 0) this.act("airAttack");
		}
	}
	chooseAnimation() {
		if (!this.animator) return;
		if (this.animator.lock === undefined) this.animator.lock = 0;
		if (this.animator.lock > 0 || this.animator.lock === "full") return;
		if (this.kickDiving) this.animate("kick-dive-fall", this.direction);
		else if (!this.isGrounded) this.animate("jump", this.direction);
		else if (this.velX != 0 || this.moveSpeed != 0) this.animate("run", this.direction);
		else if (this.crouching) this.animate("crouch", this.direction);
		else this.animate("stand", this.direction);
	}
	jump() {
		super.jump();
		this.jumpFrame = 1;
	}
	canJump() {
		return this.isGrounded;
	}
	cancelJump() {
		let gravity = this.objectManager? this.objectManager.engine.gravity : {x: 0, y: 0};
		let currentJumpVel = this.jumpAccel + gravity.y * (this.jumpFrame);
		// cancel the remaining velocity of the current jump and add some final compensation
		this.velY += -currentJumpVel + this.jumpCancelAccel;
		this.jumpFrame = 0;
	}
	static fromSpawnPoint(spawn: SpawnPoint) {
		return new this(spawn.x, spawn.y, spawn.slot, spawn.direction);
	}

	// Standard attack
	attackDuration = 20
	attackCooldown = 30
	attackInit = () => this.animate("attack", undefined, "full");
	attackTick = () => {}
	attackFinish = () => {}

	// Air attacks
	airAttackDuration = 10
	airAttackCooldown = 20
	airAttackInit = () => {
		let duration = 15;
		this.airAttacks--;
		this.jumpFrame = 0;
		this.kickDiving = false;
		this.lockDirection = false;
		let gravScale = 0.6;
		let force = 5;
		let diagonal = force * Math.cos(Math.PI/4);
		let keys = this.keys;
		// vertical axis only
		if (keys.left === keys.right) {
			// neutral
			if (keys.up === keys.down) {
				this.gravityScale = gravScale;
				this.animate("attack", this.direction, duration);
			}
			// up
			else if (keys.up) {
				this.feelsGravity = false;
				this.gravityScale = gravScale;
				this.lockMovement = true;
				this.targetMoveSpeed = this.slowMoveSpeed;
				this.velY = force;
				this.velX = this.moveSpeed = 0;
				this.animate("attack-upward", this.direction, duration);
			}
			// down
			else {
				this.velY = -force;
				this.velX = this.moveSpeed = 0;
				this.animate("attack", this.direction, duration);
			}
		}
		// horizontal pressed
		else {
			this.moveSpeed = 0;
			let dir: Scribble.DIR = keys.right? Scribble.RIGHT : Scribble.LEFT;
			// horizontal axis only
			if (keys.up === keys.down) {
				this.feelsGravity = false;
				this.gravityScale = gravScale;
				this.lockMovement = true;
				this.targetMoveSpeed = this.slowMoveSpeed;
				this.velX = keys.right? force : -force;
				this.velY = 0;
				this.animate("attack-charge-air", dir, duration);
			}
			// up diagonals
			else if (keys.up) {
				this.feelsGravity = false;
				this.gravityScale = gravScale;
				this.lockMovement = true;
				this.targetMoveSpeed = this.slowMoveSpeed;
				this.velX = keys.right? diagonal : -diagonal;
				this.velY = diagonal;
				this.animate("attack-upward-air", dir, duration);
			}
			// down diagonals
			else {
				this.velX = keys.right? diagonal : -diagonal;
				this.velY = -diagonal;
				this.kickDiving = true;
				this.lockDirection = true;
				this.animate("attack-kick-dive", dir, duration);
			}
		}
		
	}
	airAttackTick = () => {}
	airAttackFinish = () => {
		this.feelsGravity = true;
		this.lockMovement = false;
	}
};

class SpawnPoint extends Scribble.GameObject {
	constructor(x: number, y: number, public slot: number, public direction: Scribble.DIR) {
		super(x, y);
		let color = ["Blue", "Red", "Green", "Yellow"][slot % 4];
		let sheet = "animations/" + color + "man.json";
		this.animator = {name: sheet, x: 0, y: 0};
		this.animator.direction = direction;
	}
	draw() {}
	drawDebug(ctx: CanvasRenderingContext2D, images: Scribble.ImageManager, animations: Scribble.AnimationManager) {
		ctx.globalAlpha = 0.25;
		super.draw(ctx, images, animations);
		ctx.globalAlpha = 1;
		super.drawDebug(ctx, images, animations);
		ctx.fillStyle = ["blue", "red", "green", "yellow"][this.slot % 4];
		ctx.font = "10px Consolas";
		ctx.textAlign = "center";
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.scale(1, -1);
		ctx.translate(-this.x, -this.y);
		ctx.fillText(String(this.slot), this.x, this.y);
		ctx.restore();
	}
};


class Marker extends Scribble.GameObject {
	constructor(x: number, y: number, public name: string) {
		super(x, y);
	}
	drawDebug(ctx: CanvasRenderingContext2D, i: Scribble.ImageManager, a: Scribble.AnimationManager) {
		super.drawDebug(ctx, i, a);
		ctx.fillStyle = "yellow";
		ctx.font = "10px Consolas";
		ctx.textAlign = "center";
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.scale(1, -1);
		ctx.translate(-this.x, -this.y);
		ctx.fillText(this.name, this.x, this.y);
		ctx.restore();
	}
};

class PaintMan extends Scribble.Objects.Entity {
	feelsGravity = true;
	terminalVel = 10;
	static health = 2;
	constructor(x: number, y: number) {
		super(x, y);
		this.collision = {
			type: Scribble.Shape.BOX,
			weight: 0,
			x: -19/2, y: 0,
			width: 19, height: 44
		};
		this.animator = {name: "animations/PaintMinion.json", x: 0, y: 0};
	}
};

class HelloPlatform extends Scribble.GameObject {
	declare collision: Scribble.Collision.CollisionComponent & Scribble.Shape.Shaped<Scribble.Shape.Box>;
	constructor(x: number, y: number, width: number, height: number, graphic: string, xVel: number, yVel: number) {
		super(x, y);
		this.collision = {
			type: Scribble.Shape.BOX,
			weight: Infinity,
			x: -width/2, y: 0,
			width: width, height: height 
		};
		this.graphic = {
			type: Scribble.Shape.BOX,
			x: -width/2, y: 0,
			width: width, height: height,
			style: graphic
		};
		this.velX = xVel;
		this.velY = yVel;
	}
	update(engine: Scribble.Engine) {
		super.update(engine);
		if (this.x < -this.collision.width/2)
			this.x = engine.level.width + this.collision.width/2;
		else if (this.x > engine.level.width + this.collision.width/2)
			this.x = -this.collision.width/2;
	}
};

class Door extends Scribble.GameObject {
	drawLayer = -1;
	constructor(x: number, y: number, entranceID: number, destID: number, preventEnter: boolean, preventExit: boolean, destLevel: string) {
		super(x, y);
		this.animator = {name: "animations/Door.json", x: 0, y: 0};
	}
};

class Box201 extends Scribble.GameObject {
	feelsGravity = true;
	constructor(x: number, y: number) {
		super(x, y);
		this.collision = {
			type: Scribble.Shape.BOX,
			weight: 0,
			x: -25, y: 0,
			width: 50, height: 40
		};
		this.graphic = {
			type: Scribble.Shape.BOX,
			x: -25, y: 0,
			width: 50, height: 40,
			style: "res/Box201.png"
		};
	}
};

export const DMOs = {
	Doodleman: Doodleman,
	SpawnPoint: SpawnPoint,
	Marker: Marker,
	PaintMan: PaintMan,
	HelloPlatform: HelloPlatform,
	Door: Door,
	Box201: Box201
}

export default DoodlemanGame;