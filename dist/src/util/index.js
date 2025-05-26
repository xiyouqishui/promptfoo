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
exports.writeOutput = writeOutput;
exports.writeMultipleOutputs = writeMultipleOutputs;
exports.readOutput = readOutput;
exports.getLatestResultsPath = getLatestResultsPath;
exports.listPreviousResultFilenames_fileSystem = listPreviousResultFilenames_fileSystem;
exports.listPreviousResults_fileSystem = listPreviousResults_fileSystem;
exports.filenameToDate = filenameToDate;
exports.dateToFilename = dateToFilename;
exports.readResult_fileSystem = readResult_fileSystem;
exports.readFilters = readFilters;
exports.printBorder = printBorder;
exports.setupEnv = setupEnv;
exports.providerToIdentifier = providerToIdentifier;
exports.varsMatch = varsMatch;
exports.resultIsForTestCase = resultIsForTestCase;
exports.renderVarsInObject = renderVarsInObject;
exports.parsePathOrGlob = parsePathOrGlob;
exports.isRunningUnderNpx = isRunningUnderNpx;
exports.maybeLoadToolsFromExternalFile = maybeLoadToolsFromExternalFile;
const sync_1 = require("csv-stringify/sync");
const dedent_1 = __importDefault(require("dedent"));
const dotenv_1 = __importDefault(require("dotenv"));
const fast_deep_equal_1 = __importDefault(require("fast-deep-equal"));
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const js_yaml_1 = __importDefault(require("js-yaml"));
const nunjucks_1 = __importDefault(require("nunjucks"));
const path = __importStar(require("path"));
const constants_1 = require("../constants");
const envars_1 = require("../envars");
const esm_1 = require("../esm");
const googleSheets_1 = require("../googleSheets");
const logger_1 = __importDefault(require("../logger"));
const types_1 = require("../types");
const invariant_1 = __importDefault(require("../util/invariant"));
const manage_1 = require("./config/manage");
const createHash_1 = require("./createHash");
const exportToFile_1 = require("./exportToFile");
const getHeaderForTable_1 = require("./exportToFile/getHeaderForTable");
const file_1 = require("./file");
const fileExtensions_1 = require("./fileExtensions");
const templates_1 = require("./templates");
const outputToSimpleString = (output) => {
    const passFailText = output.pass
        ? '[PASS]'
        : output.failureReason === types_1.ResultFailureReason.ASSERT
            ? '[FAIL]'
            : '[ERROR]';
    const namedScoresText = Object.entries(output.namedScores)
        .map(([name, value]) => `${name}: ${value?.toFixed(2)}`)
        .join(', ');
    const scoreText = namedScoresText.length > 0
        ? `(${output.score?.toFixed(2)}, ${namedScoresText})`
        : `(${output.score?.toFixed(2)})`;
    const gradingResultText = output.gradingResult
        ? `${output.pass ? 'Pass' : 'Fail'} Reason: ${output.gradingResult.reason}`
        : '';
    return (0, dedent_1.default) `
      ${passFailText} ${scoreText}

      ${output.text}

      ${gradingResultText}
    `.trim();
};
async function writeOutput(outputPath, evalRecord, shareableUrl) {
    if (outputPath.match(/^https:\/\/docs\.google\.com\/spreadsheets\//)) {
        const table = await evalRecord.getTable();
        (0, invariant_1.default)(table, 'Table is required');
        const rows = table.body.map((row) => {
            const csvRow = {};
            table.head.vars.forEach((varName, index) => {
                csvRow[varName] = row.vars[index];
            });
            table.head.prompts.forEach((prompt, index) => {
                csvRow[prompt.label] = outputToSimpleString(row.outputs[index]);
            });
            return csvRow;
        });
        logger_1.default.info(`Writing ${rows.length} rows to Google Sheets...`);
        await (0, googleSheets_1.writeCsvToGoogleSheet)(rows, outputPath);
        return;
    }
    const { data: outputExtension } = types_1.OutputFileExtension.safeParse(path.extname(outputPath).slice(1).toLowerCase());
    (0, invariant_1.default)(outputExtension, `Unsupported output file format ${outputExtension}. Please use one of: ${types_1.OutputFileExtension.options.join(', ')}.`);
    // Ensure the directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    if (outputExtension === 'csv') {
        // Write headers first
        const headers = (0, getHeaderForTable_1.getHeaderForTable)(evalRecord);
        const headerCsv = (0, sync_1.stringify)([
            [...headers.vars, ...headers.prompts.map((prompt) => `[${prompt.provider}] ${prompt.label}`)],
        ]);
        fs.writeFileSync(outputPath, headerCsv);
        // Write body rows in batches
        for await (const batchResults of evalRecord.fetchResultsBatched()) {
            // we need split the batch into rows by testIdx
            const tableRows = {};
            for (const result of batchResults) {
                if (!(result.testIdx in tableRows)) {
                    tableRows[result.testIdx] = [];
                }
                tableRows[result.testIdx].push(result);
            }
            const batchCsv = (0, sync_1.stringify)(Object.values(tableRows).map((results) => {
                const row = (0, exportToFile_1.convertTestResultsToTableRow)(results, headers.vars);
                return [...row.vars, ...row.outputs.map(outputToSimpleString)];
            }));
            fs.appendFileSync(outputPath, batchCsv);
        }
    }
    else if (outputExtension === 'json') {
        const summary = await evalRecord.toEvaluateSummary();
        fs.writeFileSync(outputPath, JSON.stringify({
            evalId: evalRecord.id,
            results: summary,
            config: evalRecord.config,
            shareableUrl,
        }, null, 2));
    }
    else if (outputExtension === 'yaml' || outputExtension === 'yml' || outputExtension === 'txt') {
        const summary = await evalRecord.toEvaluateSummary();
        fs.writeFileSync(outputPath, js_yaml_1.default.dump({
            evalId: evalRecord.id,
            results: summary,
            config: evalRecord.config,
            shareableUrl,
        }));
    }
    else if (outputExtension === 'html') {
        const table = await evalRecord.getTable();
        (0, invariant_1.default)(table, 'Table is required');
        const summary = await evalRecord.toEvaluateSummary();
        const template = fs.readFileSync(`${(0, esm_1.getDirectory)()}/tableOutput.html`, 'utf-8');
        const htmlTable = [
            [
                ...table.head.vars,
                ...table.head.prompts.map((prompt) => `[${prompt.provider}] ${prompt.label}`),
            ],
            ...table.body.map((row) => [...row.vars, ...row.outputs.map(outputToSimpleString)]),
        ];
        const htmlOutput = (0, templates_1.getNunjucksEngine)().renderString(template, {
            config: evalRecord.config,
            table: htmlTable,
            results: summary,
        });
        fs.writeFileSync(outputPath, htmlOutput);
    }
    else if (outputExtension === 'jsonl') {
        for await (const batchResults of evalRecord.fetchResultsBatched()) {
            const text = batchResults.map((result) => JSON.stringify(result)).join('\n');
            fs.appendFileSync(outputPath, text);
        }
    }
}
async function writeMultipleOutputs(outputPaths, evalRecord, shareableUrl) {
    await Promise.all(outputPaths.map((outputPath) => writeOutput(outputPath, evalRecord, shareableUrl)));
}
async function readOutput(outputPath) {
    const ext = path.parse(outputPath).ext.slice(1);
    switch (ext) {
        case 'json':
            return JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        default:
            throw new Error(`Unsupported output file format: ${ext} currently only supports json`);
    }
}
/**
 * TODO(ian): Remove this
 * @deprecated Use readLatestResults directly instead.
 */
