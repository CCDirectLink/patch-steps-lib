import {
	makeToken,
	TOKEN_NOOP, 
	TOKEN_COMMA, 
	TOKEN_DECIMAL, 
	TOKEN_GETTER, 
	TOKEN_INVALID,
	isAssignmentToken, 
	isOpenToken, 
	isCloseToken, 
	openTokenMatch
} from './patchsteps-expr_tokens.js';


function handleParenTransform(tokens, index, openTokenIndex,  output, subExprIndex, subExprLen) {
	const closeToken = tokens[index];
	const openToken = tokens[openTokenIndex];
	let tokenBeforeExpr = output[subExprIndex - 1];
	if (tokenBeforeExpr == null) {
		// Make logic easier
		const emptyToken = makeToken("EMPTY", closeToken.index);
		tokenBeforeExpr = emptyToken;
	}
	
	// All user function calls
	if ((tokenBeforeExpr.type == "IDENTIFIER") || 
		(tokenBeforeExpr.type == "FUNCTION" && tokenBeforeExpr.value == "@call")) {
		// call(userFuncPointer, arguments)

		// a() => call(a, args) => a args , @call
		// a()() => call(call(a, args1), args2) => a args1 , @call args2 , @call

		// args
		// Just a placeholder
		if (subExprLen == 0) {
			const emptyToken = makeToken("EMPTY", closeToken.index);
			output.push(emptyToken);
		}
		// ,
		const commaToken = makeToken(",");
		output.push(commaToken);
		
		// @call
		const callToken = makeToken("FUNCTION", openToken.index, "@call");
		output.push(callToken);
		return;	
	} else if (subExprLen == 0) {
		// Only call functions can be empty
		// Invalid expression
		const invalidToken = makeToken("INVALID", closeToken.index);
		output.push(invalidToken);
		return;
	}
	tokenBeforeExpr = tokens[openTokenIndex - 1];
	if (tokenBeforeExpr == null) {
		// Make logic easier
		const emptyToken = makeToken("EMPTY", closeToken.index);
		tokenBeforeExpr = emptyToken;

	}
	// FACT: subExprLen > 0

	if (!tokenBeforeExpr.number && tokenBeforeExpr.literal) {
		// examples: ""(expression), false(expression)
		// Invalid expression
		const invalidToken = makeToken("INVALID", openToken.index);
		output.push(invalidToken);
		return;
	} 

	const lastExprOp = output[subExprIndex + subExprLen - 1];

	// Essentially a list of expressions
	// Get the result of the last sub expression
	if (lastExprOp.type == ",") {
		const flattenToken = makeToken("TRANSFORM", 0, "@flatten");
		output.push(flattenToken);	

		const popToken = makeToken("FUNCTION", 0, "@pop");
		output.push(popToken);	
	}

	// Yay math!
	if (tokenBeforeExpr.number) {
		// 1(expression) => 1 * (expression)
		const multiToken = makeToken("*", openToken.index); 
		output.push(multiToken);
	}
}
function handleSquareBracketTransform(tokens, index, openTokenIndex,  output, subExprIndex, subExprLen) {
	const openToken = tokens[openTokenIndex];
	// Valid array contexts
	// []
	// [1]
	// [1,2]
	// [] op []
	// [i] = [0]
	//
	// Valid accessor contexts
	// a()[0], a() returns an array/object with key 0
	// i[0], i is an array/object with key 0
	// i[0][0], i[0] is an array/object with key 0
	const closeToken = tokens[index];
	let tokenBeforeExpr = output[subExprIndex - 1];
	if (tokenBeforeExpr == null) {
		// ^[]
		if (subExprLen == 0) {
			const emptyToken = makeToken("EMPTY", closeToken.index);
			output.push(emptyToken);
		} else if (subExprLen > 2) {
			const lastToken = output[subExprIndex + subExprLen - 1];
			if (lastToken.type == ",") {
				const flattenToken = makeToken("TRANSFORM", 0, "@flatten");
				output.push(flattenToken);	
			}
		}


		const callToken = makeToken("FUNCTION", openToken.index, "@createArray");
		output.push(callToken);	
		return;
	}
	if (!(tokenBeforeExpr.type == "IDENTIFIER") &&
		!(tokenBeforeExpr.type == "FUNCTION" && tokenBeforeExpr.value != "@call") &&
		!(tokenBeforeExpr.type == "#")) {
		// not an identifier and
		// not a builtin call expression and 
		// not a getter
		const invalidToken = makeToken("INVALID", openToken.index);
		output.push(invalidToken);
		return;

	}
	if (subExprLen == 0) {
		// [] is equal to [0]
		// also makes logic easier
		const zeroToken = makeToken("DECIMAL", openToken.index, 0);
		output.push(zeroToken);	
		subExprLen++;
	}

	const lastExprOp = output[subExprIndex + subExprLen - 1];
	// commas in between square brackets behaves like parenthesis
	// Essentially a list of expressions
	// Get the result of the last sub expression
	if (lastExprOp.type == ",") {
		const flattenToken = makeToken("TRANSFORM", 0, "@flatten");
		output.push(flattenToken);	

		const popToken = makeToken("FUNCTION", 0, "@pop");
		output.push(popToken);	
	}
	
	// finally apply the operator to do getter
	const getterToken = makeToken("#", openToken.index); 
	output.push(getterToken);
}

