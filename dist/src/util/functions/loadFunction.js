"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.functionCache = void 0;
exports.loadFunction = loadFunction;
exports.parseFileUrl = parseFileUrl;
const path_1 = __importDefault(require("path"));
const cliState_1 = __importDefault(require("../../cliState"));
const esm_1 = require("../../esm");
const logger_1 = __importDefault(require("../../logger"));
const pythonUtils_1 = require("../../python/pythonUtils");
const fileExtensions_1 = require("../fileExtensions");
exports.functionCache = {};
/**
 * Loads a function from a JavaScript or Python file
 * @param options Options for loading the function
 * @returns The loaded function
 */
async function loadFunction({ filePath, functionName, defaultFunctionName = 'func', basePath = cliState_1.default.basePath, useCache = true, }) {
    const cacheKey = `${filePath}${functionName ? `:${functionName}` : ''}`;
    if (useCache && exports.functionCache[cacheKey]) {
        return exports.functionCache[cacheKey];
    }
    const resolvedPath = basePath ? path_1.default.resolve(basePath, filePath) : filePath;
    if (!(0, fileExtensions_1.isJavascriptFile)(resolvedPath) && !resolvedPath.endsWith('.py')) {
        throw new Error(`File must be a JavaScript (${fileExtensions_1.JAVASCRIPT_EXTENSIONS.join(', ')}) or Python (.py) file`);
    }
    try {
        let func;
        if ((0, fileExtensions_1.isJavascriptFile)(resolvedPath)) {
            const module = await (0, esm_1.importModule)(resolvedPath, functionName);
            let moduleFunc;
            if (functionName) {
                moduleFunc = module;
            }
            else {
                moduleFunc =
                    typeof module === 'function'
                        ? module
                        : module?.default?.default ||
                            module?.default ||
                            module?.[defaultFunctionName] ||
                            module;
            }
            if (typeof moduleFunc !== 'function') {
                throw new Error(functionName
                    ? `JavaScript file must export a "${functionName}" function`
                    : `JavaScript file must export a function (as default export or named export "${defaultFunctionName}")`);
            }
            func = moduleFunc;
        }
        else {
            const result = (...args) => (0, pythonUtils_1.runPython)(resolvedPath, functionName || defaultFunctionName, args);
            func = result;
        }
        if (useCache) {
            exports.functionCache[cacheKey] = func;
        }
        return func;
    }
    catch (err) {
        logger_1.default.error(`Failed to load function: ${err.message}`);
        throw err;
    }
}
/**
 * Extracts the file path and function name from a file:// URL
 * @param fileUrl The file:// URL (e.g., "file://path/to/file.js:functionName")
 * @returns The file path and optional function name
 */
function parseFileUrl(fileUrl) {
    if (!fileUrl.startsWith('file://')) {
        throw new Error('URL must start with file://');
    }
    const urlWithoutProtocol = fileUrl.slice('file://'.length);
    const lastColonIndex = urlWithoutProtocol.lastIndexOf(':');
    if (lastColonIndex > 1) {
        return {
            filePath: urlWithoutProtocol.slice(0, lastColonIndex),
            functionName: urlWithoutProtocol.slice(lastColonIndex + 1),
        };
    }
    return {
        filePath: urlWithoutProtocol,
    };
}
//# sourceMappingURL=loadFunction.js.map