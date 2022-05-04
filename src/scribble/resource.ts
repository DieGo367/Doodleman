import Engine from "./engine";

export default class ResourceManager<StoredType> {
	map: {[key: string]: StoredType} = {};
	constructor(public engine: Engine, public name = "Unknown Resource Manager") {}

	get(name: string): StoredType {
		if (this.map[name]) return this.map[name];
		else throw new Error(`"${name}" not found in ${this.name}`);
	}
	has(name: string): boolean { return this.map[name] !== undefined }
	
	_request(src: string): Promise<StoredType> { return this.engine.request(src) as unknown as Promise<StoredType>; }
	async loadAs(name: string, src: string): Promise<StoredType> {
		let response = await this._request(src);
		this.map[name] = response;
		return response;
	}
	load(name: string): Promise<StoredType> { return this.loadAs(name, name); }
	async loadList(list: string[]): Promise<StoredType[]> {
		let res: Promise<StoredType>[] = [];
		for (let i = 0; i < list.length; i++) {
			res.push(this.load(list[i]));
		}
		return await Promise.all(res);
	}
}