function handleAssignLeftHandSide(tokens, index, output) {
	// has to be either 
	// i = 2
	// id 
	// or 
	// i[0] = 2
	//
	const token = tokens[index];
	let lastToken = output.pop();
	if (lastToken == null) {
		const emptyToken = makeToken("EMPTY", token.index);
		lastToken = emptyToken;
	}
	// WORLD "i" 
	if (lastToken.type == "IDENTIFIER") {
		// push reserved IDENTIFIER
		output.push(makeToken("IDENTIFIER", lastToken.index, "WORLD"))
		// push the id as a string
		output.push(makeToken("STRING", lastToken.index, lastToken.value));	
	} else if(lastToken.type != "#") {
		const invalidToken = makeToken("INVALID", token.index);
		output.push(invalidToken);
		return;
		
	}
	// ,
	output.push(makeToken(",", token.index));
}

export function shuntingYard(codeTokens) {
	const output  = [];
	const operators = [];
	const changeTracker = [];
	if (codeTokens.length == 0) {
		return output;
	}
	// expression = expression "," expression 
	const tokens = [].concat(codeTokens);
	tokens.unshift(makeToken("("))
	const EOF = tokens.pop();
	tokens.push(makeToken(")"));
	tokens.push(EOF);
	for(let i = 0; i < tokens.length; i++) {
		let token = tokens[i];
		if (token.type == "EOF") {
			break;
		}
		if (isAssignmentToken(token.type)) {
			handleAssignLeftHandSide(tokens, i, output);
		}
		if (token.type == "IDENTIFIER") {
			output.push(token);
		} else if(token.literal == true) {
			output.push(token);
		} else if (isOpenToken(token.type)) {
			// Save before the temporary token
			// is added
			changeTracker.push([i, output.length]);
			operators.push(token);
		} else if (isCloseToken(token.type)) {
			// Assume an open token 
			// has a matching close token
			while (operators.length) {
				let operator = operators.pop();
				if (operator.type == openTokenMatch(token.type)) {
					break;
				}
				output.push(operator);
			}

			// Find how many tokens were in between the pairs
			let [openTokenIndex, subExprIndex] = changeTracker.pop();
			let subExprLen = output.length - subExprIndex;

			if (token.type == ")") {
				handleParenTransform(tokens, i, openTokenIndex, output, subExprIndex, subExprLen);
			} else if (token.type == "]") {
				handleSquareBracketTransform(tokens, i, openTokenIndex, output, subExprIndex, subExprLen);
			}

		} else if (operators.length == 0) {
			operators.push(token);
		} else {
			const PREC_LOWER = 0;
			const PREC_EQUAL = 1;
			const PREC_GREATER = 2;
			let lastOperator = operators[operators.length - 1];
			let preorder; 
			if (token.precedence < lastOperator.precedence) {
				preorder = PREC_LOWER;
			} else if (token.precedence == lastOperator.precedence) {
				preorder = PREC_EQUAL;
			} else {
				preorder = PREC_GREATER;
			}
			if ((preorder == PREC_GREATER) ||
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
					if (isOpenToken(lastOperator.type)) {
						// Do not escape subexpression scope
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
			const callSetToken = makeToken("FUNCTION", output[i].index, "@set");
			const commaToken = makeToken(",", output[i].index);
			// It no longer needs this
			delete output[i].precedence
			// Insert comma
			// object index , value , @set == @set(object, index, value)
			output.splice(i, 1, commaToken, callSetToken);
			// move back to match
			i++;
		}
	}
	return output;
}

