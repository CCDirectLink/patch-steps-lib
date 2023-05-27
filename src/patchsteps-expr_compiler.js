import {Tokenizer} from './patchsteps-expr_tokenizer.js';
import {shuntingYard} from './patchsteps-expr_shunting.js';
import {PrettyError} from './patchsteps-expr_errors.js';
import {
	TOKEN_OPERATORS, 
	TOKEN_NOOP, 
	isOpenToken, 
	isCloseToken, 
	closeTokenMatch, 
	openTokenMatch
} from './patchsteps-expr_tokens.js';

function doShuntingYard(input) {
	const tokenizer = new Tokenizer(input);
	const tokens = [];
	let token;

	while ((token = tokenizer.getToken())) {
		tokens.push(token);
		if (token.type == "EOF") {
			break;
		}
	}

	return shuntingYard(tokens);
}


export function checkForUnbalancedPairedToken(input) {
	const tokenizer = new Tokenizer(input);
	const pairTokens = [];

	while(true) {
		const token = tokenizer.getToken();
		if (token.type == "EOF") {
			break;
		}

		if (isOpenToken(token.value)) {
			pairTokens.push(token);
		} else if (isCloseToken(token.value)) {
			let lastPairToken = pairTokens.pop();
			const matchingToken = openTokenMatch(token.value);
			if (lastPairToken == null || matchingToken != lastPairToken.value) {
				PrettyError.throwError(input, token.index, 19, "Token has no matching " + matchingToken);
			}
		}
	}
	if (pairTokens.length) {
		let lastPairToken = pairTokens.shift();
		const matchingToken = closeTokenMatch(lastPairToken.value);
		PrettyError.throwError(input, lastPairToken.index, 19, "Token has no matching " + matchingToken);
	}
}

export function checkForInvalidTokens(input) {
	const tokenizer = new Tokenizer(input);
	while (true) {
		const token = tokenizer.getToken();
		if (token.type == "EOF") {
			break;
		}
		if (token.type == "INVALID") {
			PrettyError.throwError(input, token.index, 19, "Invalid token");
		}
	}
}

function findMatchingTokenIndex(token, tokens) {
	for(let i = 0; i < tokens.length; i++) {
		if (tokens[i].index == token.index) {
			return i;
		}
	}
	return -1;
}

export function checkForInvalidOpsSyntax(input) {
	const tokenizer = new Tokenizer(input);
	const tokens = [];
	while (true) {
		const token = tokenizer.getToken();
		tokens.push(token);
		if (token.type == "EOF") {
			break;
		}
	}

	const postfixExpr = shuntingYard(tokens);
	let stackCount = 0;

	for (let i = 0; i < postfixExpr.length; i++) {
		const token = postfixExpr[i];
		if (!isNaN(token.precedence)) {
			stackCount -= 2;
			if (stackCount < 0) {
				PrettyError.throwError(input, token.index, 19, "Invalid syntax for operation");
			}
		} else if (token.type == "FUNCTION" || token.type == "OBJECT") {
			stackCount--;
			if (stackCount < 0) {
				const nextTokenIndex = findMatchingTokenIndex(token, tokens) + 1;
				const nextToken = tokens[nextTokenIndex];	
				PrettyError.throwError(input, nextToken.index, 19, "Invalid syntax for operation");
			}
		} else {
			stackCount++;
		}
	}
}

export function checkExpressionSyntax(input) {
	checkForInvalidTokens(input);
	checkForUnbalancedPairTokens(input);
	checkForInvalidSyntax(input);
}

export function compileExpression(input) {
	checkExpressionSyntax(input);
	const postfixExpr = doShuntingYard(input);

}
