"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLlmRubric = void 0;
const matchers_1 = require("../matchers");
const invariant_1 = __importDefault(require("../util/invariant"));
const handleLlmRubric = ({ assertion, renderedValue, outputString, test, }) => {
    (0, invariant_1.default)(typeof renderedValue === 'string' ||
        typeof renderedValue === 'object' ||
        typeof renderedValue === 'undefined', '"llm-rubric" assertion type must have a string or object value');
    if (test.options?.rubricPrompt && typeof test.options.rubricPrompt === 'object') {
        test.options.rubricPrompt = JSON.stringify(test.options.rubricPrompt);
    }
    // Update the assertion value. This allows the web view to display the prompt.
    assertion.value = assertion.value || test.options?.rubricPrompt;
    return (0, matchers_1.matchesLlmRubric)(renderedValue || '', outputString, test.options, test.vars, assertion);
};
exports.handleLlmRubric = handleLlmRubric;
//# sourceMappingURL=llmRubric.js.map