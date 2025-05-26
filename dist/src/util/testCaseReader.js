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
exports.readTestFiles = readTestFiles;
exports.readStandaloneTestsFile = readStandaloneTestsFile;
exports.readTest = readTest;
exports.loadTestsFromGlob = loadTestsFromGlob;
exports.readTests = readTests;
const json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
const sync_1 = require("csv-parse/sync");
const dedent_1 = __importDefault(require("dedent"));
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const js_yaml_1 = __importDefault(require("js-yaml"));
const path = __importStar(require("path"));
const path_1 = require("path");
const csv_1 = require("../csv");
const envars_1 = require("../envars");
const esm_1 = require("../esm");
const googleSheets_1 = require("../googleSheets");
const huggingfaceDatasets_1 = require("../integrations/huggingfaceDatasets");
const logger_1 = __importDefault(require("../logger"));
const providers_1 = require("../providers");
const pythonUtils_1 = require("../python/pythonUtils");
const telemetry_1 = __importDefault(require("../telemetry"));
const fileExtensions_1 = require("./fileExtensions");
async function readTestFiles(pathOrGlobs, basePath = '') {
    if (typeof pathOrGlobs === 'string') {
        pathOrGlobs = [pathOrGlobs];
    }
    const ret = {};
    for (const pathOrGlob of pathOrGlobs) {
        const resolvedPath = path.resolve(basePath, pathOrGlob);
        const paths = (0, glob_1.globSync)(resolvedPath, {
            windowsPathsNoEscape: true,
        });
        for (const p of paths) {
            const yamlData = js_yaml_1.default.load(fs.readFileSync(p, 'utf-8'));
            Object.assign(ret, yamlData);
        }
    }
    return ret;
}
/**
 * Reads test cases from a file in various formats (CSV, JSON, YAML, Python, JavaScript) and returns them as TestCase objects.
 *
 * Supports multiple input sources:
 * - Hugging Face datasets (huggingface://datasets/...)
 * - JavaScript/TypeScript files (.js, .ts, .mjs)
 * - Python files (.py) with optional function name
 * - Google Sheets (https://docs.google.com/spreadsheets/...)
 * - Local CSV files with configurable delimiter
 * - Local JSON files
 * - Local YAML files (.yaml, .yml)
 *
 * For file-based inputs, each row/entry is converted into a TestCase object with an auto-generated description
 * if none is provided.
 *
 * @param varsPath - Path or URL to the file containing test cases. Can include protocol prefixes for special handlers.
 * @param basePath - Optional base path for resolving relative file paths. Defaults to empty string.
 * @returns Promise resolving to an array of TestCase objects parsed from the input source.
 * @throws Error if Python test function returns non-array result
 */
