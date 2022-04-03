import { Engine } from "./engine";

type DebugData = string | object;

export class Debug {
	enabled = false;
	lines = [] as string[];
	dict = {} as {[key: string]: string};
	frameStepper = true;
	frameCanStep = false;
	constructor(public engine: Engine) {}
	toggle() {
		this.enabled = !this.enabled;
	}

	set(key: string, text: DebugData) {
		if (typeof text === "object") this.dict[key] = JSON.stringify(text);
		else this.dict[key] = text;
	}
	remove(key: string) {
		delete this.dict[key];
	}
	print(...args: DebugData[]) {
		for (let arg of args) {
			if (typeof arg === "object") {
				this.lines.push(JSON.stringify(arg));
			}
			else this.lines.push(arg);
		}
	}

	update() {
		this.lines = [];
	}
	render(ctx: CanvasRenderingContext2D) {
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
		for (let line of this.lines) {
			ctx.fillText(line, 10, y);
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