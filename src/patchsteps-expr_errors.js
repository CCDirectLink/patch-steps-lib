
function getInputSummary(input, index, length) {
	const parity = length%2;
	const alignedLength = parity + length;
	const end = index + (alignedLength >> 1);
	const start = Math.max(0, end - length);
	return [index - start, input.substring(start, end)];

}

export class PrettyError {
	static throwError(input, index, inputPreviewLength, message) {
		const [offset, preview] = getInputSummary(input, index, inputPreviewLength);
		const errorMessage = [];
		errorMessage.push("");
		errorMessage.push(message);
		errorMessage.push(preview);
		errorMessage.push(" ".repeat(offset) + "^")
		throw new Error(errorMessage.join("\n"));
	}
}
