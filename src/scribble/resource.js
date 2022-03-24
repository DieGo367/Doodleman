Scribble.ResourceManager = class ResourceManager {
	constructor(engine, name) {
		this.engine = engine;
		this.name = name || "Unknown Resource Manager";
		this.map = {};
		this.loadingCount = 0;
	}

	get(name) {
		if (this.map[name]) return this.map[name];
		else throw new Error(`"${name}" not found in ${this.name}`);
	}
	has = name => this.map[name] !== void(0)
	
	_request = src => this.engine.request(src)
	loadAs(name, src) {
		this.loadingCount++;
		return this._request(name, src).then(response => {
			this.map[name] = response;
			this.loadingCount--;
			return response;
		});
	}
	load = name => this.loadAs(name, name)
	loadList(list) {
		let promises = [];
		for (let i = 0; i < list.length; i++) {
			promises.push(this.load(list[i]));
		}
		return Promise.all(promises);
	}
}