#!/usr/bin/node
import {callable, patch} from "./patchsteps.js";
import {compileExpression} from "./patchsteps-expr_compiler.js";
import {evaluateExpression} from "./patchsteps-expr_evaluator.js";
import {PatchCompiler} from "./patchsteps-patch_compiler.js";
const compiler = new PatchCompiler();

callable.register("CALL", async function(state, args) {
	const sm = state.stepMachine;
	const memory = state.memory;
	const functionName = args["name"];
	let functionIndex = sm.findLabelIndex(functionName);
	if (functionIndex == -1) {
		state.debugState.throwError("ValueError", functionName + " does not exist.")
	}
	const functionStartIndex = functionIndex + 1;
	const odContext = sm.getCurrentContext();
	sm.pushContext({
		name: functionName,
		offset: functionStartIndex,
		returnIndex: sm.getStepIndex() + 1,
	});
	state.debugState.addStep(sm.getStepIndex(), "CALL", oldContext.name);
	sm.setStepIndex(functionIndex);
});

callable.register("RETURN", async function(state, args) {
	const sm = state.stepMachine;
	let oldContext = sm.popContext();
	if (oldContext == null) {
		sm.exit();
	} else {
		const {returnIndex} = oldCallState;
		sm.setStepIndex(returnIndex);	
		state.debugState.removeLastStep();
	}
});

compiler.registerHandler("FUNCTION", function(compiler,step) {
	// New function	
	const newSteps = [];
	newSteps.push({
		"type": "LABEL",
		"callable": true,
		"name": step["name"]
	});
	for (const statement of (step["body"] || [])) {
		newSteps.push(statement);
	}
	newSteps.push({
		"type": "RETURN",
	});
	compiler.addHiddenSteps(newSteps);	
	return 0;
});

function createIfSteps(compiler, step, steps, endLabel) {
	// This must be true
	if (!compiler.isGeneratedLabel(endLabel)) {
		console.log("Is not generated label", endLabel);
		// this is an error
		return;
	}
	
	// IF(cond)
	// {body}
	// {endJmp}
	// {endLabel}

	let newSteps = [];

	// IF(cond)
	const ifStep = {
		type: "IF",
		cond : step.cond || "true",
	};

	ifStep["elseJmp"] = compiler.createJump(endLabel.name, ifStep);

	newSteps.push(ifStep);
	// {body}
	const thenSteps = step["thenSteps"] || [];
	newSteps = newSteps.concat(thenSteps); 
	endLabel.parentStep = ifStep;
	// {endJmp}
	const endJmp = compiler.createJump(endLabel.name);
	newSteps.push(endJmp);
	// {endLabel}
	newSteps.push(endLabel);
	newSteps.forEach((s,i) => steps.push(s));
}

compiler.registerHandler("IF", function(compiler, step, steps) {
	const endLabel = compiler.createLabel();
	createIfSteps(compiler, step, steps, endLabel);	
});

compiler.registerHandler("ELIF", function(compiler, step, steps) {
	const endLabel = steps.pop();
	if (!compiler.isGeneratedLabel(endLabel)) {
		// this is an error	
		return;
	}
	if (!endLabel.parentStep) {
		// this is an error
		return;
	}
	const lastOwner = endLabel.parentStep;
	if (lastOwner == null) {
		// this is an error
		return;
	}

	if (lastOwner.type !== "IF") {
		// this is an error
		return;
	}

	// This is the marker for the if
	const elifLabel =  compiler.createLabel();
	steps.push(elifLabel);
	// Make the last if jump to this if if the condition fails
	const elseJmp = compiler.createJump(elifLabel.name, lastOwner);
	lastOwner["elseJmp"] = elseJmp;
	createIfSteps(compiler, step, steps, endLabel);	
})

