export class StepMachine {
	constructor(steps) {
		this.steps = steps;
		this.si = 0;
		this.finished = false;
		this.contexts = [];
		this.tempSteps = [];
	}

	getCurrentContext() {
		const currentContext = this.contexts[this.contexts.length - 1];
		if (currentContext == null) {
			return null;
		}
		return currentContext;
	}

	*run() {
		while (this.si < this.steps.length) {
			let offset = this.si;
			let functionName = "";
			const context = this.getCurrentContext();
			if (context) {
				offset = offset - context.offset;
				functionName = context.name;
			}
			// These are only added to 
			// steps that run within a specific step
			// It will act 
			yield [offset, this.steps[this.si], functionName];
			// These were added by the last command
			// So do not increment the stepIndex yet
			while (this.tempSteps.length) {
				const tempStep = this.tempSteps.shift();
				yield [offset, tempStep, functionName];
			}

			if (this.finished) {
				break;
			}
			this.si++;
		}
	}
	

}

export function SafeStepMachine(stepMachine) {

	return {
		addTempStep(newStep) {
			stepMachine.tempSteps.push(newStep);
		},
		pushContext(context) {
			context.offset = context.offset || 0;
			context.name = context.name || "";
			stepMachine.contexts.push(context);
		},
		getCurrentContext() {
			return stepMachine.getCurrentContext();
		},
		popContext() {
			return stepMachine.contexts.pop();
		},
		exit() {
			stepMachine.finished = true;
		},
		gotoLabel(labelName) {
			const labelIndex = stepMachine.findLabelIndex(labelName);
			if (labelIndex == -1) {
				return false;
			}
			stepMachine.setStepIndex(labelIndex);
			return true;	
		},

		setStepIndex(newStepIndex) {
			if(newStepIndex < 0 || stepMachine.steps.length <= newStepIndex) {
				return false;
			}
			// Since the step machine will increment before it
			// fetches the instruction
			stepMachine.si = newStepIndex - 1;
			return true;
		},
		
		getCurrentStep() {
			return stepMachine.steps[stepMachine.si];
		},

		getStepIndex() {
			return stepMachine.si;
		},

		findLabelIndex(labelName) {
			let stepIndex = -1;

			for(const [index, step] of stepMachine.steps.entries())  {
				if (step["type"] !== "LABEL") {
					continue;
				}
				if (step["name"] == labelName) {
					stepIndex = index;
					break;
				}
			}

			return stepIndex;
		},

	};
}
