import {
	checkForUnbalancedPairedToken,
	checkForInvalidTokens,
	checkForInvalidOpsSyntax,
	compileExpression,
} from './patchsteps-expr_compiler.js';

function ne(func, input) {
	try {
		func(input);
	} catch(e) {
		console.log(e);
		throw Error(input + " raised an error.");
	}
}
function ye(func, input) {
	try {
		func(input);
	} catch(e) {
		console.log(e.message);
		return;
	}
	throw Error(input + " did not raise an error.");
}

function genChecker(func) {
	return function(input, shouldRaiseError = false) {
		if (shouldRaiseError) {
			ye(func, input);
		} else {
			ne(func, input);
		}
	}
}
const pt = genChecker(checkForUnbalancedPairedToken);
const it = genChecker(checkForInvalidTokens);
const io = genChecker(checkForInvalidOpsSyntax);

// PairedTokenChecker
pt("()");
pt("[]");
pt("(]", true);
pt("[)", true);
pt("(", true);
pt(")", true);
pt("[", true);
pt("]", true);

// InvalidTokenChecker
it("()");
it(".", true);

// InvalidOpsSyntax
io("()");
io("abc()");
io("abc[]");// same as abc[0]
io("2 +", true);
io("2 ** 3 /", true);

console.log(compileExpression("2 ** 3"))
console.log(compileExpression("true|| false"))
console.log(compileExpression("true&& false"))