compiler.registerHandler("WHILE", function(compiler, step, steps) {
	// WHILE(cond)
	// {body}
	// {endLabel}
	// ==
	// {label}
	// IF(cond)
	// {body}
	// {goto label}
	// {endLabel}

	// {label}
	const whileLoopLabel = compiler.createLabel();
	whileLoopLabel.loop = true;
	steps.push(whileLoopLabel);

	const whileLoopEndLabel = compiler.createLabel();
	const newSteps = [];
	// IF(cond)
	// {body}
	createIfSteps(compiler, step, newSteps, whileLoopEndLabel);
	const endLabel = newSteps.pop();

	// Unnecessary jump label added by if to exit
	compiler.deleteJump(newSteps.pop());
	// {goto label}
	newSteps.push(compiler.createJump(whileLoopLabel.name));
	// {endLabel}
	newSteps.push(endLabel);
	newSteps.forEach((s,i) => steps.push(s));
	// Skip the label and if condition since it was already generated
	return 2;
});

compiler.registerHandler("BREAK", function(compiler, step, steps) {
	let loopCond = null;
	for(const [index, loopStep] of steps.reverseIterator()) {
		if (loopStep.callable) {
			// We are about to exit out of a function
			// No loop found
			
			break;
		}

		if (!loopStep.loop) {
			continue;
		}
		// We found it
		loopCond = steps.get(index + 1);
	}

	if (loopCond == null) {
		throw Error("break used outside loop context");	
	}
	steps.push(compiler.createJump(loopCond.elseJmp.name));	
});

compiler.registerHandler("CONTINUE", function(compiler, step, steps) {
	let loopLabel = null;
	for(const [_, loopLabelStep] of steps.reverseIterator()) {
		if (loopLabelStep.callable) {
			// We are about to exit out of a function
			// No loop found
			
			break;
		}

		if (!loopLabelStep.loop) {
			continue;
		}
		// We found it
		loopLabel = loopLabelStep;
	}

	if (loopLabel == null) {
		throw Error("continue used outside loop context");	
	}
	steps.push(compiler.createJump(loopLabel.name));	
});

compiler.registerHandler("ELSE", function(compiler, step, steps) {
	const endLabel = steps.pop();
	if (!compiler.isGeneratedLabel(endLabel)) {
		// this is an error	
		return;
	}
	if (!endLabel.parentStep) {
		// this is an error
		return;
	}
	const lastOwner = endLabel.parentStep;
	if (lastOwner == null) {
		// This is an error
		return;
	}
	if (lastOwner.type !== "IF") {
		// this is an error
		return;
	}

	// This is the marker for the else
	const elseLabel = compiler.createLabel();
	steps.push(elseLabel);
	// Make the last if jump to this if if the condition fails
	lastOwner["elseJmp"] = compiler.createJump(elseLabel.name, lastOwner);
	// Always execute
	const mySteps = [];
	createIfSteps(compiler, step, mySteps, endLabel);	
	// Remove the if since it's unnecessary
	mySteps.shift();
	// Else is the final branch, no one else can add to
	// the final label
	mySteps[mySteps.length - 1].parentStep = null;
	// Add it to the big steps
	mySteps.forEach((s, i) => {
		steps.push(s)	
	});
});

callable.register("IF", async function(state, args) {
	const sm = state.stepMachine;
	const compiledExpression = compileExpression(args["cond"] || "true");
	const condResult = evaluateExpression(compiledExpression);
	if ((!!condResult) == false) {
		sm.addTempStep(args["elseJmp"]);
	}
});

callable.register("PRINT", async function(state, args) {
	console.log(args["data"]);
});

callable.register("PRINT_STEPS", async function(state, args) {
	console.log("Printing steps");
});


(async function() {
	// Test LABELS
	const steps = [{
		"type": "WHILE",
		"cond": "true",
		"thenSteps": [{
			"type": "PRINT",
			"data": "Only called if true"
		}, {
			"type": "CONTINUE"
		},{
			"type": "BREAK"
		}],
	}];
	const compiledSteps = compiler.compile(steps);
	await patch({}, compiledSteps, async () => {});
})()
