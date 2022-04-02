import { Engine } from "./engine.js";
import { ResourceManager } from "./resource.js";

export class SoundManager extends ResourceManager {
	constructor(engine: Engine) {
		super(engine, "Sounds");
	}
}