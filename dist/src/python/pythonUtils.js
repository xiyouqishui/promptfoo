"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.state = void 0;
exports.tryPath = tryPath;
exports.validatePythonPath = validatePythonPath;
exports.runPython = runPython;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const python_shell_1 = require("python-shell");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const json_1 = require("../util/json");
const execAsync_1 = require("./execAsync");
exports.state = { cachedPythonPath: null };
/**
 * Attempts to validate a Python executable path.
 * @param path - The path to the Python executable to test.
 * @returns The validated path if successful, or null if invalid.
 */
async function tryPath(path) {
    try {
        const result = await Promise.race([
            (0, execAsync_1.execAsync)(`${path} --version`),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Command timed out')), 2500)),
        ]);
        const versionOutput = result.stdout.trim();
        if (versionOutput.startsWith('Python')) {
            return path;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Validates and caches the Python executable path.
 *
 * @param pythonPath - Path to the Python executable.
 * @param isExplicit - If true, only tries the provided path.
 * @returns Validated Python executable path.
 * @throws {Error} If no valid Python executable is found.
 */
async function validatePythonPath(pythonPath, isExplicit) {
    if (exports.state.cachedPythonPath) {
        return exports.state.cachedPythonPath;
    }
    const primaryPath = await tryPath(pythonPath);
    if (primaryPath) {
        exports.state.cachedPythonPath = primaryPath;
        return primaryPath;
    }
    if (isExplicit) {
        throw new Error(`Python 3 not found. Tried "${pythonPath}" ` +
            `Please ensure Python 3 is installed and set the PROMPTFOO_PYTHON environment variable ` +
            `to your Python 3 executable path (e.g., '${process.platform === 'win32' ? 'C:\\Python39\\python.exe' : '/usr/bin/python3'}').`);
    }
    const alternativePath = process.platform === 'win32' ? 'py -3' : 'python3';
    const secondaryPath = await tryPath(alternativePath);
    if (secondaryPath) {
        exports.state.cachedPythonPath = secondaryPath;
        return secondaryPath;
    }
    throw new Error(`Python 3 not found. Tried "${pythonPath}" and "${alternativePath}". ` +
        `Please ensure Python 3 is installed and set the PROMPTFOO_PYTHON environment variable ` +
        `to your Python 3 executable path (e.g., '${process.platform === 'win32' ? 'C:\\Python39\\python.exe' : '/usr/bin/python3'}').`);
}
/**
 * Runs a Python script with the specified method and arguments.
 *
 * @param scriptPath - The path to the Python script to run.
 * @param method - The name of the method to call in the Python script.
 * @param args - An array of arguments to pass to the Python script.
 * @param options - Optional settings for running the Python script.
 * @param options.pythonExecutable - Optional path to the Python executable.
 * @returns A promise that resolves to the output of the Python script.
 * @throws An error if there's an issue running the Python script or parsing its output.
 */
async function runPython(scriptPath, method, args, options = {}) {
    const absPath = path_1.default.resolve(scriptPath);
    const tempJsonPath = path_1.default.join(os_1.default.tmpdir(), `promptfoo-python-input-json-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const outputPath = path_1.default.join(os_1.default.tmpdir(), `promptfoo-python-output-json-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const customPath = options.pythonExecutable || (0, envars_1.getEnvString)('PROMPTFOO_PYTHON');
    let pythonPath = customPath || 'python';
    pythonPath = await validatePythonPath(pythonPath, typeof customPath === 'string');
    const pythonOptions = {
        args: [absPath, method, tempJsonPath, outputPath],
        env: process.env,
        mode: 'binary',
        pythonPath,
        scriptPath: __dirname,
    };
    try {
        await fs_1.default.writeFileSync(tempJsonPath, (0, json_1.safeJsonStringify)(args), 'utf-8');
        logger_1.default.debug(`Running Python wrapper with args: ${(0, json_1.safeJsonStringify)(args)}`);
        await new Promise((resolve, reject) => {
            try {
                const pyshell = new python_shell_1.PythonShell('wrapper.py', pythonOptions);
                pyshell.stdout.on('data', (chunk) => {
                    logger_1.default.debug(chunk.toString('utf-8').trim());
                });
                pyshell.stderr.on('data', (chunk) => {
                    logger_1.default.error(chunk.toString('utf-8').trim());
                });
                pyshell.end((err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
        const output = await fs_1.default.readFileSync(outputPath, 'utf-8');
        logger_1.default.debug(`Python script ${absPath} returned: ${output}`);
        let result;
        try {
            result = JSON.parse(output);
            logger_1.default.debug(`Python script ${absPath} parsed output type: ${typeof result}, structure: ${result ? JSON.stringify(Object.keys(result)) : 'undefined'}`);
        }
        catch (error) {
            throw new Error(`Invalid JSON: ${error.message} when parsing result: ${output}\nStack Trace: ${error.stack}`);
        }
        if (result?.type !== 'final_result') {
            throw new Error('The Python script `call_api` function must return a dict with an `output`');
        }
        // Add helpful logging about the data structure
        if (result.data) {
            logger_1.default.debug(`Python script result data type: ${typeof result.data}, structure: ${result.data ? JSON.stringify(Object.keys(result.data)) : 'undefined'}`);
        }
        return result.data;
    }
    catch (error) {
        logger_1.default.error(`Error running Python script: ${error.message}\nStack Trace: ${error.stack?.replace('--- Python Traceback ---', 'Python Traceback: ') ||
            'No Python traceback available'}`);
        throw new Error(`Error running Python script: ${error.message}\nStack Trace: ${error.stack?.replace('--- Python Traceback ---', 'Python Traceback: ') ||
            'No Python traceback available'}`);
    }
    finally {
        await Promise.all([tempJsonPath, outputPath].map((file) => {
            try {
                fs_1.default.unlinkSync(file);
            }
            catch (error) {
                logger_1.default.error(`Error removing ${file}: ${error}`);
            }
        }));
    }
}
//# sourceMappingURL=pythonUtils.js.map