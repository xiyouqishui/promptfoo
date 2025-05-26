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
exports.dereferenceConfig = dereferenceConfig;
exports.readConfig = readConfig;
exports.maybeReadConfig = maybeReadConfig;
exports.combineConfigs = combineConfigs;
exports.resolveConfigs = resolveConfigs;
const json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const js_yaml_1 = __importDefault(require("js-yaml"));
const path = __importStar(require("path"));
const process_1 = __importDefault(require("process"));
const zod_validation_error_1 = require("zod-validation-error");
const assertions_1 = require("../../assertions");
const validateAssertions_1 = require("../../assertions/validateAssertions");
const cliState_1 = __importDefault(require("../../cliState"));
const filterTests_1 = require("../../commands/eval/filterTests");
const envars_1 = require("../../envars");
const esm_1 = require("../../esm");
const logger_1 = __importDefault(require("../../logger"));
const prompts_1 = require("../../prompts");
const providers_1 = require("../../providers");
const telemetry_1 = __importDefault(require("../../telemetry"));
const types_1 = require("../../types");
const util_1 = require("../../util");
const file_1 = require("../../util/file");
const fileExtensions_1 = require("../../util/fileExtensions");
const invariant_1 = __importDefault(require("../../util/invariant"));
const prompts_2 = require("../../validators/prompts");
const testCaseReader_1 = require("../testCaseReader");
async function dereferenceConfig(rawConfig) {
    if ((0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_REF_PARSER')) {
        return rawConfig;
    }
    // Track and delete tools[i].function for each tool, preserving the rest of the properties
    // https://github.com/promptfoo/promptfoo/issues/364
    // Remove parameters from functions and tools to prevent dereferencing
    const extractFunctionParameters = (functions) => {
        return functions.map((func) => {
            const { parameters } = func;
            delete func.parameters;
            return { parameters };
        });
    };
    const extractToolParameters = (tools) => {
        return tools.map((tool) => {
            const { parameters } = tool.function || {};
            if (tool.function?.parameters) {
                delete tool.function.parameters;
            }
            return { parameters };
        });
    };
    // Restore parameters to functions and tools after dereferencing
    const restoreFunctionParameters = (functions, parametersList) => {
        functions.forEach((func, index) => {
            if (parametersList[index]?.parameters) {
                func.parameters = parametersList[index].parameters;
            }
        });
    };
    const restoreToolParameters = (tools, parametersList) => {
        tools.forEach((tool, index) => {
            if (parametersList[index]?.parameters) {
                tool.function = tool.function || {};
                tool.function.parameters = parametersList[index].parameters;
            }
        });
    };
    const functionsParametersList = [];
    const toolsParametersList = [];
    if (Array.isArray(rawConfig.providers)) {
        rawConfig.providers.forEach((provider, providerIndex) => {
            if (typeof provider === 'string') {
                return;
            }
            if (typeof provider === 'function') {
                return;
            }
            if (!provider.config) {
                // Handle when provider is a map
                provider = Object.values(provider)[0];
            }
            // Handle dereferencing for inline tools, but skip external file paths (which are just strings)
            if (Array.isArray(provider.config?.functions)) {
                functionsParametersList[providerIndex] = extractFunctionParameters(provider.config.functions);
            }
            if (Array.isArray(provider.config?.tools)) {
                toolsParametersList[providerIndex] = extractToolParameters(provider.config.tools);
            }
        });
    }
    // Dereference JSON
    const config = (await json_schema_ref_parser_1.default.dereference(rawConfig));
    // Restore functions and tools parameters
    if (Array.isArray(config.providers)) {
        config.providers.forEach((provider, index) => {
            if (typeof provider === 'string') {
                return;
            }
            if (typeof provider === 'function') {
                return;
            }
            if (!provider.config) {
                // Handle when provider is a map
                provider = Object.values(provider)[0];
            }
            if (functionsParametersList[index]) {
                provider.config.functions = provider.config.functions || [];
                restoreFunctionParameters(provider.config.functions, functionsParametersList[index]);
            }
            if (toolsParametersList[index]) {
                provider.config.tools = provider.config.tools || [];
                restoreToolParameters(provider.config.tools, toolsParametersList[index]);
            }
        });
    }
    return config;
}
async function readConfig(configPath) {
    let ret;
    const ext = path.parse(configPath).ext;
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
        const rawConfig = js_yaml_1.default.load(fs.readFileSync(configPath, 'utf-8')) ?? {};
        const dereferencedConfig = await dereferenceConfig(rawConfig);
        // Validator requires `prompts`, but prompts is not actually required for redteam.
        const UnifiedConfigSchemaWithoutPrompts = types_1.UnifiedConfigSchema.innerType()
            .innerType()
            .extend({ prompts: types_1.UnifiedConfigSchema.innerType().innerType().shape.prompts.optional() });
        const validationResult = UnifiedConfigSchemaWithoutPrompts.safeParse(dereferencedConfig);
        if (!validationResult.success) {
            logger_1.default.warn(`Invalid configuration file ${configPath}:\n${(0, zod_validation_error_1.fromError)(validationResult.error).message}`);
        }
        ret = dereferencedConfig;
    }
    else if ((0, fileExtensions_1.isJavascriptFile)(configPath)) {
        const imported = await (0, esm_1.importModule)(configPath);
        const validationResult = types_1.UnifiedConfigSchema.safeParse(imported);
        if (!validationResult.success) {
            logger_1.default.warn(`Invalid configuration file ${configPath}:\n${(0, zod_validation_error_1.fromError)(validationResult.error).message}`);
        }
        ret = imported;
    }
    else {
        throw new Error(`Unsupported configuration file format: ${ext}`);
    }
    if (ret.targets) {
        logger_1.default.debug(`Rewriting config.targets to config.providers`);
        ret.providers = ret.targets;
        delete ret.targets;
    }
    if (ret.plugins) {
        logger_1.default.debug(`Rewriting config.plugins to config.redteam.plugins`);
        ret.redteam = ret.redteam || {};
        ret.redteam.plugins = ret.plugins;
        delete ret.plugins;
    }
    if (ret.strategies) {
        logger_1.default.debug(`Rewriting config.strategies to config.redteam.strategies`);
        ret.redteam = ret.redteam || {};
        ret.redteam.strategies = ret.strategies;
        delete ret.strategies;
    }
    if (!ret.prompts) {
        logger_1.default.debug(`Setting default prompt because there is no \`prompts\` field`);
        const hasAnyPrompt = 
        // Allow no tests
        !ret.tests ||
            // Allow any string
            typeof ret.tests === 'string' ||
            // Check the array for `prompt` vars
            (Array.isArray(ret.tests) &&
                ret.tests.some((test) => typeof test === 'object' && Object.keys(test.vars || {}).includes('prompt')));
        if (!hasAnyPrompt) {
            logger_1.default.warn(`Warning: Expected top-level "prompts" property in config or a test variable named "prompt"`);
        }
        ret.prompts = ['{{prompt}}'];
    }
    return ret;
}
async function maybeReadConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        return undefined;
    }
    return readConfig(configPath);
}
/**
 * Reads multiple configuration files and combines them into a single UnifiedConfig.
 *
 * @param {string[]} configPaths - An array of paths to configuration files. Supports glob patterns.
 * @returns {Promise<UnifiedConfig>} A promise that resolves to a unified configuration object.
 */
