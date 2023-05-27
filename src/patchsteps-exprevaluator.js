import * as EXTERNAL_TOKENS from './patchsteps-tokens.js';
export const OPERATORS = EXTERNAL_TOKENS.TOKEN_TYPES.map(e => e.match);
const TOKEN_TYPES = EXTERNAL_TOKENS.TOKEN_TYPES.concat([{
	type: "HEXIDECIMAL",
	literal: true,
	match: /^0x[\w]+/
}, {
	type: "OCTAL",
	literal: true,
	match: /^0o[\d_]+/
}, {
	type: "BINARY",
	literal: true,
	match: /^0b[\d_]+/
}, {
	type: "DECIMAL",
	literal: true,
	match: /^\d+\.?\d{0,}/
},{
	type: "IDENTIFIER",
	match: /^[a-zA-Z][a-zA-Z0-9]{0,}/
}]);

const NOOP_TYPE = {
	type: "NOOP",
};

class Tokenizer {
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
function isOpenToken(tokenChar) {
	return tokenChar == '(' || tokenChar == '[';
}

function isClosedToken(tokenChar) {
	return tokenChar == ')' || tokenChar == ']'; 
}

function closedMatch(openTokenChar) {
	if (openTokenChar == '(') 
		return ')';
	if (openTokenChar == '[')
		return ']';
	return '';
}

function shuntingYard(tokens, index = 0, bracketOperator = '') {
	const output  = [];
	const operators = [];
	let i = index;

	for(; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.type == "EOF") {
			break;
		}
		if (token.type == "IDENTIFIER") {
			const nextToken = tokens[i + 1];
			if (nextToken && isOpenToken(nextToken.type)) {
				operators.push(token);
			} else {
				output.push(token);
			}
		} else if(token.literal == true) {
			output.push(token);
		} else if (isOpenToken(token.type)) {
			const [subOutput, newIndex] = shuntingYard(tokens, i + 1, token.type);
			i = newIndex;
			if (subOutput.length == 0) {
				output.push(NOOP_TYPE);
			} else {
				output.push(...subOutput);
			}
			const lastOperator = operators[operators.length - 1];
			if (!lastOperator) {
				continue;
			}
			if (lastOperator.type == "IDENTIFIER") {
				const callType = token.type == "(" ? "call" : "index";
				const operator = Object.assign({}, operators.pop());
				if (callType == "call") {
					operator.value = "#" + operator.value;
				} else {
					operator.value = "@" + operator.value;
				}
				output.push(operator);
			}
		} else if (isClosedToken(token.type)) {
			if (!bracketOperator) {
				continue;
			}
			if (token.type != closedMatch(bracketOperator)) {
				continue;
			}
			while (operators.length) {
				output.push(operators.pop());
			}
			break;
		} else if (operators.length == 0) {
			operators.push(token);
		} else {
			const PREC_LOWER = 0;
			const PREC_EQUAL = 1;
			const PREC_GREATER = 2;
			let lastOperator = operators[operators.length - 1];
			let preorder; 
			if (lastOperator.precedence < token.precedence) {
				preorder = PREC_LOWER;
			} else if (lastOperator.precedence == token.precedence) {
				preorder = PREC_EQUAL;
			} else {
				preorder = PREC_GREATER;
			}
			if ((preorder == PREC_LOWER) ||
				(preorder == PREC_EQUAL && token.assocLeft == false)) {
				operators.push(token);
			} else {
				while(true) {
					lastOperator = operators.pop();
					if (lastOperator == null) {
						operators.push(token);
						break;
					}
					if (lastOperator.precedence < token.precedence) {
						operators.push(lastOperator);
						operators.push(token);
						break;
					}
					if (lastOperator.precedence >= token.precedence) {
						output.push(lastOperator);
					}
				}
			}
		}
	}

	while(operators.length) {
		output.push(operators.pop());
	}
	return [output,i];
}
export function doShuntingYard(input, verbose = false) {
	const tokenizer = new Tokenizer(input);
	const tokens = [];
	let token;

	while ((token = tokenizer.getToken()) && token.type != "EOF") {
		tokens.push(token);
	}
	if (verbose) {
		console.log(tokens);
	}
	const [output, _ ] = shuntingYard(tokens);
	return output;
}

export function evaluateExpression(input, functions = {}, variables = {}) {
	const tokenStream = doShuntingYard(input);
	const output = [];	
	for (const token of tokenStream) {
		if (token == null) {
			console.log("Null token!");
			console.log(tokenStream);
			return null;
		}
		if (token.literal) {
			output.push(Number(token.value.replace(/_/g, "")))
		} else if(token.type == "IDENTIFIER") {
			let identifier = token.value;
			if (identifier.startsWith("@")) {
				const index = output.pop();
				const charPos = token.index; 
				identifier = identifier.substring(1);
				const variable = variables[identifier];
				if (!variable) {
					throw Error("Variable " + identifier + " is undefined.")
				}
				if (Array.isArray(variable) || typeof variable === "object") {
					output.push(variable[index]);
				} else {
					throw Error("Variable " + identifier + " can not be indexed.")
				}
			} else if (identifier.startsWith("#")) {
				// Function so look in functions
				identifier = identifier.substring(1);
				if (!functions[identifier]) {
					throw Error(identifier + " is not a function.")
				}
				const func = functions[identifier];
				// Only pop the last value becase
				const args = output.pop();
				if (Array.isArray(args)) {
					output.push(func.apply(null, args));
				} else if (args == NOOP_TYPE) {
					output.push(func());
				} else {
					output.push(func(args));
				}
			} else {
				// Just a regular variable
				output.push(variables[identifier]);
			}
		} else if (token == NOOP_TYPE) {
			output.push(token);
		} else {
			// Assume binary operator
			let secondArg = output.pop();
			let firstArg = output.pop();
			const id = token.value;
			const func = functions[id];
			if (!func) {
				throw Error("Binary operator " + id + " not implemented.");
			}
			if (secondArg == null) {
				throw Error("Second arg null");
			} else if (firstArg == null) {
				throw Error("First arg null");
			}
			output.push(func(firstArg, secondArg));
		}
	}

	return output.pop();
}