async function readStandaloneTestsFile(varsPath, basePath = '') {
    const resolvedVarsPath = path.resolve(basePath, varsPath.replace(/^file:\/\//, ''));
    // Split on the last colon to handle Windows drive letters correctly
    const colonCount = resolvedVarsPath.split(':').length - 1;
    const lastColonIndex = resolvedVarsPath.lastIndexOf(':');
    // For Windows paths, we need to account for the drive letter colon
    const isWindowsPath = /^[A-Za-z]:/.test(resolvedVarsPath);
    const effectiveColonCount = isWindowsPath ? colonCount - 1 : colonCount;
    if (effectiveColonCount > 1) {
        throw new Error(`Too many colons. Invalid test file script path: ${varsPath}`);
    }
    const pathWithoutFunction = lastColonIndex > 1 ? resolvedVarsPath.slice(0, lastColonIndex) : resolvedVarsPath;
    const maybeFunctionName = lastColonIndex > 1 ? resolvedVarsPath.slice(lastColonIndex + 1) : undefined;
    const fileExtension = (0, path_1.parse)(pathWithoutFunction).ext.slice(1);
    if (varsPath.startsWith('huggingface://datasets/')) {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'huggingface dataset',
        });
        return await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)(varsPath);
    }
    if ((0, fileExtensions_1.isJavascriptFile)(pathWithoutFunction)) {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'js tests file',
        });
        const mod = await (0, esm_1.importModule)(pathWithoutFunction, maybeFunctionName);
        return typeof mod === 'function' ? await mod() : mod;
    }
    if (fileExtension === 'py') {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'python tests file',
        });
        const result = await (0, pythonUtils_1.runPython)(pathWithoutFunction, maybeFunctionName ?? 'generate_tests', []);
        if (!Array.isArray(result)) {
            throw new Error(`Python test function must return a list of test cases, got ${typeof result}`);
        }
        return result;
    }
    let rows = [];
    if (varsPath.startsWith('https://docs.google.com/spreadsheets/')) {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'csv tests file - google sheet',
        });
        rows = await (0, googleSheets_1.fetchCsvFromGoogleSheet)(varsPath);
    }
    else if (fileExtension === 'csv') {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'csv tests file - local',
        });
        const delimiter = (0, envars_1.getEnvString)('PROMPTFOO_CSV_DELIMITER', ',');
        const fileContent = fs.readFileSync(resolvedVarsPath, 'utf-8');
        const enforceStrict = (0, envars_1.getEnvBool)('PROMPTFOO_CSV_STRICT', false);
        try {
            // First try parsing with strict mode if enforced
            if (enforceStrict) {
                rows = (0, sync_1.parse)(fileContent, {
                    columns: true,
                    bom: true,
                    delimiter,
                    relax_quotes: false,
                });
            }
            else {
                // Try strict mode first, fall back to relaxed if it fails
                try {
                    rows = (0, sync_1.parse)(fileContent, {
                        columns: true,
                        bom: true,
                        delimiter,
                        relax_quotes: false,
                    });
                }
                catch {
                    // If strict parsing fails, try with relaxed quotes
                    rows = (0, sync_1.parse)(fileContent, {
                        columns: true,
                        bom: true,
                        delimiter,
                        relax_quotes: true,
                    });
                }
            }
        }
        catch (err) {
            // Add helpful context to the error message
            const e = err;
            if (e.code === 'CSV_INVALID_OPENING_QUOTE') {
                throw new Error(e.message);
            }
            throw e;
        }
    }
    else if (fileExtension === 'json') {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'json tests file',
        });
        const fileContent = fs.readFileSync(resolvedVarsPath, 'utf-8');
        const jsonData = js_yaml_1.default.load(fileContent);
        const testCases = Array.isArray(jsonData) ? jsonData : [jsonData];
        return testCases.map((item, idx) => ({
            ...item,
            description: item.description || `Row #${idx + 1}`,
        }));
    }
    // Handle .jsonl files
    else if (fileExtension === 'jsonl') {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'jsonl tests file',
        });
        const fileContent = fs.readFileSync(resolvedVarsPath, 'utf-8');
        return fileContent
            .split('\n')
            .filter((line) => line.trim())
            .map((line, idx) => {
            const row = JSON.parse(line);
            return {
                ...row,
                description: `Row #${idx + 1}`,
            };
        });
    }
    else if (fileExtension === 'yaml' || fileExtension === 'yml') {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'yaml tests file',
        });
        rows = js_yaml_1.default.load(fs.readFileSync(resolvedVarsPath, 'utf-8'));
    }
    return rows.map((row, idx) => {
        const test = (0, csv_1.testCaseFromCsvRow)(row);
        test.description || (test.description = `Row #${idx + 1}`);
        return test;
    });
}
async function loadTestWithVars(testCase, testBasePath) {
    const ret = { ...testCase, vars: undefined };
    if (typeof testCase.vars === 'string' || Array.isArray(testCase.vars)) {
        ret.vars = await readTestFiles(testCase.vars, testBasePath);
    }
    else {
        ret.vars = testCase.vars;
    }
    return ret;
}
async function readTest(test, basePath = '') {
    let testCase;
    if (typeof test === 'string') {
        const testFilePath = path.resolve(basePath, test);
        const testBasePath = path.dirname(testFilePath);
        const rawTestCase = js_yaml_1.default.load(fs.readFileSync(testFilePath, 'utf-8'));
        testCase = await loadTestWithVars(rawTestCase, testBasePath);
    }
    else {
        testCase = await loadTestWithVars(test, basePath);
    }
    if (testCase.provider && typeof testCase.provider !== 'function') {
        // Load provider
        if (typeof testCase.provider === 'string') {
            testCase.provider = await (0, providers_1.loadApiProvider)(testCase.provider);
        }
        else if (typeof testCase.provider.id === 'string') {
            testCase.provider = await (0, providers_1.loadApiProvider)(testCase.provider.id, {
                options: testCase.provider,
                basePath,
            });
        }
    }
    if (!testCase.assert &&
        !testCase.vars &&
        !testCase.options &&
        !testCase.metadata &&
        !testCase.provider &&
        !testCase.providerOutput &&
        typeof testCase.threshold !== 'number') {
        // Validate the shape of the test case
        // We skip validation when loading the default test case, since it may not have all the properties
        throw new Error(`Test case must contain one of the following properties: assert, vars, options, metadata, provider, providerOutput, threshold.\n\nInstead got:\n${JSON.stringify(testCase, null, 2)}`);
    }
    return testCase;
}
/**
 * Loads test cases from a glob pattern, supporting various file formats and sources.
 * @param loadTestsGlob - The glob pattern or URL to load tests from
 * @param basePath - Base path for resolving relative paths
 * @returns Promise resolving to an array of TestCase objects
 */
