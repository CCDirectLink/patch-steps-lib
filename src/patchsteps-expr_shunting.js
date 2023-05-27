import {TOKEN_NOOP} from './patchsteps-expr_tokens.js';

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

function openedMatch(closeTokenChar) {
	if (closeTokenChar == ')') 
		return '(';
	if (closeTokenChar == ']')
		return '[';
	return '';
}

export function shuntingYard(tokens) {
	const output  = [];
	const operators = [];
	for(let i = 0; i < tokens.length; i++) {
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
			operators.push(token);
		} else if (isClosedToken(token.type)) {
			let pushedOps = 0;
			while (operators.length) {
				let operator = operators.pop();
				if (operator.type == openedMatch(token.type)) {
					break;
				}
				output.push(operator);
				pushedOps++;
			}

			const lastOperator = operators[operators.length - 1];
			if (lastOperator && lastOperator.type == "IDENTIFIER") {
				const callType = token.type == ")" ? "call" : "index";
				if (callType == "call" && pushedOps == 0) {
					output.push(TOKEN_NOOP);
				}
				const operator = Object.assign({}, operators.pop());
				if (callType == "call") {
					operator.type = "FUNCTION";
				} else {
					operator.type = "OBJECT";
				}
				output.push(operator);
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
	return output;
}

