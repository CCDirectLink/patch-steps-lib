import {TOKEN_NOOP, TOKEN_COMMA, TOKEN_DECIMAL, TOKEN_GETTER, TOKEN_INVALID,isAssignmentToken, isOpenToken, isCloseToken, openTokenMatch} from './patchsteps-expr_tokens.js';

export function shuntingYard(tokens) {
	const output  = [];
	const operators = [];
	const changeTracker = [];

	for(let i = 0; i < tokens.length; i++) {
		let token = tokens[i];
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
			// Save before the temporary token
			// is added
			changeTracker.push(output.length);
			operators.push(token);
		} else if (isCloseToken(token.type)) {
			let openOperator;
			while (operators.length) {
				let operator = operators.pop();
				if (operator.type == openTokenMatch(token.type)) {
					openOperator = operator;
					break;
				}
				output.push(operator);
			}

			// Find how many tokens were in between the pairs
			let oldOutLen = changeTracker.pop();
			let deltaOutput = output.length - oldOutLen;

			const lastOperator = operators[operators.length - 1];
			const nextToken = tokens[i + 1];
			if (deltaOutput == 0 && token.type == ")") {
				if (!lastOperator || lastOperator.type != "IDENTIFIER") {
					// Can't be empty so ) is invalid
					const invalidToken = Object.assign({index: token.index, value: token.value}, TOKEN_INVALID);
					output.push(invalidToken);
					break;
				} else {
					// Has to be before since it's a function call
					output.push(TOKEN_NOOP);
				}
			}

			if (lastOperator && lastOperator.type == "IDENTIFIER") {
				const callType = token.type == ")" ? "call" : "index";
				const operator = Object.assign({}, operators.pop());
				if (callType == "call") {
					operator.type = "FUNCTION";
					output.push(operator);
				} else {
					if (isAssignmentToken(nextToken.match)) {
						operator.type = "STRING";
						operator.literal = true;
					}
					if (deltaOutput == 0) {
						output.push(operator);
					} else {
						// Has to be inserted before all the previous tokens
						// since getter requires the object be the first argument
						output.splice(oldOutLen, 0, operator);
					}
				}
				if (isAssignmentToken(nextToken.match)) {
					if (callType == "call") {
						// Not valid
						const invalidToken = Object.assign({index: token.index, value: token.value}, TOKEN_INVALID);
						output.push(invalidToken);
						break;
					} else {
						const commaToken = Object.assign({index: token.index, value: ","}, TOKEN_COMMA);
						output.push(commaToken);
					}
				}
			}
			if (deltaOutput == 0) {
				// Has to be after since since it's argument 2 of getter
				if (token.type == "]") {
					const zeroToken = Object.assign({index: openOperator.index, value: 0}, TOKEN_DECIMAL);
					output.push(zeroToken);
				}
			}

			if (token.type == "]") {
				if (!isAssignmentToken(nextToken.match)) {
					output.push(Object.assign({index: openOperator.index, value: "#"}, TOKEN_GETTER));
				}
			}
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
	for (let i = 0; i < output.length; i++) {
		if (output[i].match == "=") {
			const commaToken = Object.assign({index: output[i].index, value: ","}, TOKEN_COMMA);
			// It no longer needs this
			delete output[i].precedence
			// Insert comma
			output.splice(i, 0, commaToken);
			// move back to comma token
			i++;
		}
	}
	return output;
}

