export class Debug {
	enabled = false;
	lines = [];
	dict = {};
	frameStepper = true;
	frameCanStep = false;
	constructor(public engine) {}
	toggle() {
		this.enabled = !this.enabled;
	}

	set(key, text) {
		if (typeof text === "object") this.dict[key] = JSON.stringify(text);
		else this.dict[key] = text;
	}
	remove(key) {
		delete this.dict[key];
	}
	print() {
		for (let i = 0; i < arguments.length; i++) {
			let arg = arguments[i];
			if (typeof arg === "object") {
				this.lines.push(JSON.stringify(arg));
			}
			else this.lines.push(arg);
		}
	}

	update() {
		this.lines = [];
	}
	render(ctx) {
		ctx.fillStyle = "black";
		ctx.font = "12px Consolas";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		
		let y = 10, yShift = 14;
		for (let key in this.dict) {
			let text = key + ": " + this.dict[key];
			ctx.fillText(text, 10, y);
			y += yShift;
		}
		for (let i = 0; i < this.lines.length; i++) {
			ctx.fillText(this.lines[i], 10, y);
			y += yShift;
		}

		let Input = this.engine.input;
		let coordinates = "(" + Math.round(Input.cursorPosX()) + ", " + Math.round(Input.cursorPosY()) + ")";
		let x = Input.cursor.x;
		y = Input.cursor.y;
		let width = ctx.measureText(coordinates).width;
		if (x + width > this.engine.width) {
			ctx.textAlign = "right";
		}
		if (y + 12 > this.engine.height) {
			ctx.textBaseline = "bottom";
		}
		ctx.fillText(coordinates, x, y);

		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
	}
}