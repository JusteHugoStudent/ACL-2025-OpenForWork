export function readStream(stream, limit = Infinity) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let length = 0;

		function onData(chunk) {
			length += chunk.length;
			chunks.push(chunk);
		}

		function onEnd() {
			cleanup();
			resolve(Buffer.concat(chunks, length).toString());
		}

		function onError(err) {
			cleanup();
			reject(err);
		}

		function cleanup() {
			stream.off('data', onData);
			stream.off('end', onEnd);
			stream.off('error', onError);
		}

		stream.on('data', onData);
		stream.on('end', onEnd);
		stream.on('error', onError);
	});
}