#!/usr/bin/node
import {callable, patch} from "./patchsteps.js";
import {compileExpression} from "./patchsteps-expr_compiler.js";
import {evaluateExpression} from "./patchsteps-expr_evaluator.js";
callable.register("CALL", async function(state, args) {
	const sm = state.stepMachine;
	const memory = state.memory;
	const functionName = args["name"];
	memory.callstack = memory.callstack || [];
	memory.callstack.push({
		returnIndex: sm.getStepIndex(),
		functionName: state.functionName, 
		oldReferenceIndex: state.stepReferenceIndex
	});
	let functionIndex = sm.findLabelIndex(functionName);
	if (functionIndex == -1) {
		state.debugState.throwError("ValueError", functionName + " does not exist.")
	}
	state.debugState.addStep(sm.getStepIndex(), "CALL", state.functionName);
	sm.gotoLabel(functionName);
	state.functionName = functionName;
	state.stepReferenceIndex = functionIndex + 1;
});

callable.register("GOTO", async function(state, args) {
	const sm = state.stepMachine;
	sm.setStepIndex(sm.findLabelIndex(args["name"]))
});

callable.register("RETURN", async function(state, args) {
	const sm = state.stepMachine;
	const memory = state.memory;

	memory.callstack = memory.callstack || [];
	let oldCallState = memory.callstack.pop();
	if (oldCallState == null) {
		sm.exit();
	} else {
		const {returnIndex, functionName, oldReferenceIndex} = oldCallState;
		state.functionName = functionName;
		state.stepReferenceIndex = oldReferenceIndex;
		sm.setStepIndex(returnIndex);	
		state.debugState.removeLastStep();
	}
});

callable.register("FUNCTION", async function(state, args) {
	const sm = state.stepMachine;
	const currentIndex = sm.findLabelIndex(args["name"]);
	if (currentIndex > -1) {
		state.debugState.throwError("ValueError", "Redefinining function " + args["name"]);
	}
	// New function	
	const newSteps = [];
	newSteps.push({
		"type": "EXIT"
	});

	newSteps.push({
		"type": "LABEL",
		"name": args["name"]
	});

	for (const step of (args["body"] || [])) {
		newSteps.push(step);
	}

	newSteps.push({
		"type": "RETURN",
	});
	sm.addSteps(newSteps);

});

callable.register("IF", async function(state, args) {
	const sm = state.stepMachine;
	const memory = state.memory;
	if (isNaN(args["number"])) {
		const randomNumber = Math.round(Math.random() * 1e6);
		sm.getCurrentStep()["number"] = randomNumber;
		args["number"] = sm.getCurrentStep()["number"];
	}

	if (!args["label"]) {
		sm.getCurrentStep()["label"] = "IF_" + args["number"];
		args["label"] = sm.getCurrentStep()["label"];
	}

	const ifLabel = args["label"];
	let ifIndex = sm.findLabelIndex(args["label"]);
	if (ifIndex == -1) {
		const newSteps = [];
		newSteps.push({
			"type": "EXIT"
		});
	
		newSteps.push({
			"type": "LABEL",
			"name": ifLabel
		});
	
		for (const step of (args["thenSteps"] || [])) {
			newSteps.push(step);
		}
	
		newSteps.push({
			"type": "RETURN",
		});
		sm.addSteps(newSteps);
		ifIndex = sm.findLabelIndex(args["label"]);
	}
	let compiledExpression;
	const compiledExpressionName = "IF_EXPR_" + args["number"];

	if (memory[compiledExpressionName] == null) {
		console.log("Compiling expression for the first time.");
		compiledExpression = compileExpression(args["cond"] || "true");
		memory[compiledExpressionName] = compiledExpression;
	} else {
		console.log("Getting compiled expression from memory.");
		compiledExpression = memory[compiledExpressionName];
		sm.exit();	
	}

	const condResult = evaluateExpression(compiledExpression);
	if (!!condResult) {
		memory.callstack = memory.callstack || [];
		memory.callstack.push({
			returnIndex: sm.getStepIndex(),
			functionName: state.functionName, 
			oldReferenceIndex: state.stepReferenceIndex
		});
		state.debugState.addStep(sm.getStepIndex(), "IF", state.functionName);
		state.stepReferenceIndex = ifIndex + 1;
		sm.gotoLabel(args["label"]);
	}
});

callable.register("PRINT", async function(state, args) {
	console.log(args["data"]);
});

callable.register("PRINT_STEPS", async function(state, args) {
	console.log(state.stepMachine.steps);
});



callable.register("EXIT", async function(state) {
	const sm = state.stepMachine;
	sm.exit();
});


(async function() {
	// Test LABELS
	const steps = [{
		"type": "FUNCTION",
		"name": "MyFunction",
		"body": [{
			"type": "PRINT",
			"data": "I did exactly what you wanted."
		},{
			"type": "PRINT",
			"data": "Inside function",
		}]
	}, {
		"type": "PRINT",
		"data": "Calling OWO", 
	}, {
		"type": "CALL",
		"name": "MyFunction"
	}, {
		"type": "LABEL",
		"name": "loop",
	}, {
		"type": "IF",
		"cond": "2 == 2",
		"thenSteps" : [{
			"type": "PRINT",
			"data": "Only called if true"
		}]
	}, {
		"type": "GOTO",
		"name": "loop",
	},{
		"type": "IF",
		"cond": "1 == 2",
		"thenSteps" : [{
			"type": "PRINT",
			"data": "Will not be called"
		}]
	}, {
		"type": "PRINT_STEPS",
	}];
	await patch({}, steps, async () => {});
})()
