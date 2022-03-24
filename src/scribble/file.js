export class FileLoader {
	constructor() {
		this.input = document.createElement("input");
		this.input.type = "file";
		this.input.onchange = event => this.onChange(event);
		window.addEventListener("focus", () => this.onLostFocus());
		this.asking = false;
		this.success = null;
		this.failure = null;
		this.extensions = [];
		this.changeFired = false;
	}
	ask(extensions, success, failure) {
		if (this.asking) {
			return console.error("Already asking for a File");
		}
		if (extensions instanceof Array) {
			this.extensions = extensions;
			if (extensions.length > 0) {
				this.input.accept = '.' + extensions.join(",.");
			}
		}
		if (typeof success === "function") this.success = success;
		if (typeof failure === "function") this.failure = failure;
		this.asking = true;
		this.input.click();
	}
	onLostFocus() {
		if (this.asking) {
			setTimeout(() => {
				if (this.asking && !this.changeFired) this.error("No file selected.");
			}, 1000);
		}
	}
	onChange(event) {
		this.changeFired = true;
		if (this.asking) {
			if (window.File && window.FileReader && window.FileList && window.Blob) {
				let file = event.target.files[0];
				if (file) {
					let ext = file.name.split(".").pop();
					if (this.extensions.indexOf(ext) !== -1) {
						let reader = new FileReader;
						reader.onload = e => {
							if (this.success) this.success(e.target.result, file);
							this.finish();
						}
						reader.readAsText(file);
					}
					else this.error("Incorrect file type!");
				}
				else this.error("No file selected.")
			}
			else this.error("Unsupported browser");
		}
	}
	error(msg) {
		if (this.failure) this.failure(msg);
		else console.error(msg);
		this.finish();
	}
	finish() {
		this.asking = false;
		this.success = this.failure = null;
		this.extensions = [];
		this.changeFired = false;
		this.input.type = "text";
		this.input.type = "file";
		this.input.accept = '';
	}
}