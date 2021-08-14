Scribble.Engine = class Engine {
	constructor(divID, canvasWidth, canvasHeight, resources) {
		// sub parts
		this.images = new Scribble.Images(this);
		this.sounds = new Scribble.Sounds();
		this.animations = new Scribble.Animations(this);
		this.level = new Scribble.Level(this);
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
		this._collectResources(resources);
		// state
		this.paused = false;
		this.gravity = {x: 0, y: 0};
		this.friction = 0.9;
		this.frictionSnap = 0.1;
		this.airResistance = 0.9;
	}
	ready(func) {
		if (typeof func == "function") {
			this.readyFunc = func;
		}
		else console.error("Expected a function argument");
	}
	request(url) {
		// TODO: add more cases to this then just JSON data
		return fetch(url).then(response => response.json());
	}
	_collectResources(resources) {
		for (let listType in resources) {
			let listName = resources[listType]; 
			if (["images","sounds","animations","levels"].indexOf(listType) != -1) {
				let callback = () => this._checkLoadComplete();
				this.request(listName).then(data => {
					if (listType == "images") this.images.loadAll(data, callback);
					else if (listType == "sounds") this.sounds.loadAll(data, callback);
					else if (listType == "animations") this.animations.loadAll(data, callback);
					else if (listType == "levels") this.level.loadAll(data, callback);
					else console.error("Unknown resource type after initial check: "+listType);
				});
				this._checkLoadComplete();
			}
			else console.warn("Unknown resource type: "+listType);
		}
	}
	_checkLoadComplete() {
		let count = this.images.loadingCount;
		count += this.sounds.loadingCount;
		count += this.animations.loadingCount;
		count += this.level.loadingCount;
		if (count == 0) {
			if (this.readyFunc) this.readyFunc();
		}
	}
	loadGame(Game) {
		if (Game.prototype instanceof Scribble.Game) {
			this.game = new Game(this);
			this.game.init();
		}
		else console.error("Given game is not a Scribble.Game.");
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
			this.objects.update();
			Scribble.Collision.run(this.objects.map, this.gravity, this.level.data);
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
		this.ctx.fillRect(0, 0, this.level.data.width, this.level.data.height);
		// render layers
		this._renderLevelLayers();
		// restore original state
		this.ctx.restore();
		this.images.flip();
	}
	_renderLevelLayers() {
		let min = Math.min(this.backgrounds.minLayer);
		let max = Math.min(this.backgrounds.maxLayer);
		for (let i = min; i <= max; i++) {
			this.backgrounds.renderLayer(i);
		}
		// render objects
		this.objects.render();
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