async function combineConfigs(configPaths) {
    const configs = [];
    for (const configPath of configPaths) {
        const resolvedPath = path.resolve(process_1.default.cwd(), configPath);
        const globPaths = (0, glob_1.globSync)(resolvedPath, {
            windowsPathsNoEscape: true,
        });
        if (globPaths.length === 0) {
            throw new Error(`No configuration file found at ${configPath}`);
        }
        for (const globPath of globPaths) {
            const config = await readConfig(globPath);
            configs.push(config);
        }
    }
    const providers = [];
    const seenProviders = new Set();
    configs.forEach((config) => {
        (0, invariant_1.default)(typeof config.providers !== 'function', 'Providers cannot be a function for multiple configs');
        if (typeof config.providers === 'string') {
            if (!seenProviders.has(config.providers)) {
                providers.push(config.providers);
                seenProviders.add(config.providers);
            }
        }
        else if (Array.isArray(config.providers)) {
            config.providers.forEach((provider) => {
                if (!seenProviders.has(JSON.stringify(provider))) {
                    providers.push(provider);
                    seenProviders.add(JSON.stringify(provider));
                }
            });
        }
    });
    const tests = [];
    for (const config of configs) {
        if (typeof config.tests === 'string') {
            const newTests = await (0, testCaseReader_1.readTests)(config.tests, path.dirname(configPaths[0]));
            tests.push(...newTests);
        }
        else if (Array.isArray(config.tests)) {
            tests.push(...config.tests);
        }
    }
    const extensions = [];
    for (const config of configs) {
        if (Array.isArray(config.extensions)) {
            extensions.push(...config.extensions);
        }
    }
    if (extensions.length > 1 && configs.length > 1) {
        console.warn('Warning: Multiple configurations and extensions detected. Currently, all extensions are run across all configs and do not respect their original promptfooconfig. Please file an issue on our GitHub repository if you need support for this use case.');
    }
    let redteam;
    for (const config of configs) {
        if (config.redteam) {
            if (!redteam) {
                redteam = {
                    plugins: [],
                    strategies: [],
                };
            }
            for (const redteamKey of Object.keys(config.redteam)) {
                if (['entities', 'plugins', 'strategies'].includes(redteamKey)) {
                    if (Array.isArray(config.redteam[redteamKey])) {
                        const currentValue = redteam[redteamKey] || [];
                        const newValue = config.redteam[redteamKey];
                        if (Array.isArray(newValue)) {
                            redteam[redteamKey] = [
                                ...new Set([...currentValue, ...newValue]),
                            ].sort();
                        }
                    }
                }
                else {
                    redteam[redteamKey] =
                        config.redteam[redteamKey];
                }
            }
        }
    }
    const configsAreStringOrArray = configs.every((config) => typeof config.prompts === 'string' || Array.isArray(config.prompts));
    let prompts = configsAreStringOrArray ? [] : {};
    const makeAbsolute = (configPath, relativePath) => {
        if (typeof relativePath === 'string') {
            if (relativePath.startsWith('file://')) {
                relativePath =
                    'file://' + path.resolve(path.dirname(configPath), relativePath.slice('file://'.length));
            }
            return relativePath;
        }
        else if (typeof relativePath === 'object' && relativePath.id) {
            if (relativePath.id.startsWith('file://')) {
                relativePath.id =
                    'file://' +
                        path.resolve(path.dirname(configPath), relativePath.id.slice('file://'.length));
            }
            return relativePath;
        }
        else if (prompts_2.PromptSchema.safeParse(relativePath).success) {
            return relativePath;
        }
        else {
            throw new Error(`Invalid prompt object: ${JSON.stringify(relativePath)}`);
        }
    };
    const seenPrompts = new Set();
    const addSeenPrompt = (prompt) => {
        if (typeof prompt === 'string') {
            seenPrompts.add(prompt);
        }
        else if (typeof prompt === 'object' && prompt.id) {
            seenPrompts.add(prompt);
        }
        else if (prompts_2.PromptSchema.safeParse(prompt).success) {
            seenPrompts.add(prompt);
        }
        else {
            throw new Error('Invalid prompt object');
        }
    };
    configs.forEach((config, idx) => {
        if (typeof config.prompts === 'string') {
            (0, invariant_1.default)(Array.isArray(prompts), 'Cannot mix string and map-type prompts');
            const absolutePrompt = makeAbsolute(configPaths[idx], config.prompts);
            addSeenPrompt(absolutePrompt);
        }
        else if (Array.isArray(config.prompts)) {
            (0, invariant_1.default)(Array.isArray(prompts), 'Cannot mix configs with map and array-type prompts');
            config.prompts.forEach((prompt) => {
                (0, invariant_1.default)(typeof prompt === 'string' ||
                    (typeof prompt === 'object' &&
                        (typeof prompt.raw === 'string' || typeof prompt.label === 'string')), `Invalid prompt: ${JSON.stringify(prompt)}. Prompts must be either a string or an object with a 'raw' or 'label' string property.`);
                addSeenPrompt(makeAbsolute(configPaths[idx], prompt));
            });
        }
        else {
            // Object format such as { 'prompts/prompt1.txt': 'foo', 'prompts/prompt2.txt': 'bar' }
            (0, invariant_1.default)(typeof prompts === 'object', 'Cannot mix configs with map and array-type prompts');
            prompts = { ...prompts, ...config.prompts };
        }
    });
    if (Array.isArray(prompts)) {
        prompts.push(...Array.from(seenPrompts));
    }
    // Combine all configs into a single UnifiedConfig
    const combinedConfig = {
        tags: configs.reduce((prev, curr) => ({ ...prev, ...curr.tags }), {}),
        description: configs.map((config) => config.description).join(', '),
        providers,
        prompts,
        tests,
        scenarios: configs.flatMap((config) => config.scenarios || []),
        defaultTest: configs.reduce((prev, curr) => {
            return {
                ...prev,
                ...curr.defaultTest,
                vars: { ...prev?.vars, ...curr.defaultTest?.vars },
                assert: [...(prev?.assert || []), ...(curr.defaultTest?.assert || [])],
                options: { ...prev?.options, ...curr.defaultTest?.options },
                metadata: { ...prev?.metadata, ...curr.defaultTest?.metadata },
            };
        }, {}),
        derivedMetrics: configs.reduce((prev, curr) => {
            if (curr.derivedMetrics) {
                return [...(prev ?? []), ...curr.derivedMetrics];
            }
            return prev;
        }, undefined),
        nunjucksFilters: configs.reduce((prev, curr) => ({ ...prev, ...curr.nunjucksFilters }), {}),
        env: configs.reduce((prev, curr) => ({ ...prev, ...curr.env }), {}),
        evaluateOptions: configs.reduce((prev, curr) => ({ ...prev, ...curr.evaluateOptions }), {}),
        outputPath: configs.flatMap((config) => typeof config.outputPath === 'string'
            ? [config.outputPath]
            : Array.isArray(config.outputPath)
                ? config.outputPath
                : []),
        commandLineOptions: configs.reduce((prev, curr) => ({ ...prev, ...curr.commandLineOptions }), {}),
        extensions,
        redteam,
        metadata: configs.reduce((prev, curr) => ({ ...prev, ...curr.metadata }), {}),
        sharing: (() => {
            if (configs.some((config) => config.sharing === false)) {
                return false;
            }
            const sharingConfig = configs.find((config) => typeof config.sharing === 'object');
            return sharingConfig ? sharingConfig.sharing : true;
        })(),
    };
    return combinedConfig;
}
/**
 * @param type - The type of configuration file. Incrementally implemented; currently supports `DatasetGeneration`.
 *  TODO(Optimization): Perform type-specific validation e.g. using Zod schemas for data model variants.
 */
