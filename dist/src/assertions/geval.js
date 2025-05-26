"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGEval = void 0;
const matchers_1 = require("../matchers");
const invariant_1 = __importDefault(require("../util/invariant"));
const handleGEval = async ({ assertion, renderedValue, prompt, outputString, test, }) => {
    (0, invariant_1.default)(typeof renderedValue === 'string' || Array.isArray(renderedValue), 'G-Eval assertion type must have a string or array of strings value');
    const threshold = assertion.threshold ?? 0.7;
    if (Array.isArray(renderedValue)) {
        const scores = [];
        const reasons = [];
        for (const value of renderedValue) {
            const resp = await (0, matchers_1.matchesGEval)(value, prompt || '', outputString, threshold, test.options);
            scores.push(resp.score);
            reasons.push(resp.reason);
        }
        const scoresSum = scores.reduce((a, b) => a + b, 0);
        return {
            assertion,
            pass: scoresSum / scores.length >= threshold,
            score: scoresSum / scores.length,
            reason: reasons.join('\n\n'),
        };
    }
    else {
        const resp = await (0, matchers_1.matchesGEval)(renderedValue, prompt || '', outputString, threshold, test.options);
        return {
            assertion,
            ...resp,
        };
    }
};
exports.handleGEval = handleGEval;
//# sourceMappingURL=geval.js.map