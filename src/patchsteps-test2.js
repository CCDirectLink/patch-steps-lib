//const assert = eval("require('node:assert').strict");
import {doShuntingYard, evaluateExpression, OPERATORS} from './patchsteps-exprevaluator.js';
class assert {
	static deepEqual(actual, expected, message = "Assertion failed") {
		if (actual != expected) {
			throw Error(message + " actual:" + actual + " expected:" + expected);
		}
	}
}
const functions = {
	',' : function(a,b) {
		if (Array.isArray(a)) {
			return a.concat([b]);
		}
		return [a,b];
	},
	'+': (a,b) => a + b,
	'*': (a,b) => a*b,
	'/': (a,b) => a/b,
	'-': (a,b) => a-b,
	'<=': (a,b) => a<=b,
	'>=': (a,b) => a>=b,
	'>': (a,b) => a>b,
	'<': (a,b) => a<b,
	'%': (a,b) => a%b,
	'&': (a,b) => a&b,
	'|': (a,b) => a|b,
	'^': (a,b) => a^b,
	'||': (a,b) => a||b,
	'&&': (a,b) => a&&b,
	'**': (a,b) => a**b,
	"==": (a,b) => a==b,
	"!=": (a,b) => a!=b,
	'<<': (a,b) => a<<b,
	'>>': (a,b) => a>>b,
	'>>>': (a,b) => a>>>b,
	'def': function(a,b) {
		return 1;
	}
};
const variables = {
	'abc': [5,10],
	'owo': 20
};

function t(input, expected) {
	let result = evaluateExpression(input, functions, variables) ;
	console.log(input, "=", result);
	assert.deepEqual(result, expected);
}
function generateTest(operatorCount = 20) {
	const operators = OPERATORS;
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
		console.log(input);
		console.log("postfix:",doShuntingYard(input).map(e => e.value))
		if (e.message.indexOf("Assert") > -1) {
			console.log(input, "did not match javascript");
		}
		console.log(e.message);
	}
}

for(let i = 0; i < 100; i++) {
	generateTest();
}