async function resolveConfigs(cmdObj, _defaultConfig, type) {
    let fileConfig = {};
    let defaultConfig = _defaultConfig;
    const configPaths = cmdObj.config;
    if (configPaths) {
        fileConfig = await combineConfigs(configPaths);
        // The user has provided a config file, so we do not want to use the default config.
        defaultConfig = {};
    }
    // Standalone assertion mode
    if (cmdObj.assertions) {
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'standalone assertions mode',
        });
        if (!cmdObj.modelOutputs) {
            logger_1.default.error('You must provide --model-outputs when using --assertions');
            process_1.default.exit(1);
        }
        const modelOutputs = JSON.parse(fs.readFileSync(path.join(process_1.default.cwd(), cmdObj.modelOutputs), 'utf8'));
        const assertions = await (0, assertions_1.readAssertions)(cmdObj.assertions);
        fileConfig.prompts = ['{{output}}'];
        fileConfig.providers = ['echo'];
        fileConfig.tests = modelOutputs.map((output) => {
            if (typeof output === 'string') {
                return {
                    vars: {
                        output,
                    },
                    assert: assertions,
                };
            }
            return {
                vars: {
                    output: output.output,
                    ...(output.tags === undefined ? {} : { tags: output.tags.join(', ') }),
                },
                assert: assertions,
            };
        });
    }
    // Use base path in cases where path was supplied in the config file
    const basePath = configPaths ? path.dirname(configPaths[0]) : '';
    cliState_1.default.basePath = basePath;
    const defaultTestRaw = fileConfig.defaultTest || defaultConfig.defaultTest;
    const config = {
        tags: fileConfig.tags || defaultConfig.tags,
        description: cmdObj.description || fileConfig.description || defaultConfig.description,
        prompts: cmdObj.prompts || fileConfig.prompts || defaultConfig.prompts || [],
        providers: cmdObj.providers || fileConfig.providers || defaultConfig.providers || [],
        tests: cmdObj.tests || cmdObj.vars || fileConfig.tests || defaultConfig.tests || [],
        scenarios: fileConfig.scenarios || defaultConfig.scenarios,
        env: fileConfig.env || defaultConfig.env,
        sharing: (0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_SHARING')
            ? false
            : (fileConfig.sharing ?? defaultConfig.sharing ?? true),
        defaultTest: defaultTestRaw ? await (0, testCaseReader_1.readTest)(defaultTestRaw, basePath) : undefined,
        derivedMetrics: fileConfig.derivedMetrics || defaultConfig.derivedMetrics,
        outputPath: cmdObj.output || fileConfig.outputPath || defaultConfig.outputPath,
        extensions: fileConfig.extensions || defaultConfig.extensions || [],
        metadata: fileConfig.metadata || defaultConfig.metadata,
        redteam: fileConfig.redteam || defaultConfig.redteam,
    };
    const hasPrompts = [config.prompts].flat().filter(Boolean).length > 0;
    const hasProviders = [config.providers].flat().filter(Boolean).length > 0;
    const hasConfigFile = Boolean(configPaths);
    if (!hasConfigFile && !hasPrompts && !hasProviders && !(0, envars_1.isCI)()) {
        const runCommand = (0, util_1.isRunningUnderNpx)() ? 'npx promptfoo' : 'promptfoo';
        logger_1.default.warn((0, dedent_1.default) `
      ${chalk_1.default.yellow.bold('⚠️  No promptfooconfig found')}

      ${chalk_1.default.white('Try running with:')}
  
      ${chalk_1.default.cyan(`${runCommand} eval -c ${chalk_1.default.bold('path/to/promptfooconfig.yaml')}`)}
  
      ${chalk_1.default.white('Or create a config with:')}
  
      ${chalk_1.default.green(`${runCommand} init`)}
    `);
        process_1.default.exit(1);
    }
    if (!hasPrompts) {
        logger_1.default.error('You must provide at least 1 prompt');
        process_1.default.exit(1);
    }
    if (
    // Dataset configs don't require providers
    type !== 'DatasetGeneration' &&
        !hasProviders) {
        logger_1.default.error('You must specify at least 1 provider (for example, openai:gpt-4o)');
        process_1.default.exit(1);
    }
    (0, invariant_1.default)(Array.isArray(config.providers), 'providers must be an array');
    // Parse prompts, providers, and tests
    const parsedPrompts = await (0, prompts_1.readPrompts)(config.prompts, cmdObj.prompts ? undefined : basePath);
    const parsedProviders = await (0, providers_1.loadApiProviders)(config.providers, {
        env: config.env,
        basePath,
    });
    const parsedTests = await (0, testCaseReader_1.readTests)(config.tests || [], cmdObj.tests ? undefined : basePath);
    // Parse testCases for each scenario
    if (fileConfig.scenarios) {
        fileConfig.scenarios = (await (0, file_1.maybeLoadFromExternalFile)(fileConfig.scenarios));
    }
    if (Array.isArray(fileConfig.scenarios)) {
        for (const scenario of fileConfig.scenarios) {
            if (typeof scenario === 'object' && scenario.tests && typeof scenario.tests === 'string') {
                scenario.tests = await (0, file_1.maybeLoadFromExternalFile)(scenario.tests);
            }
            if (typeof scenario === 'object' && scenario.tests && Array.isArray(scenario.tests)) {
                const parsedScenarioTests = await (0, testCaseReader_1.readTests)(scenario.tests, cmdObj.tests ? undefined : basePath);
                scenario.tests = parsedScenarioTests;
            }
            (0, invariant_1.default)(typeof scenario === 'object', 'scenario must be an object');
            const filteredTests = await (0, filterTests_1.filterTests)({
                ...(scenario ?? {}),
                providers: parsedProviders,
                prompts: parsedPrompts,
            }, {
                firstN: cmdObj.filterFirstN,
                pattern: cmdObj.filterPattern,
                failing: cmdObj.filterFailing,
                sample: cmdObj.filterSample,
            });
            (0, invariant_1.default)(filteredTests, 'filteredTests are undefined');
            scenario.tests = filteredTests;
        }
    }
    const parsedProviderPromptMap = (0, prompts_1.readProviderPromptMap)(config, parsedPrompts);
    if (parsedPrompts.length === 0) {
        logger_1.default.error('No prompts found');
        process_1.default.exit(1);
    }
    const defaultTest = {
        metadata: config.metadata,
        options: {
            prefix: cmdObj.promptPrefix,
            suffix: cmdObj.promptSuffix,
            provider: cmdObj.grader,
            // rubricPrompt
            ...(config.defaultTest?.options || {}),
        },
        ...config.defaultTest,
    };
    const testSuite = {
        description: config.description,
        tags: config.tags,
        prompts: parsedPrompts,
        providers: parsedProviders,
        providerPromptMap: parsedProviderPromptMap,
        tests: parsedTests,
        scenarios: config.scenarios,
        defaultTest,
        derivedMetrics: config.derivedMetrics,
        nunjucksFilters: await (0, util_1.readFilters)(fileConfig.nunjucksFilters || defaultConfig.nunjucksFilters || {}, basePath),
        extensions: config.extensions,
    };
    if (testSuite.tests) {
        (0, validateAssertions_1.validateAssertions)(testSuite.tests);
    }
    cliState_1.default.config = config;
    return { config, testSuite, basePath };
}
//# sourceMappingURL=load.js.map