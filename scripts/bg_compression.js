// Web worker
self.importScripts("lib/lz-string.min.js");

self.addEventListener("message",function(message) {
	let data = message.data;
	if (data.compress && data.b64) {
		try {
			let lz = LZString.compress(atob(data.b64));
			self.postMessage({
				resolved: true,
				taskID: data.taskID,
				output: lz
			});
		}
		catch(e) {
			self.postMessage({
				resolved: false,
				taskID: data.taskID,
				error: e
			});
		}
	}
	else if (data.decompress && data.lz) {
		try {
			let b64 = btoa(LZString.decompress(data.lz));
			self.postMessage({
				resolved: true,
				taskID: data.taskID,
				output: b64
			});
		}
		catch(e) {
			self.postMessage({
				resolved: false,
				taskID: data.taskID,
				error: e
			});
		}
	}
})