import {TOKEN_TYPES, TOKEN_INVALID} from './patchsteps-expr_tokens.js';

export class Tokenizer {
	constructor(input) {
		this.input = input;
		this.index = 0;
		this.inputLength = this.input.length;
	}

	getInput() {
		return this.input.substring(this.index);
	}
	
	ignoreWhitespace() {
		const match = this.getInput().match(/^\s+/);
		if (match) {
			this.index += match[0].length;
		}
	}
	
	getStringLiteral() {
		return "";	
	}

	getToken() {
		// Number is a string of digits
		let token = {};
		this.ignoreWhitespace();
		if (this.index == this.inputLength) {
			return {type: "EOF"};
		}

		const input = this.getInput();
		for(const tokenType of TOKEN_TYPES) {
			const value = tokenType.match;
			if (typeof value == "string") {
				if (input.substring(0, value.length) == value) {
					const index = this.index;
					const newToken = Object.assign({index,value}, tokenType);
					this.index += value.length;
					return newToken;
				}
			} else {
				const match = input.match(value);
				if (match) {
					const index = this.index;
					this.index += match[0].length;
					let newToken = Object.assign({index}, tokenType);
					if (newToken.type == "BOOL") {
						newToken.value = match[0] == "true";
					} else if (newToken.literal) {
						newToken.value = Number(match[0].replace(/_/g, ""));
					} else {
						newToken.value = match[0];
					}
					return newToken;
				}
			}
		}
		return Object.assign({index: this.index}, TOKEN_INVALID);
	}

	peek() {
		const index = this.index;
		const token = this.getToken();
		this.index = index;
		return token;
	}
}

