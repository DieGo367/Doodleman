class DoodlemanGame extends Scribble.Game {
	constructor(engine) {
		super(engine);
		this.mode = null;
	}
	init() {
		// called when first loaded
		this.engine.setSpeed(1000/60);
		this.engine.setGravity(0, -1.1);
		this.engine.setFriction(0.7, 0.1);
		this.engine.setAirResistance(0.92);
		this.engine.loadActorData("data/actors.json").then(() => {
			this.engine.registerClasses(DMOs);
			let url = new URL(window.location.href);
			let level = url.searchParams.get("level");
			if (level) this.engine.level.set("levels/"+level+".json");
			else this.engine.level.set("levels/1st Platformy Level.json");
			// this.tempTestBlocks();
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
		if (this.engine.input.keyEventDown("Enter")) {
			this.engine.debug.frameCanStep = true;
		}
		if (this.engine.input.keyEventDown("Backquote")) {
			this.engine.level.set(this.engine.level.data);
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
				this.follow.collision.level = window.collisionLevel;
				let coll = Scribble.Collision.getCollider(this.follow);
				let ss = Scribble.Collision.getShapeTops(coll, this.engine.gravity);
				for (let i = 0; i < ss.length; i++) {
					const shape = ss[i];
					if (Scribble.Collision.intersectFuncMap[Scribble.SHAPE.POINT][shape.type](this.engine.input.cursorPos(), shape))
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
		super.onRenderUI();
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
		if (event.pageX - rect.left < 0) this.engine.level.loadFromFile();
	}
	tempTestBlocks() {
		this.engine.objects.add(new Scribble.Objects.Box(400, 200, 100, 150, "black"));
		this.engine.objects.add(new Scribble.Objects.Line(10, 250, 300, 290, "black")); 
		this.engine.objects.add(new Scribble.Objects.Circle(205, 115, 40, "black")); 
		this.engine.objects.add(new Scribble.Objects.Polygon(450, 90, [
			[-100, 0], [-80, 70], [0, 80], [40, 30], [50, 0], [0, -60]
		], "black"));

		// this.follow = new Scribble.Objects.Box(0, 0, 40, 50, "blue");
		this.follow = new Scribble.Objects.Circle(0, 0, 40, "blue");
		// this.follow = new Scribble.Objects.Line(0, 0, 40, 40, "blue");
		// this.follow = new Scribble.Objects.Polygon(0, 0, [[60, 70], [70, 0], [71, -30], [45, -80], [0, -45], [-10, -35], [-15, -27], [-20, 0], [-10, 45], [0, 50], [25, 67]], "blue");
		window.collisionLevel = 0;
		this.engine.objects.add(this.follow);
	}
}


const DMOs = {};

DMOs.Entity = class extends Scribble.Object {
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

DMOs.Doodleman = class extends DMOs.Entity {
	constructor(x, y, slot, direction) {
		super(x, y);
		this.slot = slot;
		this.direction = direction;
		this.collision = {
			type: Scribble.SHAPE.BOX,
			level: 0,
			x: -19/2, y: 0,
			width: 19, height: 44
		};
		let sheet = "animations/Doodleman.json";
		this.animation = {
			x: 0, y: 0,
			name: sheet
		};
	}
	static actions = Object.assign({}, super.actions)
	static proto() {
		super.proto();
		this.drawLayer = 2;
		this.feelsGravity = true;
		this.targetMoveSpeed = 6;
		this.moveAccel = 0.5;
		this.jumpAccel = 14;
		this.jumpCancelTime = 10;
		this.jumpCancelAccel = 3;
	}
	update(engine) {
		if (this.jumpFrame > 0) {
			this.jumpFrame++;
		}
		if (this.isGrounded) this.jumpFrame = 0;
		this.controls(engine);
		this.animations(engine);
		super.update(engine);
		engine.debug.print("X: " + Math.round(this.x) + ", Y: " + Math.round(this.y));
	}
	controls(engine) {
		if (engine.input.key("KeyD")) this.move(1);
		if (engine.input.key("KeyA")) this.move(-1);
		if (this.jumpFrame > 0 && this.jumpFrame <= this.jumpCancelTime) {
			if (!engine.input.key("KeyW")) this.cancelJump();
		}
		if (engine.input.keyPress("KeyW") && this.canJump()) this.jump();
		if (engine.input.key("KeyS")) {
			this.moveSpeed = 0;
			this.crouching = true;
		}
		else this.crouching = false;

		if (engine.input.key("KeyG")) this.act(engine, "attack");
	}
	animations(e) {
		if (!this.isGrounded) this.animate(e, "jump", this.direction);
		else if (this.velX != 0 || this.moveSpeed != 0) this.animate(e, "run", this.direction);
		else if (this.crouching) this.animate(e, "crouch", this.direction);
		else this.animate(e, "stand", this.direction);
	}
	jump() {
		super.jump();
		this.jumpFrame = 1;
	}
	canJump() {
		return this.isGrounded;
	}
	cancelJump() {
		let currentJumpVel = this.jumpAccel + engine.gravity.y * (this.jumpFrame);
		// cancel the remaining velocity of the current jump and add some final compensation
		this.velY += -currentJumpVel + this.jumpCancelAccel;
		this.jumpFrame = 0;
	}
	static fromSpawnPoint(spawn) {
		return new this(spawn.x, spawn.y, spawn.slot, spawn.direction);
	}
};
DMOs.Doodleman.defineAction("attack", 20, 10,
	(e, frame) => {
		console.log(frame)
	},
	e => {
		console.log("finished")
	},
"attack");

DMOs.SpawnPoint = class extends Scribble.Object {
	constructor(x, y, slot, direction) {
		super(x, y);
		this.slot = slot;
		this.direction = direction;
		let color = ["Blue", "Red", "Green", "Yellow"][slot % 4];
		let sheet = "animations/" + color + "man.json";
		this.animation = {
			x: 0, y: 0,
			name: sheet,
			direction: direction
		};
	}
	draw() {}
	drawDebug(ctx, images, animation) {
		ctx.globalAlpha = 0.25;
		super.draw(ctx, images, animation);
		ctx.globalAlpha = 1;
		super.drawDebug(ctx, images, animation);
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


DMOs.Marker = class extends Scribble.Object {
	constructor(x, y, name) {
		super(x, y);
		this.name = name;
	}
	drawDebug(ctx) {
		super.drawDebug(ctx);
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

DMOs.PaintMan = class extends DMOs.Entity {
	constructor(x, y) {
		super(x, y);
		this.collision = {
			type: Scribble.SHAPE.BOX,
			level: 0,
			x: -19/2, y: 0,
			width: 19, height: 44
		};
		this.animation = {
			x: 0, y: 0,
			name: "animations/PaintMinion.json"
		};
	}
	static proto() {
		super.proto();
		this.feelsGravity = true;
	}
};

DMOs.HelloPlatform = class extends Scribble.Object {
	constructor(x, y, width, height, graphic, xVel, yVel) {
		super(x, y);
		this.collision = {
			type: Scribble.SHAPE.BOX,
			level: Infinity,
			x: -width/2, y: 0,
			width: width, height: height 
		};
		this.graphic = {
			shape: Scribble.SHAPE.BOX,
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
			this.x = engine.level.data.width + this.collision.width/2;
		else if (this.x > engine.level.data.width + this.collision.width/2)
			this.x = -this.collision.width/2;
	}
};

DMOs.Door = class extends Scribble.Object {
	constructor(x, y, entranceID, destID, preventEnter, preventExit, destLevel) {
		super(x, y);
		this.animation = {
			x: 0, y: 0,
			name: "animations/Door.json"
		};
	}
	static proto() {
		this.drawLayer = -1;
	}
};

DMOs.Box201 = class extends Scribble.Object {
	constructor(x, y) {
		super(x, y);
		this.collision = {
			type: Scribble.SHAPE.BOX,
			level: 0,
			x: -25, y: 0,
			width: 50, height: 40
		};
		this.graphic = {
			shape: Scribble.SHAPE.BOX,
			x: -25, y: 0,
			width: 50, height: 40,
			style: "res/Box201.png"
		};
	}
	static proto() {
		super.proto();
		this.feelsGravity = true;
	}
};