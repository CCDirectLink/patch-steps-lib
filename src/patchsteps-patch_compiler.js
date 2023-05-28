class Steps {
	constructor(backingArray) {
		this.index = 0;
		this.blindLength = 0;
		this.steps = backingArray;
	}
	get(index) {
		return this.steps[index];
	}

	*reverseIterator() {
		let index = this.blindLength - 1;
		while (index >= 0) {
			yield [index, this.steps[index]];
			index--;
		}
	}
	
	push() {
		if (this.blindLength < this.steps.length) {
			this.steps.splice.apply(this.steps, [this.blindLength,0].concat(Array.from(arguments)));
		} else {
			this.steps.push.apply(this.steps, Array.from(arguments));
		}
		this.blindLength++;
	}

	pop() {
		if (this.blindLength == 0) {
			return null;
		}
		let item;
		this.blindLength--;
		if (this.blindLength < this.steps.length) {
			item = this.steps.splice(this.blindLength, 1).pop();
		} else {
			item = this.steps.pop();
		}
		return item;
	}

	get length() {
		return this.blindLength;
	}

	set length(newLength) {
		this.blindLength = newLength;
	}
}
function equalArray(arr1, arr2) {
	if (arr1.length !== arr2.length) {
		throw Error("Array lengths do not match");
	}
	for(let i = 0; i < arr1.length; i++) {
		if (arr1[i] != arr2[i]) {
			throw Error("Mismatch at index " + i);
		}
	}
}
function testSteps() {
	let steps = new Steps([]);
	// Check basic operations when both blindLength and length are equal
	steps.push(1);
	equalArray(steps.steps, [1]);
	steps.pop();
	equalArray(steps.steps, []);
	// Test when array has elements in it
	steps = new Steps([1]);	
	steps.length = 0;
	steps.push(2);
	equalArray(steps.steps, [2, 1]);	
	steps.pop();
	equalArray(steps.steps, [1]);	
	steps.pop();
	equalArray(steps.steps, [1]);
	steps.push(3,4);
	equalArray(steps.steps, [3,4, 1]);
}
testSteps();
export class PatchCompiler {
	constructor(stepHandlers) {
		// [stepName]: function(compiler, rawSteps, index) : bool // == true the revisit current step else ignore
		this.stepHandlers = stepHandlers || {};
		this.labelIndex = 0;
		this.labels = {};
		this.jumpIndex = 0;
		this.jumps = {};
		this.hiddenSteps = [];
	}

	registerHandler(stepName, handler) {
		this.stepHandlers[stepName] = handler;
	}

	isGeneratedLabel(label) {
		if (label == null) {
			return false;
		}
		if (label.type !== "LABEL") {
			return false;
		}
		return this.labels[label.name] === label;
	}
	
	isGeneratedJump(jump) {
		if (jump == null) {
			return false;
		}
		if (jump.type !== "JUMP_TO_LABEL") {
			return false;
		}
		return this.jumps[jump.id] === jump;
	}

	createJump(labelName, step = null) {
		this.jumpIndex++;
		const jump = {
			type: "JUMP_TO_LABEL",
			id: "JUMP" + this.jumpIndex,
			name: labelName,
			// If null then jump is relative to this step
			// otherwise it's relative to parent step
			relativeTo: step,
		};
		this.jumps[jump.id] = jump;
		return jump;
	}
	
	deleteJump(jump) {
		this.jumps[jump.id].relativeTo = null;
		delete this.jumps[jump.id];
	}

	addHiddenSteps(hiddenSteps) {
		if (!Array.isArray(hiddenSteps)) {
			throw Error("Hidden steps must be an array.");
		}
		this.hiddenSteps = hiddenSteps.concat(this.hiddenSteps);
	}

	getHandler(handlerType) {
		return this.stepHandlers[handlerType];
	}

	createLabel() {
		this.labelIndex++;
		const labelName = "LABEL" + this.labelIndex;
		const label = {
			type: "LABEL",
			name: labelName,
		};
		this.labels[label.name] = label;
		return label;
	}	
	
	stripUselessJumps(steps) {
		for(let i = 0; i < steps.length - 1; i++) {
			let currentStep = steps[i];
			if (currentStep.type != "JUMP_TO_LABEL") {
				continue;
			}
			let nextStep = steps[i + 1];
			if (nextStep.type != "LABEL") {
				continue;
			}

			if (nextStep.name !== currentStep.name) {
				continue;
			}
			// Delete current jump since it's useless
			steps.splice(i, 1);
			this.deleteJump(currentStep);
			i--;	
		}
	}
	
	calculateJumpOffset(index, targetIndex) {
		return targetIndex - index;
	}

	stripGeneratedLabels(steps) {
		const labels = {};
		for(let i = 0; i < steps.length; i++) {
			const label = steps[i];
			if (!this.isGeneratedLabel(label)) { 
				continue;
			}
			steps.splice(i, 1);
			labels[label.name] = i;
			i--;
		}
	
		// Convert JUMP_TO_LABEL to JUMP
		for (let i = 0; i < steps.length; i++) {
			const jump = steps[i];
			if (!this.isGeneratedJump(jump)) { 
				continue;
			}
			if (jump.relativeTo !== null) {
				// This isn't suppose to happen
				throw Error("relativeTo is not null for free standing jump @" + i);
			}
			this.deleteJump(jump);
			let offset = this.calculateJumpOffset(i, labels[jump.name]);
			steps[i] = {
				type: "JUMP",
				absolute: false,
				offset, 
			};
		}
		// Do the jumps associated with objects
		const jumpIds = Object.keys(this.jumps);
		for (const jumpId of jumpIds) {
			const jump = this.jumps[jumpId];
			
			if (jump.relativeTo == null) {
				// This isn't suppose to happen
				throw Error("relativeTo is null so I can't do anything with it. id:" + jump.id);
			}
			const stepIndex = steps.indexOf(jump.relativeTo);
			// No longer needed
			delete jump.relativeTo;
			delete jump.id;
			jump.type = "JUMP";
			jump.absolute = false;
			let offset = this.calculateJumpOffset(stepIndex, labels[jump.name]);
			jump.offset = offset;
			delete jump.name;
		}
	}
	compileSteps(rawSteps, newSteps) {
		const copyRawSteps = [].concat(rawSteps);
		const blindSteps = new Steps(newSteps, 0);
		let i = 0;
		while (true) {
			for(; i < newSteps.length;) {
				const step = newSteps[i];
				const handler = this.getHandler(step.type);
				if (handler) {
					// It's up to the handler to add it back
					const step = newSteps.splice(i, 1).pop();
					blindSteps.length = i;
					let toSkip = handler(this,step,blindSteps);
					if (isNaN(toSkip)) {
						toSkip = 1;
					}
					i += toSkip;
				} else {
					i++;
				}
			}
			if (copyRawSteps.length == 0) {
				break;
			}
			newSteps.push(copyRawSteps.shift());
		}
		newSteps.push({
			type: "END"
		});
		this.hiddenSteps.forEach((s) => newSteps.push(s));
	}

	compile(rawSteps) {
		// Do label cleanup
		const newSteps = [];
		this.compileSteps(rawSteps, newSteps);
		this.stripUselessJumps(newSteps);
		this.stripGeneratedLabels(newSteps);
		return newSteps;
	}
}