function getLatestResultsPath() {
    return path.join((0, manage_1.getConfigDirectoryPath)(), 'output', 'latest.json');
}
/**
 * @deprecated Used only for migration to sqlite
 */
function listPreviousResultFilenames_fileSystem() {
    const directory = path.join((0, manage_1.getConfigDirectoryPath)(), 'output');
    if (!fs.existsSync(directory)) {
        return [];
    }
    const files = fs.readdirSync(directory);
    const resultsFiles = files.filter((file) => file.startsWith('eval-') && file.endsWith('.json'));
    return resultsFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(directory, a));
        const statB = fs.statSync(path.join(directory, b));
        return statA.birthtime.getTime() - statB.birthtime.getTime(); // sort in ascending order
    });
}
const resultsCache = {};
/**
 * @deprecated Used only for migration to sqlite
 */
function listPreviousResults_fileSystem() {
    const directory = path.join((0, manage_1.getConfigDirectoryPath)(), 'output');
    if (!fs.existsSync(directory)) {
        return [];
    }
    const sortedFiles = listPreviousResultFilenames_fileSystem();
    return sortedFiles.map((fileName) => {
        if (!resultsCache[fileName]) {
            try {
                const fileContents = fs.readFileSync(path.join(directory, fileName), 'utf8');
                const data = js_yaml_1.default.load(fileContents);
                resultsCache[fileName] = data;
            }
            catch (error) {
                logger_1.default.warn(`Failed to read results from ${fileName}:\n${error}`);
            }
        }
        return {
            fileName,
            description: resultsCache[fileName]?.config.description,
        };
    });
}
function filenameToDate(filename) {
    const dateString = filename.slice('eval-'.length, filename.length - '.json'.length);
    // Replace hyphens with colons where necessary (Windows compatibility).
    const dateParts = dateString.split('T');
    const timePart = dateParts[1].replace(/-/g, ':');
    const formattedDateString = `${dateParts[0]}T${timePart}`;
    const date = new Date(formattedDateString);
    return date;
    /*
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
    */
}
function dateToFilename(date) {
    return `eval-${date.toISOString().replace(/:/g, '-')}.json`;
}
/**
 * @deprecated Used only for migration to sqlite
 */
