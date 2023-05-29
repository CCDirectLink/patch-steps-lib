import {Tokenizer} from './patchsteps-expr_tokenizer.js';
import {shuntingYard} from './patchsteps-expr_shunting.js';
import {PrettyError} from './patchsteps-expr_errors.js';
import {
	TOKEN_OPERATORS, 
	TOKEN_EMPTY, 
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
		if (token.type == "INVALID") {
			PrettyError.throwError(input, token.index, 19, "Unexpected token");
		}
		if (!isNaN(token.precedence)) {
			stackCount -= 2;
			if (stackCount < 0) {
				PrettyError.throwError(input, token.index, 19, "Invalid syntax for operation");
			}
			stackCount++;
		} else if (token.type == "FUNCTION") {
			// Removes the last argument
			stackCount--;
			if (stackCount < 0) {
				const nextTokenIndex = findMatchingTokenIndex(token, tokens) + 1;
				const nextToken = tokens[nextTokenIndex];	
				PrettyError.throwError(input, nextToken.index, 19, "Invalid syntax for operation");
			}
			// Then it pushes the result back onto the stack
			stackCount++;
		} else {
			stackCount++;
		}
	}
}

export function checkExpressionSyntax(input) {
	checkForInvalidTokens(input);
	checkForUnbalancedPairedToken(input);
	checkForInvalidOpsSyntax(input);
}

// LITERAL[value=value]
function createLiteral(value) {
	return {
		type: "LITERAL",
		value,
	};
}
// CALL[id=name, args=[]]
function createCall(id, args) {
	return {
		type: "CALL",
		id,
		args,
	};
}
// Accessor[id=name, index=index]
function createAccessor(id, index) {
	return {
		type: "ACCESSOR",
		id,
		index,
	};

}
function createIdentifier(id) {
	return {
		type: "IDENTIFIER",
		id,
	};
}
function createEmpty() {
	return {
		type: "EMPTY"
	};
}
function createBinaryOp(op, leftNode, rightNode) {
	return {
		type: "BINARY_OP",
		op,
		left: leftNode,
		right: rightNode,
	};
}

export function compileExpression(input) {
	checkExpressionSyntax(input);
	const tokenStream = doShuntingYard(input);
	const output = [];	
	for (const token of tokenStream) {
		if (token.literal) {
			output.push(createLiteral(token.value));
		} else if (token.type === "FUNCTION") {
			const identifier = token.value;
			// Only pop the last value becase
			const args = output.pop();
			let callArgs;
			if (Array.isArray(args)) {
				callArgs = args;
			} else if (args.type == "EMPTY") {
				callArgs = [];
			} else {
				callArgs = [args];
			}
			output.push(createCall(identifier, callArgs));
		} else if(token.type == "IDENTIFIER") {
			const id = token.value;
			output.push(createIdentifier(id));
		} else if (token.type == "EMPTY") {
			output.push(createEmpty());
		} else {
			// Assume binary operator
			let secondArg = output.pop();
			let firstArg = output.pop();
			const op = token.match;
			output.push(createBinaryOp(op,firstArg, secondArg));
		}
	}
	// Should be the root node
	return output.pop();
}

