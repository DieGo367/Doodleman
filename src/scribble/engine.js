Scribble.Engine = class Engine {
	constructor(divID, canvasWidth, canvasHeight, resources) {
		// resource managers
		this.images = new Scribble.ImageManager(this);
		this.sounds = new Scribble.SoundManager(this);
		this.animations = new Scribble.AnimationManager(this);
		this.levels = new Scribble.LevelManager(this);
		// sub parts
		this.level = Object.assign({}, Scribble.BlankLevel);
		this.objects = new Scribble.ObjectManager(this);
		this.camera = new Scribble.Camera(this, canvasWidth/2, canvasHeight/2, canvasWidth, canvasHeight);
		this.input = new Scribble.InputManager(this);
		this.backgrounds = new Scribble.Backgrounds(this);
		this.file = new Scribble.File();
		this.debug = new Scribble.Debug(this);
		// page setup
		this.div = document.getElementById(divID);
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.width = canvasWidth;
		this.canvas.height = this.height = canvasHeight;
		this.canvas.style.width = canvasWidth + "px";
		this.canvas.style.height = canvasHeight + "px";
		this.div.appendChild(this.canvas);
		this.ctx = this.images.ctx = this.backgrounds.ctx = this.canvas.getContext("2d");
		// state
		this.paused = false;
		this.gravity = {x: 0, y: 0};
		this.friction = 0.9;
		this.frictionSnap = 0.1;
		this.airResistance = 0.9;
		// final load
		this._collectResources(resources);
	}
	ready(func) {
		if (typeof func == "function") {
			this.readyFunc = func;
			if (this.loadingCompleted) func();
		}
		else throw new TypeError("Expected a function");
	}
	request = url => fetch(url);
	requestData = url => this.request(url).then(response => response.json());
	async _collectResources(resources) {
		if (resources) {
			let lists = [];
			let batches = [];
			for (let listType in resources) {
				let listName = resources[listType]; 
				lists.push(this.requestData(listName).then(list => {
					if (listType === "images") batches.push(this.images.loadList(list));
					else if (listType === "sounds") batches.push(this.sounds.loadList(list));
					else if (listType === "animations") batches.push(this.animations.loadList(list));
					else if (listType === "levels") batches.push(this.levels.loadList(list));
					else throw new Error("Unknown resource type: "+listType);
				}));
			}
			await Promise.all(lists);
			await Promise.all(batches);
		}
		this.loadingCompleted = true;
		if (this.readyFunc) this.readyFunc();
	}
	loadGame(Game) {
		if (Game.prototype instanceof Scribble.Game) {
			this.game = new Game(this);
			this.game.init();
		}
		else throw new TypeError("Given game is not a Scribble.Game");
	}
	setSpeed(tickSpeed) {
		this.tickSpeed = tickSpeed;
		this._resetInterval();
	}
	setGravity(x, y) {
		this.gravity.x = x;
		this.gravity.y = y;
	}
	setFriction(u, lowerSnap) {
		this.friction = u;
		this.frictionSnap = lowerSnap;
	}
	setAirResistance(u) {
		this.airResistance = u;
	}
	setFullscreen(bool) {
		if (bool) {
			this.canvas.requestFullscreen();
		}
		else {
			document.exitFullscreen();
		}
	}
	_resetInterval() {
		if (this.interval) window.clearInterval(this.interval);
		this.interval = window.setInterval(() => {
			this._run();
		}, this.tickSpeed);
	}
	canUpdate() {
		return !this.paused && (this.debug.frameStepper != this.debug.frameCanStep);
	}
	_run() {
		this.debug.update();
		this.game.tick();
		if (this.canUpdate()) {
			this.objects.start();
			this.objects.update();
			this.objects.attackUpdate();
			Scribble.Collision.run(this.objects.map, this.gravity, this.level);
			this.objects.finish();
			this.input.gameUpdate();
		}
		this.input.finish();
		this.debug.frameCanStep = false;
		window.requestAnimationFrame(() => this._render());
	}
	_render() {
		// adjust for screen density
		let density = window.devicePixelRatio;
		if (document.fullscreenElement === this.canvas) {
			let widthScale = window.innerWidth / this.width;
			let heightScale = window.innerHeight / this.height;
			let resolution = Math.max(widthScale, heightScale);
			density *= resolution;
		}
		this.canvas.width = this.width * density;
		this.canvas.height = this.height * density;
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.save();
		this.ctx.scale(density, density);
		// render passes
		this._renderLevel();
		this._renderUI();
		// finished
		this.ctx.restore();
	}
	_renderLevel() {
		this.ctx.save();
		// flip Y coordinate
		this.ctx.scale(1,-1);
		this.ctx.translate(0, -this.height);
		this.images.flip();
		// default backdrop
		this.ctx.fillStyle = Scribble.COLOR.BACKDROP;
		this.ctx.fillRect(0, 0, this.width, this.height);
		// camera zoom/pan
		this.ctx.translate(this.width/2, this.height/2);
		this.ctx.scale(this.camera.zoom, this.camera.zoom);
		this.ctx.translate(-this.camera.x, -this.camera.y);
		// level space
		this.ctx.fillStyle = Scribble.COLOR.LEVEL;
		this.ctx.fillRect(0, 0, this.level.width, this.level.height);
		// render layers
		this._renderLevelLayers();
		// restore original state
		this.ctx.restore();
		this.images.flip();
	}
	_renderLevelLayers() {
		let min = Math.min(this.backgrounds.minLayer, this.objects.minLayer);
		let max = Math.max(this.backgrounds.maxLayer, this.objects.maxLayer);
		for (let i = min; i <= max; i++) {
			this.backgrounds.renderLayer(i);
			this.objects.renderLayer(i);
		}
		if (this.debug.enabled) this.objects.renderDebug();
	}
	_renderUI() {
		this.game.onRenderUI(this.ctx);
		if (this.debug.enabled) this.debug.render(this.ctx);
	}
	async loadActorData(url) {
		await this.objects.loadActorData(url);
	}
	registerClasses(classGroup) {
		this.objects.registerClasses(classGroup);
	}
};