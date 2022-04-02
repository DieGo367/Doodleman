import { Engine } from "./engine";
import { Point } from "./shape";

interface Keys {
	[key: string]: boolean;
}
interface Buttons {
	[key: number]: boolean;
}

export class InputManager {
	keys = {} as Keys;
	keyPrev = {} as Keys;
	keyPrevGame = {} as Keys;
	cursor = {
		x: 0, y: 0,
		buttons: {} as Buttons,
		buttonsPrev: {} as Buttons,
		buttonsPrevGame: {} as Buttons
	};
	constructor(public engine: Engine) {
		document.addEventListener("keydown", event => this._handle_key(event, true));
		document.addEventListener("keyup", event => this._handle_key(event, false));
		document.addEventListener("mousemove", event => this._handle_mouse(event));
		document.addEventListener("mousedown", event => this._handle_click(event, true));
		document.addEventListener("mouseup", event => this._handle_click(event, false));
		document.addEventListener("contextmenu", event => event.preventDefault());
	}
	gameUpdate() {
		this.keyPrevGame = Object.assign({}, this.keys);
		this.cursor.buttonsPrevGame = Object.assign({}, this.cursor.buttons);
	}
	finish() {
		this.keyPrev = Object.assign({}, this.keys);
		this.cursor.buttonsPrev = Object.assign({}, this.cursor.buttons);
	}

	key(key: string): boolean {
		return this.keys[key];
	}
	keyEventDown(key: string): boolean {
		return this.keys[key] && !this.keyPrev[key];
	}
	keyEventUp(key: string): boolean {
		return !this.keys[key] && this.keyPrev[key];
	}
	keyPress(key: string): boolean {
		return this.keys[key] && !this.keyPrevGame[key];
	}
	keyRelease(key: string): boolean {
		return !this.keys[key] && this.keyPrevGame[key];
	}
	_handle_key(event: KeyboardEvent, state: boolean) {
		let code = event.code;
		this.keys[code] = state;
		if (state) this.engine.debug.set("LastPressedKey", code);
	}

	mouseButton(number = 1): boolean {
		return this.cursor.buttons[number];
	}
	mouseEventDown(number = 1): boolean {
		return this.cursor.buttons[number] && !this.cursor.buttonsPrev[number];
	}
	mouseEventUp(number = 1): boolean {
		return !this.cursor.buttons[number] && this.cursor.buttonsPrev[number];
	}
	mousePress(number = 1): boolean {
		return this.cursor.buttons[number] && !this.cursor.buttonsPrevGame[number];
	}
	mouseRelease(number = 1): boolean {
		return !this.cursor.buttons[number] && this.cursor.buttonsPrevGame[number];
	}
	_handle_click(event: MouseEvent, state) {
		this.cursor.buttons[event.button] = state;
	}
	
	cursorPosX(): number { return this.cursor.x + this.engine.camera.left(); }
	cursorPosY(): number { return this.engine.height - this.cursor.y + this.engine.camera.bottom(); }
	cursorPos(): Point { return {x: this.cursorPosX(), y: this.cursorPosY()}; }
	_handle_mouse(event: MouseEvent) {
		let rect = this.engine.canvas.getBoundingClientRect();
		this.cursor.x = event.pageX - rect.left;
		this.cursor.y = event.pageY - rect.top;
		this.cursor.x *= this.engine.width/rect.width;
		this.cursor.y *= this.engine.height/rect.height;
	}
}