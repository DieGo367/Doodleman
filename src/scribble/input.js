export class InputManager {
	constructor(engine) {
		this.engine = engine;
		this.keys = {};
		this.keyPrev = {};
		this.keyPrevGame = {};
		this.cursor = {
			x: 0, y: 0,
			buttons: {},
			buttonsPrev: {},
			buttonsPrevGame: {}
		};
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

	key(key) {
		return this.keys[key];
	}
	keyEventDown(key) {
		return this.keys[key] && !this.keyPrev[key];
	}
	keyEventUp(key) {
		return !this.keys[key] && this.keyPrev[key];
	}
	keyPress(key) {
		return this.keys[key] && !this.keyPrevGame[key];
	}
	keyRelease(key) {
		return !this.keys[key] && this.keyPrevGame[key];
	}
	_handle_key(event, state) {
		let code = event.code;
		this.keys[code] = state;
		if (state) this.engine.debug.set("LastPressedKey", code);
	}

	mouseButton(number) {
		return this.cursor.buttons[number||1];
	}
	mouseEventDown(number) {
		return this.cursor.buttons[number||1] && !this.cursor.buttonsPrev[number||1];
	}
	mouseEventUp(number) {
		return !this.cursor.buttons[number||1] && this.cursor.buttonsPrev[number||1];
	}
	mousePress(number) {
		return this.cursor.buttons[number||1] && !this.cursor.buttonsPrevGame[number||1];
	}
	mouseRelease(number) {
		return !this.cursor.buttons[number||1] && this.cursor.buttonsPrevGame[number||1];
	}
	_handle_click(event, state) {
		this.cursor.buttons[event.which] = state;
	}
	
	cursorPosX = () => this.cursor.x + this.engine.camera.left();
	cursorPosY = () => this.engine.height - this.cursor.y + this.engine.camera.bottom();
	cursorPos = () => {return {x: this.cursorPosX(), y: this.cursorPosY()}};
	_handle_mouse(event) {
		let rect = this.engine.canvas.getBoundingClientRect();
		this.cursor.x = event.pageX - rect.left;
		this.cursor.y = event.pageY - rect.top;
		this.cursor.x *= this.engine.width/rect.width;
		this.cursor.y *= this.engine.height/rect.height;
	}
}