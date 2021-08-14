Scribble.InputManager = class InputManager {
	constructor(engine) {
		this.engine = engine;
		this.keys = {};
		this.keyPrev = {};
		this.keyPrevGame = {};
		this.cursor = {x: 0, y: 0};
		document.addEventListener("keydown", event => this._handle_key(event, true));
		document.addEventListener("keyup", event => this._handle_key(event, false));
		document.addEventListener("mousemove", event => this._handle_mouse(event));
	}
	gameUpdate() {
		this.keyPrevGame = Object.assign({}, this.keys);
	}
	finish() {
		this.keyPrev = Object.assign({}, this.keys);
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
	_handle_mouse(event) {
		let rect = this.engine.canvas.getBoundingClientRect();
		this.cursor.x = event.pageX - rect.left;
		this.cursor.y = event.pageY - rect.top;
		this.cursor.x *= this.engine.width/rect.width;
		this.cursor.y *= this.engine.height/rect.height;
	}

	cursorPosX = () => this.cursor.x + this.engine.camera.left();
	cursorPosY = () => this.engine.height - this.cursor.y + this.engine.camera.bottom();
	cursorPos = () => {return {x: this.cursorPosX(), y: this.cursorPosY()}};
};