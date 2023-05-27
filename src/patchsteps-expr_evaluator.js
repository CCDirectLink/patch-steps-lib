import {PrettyError} from './patchsteps-expr_errors.js';
const builtins = {
	'+': (a,b, e) => e(a) + e(b),
	'*': (a,b, e) => e(a)*e(b),
	'/': (a,b,e) => e(a)/e(b),
	'-': (a,b,e) => e(a)-e(b),
	'<=': (a,b,e) => e(a)<=e(b),
	'>=': (a,b,e) => e(a)>=e(b),
	'>': (a,b,e) => e(a)>e(b),
	'<': (a,b,e) => e(a)<e(b),
	'%': (a,b,e) => e(a)%e(b),
	'&': (a,b,e) => e(a)&e(b),
	'|': (a,b,e) => e(a)|e(b),
	'^': (a,b,e) => e(a)^e(b),
	'||': (a,b,e) => {
		const a_value = e(a);
		if (a_value) {
			return a_value;
		}
		return e(b);
	},
	'&&': (a,b,e) => {
		const a_value = e(a);
		if (!a_value) {
			return a_value;
		}
		return e(b);
	},
	'#': (a,b,e) => {
		return e(a)[e(b)];
	}, 
	'**': (a,b,e) => e(a)**e(b),
	"==": (a,b,e) => e(a)==e(b),
	"!=": (a,b,e) => e(a)!=e(b),
	'<<': (a,b,e) => e(a)<<e(b),
	'>>': (a,b,e) => e(a)>>e(b),
	'>>>': (a,b,e) => e(a)>>>e(b),
};
const PREVIEW_ERROR_LENGTH = 19;

function checkIfVariableExists(id, variables) {
	if (!variables[id]) {
		throw Error(id + " is not defined.");
	}
}

function getIdentifierValue(node, variables) {
	const varId = node.id;
	checkIfVariableExists(varId, variables);
	return variables[varId];
}

function getAccessorValue(node, variables, e) {
	const varId = node.id;
	checkIfVariableExists(varId, variables);
	const variable = variables[varId];
	const index = e(node.index);
	return variable[index];
}


function callFunction(callNode, variables, e) {
	const functionId = callNode.id;
	checkIfVariableExists(functionId, variables);
	const func = variables[functionId];
	if (typeof func  !== "function") {
		throw Error(functionId + " is not a function.");
	}
	const callArgs = callNode.args.map(n => e(n));
	return func.apply({variables, eval: e}, callArgs);
}

export function evaluateExpression(node, variables = {}, cache = {}) {
	if (node == null) {
		return;
	}
	if (cache["eval"] == null) {
		cache["eval"] = (n) => evaluateExpression(n, variables, cache);
	}
	if (node.type == "LITERAL") {
		return node.value;
	}
	if (node.type == "IDENTIFIER") {
		return getIdentifierValue(node, variables);
	}

	if (node.type == "BINARY_OP") {
		const e = cache["eval"];
		const operator = builtins[node.op];
		if (!operator) {
			console.log(node);
			throw Error(node.op + " is not implemented.");
		}

		return operator(node.left, node.right, e);
	}
	if (node.type == "CALL") {
		const e = cache["eval"];
		return callFunction(node, variables, e);
	}
	
	if (node.type == "ACCESSOR") {
		const e = cache["eval"];
		return getAccessorValue(node, variables, e);
	}
}
