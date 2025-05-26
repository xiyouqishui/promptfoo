"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonPromptFunctionLegacy = exports.pythonPromptFunction = void 0;
exports.processPythonFile = processPythonFile;
const fs = __importStar(require("fs"));
const python_shell_1 = require("python-shell");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const pythonUtils_1 = require("../../python/pythonUtils");
const invariant_1 = __importDefault(require("../../util/invariant"));
const json_1 = require("../../util/json");
/**
 * Python prompt function. Runs a specific function from the python file.
 * @param promptPath - Path to the Python file.
 * @param functionName - Function name to execute.
 * @param context - Context for the prompt.
 * @returns The prompts
 */
const pythonPromptFunction = async (filePath, functionName, context) => {
    (0, invariant_1.default)(context.provider?.id, 'provider.id is required');
    const transformedContext = {
        vars: context.vars,
        provider: {
            id: typeof context.provider?.id === 'function' ? context.provider?.id() : context.provider?.id,
            label: context.provider?.label,
        },
        config: context.config ?? {},
    };
    return (0, pythonUtils_1.runPython)(filePath, functionName, [transformedContext]);
};
exports.pythonPromptFunction = pythonPromptFunction;
/**
 * Legacy Python prompt function. Runs the whole python file.
 * @param filePath - Path to the Python file.
 * @param context - Context for the prompt.
 * @returns The prompts
 */
const pythonPromptFunctionLegacy = async (filePath, context) => {
    (0, invariant_1.default)(context?.provider?.id, 'provider.id is required');
    const transformedContext = {
        vars: context.vars,
        provider: {
            id: typeof context.provider?.id === 'function' ? context.provider?.id() : context.provider?.id,
            label: context.provider?.label,
        },
        config: context.config ?? {},
    };
    const options = {
        mode: 'text',
        pythonPath: (0, envars_1.getEnvString)('PROMPTFOO_PYTHON', 'python'),
        args: [(0, json_1.safeJsonStringify)(transformedContext)],
    };
    logger_1.default.debug(`Executing python prompt script ${filePath}`);
    const results = (await python_shell_1.PythonShell.run(filePath, options)).join('\n');
    logger_1.default.debug(`Python prompt script ${filePath} returned: ${results}`);
    return results;
};
exports.pythonPromptFunctionLegacy = pythonPromptFunctionLegacy;
/**
 * Processes a Python file to extract or execute a function as a prompt.
 * @param filePath - Path to the Python file.
 * @param prompt - The raw prompt data.
 * @param functionName - Optional function name to execute.
 * @returns Array of prompts extracted or executed from the file.
 */
function processPythonFile(filePath, prompt, functionName) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const label = prompt.label ?? (functionName ? `${filePath}:${functionName}` : `${filePath}: ${fileContent}`);
    return [
        {
            raw: fileContent,
            label,
            function: functionName
                ? (context) => (0, exports.pythonPromptFunction)(filePath, functionName, { ...context, config: prompt.config })
                : (context) => (0, exports.pythonPromptFunctionLegacy)(filePath, { ...context, config: prompt.config }),
            config: prompt.config,
        },
    ];
}
//# sourceMappingURL=python.js.map