async function loadTestsFromGlob(loadTestsGlob, basePath = '') {
    if (loadTestsGlob.startsWith('huggingface://datasets/')) {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'huggingface dataset',
        });
        return await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)(loadTestsGlob);
    }
    if (loadTestsGlob.startsWith('file://')) {
        loadTestsGlob = loadTestsGlob.slice('file://'.length);
    }
    const resolvedPath = path.resolve(basePath, loadTestsGlob);
    const testFiles = (0, glob_1.globSync)(resolvedPath, {
        windowsPathsNoEscape: true,
    });
    // Check for possible function names in the path
    const pathWithoutFunction = resolvedPath.split(':')[0];
    // Only add the file if it's not already included by glob and it's a special file type
    if (((0, fileExtensions_1.isJavascriptFile)(pathWithoutFunction) || pathWithoutFunction.endsWith('.py')) &&
        !testFiles.some((file) => file === resolvedPath || file === pathWithoutFunction)) {
        testFiles.push(resolvedPath);
    }
    if (loadTestsGlob.startsWith('https://docs.google.com/spreadsheets/')) {
        testFiles.push(loadTestsGlob);
    }
    const _deref = async (testCases, file) => {
        logger_1.default.debug(`Dereferencing test file: ${file}`);
        return (await json_schema_ref_parser_1.default.dereference(testCases));
    };
    const ret = [];
    if (testFiles.length < 1) {
        logger_1.default.error(`No test files found for path: ${loadTestsGlob}`);
        return ret;
    }
    for (const testFile of testFiles) {
        let testCases;
        const pathWithoutFunction = testFile.split(':')[0];
        if (testFile.endsWith('.csv') ||
            testFile.startsWith('https://docs.google.com/spreadsheets/') ||
            (0, fileExtensions_1.isJavascriptFile)(pathWithoutFunction) ||
            pathWithoutFunction.endsWith('.py')) {
            testCases = await readStandaloneTestsFile(testFile, basePath);
        }
        else if (testFile.endsWith('.yaml') || testFile.endsWith('.yml')) {
            testCases = js_yaml_1.default.load(fs.readFileSync(testFile, 'utf-8'));
            testCases = await _deref(testCases, testFile);
        }
        else if (testFile.endsWith('.jsonl')) {
            const fileContent = fs.readFileSync(testFile, 'utf-8');
            testCases = fileContent
                .split('\n')
                .filter((line) => line.trim())
                .map((line) => JSON.parse(line));
            testCases = await _deref(testCases, testFile);
        }
        else if (testFile.endsWith('.json')) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            testCases = await _deref(require(testFile), testFile);
        }
        else {
            throw new Error(`Unsupported file type for test file: ${testFile}`);
        }
        if (testCases) {
            if (!Array.isArray(testCases) && typeof testCases === 'object') {
                testCases = [testCases];
            }
            for (const testCase of testCases) {
                ret.push(await readTest(testCase, path.dirname(testFile)));
            }
        }
    }
    return ret;
}
async function readTests(tests, basePath = '') {
    const ret = [];
    if (typeof tests === 'string') {
        // Points to a tests file with multiple test cases
        if (tests.endsWith('yaml') || tests.endsWith('yml')) {
            return loadTestsFromGlob(tests, basePath);
        }
        // Points to a tests.{csv,json,yaml,yml,py,js,ts,mjs} or Google Sheet
        return readStandaloneTestsFile(tests, basePath);
    }
    if (Array.isArray(tests)) {
        for (const globOrTest of tests) {
            if (typeof globOrTest === 'string') {
                const pathWithoutFunction = globOrTest.split(':')[0];
                // For Python and JS files, or files with potential function names, use readStandaloneTestsFile
                if ((0, fileExtensions_1.isJavascriptFile)(pathWithoutFunction) ||
                    pathWithoutFunction.endsWith('.py') ||
                    globOrTest.replace(/^file:\/\//, '').includes(':')) {
                    ret.push(...(await readStandaloneTestsFile(globOrTest, basePath)));
                }
                else {
                    // Resolve globs for other file types
                    ret.push(...(await loadTestsFromGlob(globOrTest, basePath)));
                }
            }
            else {
                // Load individual TestCase
                ret.push(await readTest(globOrTest, basePath));
            }
        }
    }
    else if (tests !== undefined && tests !== null) {
        logger_1.default.warn((0, dedent_1.default) `
      Warning: Unsupported 'tests' format in promptfooconfig.yaml.
      Expected: string, string[], or TestCase[], but received: ${typeof tests}

      Please check your configuration file and ensure the 'tests' field is correctly formatted.
      For more information, visit: https://promptfoo.dev/docs/configuration/reference/#test-case
    `);
    }
    if (ret.some((testCase) => testCase.vars?.assert) &&
        !(0, envars_1.getEnvBool)('PROMPTFOO_NO_TESTCASE_ASSERT_WARNING')) {
        logger_1.default.warn((0, dedent_1.default) `
      Warning: Found 'assert' key in vars. This is likely a mistake in your configuration.

      'assert' should be *unindented* so it is under the test itself, not vars. For example:

      tests:
        - vars:
            foo: bar
          assert:
            - type: contains
              value: "bar"

      To disable this message, set the environment variable PROMPTFOO_NO_TESTCASE_ASSERT_WARNING=1.
    `);
    }
    return ret;
}
//# sourceMappingURL=testCaseReader.js.map