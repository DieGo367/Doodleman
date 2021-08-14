Scribble.Sounds = class Sounds {
	constructor() {
		this.map = {};
		this.loadingCount = 0;
	}
	load(filename) {
		this.loadingCount++;
		fetch(filename).then(data => {
			this.map[filename] = {raw: data};
			this.loadingCount--;
			if (this.loadingCount == 0 && this.onLoadFunc) {
				this.onLoadFunc();
				this.onLoadFunc = null;
			}
		});
	}
	loadAll(list, callback) {
		if (callback) {
			if (typeof callback == "function") this.onLoadFunc = callback;
		}
		for (let i = 0; i < list.length; i++) {
			this.load(list[i]);
		}
	}
};