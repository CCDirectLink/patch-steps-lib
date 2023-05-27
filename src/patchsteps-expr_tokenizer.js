import {TOKEN_TYPES} from './patchsteps-expr_tokens.js';

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
					const newToken = Object.assign({index,value: match[0]}, tokenType);
					return newToken;
				}
			}
		}
	}

	peek() {
		const index = this.index;
		const token = this.getToken();
		this.index = index;
		return token;
	}
}

