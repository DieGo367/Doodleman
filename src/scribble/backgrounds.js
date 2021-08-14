Scribble.Backgrounds = class Backgrounds {
	constructor(engine) {
		this.engine = engine;
		this.bgs = [];
		this.minLayer = this.maxLayer = 0;
		this.rawBGs = 0;
	}
	load(background) {
		let bg = Object.assign({tick: 0}, background);
		this.bgs.push(bg);
		this.minLayer = Math.min(this.minLayer, bg.layer);
		this.maxLayer = Math.max(this.maxLayer, bg.layer);
		if (bg.type === "name") {
			if (!this.engine.images.hasImage(bg.name)) {
				this.engine.images.load(bg.name);
			}
		}
		else if (bg.type === "raw") {
			bg.name = "Raw:" + this.rawBGs;
			this.engine.images.loadB64(bg.name, bg.raw);
			this.rawBGs++;
		}
	}
	clearAll() {
		this.bgs = [];
		this.minLayer = this.maxLayer = 0;
		this.rawBGs = 0;
	}
	forAll(func) {
		for (let i = 0; i < this.bgs.length; i++) {
			let bg = this.bgs[i];
			if (bg) {
				func(bg);
			}
			else this.bgs.splice(i--, 1);
		}
	}
	renderLayer(layer) {
		let level = this.engine.level.data;
		let cam = this.engine.camera;
		this.forAll(bg => {
			if (bg.layer == layer) {
				let x = Math.max(0, cam.left());
				let y = Math.max(0, cam.bottom());
				let width = Math.min(level.width, cam.right()) - x;
				let height = Math.min(level.height, cam.top()) - y;
				let offsetX = bg.tick * bg.velX;
				let offsetY = bg.tick * bg.velY;
				this.engine.images.drawPattern(bg.name, x, y, width, height, bg.scale, bg.parallax, offsetX, offsetY);
				if (!this.engine.paused) bg.tick++;
			}
		});
	}
};