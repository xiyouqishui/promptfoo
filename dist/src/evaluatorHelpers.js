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
exports.extractTextFromPDF = extractTextFromPDF;
exports.resolveVariables = resolveVariables;
exports.renderPrompt = renderPrompt;
exports.runExtensionHook = runExtensionHook;
const fs = __importStar(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path = __importStar(require("path"));
const cliState_1 = __importDefault(require("./cliState"));
const envars_1 = require("./envars");
const esm_1 = require("./esm");
const helicone_1 = require("./integrations/helicone");
const langfuse_1 = require("./integrations/langfuse");
const portkey_1 = require("./integrations/portkey");
const logger_1 = __importDefault(require("./logger"));
const packageParser_1 = require("./providers/packageParser");
const pythonUtils_1 = require("./python/pythonUtils");
const telemetry_1 = __importDefault(require("./telemetry"));
const util_1 = require("./util");
const fileExtensions_1 = require("./util/fileExtensions");
const invariant_1 = __importDefault(require("./util/invariant"));
const templates_1 = require("./util/templates");
const transform_1 = require("./util/transform");
async function extractTextFromPDF(pdfPath) {
    logger_1.default.debug(`Extracting text from PDF: ${pdfPath}`);
    try {
        const { default: PDFParser } = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await PDFParser(dataBuffer);
        return data.text.trim();
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("Cannot find module 'pdf-parse'")) {
            throw new Error('pdf-parse is not installed. Please install it with: npm install pdf-parse');
        }
        throw new Error(`Failed to extract text from PDF ${pdfPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function resolveVariables(variables) {
    let resolved = true;
    const regex = /\{\{\s*(\w+)\s*\}\}/; // Matches {{variableName}}, {{ variableName }}, etc.
    let iterations = 0;
    do {
        resolved = true;
        for (const key of Object.keys(variables)) {
            if (typeof variables[key] !== 'string') {
                continue;
            }
            const value = variables[key];
            const match = regex.exec(value);
            if (match) {
                const [placeholder, varName] = match;
                if (variables[varName] === undefined) {
                    // Do nothing - final nunjucks render will fail if necessary.
                    // logger.warn(`Variable "${varName}" not found for substitution.`);
                }
                else {
                    variables[key] = value.replace(placeholder, variables[varName]);
                    resolved = false; // Indicate that we've made a replacement and should check again
                }
            }
        }
        iterations++;
    } while (!resolved && iterations < 5);
    return variables;
}
// Utility: Detect partial/unclosed Nunjucks tags and wrap in {% raw %} if needed
function autoWrapRawIfPartialNunjucks(prompt) {
    // Detects any occurrence of an opening Nunjucks tag without a matching close
    // e.g. "{%" or "{{" not followed by a closing "%}" or "}}"
    const hasPartialTag = /({%[^%]*$|{{[^}]*$|{#[^#]*$)/m.test(prompt);
    const alreadyWrapped = /{\%\s*raw\s*\%}/.test(prompt) && /{\%\s*endraw\s*\%}/.test(prompt);
    if (hasPartialTag && !alreadyWrapped) {
        return `{% raw %}${prompt}{% endraw %}`;
    }
    return prompt;
}
async function renderPrompt(prompt, vars, nunjucksFilters, provider) {
    const nunjucks = (0, templates_1.getNunjucksEngine)(nunjucksFilters);
    let basePrompt = prompt.raw;
    // Load files
    for (const [varName, value] of Object.entries(vars)) {
        if (typeof value === 'string' && value.startsWith('file://')) {
            const basePath = cliState_1.default.basePath || '';
            const filePath = path.resolve(process.cwd(), basePath, value.slice('file://'.length));
            const fileExtension = filePath.split('.').pop();
            logger_1.default.debug(`Loading var ${varName} from file: ${filePath}`);
            if ((0, fileExtensions_1.isJavascriptFile)(filePath)) {
                const javascriptOutput = (await (await (0, esm_1.importModule)(filePath))(varName, basePrompt, vars, provider));
                if (javascriptOutput.error) {
                    throw new Error(`Error running ${filePath}: ${javascriptOutput.error}`);
                }
                if (!javascriptOutput.output) {
                    throw new Error(`Expected ${filePath} to return { output: string } but got ${javascriptOutput}`);
                }
                vars[varName] = javascriptOutput.output;
            }
            else if (fileExtension === 'py') {
                const pythonScriptOutput = (await (0, pythonUtils_1.runPython)(filePath, 'get_var', [
                    varName,
                    basePrompt,
                    vars,
                ]));
                if (pythonScriptOutput.error) {
                    throw new Error(`Error running Python script ${filePath}: ${pythonScriptOutput.error}`);
                }
                if (!pythonScriptOutput.output) {
                    throw new Error(`Python script ${filePath} did not return any output`);
                }
                (0, invariant_1.default)(typeof pythonScriptOutput.output === 'string', `pythonScriptOutput.output must be a string. Received: ${typeof pythonScriptOutput.output}`);
                vars[varName] = pythonScriptOutput.output.trim();
            }
            else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                vars[varName] = JSON.stringify(js_yaml_1.default.load(fs.readFileSync(filePath, 'utf8')));
            }
            else if (fileExtension === 'pdf' && !(0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_PDF_AS_TEXT')) {
                telemetry_1.default.recordOnce('feature_used', {
                    feature: 'extract_text_from_pdf',
                });
                vars[varName] = await extractTextFromPDF(filePath);
            }
            else if (((0, fileExtensions_1.isImageFile)(filePath) || (0, fileExtensions_1.isVideoFile)(filePath) || (0, fileExtensions_1.isAudioFile)(filePath)) &&
                !(0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_MULTIMEDIA_AS_BASE64')) {
                const fileType = (0, fileExtensions_1.isImageFile)(filePath)
                    ? 'image'
                    : (0, fileExtensions_1.isVideoFile)(filePath)
                        ? 'video'
                        : 'audio';
                telemetry_1.default.recordOnce('feature_used', {
                    feature: `load_${fileType}_as_base64`,
                });
                logger_1.default.debug(`Loading ${fileType} as base64: ${filePath}`);
                try {
                    const fileBuffer = fs.readFileSync(filePath);
                    vars[varName] = fileBuffer.toString('base64');
                }
                catch (error) {
                    throw new Error(`Failed to load ${fileType} ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            else {
                vars[varName] = fs.readFileSync(filePath, 'utf8').trim();
            }
        }
        else if ((0, packageParser_1.isPackagePath)(value)) {
            const basePath = cliState_1.default.basePath || '';
            const javascriptOutput = (await (await (0, packageParser_1.loadFromPackage)(value, basePath))(varName, basePrompt, vars, provider));
            if (javascriptOutput.error) {
                throw new Error(`Error running ${value}: ${javascriptOutput.error}`);
            }
            if (!javascriptOutput.output) {
                throw new Error(`Expected ${value} to return { output: string } but got ${javascriptOutput}`);
            }
            vars[varName] = javascriptOutput.output;
        }
    }
    // Apply prompt functions
    if (prompt.function) {
        const result = await prompt.function({ vars, provider });
        if (typeof result === 'string') {
            basePrompt = result;
        }
        else if (typeof result === 'object') {
            // Check if it's using the structured PromptFunctionResult format
            if ('prompt' in result) {
                basePrompt =
                    typeof result.prompt === 'string' ? result.prompt : JSON.stringify(result.prompt);
                // Merge config if provided
                if (result.config) {
                    prompt.config = {
                        ...(prompt.config || {}),
                        ...result.config,
                    };
                }
            }
            else {
                // Direct object/array format
                basePrompt = JSON.stringify(result);
            }
        }
        else {
            throw new Error(`Prompt function must return a string or object, got ${typeof result}`);
        }
    }
    // Remove any trailing newlines from vars, as this tends to be a footgun for JSON prompts.
    for (const key of Object.keys(vars)) {
        if (typeof vars[key] === 'string') {
            vars[key] = vars[key].replace(/\n$/, '');
        }
    }
    // Resolve variable mappings
    resolveVariables(vars);
    // Third party integrations
    if (prompt.raw.startsWith('portkey://')) {
        const portKeyResult = await (0, portkey_1.getPrompt)(prompt.raw.slice('portkey://'.length), vars);
        return JSON.stringify(portKeyResult.messages);
    }
    else if (prompt.raw.startsWith('langfuse://')) {
        const langfusePrompt = prompt.raw.slice('langfuse://'.length);
        // we default to "text" type.
        const [helper, version, promptType = 'text'] = langfusePrompt.split(':');
        if (promptType !== 'text' && promptType !== 'chat') {
            throw new Error('Unknown promptfoo prompt type');
        }
        const langfuseResult = await (0, langfuse_1.getPrompt)(helper, vars, promptType, version === 'latest' ? undefined : Number(version));
        return langfuseResult;
    }
    else if (prompt.raw.startsWith('helicone://')) {
        const heliconePrompt = prompt.raw.slice('helicone://'.length);
        const [id, version] = heliconePrompt.split(':');
        const [majorVersion, minorVersion] = version ? version.split('.') : [undefined, undefined];
        const heliconeResult = await (0, helicone_1.getPrompt)(id, vars, majorVersion === undefined ? undefined : Number(majorVersion), minorVersion === undefined ? undefined : Number(minorVersion));
        return heliconeResult;
    }
    // Render prompt
    try {
        if ((0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_JSON_AUTOESCAPE')) {
            // Pre-process: auto-wrap in {% raw %} if partial Nunjucks tags detected
            basePrompt = autoWrapRawIfPartialNunjucks(basePrompt);
            return nunjucks.renderString(basePrompt, vars);
        }
        const parsed = JSON.parse(basePrompt);
        // The _raw_ prompt is valid JSON. That means that the user likely wants to substitute vars _within_ the JSON itself.
        // Recursively walk the JSON structure. If we find a string, render it with nunjucks.
        return JSON.stringify((0, util_1.renderVarsInObject)(parsed, vars), null, 2);
    }
    catch {
        // Vars values can be template strings, so we need to render them first:
        const renderedVars = Object.fromEntries(Object.entries(vars).map(([key, value]) => [
            key,
            typeof value === 'string'
                ? nunjucks.renderString(autoWrapRawIfPartialNunjucks(value), vars)
                : value,
        ]));
        // Pre-process: auto-wrap in {% raw %} if partial Nunjucks tags detected
        basePrompt = autoWrapRawIfPartialNunjucks(basePrompt);
        // Note: Explicitly not using `renderVarsInObject` as it will re-call `renderString`; each call will
        // strip Nunjucks Tags, which breaks using raw (https://mozilla.github.io/nunjucks/templating.html#raw) e.g.
        // {% raw %}{{some_string}}{% endraw %} -> {{some_string}} -> ''
        return nunjucks.renderString(basePrompt, renderedVars);
    }
}
/**
 * Runs extension hooks for the given hook name and context.
 * @param extensions - An array of extension paths, or null.
 * @param hookName - The name of the hook to run.
 * @param context - The context object to pass to the hook.
 * @returns A Promise that resolves when all hooks have been run.
 */
async function runExtensionHook(extensions, hookName, context) {
    if (!extensions || !Array.isArray(extensions) || extensions.length === 0) {
        return;
    }
    telemetry_1.default.recordOnce('feature_used', {
        feature: 'extension_hook',
    });
    for (const extension of extensions) {
        (0, invariant_1.default)(typeof extension === 'string', 'extension must be a string');
        logger_1.default.debug(`Running extension hook ${hookName} with context ${JSON.stringify(context)}`);
        await (0, transform_1.transform)(extension, hookName, context, false);
    }
}
//# sourceMappingURL=evaluatorHelpers.js.map