import {TOKEN_TYPES, TOKEN_INVALID, TOKEN_STRING} from './patchsteps-expr_tokens.js';

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

	isQuoteCharacter(character) {
		return character === '"' || character === "'";
	}
	
	getStringLiteral() {
		const input = this.getInput();
		const startQuote = input[0];
		let foundEndQuote = false;
		let start = 1;
		let end = 1; 
		for(let i = start; i < input.length; i++) {
			const currChar = input[i];
			const lastChar = input[i-1] || "";
			if(currChar == startQuote && lastChar !== "\\") {
				foundEndQuote = true;
				// Do not include quote inside raw string
				end = i;
				break;
			}
			

		}
		const startIndex = this.index;
		if (!foundEndQuote) {
			this.index += input.length + 1;
			return Object.assign({index: startIndex}, TOKEN_INVALID);
		}
		// Ignore the quote

		this.index += end + 1;
		return Object.assign({index: startIndex, value: input.substring(start, end)}, TOKEN_STRING);
	}

	getToken() {
		// Number is a string of digits
		let token = {};
		this.ignoreWhitespace();
		if (this.index >= this.inputLength) {
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
			} else if (value == null) { 
				const quoteChar = input[0];
				if (!this.isQuoteCharacter(quoteChar)) {
					continue;
				}
				return this.getStringLiteral();
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

