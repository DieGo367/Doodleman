export class FileLoader {
	input: HTMLInputElement;
	asking = false;
	changeFired = false;
	onLostFocus = () => {};
	constructor() {
		this.input = document.createElement("input");
		this.input.type = "file";
		window.addEventListener("focus", () => this.onLostFocus());
	}
	async ask(extensions: string[]): Promise<FileList> {
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
		let fileList: FileList = await new Promise((resolve, reject) => {
			this.input.onchange = event => {
				this.changeFired = true;
				let files = this.input.files;
				if (files) resolve(files);
				else reject("No file selected.");
			};
			this.input.onerror = (err: string|Event) => reject(typeof err === "string"? err : err.type);
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
	async askText(extensions: string[]): Promise<string[]> {
		let fileList = await this.ask(extensions);
		let texts: Promise<string>[] = [];
		for (let file of fileList) texts.push(file.text());
		return await Promise.all(texts);
	}
	async askData(extensions: string[]): Promise<unknown[]> {
		let texts = await this.askText(extensions);
		return texts.map(value => JSON.parse(value) as unknown);
	}
}