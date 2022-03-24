export class AnimationManager extends ResourceManager {
	constructor(engine) {
		super(engine, "Animations");
	}
	_request = src => this.engine.requestData(src)
	loadAs(name, src) {
		return super.loadAs(name, src).then(data => {
			return this.map[name] = new AnimationSheet(name, data);
		});
	}
	loadList(list) {
		return super.loadList(list).then(() => this.inheritance());
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
			let img = this.engine.images.get(imgName);
			if (img) {
				// find the current animation
				if (component.current == null) {
					component.current = sheet.defaultAnimation;
				}
				let anim = sheet.get(component.current);
				if (anim) {
					let frameX = 0, frameY = 0;

					// apply directional sheet offset
					if (sheet.hasDirection) {
						let offset = (
							component.direction == LEFT? sheet.sheetOffsets.left
							: (component.direction == RIGHT? sheet.sheetOffsets.right
							: sheet.sheetOffsets.right
						));
						frameX = offset.x;
						frameY = offset.y;
					}
					
					// position at correct frame in spritesheet
					frameX += sheet.spriteWidth * anim.col;
					frameY += sheet.spriteHeight * anim.row;

					// move corresponding amount of frames forward in the animation
					let frameIndex = Math.floor((component.tick||0) * anim.frameRate);
					let frame = this.getFrameData(frameIndex, anim, "frame") || 0;
					frameX += frame * sheet.spriteWidth;
					
					// determine alpha value for frame
					let alpha = this.getFrameData(frameIndex, anim, "alpha");

					// draw image
					let globalAlpha = ctx.globalAlpha;
					ctx.globalAlpha *= alpha;
					ctx.drawImage(img,
						frameX, img.height - frameY,
						sheet.spriteWidth, -sheet.spriteHeight,
						Math.floor(x + component.x) + sheet.drawOffset.x,
						Math.floor(y + component.y) + sheet.drawOffset.y,
						sheet.spriteWidth, sheet.spriteHeight);
					ctx.globalAlpha = globalAlpha;
				}
				else console.warn("Missing animation: " + component.current);
			}
			else console.warn("Image "+imgName+" not found!");
		}
		else console.warn("Unknown animation file " + component.name);
	}
	set(component, animationName, direction, lockTime) {
		if (component.lock > 0 || component.lock === "full") return false;
		if (direction != void(0)) component.direction = direction;
		if (component.current === animationName) return true;
		component.previous = component.current;
		component.current = animationName;
		component.tick = 0;
		if (lockTime === "full" || typeof lockTime === "number") {
			component.lock = lockTime;
		}
		return true;
	}
	getAnimation(component) {
		let sheet = this.map[component.name];
		if (sheet) {
			if (component.current == void(0)) {
				component.current = sheet.defaultAnimation;
			}
			let anim = sheet.get(component.current);
			if (anim) return anim;
			else console.error("Missing animation: " + component.current);
		}
		else console.error("Unknown animation file " + component.name);
	}
	tick(component) {
		let anim = this.getAnimation(component);
		component.tick++;
		if (component.lock === "full") component.lock = anim.frameCount / anim.frameRate;
		if (component.lock > 0) component.lock--;
		if (Math.floor(component.tick * anim.frameRate) >= anim.frameCount) {
			component.tick = 0;
			component.previous = component.current;
		}
	}
	getFrameData(frameIndex, anim, key) {
		let chain = key.split(".");
		if (!anim.data) throw new Error("Frame data not provided!");
		let value = anim.data;
		while (chain.length > 0) value = value[chain.shift()];
		return this.resolveDataValue(frameIndex, value);
	}
	resolveDataValue(frameIndex, value) {
		if (value instanceof Array) return value[frameIndex];
		else if (typeof value === "object" && value.response) return this.resolveDataResponse(frameIndex, value);
		else return value;
	}
	resolveDataResponse(frameIndex, response) {
		switch(response.response) {
			case "expression":
				let validExpr = /^([0-9x\.+\-*/%() ]|floor\(|ceil\(|round\()+$/;
				if (validExpr.test(response.expression)) {
					let expr = response.expression.replace(/x/g, frameIndex);
					expr = expr.replace(/floor\(/g, "Math.floor(");
					expr = expr.replace(/ceil\(/g, "Math.ceil(");
					expr = expr.replace(/round\(/g, "Math.round(");
					return eval(expr);
				}
				else throw new Error(`Invalid expression: ${response.expression}`);

			case "keyframes":
				while (frameIndex >= 0) {
					let item = response[frameIndex];
					if (item !== void(0)) return JSON.parse(JSON.stringify(item));
					frameIndex--;
				}
				return;
			
			case "data":
				let resolved = {};
				for (let key in response) {
					if (key === "response") continue;
					resolved[key] = this.resolveDataValue(frameIndex, response[key]);
				}
				return resolved;
			
			default:
				throw new Error(`Unknown data response type "${response.response}"`);
		}
	}
	getFrameDataFromComponent(component, key) {
		let anim = this.getAnimation(component);
		let frameIndex = Math.floor((component.tick||0) * anim.frameRate);
		return this.getFrameData(frameIndex, anim, key);
	}
};

export class AnimationSheet {
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
	get(animationName) {
		if (this.animations[animationName]) return this.animations[animationName];
		return null;
	}
}

export class AnimationComponent {
	constructor(x, y, sheetName) {
		this.x = x;
		this.y = y;
		this.name = sheetName;
	}
}