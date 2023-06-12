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
		let stringValue = "";
		let foundEndQuote = false;
		let start = 1;
		let end = 1; 
		for(let i = start; i < input.length; i++) {
			const currChar = input[i];
			const lastChar = input[i-1];
			// Ignore these
			if (currChar == "\\") {
				continue;
			}

			if (lastChar == "\\") {
				stringValue += currChar;
			} else if(currChar == startQuote) {
				foundEndQuote = true;
				// Do not include quote inside raw string
				end = i;
				break;
			} else {
				stringValue += currChar;
			}
		}
		const startIndex = this.index;
		if (!foundEndQuote) {
			this.index += input.length + 1;
			return Object.assign({index: startIndex}, TOKEN_INVALID);
		}
		// Ignore the quote
		this.index += end + 1;
		return Object.assign({index: startIndex, value: stringValue}, TOKEN_STRING);
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
			const match = tokenType.match;
			if (typeof match == "string") {
				if (input.substring(0, match.length) == match) {
					const index = this.index;
					const value = tokenType.value || match;
					const newToken = Object.assign({index,value}, tokenType);
					this.index += match.length;
					return newToken;
				}
			} else if (match == null) { 
				const quoteChar = input[0];
				if (!this.isQuoteCharacter(quoteChar)) {
					continue;
				}
				return this.getStringLiteral();
			} else {
				const foundMatch = input.match(match);
				if (foundMatch) {
					const value = foundMatch[0];
					const index = this.index;
					this.index += value.length;
					let newToken = Object.assign({index}, tokenType);
					if (newToken.type == "BOOL") {
						newToken.value = value == "true";
					} else if (newToken.literal) {
						newToken.value = Number(value.replace(/_/g, ""));
					} else {
						newToken.value = value;
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

