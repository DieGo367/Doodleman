export class ResourceManager {
	map = {};
	loadingCount = 0;
	constructor(public engine, public name = "Unknown Resource Manager") {}

	get(name) {
		if (this.map[name]) return this.map[name];
		else throw new Error(`"${name}" not found in ${this.name}`);
	}
	has = name => this.map[name] !== void(0)
	
	_request = src => this.engine.request(src)
	async loadAs(name, src) {
		this.loadingCount++;
		let response = await this._request(src);
		this.map[name] = response;
		this.loadingCount--;
		return response;
	}
	load = name => this.loadAs(name, name)
	async loadList(list) {
		let res = [];
		for (let i = 0; i < list.length; i++) {
			res.push(this.load(list[i]));
		}
		return await Promise.all(res);
	}
}