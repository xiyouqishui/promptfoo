"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePython = void 0;
const wrapper_1 = require("../python/wrapper");
const types_1 = require("../types");
const invariant_1 = __importDefault(require("../util/invariant"));
const handlePython = async ({ assertion, renderedValue, valueFromScript, context, output, }) => {
    (0, invariant_1.default)(typeof renderedValue === 'string', 'python assertion must have a string value');
    let pass;
    let score;
    try {
        let result;
        if (typeof valueFromScript === 'undefined') {
            const isMultiline = renderedValue.includes('\n');
            let indentStyle = '    ';
            if (isMultiline) {
                // Detect the indentation style of the first indented line
                const match = renderedValue.match(/^(?!\s*$)\s+/m);
                if (match) {
                    indentStyle = match[0];
                }
            }
            const pythonScript = `import json

def main(output, context):
${isMultiline
                ? renderedValue
                    .split('\n')
                    .map((line) => `${indentStyle}${line}`)
                    .join('\n')
                : `    return ${renderedValue}`}
`;
            result = await (0, wrapper_1.runPythonCode)(pythonScript, 'main', [output, context]);
        }
        else {
            result = valueFromScript;
        }
        if ((typeof result === 'boolean' && result) ||
            (typeof result === 'string' && result.toLowerCase() === 'true')) {
            pass = true;
            score = 1.0;
        }
        else if ((typeof result === 'boolean' && !result) ||
            (typeof result === 'string' && result.toLowerCase() === 'false')) {
            pass = false;
            score = 0.0;
        }
        else if (typeof result === 'string' && result.startsWith('{')) {
            let parsed;
            try {
                parsed = JSON.parse(result);
            }
            catch (err) {
                throw new Error(`Invalid JSON: ${err} when parsing result: ${result}`);
            }
            if (!(0, types_1.isGradingResult)(parsed)) {
                throw new Error(`Python assertion must return a boolean, number, or {pass, score, reason} object. Got instead: ${result}`);
            }
            return parsed;
        }
        else if (typeof result === 'object') {
            if (!(0, types_1.isGradingResult)(result)) {
                throw new Error(`Python assertion must return a boolean, number, or {pass, score, reason} object. Got instead:\n${JSON.stringify(result, null, 2)}`);
            }
            const pythonGradingResult = result;
            if (assertion.threshold && pythonGradingResult.score < assertion.threshold) {
                pythonGradingResult.pass = false;
                const scoreMessage = `Python score ${pythonGradingResult.score} is less than threshold ${assertion.threshold}`;
                pythonGradingResult.reason = pythonGradingResult.reason
                    ? `${scoreMessage}: ${pythonGradingResult.reason}`
                    : scoreMessage;
            }
            return {
                ...pythonGradingResult,
                assertion,
            };
        }
        else {
            score = Number.parseFloat(String(result));
            pass = assertion.threshold ? score >= assertion.threshold : score > 0;
            if (Number.isNaN(score)) {
                throw new Error(`Python assertion must return a boolean, number, or {pass, score, reason} object. Instead got:\n${result}`);
            }
            if (typeof assertion.threshold !== 'undefined' && score < assertion.threshold) {
                pass = false;
            }
        }
    }
    catch (err) {
        return {
            pass: false,
            score: 0,
            reason: `Python code execution failed: ${err.message}`,
            assertion,
        };
    }
    return {
        pass,
        score,
        reason: pass
            ? 'Assertion passed'
            : `Python code returned ${pass ? 'true' : 'false'}\n${assertion.value}`,
        assertion,
    };
};
exports.handlePython = handlePython;
//# sourceMappingURL=python.js.map