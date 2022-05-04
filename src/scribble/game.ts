import Engine from "./engine";

export default class Game {
	constructor(public engine: Engine) {}
	init() {}
	tick() {}
	onRenderUI(_ctx: CanvasRenderingContext2D) {}
	onLevelLoad() {}
}