function readResult_fileSystem(name) {
    const resultsDirectory = path.join((0, manage_1.getConfigDirectoryPath)(), 'output');
    const resultsPath = path.join(resultsDirectory, name);
    try {
        const result = JSON.parse(fs.readFileSync(fs.realpathSync(resultsPath), 'utf-8'));
        const createdAt = filenameToDate(name);
        return {
            id: (0, createHash_1.sha256)(JSON.stringify(result.config)),
            result,
            createdAt,
        };
    }
    catch (err) {
        logger_1.default.error(`Failed to read results from ${resultsPath}:\n${err}`);
    }
}
async function readFilters(filters, basePath = '') {
    const ret = {};
    for (const [name, filterPath] of Object.entries(filters)) {
        const globPath = path.join(basePath, filterPath);
        const filePaths = (0, glob_1.globSync)(globPath, {
            windowsPathsNoEscape: true,
        });
        for (const filePath of filePaths) {
            const finalPath = path.resolve(filePath);
            ret[name] = await (0, esm_1.importModule)(finalPath);
        }
    }
    return ret;
}
function printBorder() {
    const border = '='.repeat(constants_1.TERMINAL_MAX_WIDTH);
    logger_1.default.info(border);
}
function setupEnv(envPath) {
    if (envPath) {
        logger_1.default.info(`Loading environment variables from ${envPath}`);
        dotenv_1.default.config({ path: envPath, override: true });
    }
    else {
        dotenv_1.default.config();
    }
}
function providerToIdentifier(provider) {
    if ((0, types_1.isApiProvider)(provider)) {
        return provider.id();
    }
    else if ((0, types_1.isProviderOptions)(provider)) {
        return provider.id;
    }
    else if (typeof provider === 'string') {
        return provider;
    }
    return undefined;
}
function varsMatch(vars1, vars2) {
    return (0, fast_deep_equal_1.default)(vars1, vars2);
}
function resultIsForTestCase(result, testCase) {
    const providersMatch = testCase.provider
        ? providerToIdentifier(testCase.provider) === providerToIdentifier(result.provider)
        : true;
    return varsMatch(testCase.vars, result.vars) && providersMatch;
}
function renderVarsInObject(obj, vars) {
    // Renders nunjucks template strings with context variables
    if (!vars || (0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_TEMPLATING')) {
        return obj;
    }
    if (typeof obj === 'string') {
        return nunjucks_1.default.renderString(obj, vars);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => renderVarsInObject(item, vars));
    }
    if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const key in obj) {
            result[key] = renderVarsInObject(obj[key], vars);
        }
        return result;
    }
    else if (typeof obj === 'function') {
        const fn = obj;
        return renderVarsInObject(fn({ vars }));
    }
    return obj;
}
/**
 * Parses a file path or glob pattern to extract function names and file extensions.
 * Function names can be specified in the filename like this:
 * prompt.py:myFunction or prompts.js:myFunction.
 * @param basePath - The base path for file resolution.
 * @param promptPath - The path or glob pattern.
 * @returns Parsed details including function name, file extension, and directory status.
 */
function parsePathOrGlob(basePath, promptPath) {
    if (promptPath.startsWith('file://')) {
        promptPath = promptPath.slice('file://'.length);
    }
    const filePath = path.resolve(basePath, promptPath);
    let filename = path.relative(basePath, filePath);
    let functionName;
    if (filename.includes(':')) {
        const splits = filename.split(':');
        if (splits[0] &&
            ((0, fileExtensions_1.isJavascriptFile)(splits[0]) || splits[0].endsWith('.py') || splits[0].endsWith('.go'))) {
            [filename, functionName] = splits;
        }
    }
    // verify that filename without function exists
    let stats;
    try {
        stats = fs.statSync(path.join(basePath, filename));
    }
    catch (err) {
        if ((0, envars_1.getEnvBool)('PROMPTFOO_STRICT_FILES')) {
            throw err;
        }
    }
    const isPathPattern = stats?.isDirectory() || /[*?{}\[\]]/.test(filePath); // glob pattern
    const safeFilename = path.relative(basePath, path.isAbsolute(filename) ? filename : path.resolve(basePath, filename));
    return {
        extension: isPathPattern ? undefined : path.parse(safeFilename).ext,
        filePath: safeFilename.startsWith(basePath) ? safeFilename : path.join(basePath, safeFilename),
        functionName,
        isPathPattern,
    };
}
function isRunningUnderNpx() {
    const npmExecPath = (0, envars_1.getEnvString)('npm_execpath');
    const npmLifecycleScript = (0, envars_1.getEnvString)('npm_lifecycle_script');
    return Boolean((npmExecPath && npmExecPath.includes('npx')) ||
        process.execPath.includes('npx') ||
        (npmLifecycleScript && npmLifecycleScript.includes('npx')));
}
/**
 * Renders variables in a tools object and loads from external file if applicable.
 * This function combines renderVarsInObject and maybeLoadFromExternalFile into a single step
 * specifically for handling tools configurations.
 *
 * @param tools - The tools configuration object or array to process.
 * @param vars - Variables to use for rendering.
 * @returns The processed tools configuration with variables rendered and content loaded from files if needed.
 */
function maybeLoadToolsFromExternalFile(tools, vars) {
    return (0, file_1.maybeLoadFromExternalFile)(renderVarsInObject(tools, vars));
}
//# sourceMappingURL=index.js.map