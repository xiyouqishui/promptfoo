"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformInputType = void 0;
exports.transform = transform;
const cliState_1 = __importDefault(require("../cliState"));
const esm_1 = require("../esm");
const logger_1 = __importDefault(require("../logger"));
const pythonUtils_1 = require("../python/pythonUtils");
const file_node_1 = require("./file.node");
const fileExtensions_1 = require("./fileExtensions");
var TransformInputType;
(function (TransformInputType) {
    TransformInputType["OUTPUT"] = "output";
    TransformInputType["VARS"] = "vars";
})(TransformInputType || (exports.TransformInputType = TransformInputType = {}));
/**
 * Parses a file path string to extract the file path and function name.
 * @param filePath - The file path string, potentially including a function name.
 * @returns A tuple containing the file path and function name (if present).
 */
function parseFilePathAndFunctionName(filePath) {
    const parts = filePath.split(':');
    return parts.length === 2 ? [parts[0], parts[1]] : [filePath, undefined];
}
/**
 * Retrieves a JavaScript transform function from a file.
 * @param filePath - The path to the JavaScript file.
 * @param functionName - Optional name of the function to retrieve.
 * @returns A Promise resolving to the requested function.
 * @throws Error if the file doesn't export a valid function.
 */
async function getJavascriptTransformFunction(filePath, functionName) {
    const requiredModule = await (0, esm_1.importModule)(filePath);
    if (functionName && typeof requiredModule[functionName] === 'function') {
        return requiredModule[functionName];
    }
    else if (typeof requiredModule === 'function') {
        return requiredModule;
    }
    else if (requiredModule.default && typeof requiredModule.default === 'function') {
        return requiredModule.default;
    }
    throw new Error(`Transform ${filePath} must export a function, have a default export as a function, or export the specified function "${functionName}"`);
}
/**
 * Creates a function that runs a Python transform function.
 * @param filePath - The path to the Python file.
 * @param functionName - The name of the function to run (defaults to 'get_transform').
 * @returns A function that executes the Python transform.
 */
function getPythonTransformFunction(filePath, functionName = 'get_transform') {
    return async (output, context) => {
        return (0, pythonUtils_1.runPython)(filePath, functionName, [output, context]);
    };
}
/**
 * Retrieves a transform function from a file, supporting both JavaScript and Python.
 * @param filePath - The path to the file, including the 'file://' prefix.
 * @returns A Promise resolving to the requested function.
 * @throws Error if the file format is unsupported.
 */
async function getFileTransformFunction(filePath) {
    const [actualFilePath, functionName] = parseFilePathAndFunctionName(filePath.slice('file://'.length));
    const fullPath = (0, file_node_1.safeJoin)(cliState_1.default.basePath || '', actualFilePath);
    if ((0, fileExtensions_1.isJavascriptFile)(fullPath)) {
        return getJavascriptTransformFunction(fullPath, functionName);
    }
    else if (fullPath.endsWith('.py')) {
        return getPythonTransformFunction(fullPath, functionName);
    }
    throw new Error(`Unsupported transform file format: file://${actualFilePath}`);
}
/**
 * Creates a function from inline JavaScript code.
 * @param code - The JavaScript code to convert into a function.
 * @returns A Function created from the provided code.
 */
function getInlineTransformFunction(code, inputType) {
    return new Function(inputType, 'context', code.includes('\n') ? code : `return ${code}`);
}
/**
 * Determines and retrieves the appropriate transform function based on the input.
 * @param codeOrFilepath - Either inline code or a file path starting with 'file://'.
 * @returns A Promise resolving to the appropriate transform function.
 */
async function getTransformFunction(codeOrFilepath, inputType) {
    let transformFn = null;
    if (codeOrFilepath.startsWith('file://')) {
        try {
            transformFn = await getFileTransformFunction(codeOrFilepath);
        }
        catch (error) {
            logger_1.default.error(`Error loading transform function from file: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    else {
        try {
            transformFn = getInlineTransformFunction(codeOrFilepath, inputType);
        }
        catch (error) {
            logger_1.default.error(`Error creating inline transform function: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    return transformFn;
}
/**
 * Transforms the output using a specified function or file.
 *
 * @param codeOrFilepath - The transformation function code or file path.
 * If it starts with 'file://', it's treated as a file path. The file path can
 * optionally include a function name (e.g., 'file://transform.js:myFunction').
 * If no function name is provided for Python files, it defaults to 'get_transform'.
 * For inline code, it's treated as JavaScript.
 * @param transformInput - The output to be transformed. Can be a string or an object.
 * @param context - The context object containing variables and prompt information.
 * @param validateReturn - Optional. If true, throws an error if the transform function doesn't return a value.
 * @returns A promise that resolves to the transformed output.
 * @throws Error if the file format is unsupported or if the transform function
 * doesn't return a value (unless validateReturn is false).
 */
async function transform(codeOrFilepath, transformInput, context, validateReturn = true, inputType = TransformInputType.OUTPUT) {
    const postprocessFn = await getTransformFunction(codeOrFilepath, inputType);
    if (!postprocessFn) {
        throw new Error(`Invalid transform function for ${codeOrFilepath}`);
    }
    const ret = await Promise.resolve(postprocessFn(transformInput, context));
    if (validateReturn && (ret === null || ret === undefined)) {
        throw new Error(`Transform function did not return a value\n\n${codeOrFilepath}`);
    }
    return ret;
}
//# sourceMappingURL=transform.js.map