export class FileLoader {
	input;
	asking = false;
	changeFired = false;
	onLostFocus;
	constructor() {
		this.input = document.createElement("input");
		this.input.type = "file";
		window.addEventListener("focus", () => {
			if (typeof this.onLostFocus === "function") {
				this.onLostFocus();
			}
		});
	}
	async ask(extensions) {
		// make sure another request isn't already happening
		if (this.asking) {
			throw new Error("Already asking for a File");
		}
		this.asking = true;
		// set preferred extensions
		if (extensions instanceof Array && extensions.length > 0) {
			this.input.accept = '.' + extensions.join(",.");
		}
		// promisified FileList getter
		let fileList = await new Promise((resolve, reject) => {
			this.input.onchange = event => {
				this.changeFired = true;
				resolve(event.target.files);
			};
			this.input.onerror = err => reject(err.type);
			this.onLostFocus = () => setTimeout(() => {
				if (this.asking && !this.changeFired) reject("No file selected.");
			}, 1000);
			this.input.click();
		});
		// finish up
		this.asking = false;
		this.changeFired = false;
		this.input.type = "text";
		this.input.type = "file";
		this.input.accept = '';
		return fileList;
	}
	async askText(extensions) {
		let fileList: any = await this.ask(extensions);
		let texts = [];
		for (let i = 0; i < fileList.length; i++) {
			let reader = new FileReader;
			texts.push(new Promise((resolve, reject) => {
				reader.onload = event => resolve(event.target.result);
				reader.onerror = err => reject(err.type);
			}));
			reader.readAsText(fileList[i]);
		}
		return await Promise.all(texts);
	}
	async askData(extensions) {
		let texts = await this.askText(extensions);
		return texts.map(value => JSON.parse(value));
	}
}