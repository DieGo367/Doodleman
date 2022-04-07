import * as Scribble from './scribble.js';
declare global {
	var collisionLevel;
}

class DoodlemanGame extends Scribble.Game {
	mode = null;
	follow;
	mouseX;
	mouseY;
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
				if (this.follow.collided) this.follow.graphic.style = "red";
				else this.follow.graphic.style = "blue";
				// this.follow.x = this.followX;
				// this.follow.y = this.followY;
				if (this.engine.input.key("KeyW")) this.follow.y += 5;
				if (this.engine.input.key("KeyA")) this.follow.x -= 5;
				if (this.engine.input.key("KeyS")) this.follow.y -= 5;
				if (this.engine.input.key("KeyD")) this.follow.x += 5;
				this.follow.collision.weight = window.collisionLevel;
				let coll = Scribble.Collision.getCollider(this.follow);
				let ss = Scribble.Collision.getShapeTops(coll, this.engine.gravity);
				for (let i = 0; i < ss.length; i++) {
					const shape = ss[i];
					if (Scribble.Collision.Intersect.shapePt(shape, this.engine.input.cursorPos()))
						this.follow.graphic.style = "green";
				}
			}
	
			let focus = {x: 0, y: 0};
			let playerCount = 0;
			this.engine.objects.forAllOfClass(DMOs.Doodleman, player => {
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
	onRenderUI(ctx) {
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
		this.engine.objects.forAllOfClass(DMOs.SpawnPoint, spawn => {
			if (spawn.slot === 0) {
				let p = DMOs.Doodleman.fromSpawnPoint(spawn);
				this.engine.objects.add(p);
				return false;
			}
		});
	}
	onmousemove(event) {
		let rect = this.engine.canvas.getBoundingClientRect();
		this.mouseX = event.pageX - rect.left;
		this.mouseY = event.pageY - rect.top;
		this.mouseX *= this.engine.width/rect.width;
		this.mouseY *= this.engine.height/rect.height;
	}
	onclick(event) {
		let rect = this.engine.canvas.getBoundingClientRect();
		if (this.follow && this.follow instanceof Scribble.Objects.Line) {
			let x2 = event.pageX - rect.left;
			let y2 = this.engine.canvas.height - (event.pageY - rect.top);
			let dx = x2 - this.follow.x;
			let dy = y2 - this.follow.y;
			this.follow.dx = this.follow.collision.dx = dx;
			this.follow.dy = this.follow.collision.dy = dy;
		}
		if (event.pageX - rect.left < 0) this.engine.levels.openFromFile();
	}
	tempTestBlocks(as = Scribble.Shape.CIRCLE) {
		this.engine.levels.clear();
		this.engine.objects.add(new Scribble.Objects.Box(400, 200, 100, 150, "black"));
		this.engine.objects.add(new Scribble.Objects.Line(10, 250, 300, 290, "black")); 
		this.engine.objects.add(new Scribble.Objects.Circle(205, 115, 40, "black")); 
		this.engine.objects.add(new Scribble.Objects.Polygon(350, 90, [
			[0, 0], [20, 70], [100, 80], [140, 30], [150, 0], [100, -60]
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
			this.follow = new Scribble.Objects.Polygon(60, 70, [[0, 0], [10, -70], [11, -100], [-15, -150], [-60, -115], [-70, -105], [-75, -97], [-80, -70], [-70, -25], [-60, -20], [-35, -3]], "blue");
		else if (as === Scribble.Shape.POINT)
			this.follow = new Scribble.Objects.Point(0, 0);
		else if (as === Scribble.Shape.ARC)
			this.follow = new Scribble.Objects.Arc(0, 0, 50, 0, Math.PI/2, "blue");
		window.collisionLevel = 0;
		this.engine.objects.add(this.follow);
	}
}


const DMOs = {} as any;

DMOs.Doodleman = class extends Scribble.Objects.Entity {
	constructor(x, y, public slot, public direction) {
		super(x, y);
		this.collision = {
			type: Scribble.Shape.BOX,
			weight: 0,
			x: -19/2, y: 0,
			width: 19, height: 44
		};
		this.animator = {name: "animations/Doodleman.json", x: 0, y: 0};
		delete this.drawLayer;
		delete this.feelsGravity;
		delete this.terminalVel;
		delete this.normalMoveSpeed;
		delete this.slowMoveSpeed;
		delete this.targetMoveSpeed;
		delete this.moveAccel;
		delete this.jumpAccel;
		delete this.jumpCancelTime;
		delete this.jumpCancelAccel;
		delete this.maxHealth;
		delete this.knockBack;
	}
	static proto(this) {
		super.proto();
		this.drawLayer = 2;
		this.feelsGravity = true;
		this.terminalVel = 10;
		this.normalMoveSpeed = 6;
		this.slowMoveSpeed = 3;
		this.targetMoveSpeed = this.normalMoveSpeed;
		this.moveAccel = 0.5;
		this.jumpAccel = 11;
		this.jumpCancelTime = 10;
		this.jumpCancelAccel = 3;
		this.maxHealth = 4;
		this.knockBack = {x: 7, y: 5};
	}
	update(engine) {
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
	finish(engine) {
		this.chooseAnimation();
		super.finish(engine);
	}
	controls(engine) {
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
		let currentJumpVel = this.jumpAccel + this.objectManager.engine.gravity.y * (this.jumpFrame);
		// cancel the remaining velocity of the current jump and add some final compensation
		this.velY += -currentJumpVel + this.jumpCancelAccel;
		this.jumpFrame = 0;
	}
	static fromSpawnPoint(spawn) {
		return new this(spawn.x, spawn.y, spawn.slot, spawn.direction);
	}

	// Standard attack
	attackDuration = 20
	attackCooldown = 30
	attackInit = () => this.animate("attack", null, "full");
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
			let dir = keys.right? Scribble.RIGHT : Scribble.LEFT;
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

DMOs.SpawnPoint = class extends Scribble.GameObject {
	constructor(x, y, public slot, public direction) {
		super(x, y);
		let color = ["Blue", "Red", "Green", "Yellow"][slot % 4];
		let sheet = "animations/" + color + "man.json";
		this.animator = {name: sheet, x: 0, y: 0};
		this.animator.direction = direction;
	}
	draw() {}
	drawDebug(ctx, images, animations) {
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
		ctx.fillText(this.slot, this.x, this.y);
		ctx.restore();
	}
};


DMOs.Marker = class extends Scribble.GameObject {
	constructor(x, y, public name) {
		super(x, y);
	}
	drawDebug(ctx, i, a) {
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

DMOs.PaintMan = class extends Scribble.Objects.Entity {
	constructor(x, y) {
		super(x, y);
		this.collision = {
			type: Scribble.Shape.BOX,
			weight: 0,
			x: -19/2, y: 0,
			width: 19, height: 44
		};
		this.animator = {name: "animations/PaintMinion.json", x: 0, y: 0};
		delete this.feelsGravity;
		delete this.terminalVel;
		delete this.maxHealth;
	}
	static proto(this) {
		super.proto();
		this.feelsGravity = true;
		this.terminalVel = 10;
		this.maxHealth = 2;
	}
};

DMOs.HelloPlatform = class extends Scribble.GameObject {
	declare collision: Scribble.Collision.CollisionComponent & Scribble.Shape.Box;
	constructor(x, y, width, height, graphic, xVel, yVel) {
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
	update(engine) {
		super.update(engine);
		if (this.x < -this.collision.width/2)
			this.x = engine.level.width + this.collision.width/2;
		else if (this.x > engine.level.width + this.collision.width/2)
			this.x = -this.collision.width/2;
	}
};

DMOs.Door = class extends Scribble.GameObject {
	constructor(x, y, entranceID, destID, preventEnter, preventExit, destLevel) {
		super(x, y);
		this.animator = {name: "animations/Door.json", x: 0, y: 0};
		delete this.drawLayer;
	}
	static proto(this) {
		this.drawLayer = -1;
	}
};

DMOs.Box201 = class extends Scribble.GameObject {
	constructor(x, y) {
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
		delete this.feelsGravity;
	}
	static proto(this) {
		super.proto();
		this.feelsGravity = true;
	}
};

export default DoodlemanGame;