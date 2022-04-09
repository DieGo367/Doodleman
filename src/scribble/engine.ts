import { Game } from "./game.js";
import { ImageManager } from "./images.js";
import { SoundManager } from "./sounds.js";
import { AnimationManager } from "./animations.js";
import { LevelManager, BlankLevel, Level } from "./level.js";
import { ObjectClass, ObjectManager } from "./object.js";
import * as Collision from "./collision.js";
import { Camera } from "./camera.js";
import { InputManager } from "./input.js";
import { Backgrounds } from "./backgrounds.js";
import { FileLoader } from "./file.js";
import { Debug } from "./debug.js";
import { COLOR } from "./util.js";

type Resources = "images" | "sounds" | "animations" | "levels";

export class Engine {
	// resource managers
	images: ImageManager;
	sounds: SoundManager;
	animations: AnimationManager;
	levels: LevelManager;
	// engine components
	objects: ObjectManager;
	camera: Camera;
	input: InputManager;
	backgrounds: Backgrounds;
	file: FileLoader;
	debug: Debug;
	// page setup
	div: HTMLElement;
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	// engine state
	level: Level = {...BlankLevel};
	levelReady = true;
	paused = false;
	gravity = {x: 0, y: 0};
	friction = 0.9;
	frictionSnap = 0.1;
	airResistance = 0.9;
	// game loading
	readyFunc = () => {};
	loadingCompleted = false;
	game: Game;
	tickSpeed: number;
	interval: number;
	constructor(divID: string, canvasWidth: number, canvasHeight: number, resources: {[resourceName in Resources]: string}) {
		// resource managers
		this.images = new ImageManager(this);
		this.sounds = new SoundManager(this);
		this.animations = new AnimationManager(this);
		this.levels = new LevelManager(this);
		// sub parts
		this.level = Object.assign({}, BlankLevel);
		this.objects = new ObjectManager(this);
		this.camera = new Camera(this, canvasWidth/2, canvasHeight/2, canvasWidth, canvasHeight);
		this.input = new InputManager(this);
		this.backgrounds = new Backgrounds(this);
		this.file = new FileLoader();
		this.debug = new Debug(this);
		// page setup
		this.div = document.getElementById(divID);
		this.canvas = document.createElement("canvas");
		this.canvas.width = this.width = canvasWidth;
		this.canvas.height = this.height = canvasHeight;
		this.canvas.style.width = canvasWidth + "px";
		this.canvas.style.height = canvasHeight + "px";
		this.div.appendChild(this.canvas);
		this.ctx = this.images.ctx = this.canvas.getContext("2d");
		// state
		this.levelReady = true;
		this.paused = false;
		this.gravity = {x: 0, y: 0};
		this.friction = 0.9;
		this.frictionSnap = 0.1;
		this.airResistance = 0.9;
		// final load
		this._collectResources(resources);
	}
	ready(func: () => void) {
		if (typeof func == "function") {
			this.readyFunc = func;
			if (this.loadingCompleted) func();
		}
		else throw new TypeError("Expected a function");
	}
	request(url: string) { return fetch(url); }
	requestData(url: string): Promise<unknown> { return this.request(url).then(response => response.json()); }
	async _collectResources(resources: {[resourceName: string]: string}) {
		if (resources) {
			let lists = [];
			let batches = [] as Promise<unknown>[];
			for (let listType in resources) {
				let listName = resources[listType]; 
				lists.push(this.requestData(listName).then(list => {
					if (list instanceof Array && list.every(item => typeof item === "string")) {
						if (listType === "images") batches.push(this.images.loadList(list));
						else if (listType === "sounds") batches.push(this.sounds.loadList(list));
						else if (listType === "animations") batches.push(this.animations.loadList(list));
						else if (listType === "levels") batches.push(this.levels.loadList(list));
						else throw new Error("Unknown resource type: "+listType);
					}
				}));
			}
			await Promise.all(lists);
			await Promise.all(batches);
		}
		this.loadingCompleted = true;
		this.readyFunc();
	}
	loadGame<Type extends Game>(GameClass: {new (...args: any[]): Type}) {
		if (GameClass.prototype instanceof Game) {
			this.game = new GameClass(this);
			this.game.init();
		}
		else throw new TypeError("Given game is not a Game class");
	}
	setSpeed(tickSpeed: number) {
		this.tickSpeed = tickSpeed;
		this._resetInterval();
	}
	setGravity(x: number, y: number) {
		this.gravity.x = x;
		this.gravity.y = y;
	}
	setFriction(u: number, lowerSnap: number) {
		this.friction = u;
		this.frictionSnap = lowerSnap;
	}
	setAirResistance(u: number) {
		this.airResistance = u;
	}
	setFullscreen(bool: boolean) {
		if (bool) {
			this.canvas.requestFullscreen();
		}
		else {
			document.exitFullscreen();
		}
	}
	_resetInterval() {
		if (this.interval !== undefined) window.clearInterval(this.interval);
		this.interval = window.setInterval(() => {
			this._run();
		}, this.tickSpeed);
	}
	canUpdate() {
		return this.levelReady && !this.paused && (this.debug.frameStepper != this.debug.frameCanStep);
	}
	_run() {
		this.debug.update();
		this.game.tick();
		if (this.canUpdate()) {
			this.objects.start();
			this.objects.update();
			this.objects.attackUpdate();
			Collision.run(this.objects.map, this.gravity, this.level);
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
		if (this.levelReady) this._renderLevel();
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
		this.ctx.fillStyle = COLOR.BACKDROP;
		this.ctx.fillRect(0, 0, this.width, this.height);
		// camera zoom/pan
		this.ctx.translate(this.width/2, this.height/2);
		this.ctx.scale(this.camera.zoom, this.camera.zoom);
		this.ctx.translate(-this.camera.x, -this.camera.y);
		// level space
		this.ctx.fillStyle = COLOR.LEVEL;
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
	async loadActorData(url: string) {
		await this.objects.loadActorData(url);
	}
	registerClasses(classGroup: {[name: string]: ObjectClass}) {
		this.objects.registerClasses(classGroup);
	}
}