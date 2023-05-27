import {Tokenizer} from './patchsteps-expr_tokenizer.js';
import {shuntingYard} from './patchsteps-expr_shunting.js';
import {TOKEN_NOOP} from './patchsteps-expr_tokens.js';

function doShuntingYard(input, verbose = false) {
	const tokenizer = new Tokenizer(input);
	const tokens = [];
	let token;

	while ((token = tokenizer.getToken()) && token.type != "EOF") {
		tokens.push(token);
	}
	if (verbose) {
		console.log(tokens);
	}
	return shuntingYard(tokens);
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
			if (token.type == "BOOL") {
				output.push(token.value == "true")
			}
			else {
				output.push(Number(token.value.replace(/_/g, "")))
			}
		} else if (token.type === "FUNCTION") {
			// Function so look in functions
			const identifier = token.value;
			const func = functions[identifier];
			if (!func) {
				throw Error(identifier + " is not a function.")
			}
			// Only pop the last value becase
			const args = output.pop();
			if (Array.isArray(args)) {
				output.push(func.apply(null, args));
			} else if (args == TOKEN_NOOP) {
				output.push(func());
			} else {
				output.push(func(args));
			}
		} else if (token.type == "OBJECT") {
			const index = output.pop();
			const charPos = token.index; 
			const identifier = token.value;
			const variable = variables[identifier];
			if (!variable) {
				throw Error("Variable " + identifier + " is undefined.")
			}
			if (Array.isArray(variable) || typeof variable === "object") {
				output.push(variable[index]);
			} else {
				throw Error("Variable " + identifier + " can not be indexed.")
			}
		} else if(token.type == "IDENTIFIER") {
			let identifier = token.value;
			output.push(variables[identifier]);
		} else if (token == TOKEN_NOOP) {
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
