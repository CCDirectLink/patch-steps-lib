//const assert = eval("require('node:assert').strict");
import {shuntingYard} from './patchsteps-expr_shunting.js';
import {TOKEN_OPERATORS} from './patchsteps-expr_tokens.js';
import {evaluateExpression} from './patchsteps-expr_evaluator.js';
import {compileExpression} from './patchsteps-expr_compiler.js';
class assert {
	static deepEqual(actual, expected, message = "Assertion failed") {
		if (actual != expected) {
			throw Error(message + " actual:" + actual + " expected:" + expected);
		}
	}
}

const variables = {
	'abc': [5,10],
	'owo': 20,
	'def': function() {
		return 1;
	},
};

function t(input, expected) {
	let expr = compileExpression(input);
	let result = evaluateExpression(expr, variables);
	console.log(input, "=", result);
	assert.deepEqual(result, expected);
}
function generateTest(operatorCount = 20) {
	const operators = TOKEN_OPERATORS.map(e => e.match);
	let ops = [];
	for(let i = 0; i < operatorCount;i++) {
		let operator;
		do {
			operator = operators[Math.trunc(Math.random() * operators.length)]
		} while(["(",")", "[", "]", ","].indexOf(operator) > -1)
		ops.push(operator);
	}	
	let input = Math.round(Math.random() * 5) + " ";
	for (const operator of ops) {
		input += operator + " ";
		input += Math.round(Math.random() * 5) + " ";
	}	
	try {
		t(input, eval(input))
	} catch(e) {
		console.log(e.message);
	}
}

t("abc[]", 5)
t("abc[0]", 5)
t("abc[1]", 10)
t("def()", 1)
t("abc[def()]", 10)
t("true||false", true)
t("true&&false", false)
