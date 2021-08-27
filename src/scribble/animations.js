Scribble.Animations = class Animations {
	constructor(engine) {
		this.engine = engine;
		this.map = {};
		this.loadingCount = 0;
	}
	load(filename) {
		this.loadingCount++;
		fetch(filename).then(res => res.json()).then(data => {
			this.map[filename] = new Scribble.Animation(filename, data);
			this.loadingCount--;
			if (this.loadingCount == 0) this.onLoadedAll();
		});
	}
	loadAll(list, callback) {
		if (callback) {
			if (typeof callback == "function") this.onLoadFunc = callback;
		}
		for (let i = 0; i < list.length; i++) {
			this.load(list[i]);
		}
	}
	onLoadedAll() {
		this.inheritance();
		if (this.onLoadFunc) {
			this.onLoadFunc();
			this.onLoadFunc = null;
		}
	}
	inheritance() {
		for (let name in this.map) {
			let target = this.map[name];
			if (target) {
				if (target.extends && !target.extended) target.extend(this.map);
			}
		}
	}
	render(ctx, x, y, component) {
		// get animation sheet
		let sheet = this.map[component.name];
		if (sheet) {
			// get relevant image
			let imgName = sheet.pages[component.page||0];
			let img = this.engine.images.getImage(imgName);
			if (img) {
				// find animation action
				if (component.animation == null) {
					component.animation = sheet.defaultAnimation;
				}
				let anim = sheet.get(component.animation);
				if (anim) {
					let frameX = 0, frameY = 0;

					// apply directional sheet offset
					if (sheet.hasDirection) {
						let offset = (
							component.direction == Scribble.LEFT? sheet.sheetOffsets.left
							: (component.direction == Scribble.RIGHT? sheet.sheetOffsets.right
							: sheet.sheetOffsets.right
						));
						frameX = offset.x;
						frameY = offset.y;
					}
					
					// position at correct frame in spritesheet
					frameX += sheet.spriteWidth * anim.col;
					frameY += sheet.spriteHeight * anim.row;

					// move corresponding amount of frames forward in the animation
					let frameIndex = Math.floor((component.tick||0) * anim.framerate);
					let frame = this.getFrameData(frameIndex, anim, "frame");
					frameX += frame * sheet.spriteWidth;
					
					// determine alpha value for frame
					let frameAlpha = 1;
					if (anim.alphas) {
						frameAlpha = this.getFrameData(frameIndex, anim, "alpha");
					}

					// draw image
					let alpha = ctx.globalAlpha;
					ctx.globalAlpha *= frameAlpha;
					ctx.drawImage(img,
						frameX, img.height - frameY,
						sheet.spriteWidth, -sheet.spriteHeight,
						Math.floor(x + component.x) + sheet.drawOffset.x,
						Math.floor(y + component.y) + sheet.drawOffset.y,
						sheet.spriteWidth, sheet.spriteHeight);
					ctx.globalAlpha = alpha;
				}
				else console.warn("Missing animation: " + component.animation);
			}
			else console.warn("Image "+imgName+" not found!");
		}
		else console.warn("Unknown animation file " + component.name);
	}
	set(component, animation, direction, lockTime) {
		// this.engine.debug.print("set anim " + component.name)
		if (component.lock > 0) {
			component.lock--;
			return false;
		}
		if (direction != void(0)) component.direction = direction;
		if (component.animation === animation) return true;
		component.previous = component.animation;
		component.animation = animation;
		component.tick = 0;
		if (lockTime === "full") {
			let action = this.getAction(component);
			this.lock = action.frameCount / action.framerate;
		}
		else if (typeof lockTime === "number") {
			component.lock = lockTime;
		}
		return true;
	}
	getAction(component) {
		let sheet = this.map[component.name];
		if (sheet) {
			if (component.animation == void(0)) {
				component.animation = sheet.defaultAnimation;
			}
			let action = sheet.get(component.animation);
			if (action) return action;
			else console.error("Missing animation: " + component.animation);
		}
		else console.error("Unknown animation file " + component.name);
	}
	tick(component) {
		let action = this.getAction(component);
		component.tick++;
		if (Math.floor(component.tick * action.framerate) >= action.frameCount) {
			component.tick = 0;
			component.lock = 0;
			component.previous = component.animation;
		}
	}
	getFrameData(frameIndex, action, key, resolveChildren) {
		let chain = key.split(".");
		if (!action.data) return console.error("Frame data not provided!", action);
		let value = action.data;
		while (chain.length > 0) value = value[chain.shift()];
		if (value instanceof Array) {
			return value[frameIndex];
		}
		else if (typeof value === "object") {
			if (resolveChildren) return this.resolveObjectChildren(frameIndex, value);
		}
		return value;
	}
	resolveObjectChildren(frameIndex, obj) {
		for (let property in obj) if (obj.hasOwnProperty(property)) {
			if (obj[property] instanceof Array) {
				obj[property] = obj[property][frameIndex];
			}
			else if (typeof obj[property] === "object") {
				obj[property] = this.resolveObjectChildren(frameIndex, obj[property]);
			}
		}
		return obj;
	}
	getFrameDataFromComponent(component, key, resolveChildren) {
		let frameIndex = Math.floor((component.tick||0) * action.framerate);
		return this.getFrameData(frameIndex, this.getAction(component), key, resolveChildren);
	}
};

Scribble.Animation = class Animation {
	constructor(filename, data) {
		Object.assign(this, data);
		this.name = filename;
	}
	extend(map) {
		let source = map[this.extends];
		if (source) {
			if (source.extends && !source.extended) source.extend(map);
			for (let property in source) {
				if (this[property] === void(0)) {
					this[property] = source[property];
				}
			}
		}
		else console.log("Couldn't extend animations from: "+this.extends);
	}
	get(action) {
		for (let i = 0; i < this.animations.length; i++) {
			if (this.animations[i].action === action) return this.animations[i];
		}
		return null;
	}
};