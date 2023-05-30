//const assert = eval("require('node:assert').strict");
import {shuntingYard} from './patchsteps-expr_shunting.js';
import {TOKEN_OPERATORS} from './patchsteps-expr_tokens.js';
import {evaluateExpression} from './patchsteps-expr_evaluator.js';
import {compileExpression} from './patchsteps-expr_compiler.js';
// Assume both are of same type
function objectCompare(l, r) {
	if(Array.isArray(l)) {
		if (l.length !== r.length) {
			return false;
		}
		for (let i = 0; i < l.length; i++) {
			let lValue = l[i];
			let rValue = r[i];
			const lType = getType(lValue);
			if (lType != getType(rValue)) {
				return false;
			}
			if (lType == "object" || lType == "array") {
				if (!objectCompare(lValue, rValue)) {
					return false;
				}
			} else if (lValue !== rValue) {
				return false;
			}
		}
	} else {
		let lKeys = Object.keys(l);
		let rKeys = Object.keys(r);
		if (lKeys.length != rKeys.length) {
			return false;
		}
		for(const key of lKeys) {
			let lValue = l[key];
			let rValue = r[key];
			const lType = getType(lValue);
			if (lType != getType(rValue)) {
				return false;
			}
			if (lType == "object" || lType == "array") {
				if (!objectCompare(lValue, rValue)) {
					return false;
				}
			} else if (lValue !== rValue) {
				return false;
			}
		}
	}
	return true;

}

function getType(value) {
	const valueType = typeof value;
	if(valueType == "object") {
		if (Array.isArray(value)) {
			return "array";
		}
		return "object";
	}
	return valueType;
}

class assert {
	static deepEqual(actual, expected, message = "Assertion failed") {
		const expectedType = getType(expected);
		const actualType = getType(actual);
		if (expectedType != actualType) {
			throw Error(message + " typeof actual == " + actualType + " but typeof expected == " + expectedType);
		}

		if (typeof expected == "object"){
			if(!objectCompare(expected, actual)) {
				throw Error(message + " expected and actual are not equal.");
			}
		} else if (actual != expected) {
			throw Error(message + " actual:" + actual + " but expected:" + expected);
		}
	}
}

const variables = {
	'abc': [5,10],
	'cde': [
		[4,5],
	],
	'owo': 20,
	'def': function() {
		return 1;
	},
	'mod': function() {
		return "loaded";
	},
};
variables['WORLD'] = variables
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

// Regression testing
t("abc[]", 5)
t("abc[0]", 5)
t("abc[1]", 10)
t("cde[][]", 4);
t("abc[0] = 1", 1);
t("abc[0] == 1", true);
t("abc[0] = 'hi'", 'hi');
t("def()", 1)
t("abc[def()]", 10)
t("true||false", true)
t("true&&false", false)
// Test short-circuiting
t("true||undefinedVariable", true)
t("false&&undefinedVariable", false)
t('mod() == "loaded"', true)
t("mod() == 'loaded'", true)
t("\"\\\"\" == '\"'", true);

// Test multiple expressions
t("1,2,3", 3);
// test array creation
t("[]", []);
t("[1]", [1]);
t("[1,2]", [1,2]);
t("5,10", 10);
t("[(5,10)]", [10]);
t("(i = (5,10)) == 10", true);
// test array assignment
t("[1][]", 1);
t("[1,12][1]", 12);
// TODO: make this work t("[1,[0]][1][0]", 0); 
