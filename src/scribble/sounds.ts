import Engine from "./engine.js";
import ResourceManager from "./resource.js";

export default class SoundManager extends ResourceManager<Response> {
	constructor(engine: Engine) {
		super(engine, "Sounds");
	}
}