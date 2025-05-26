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
exports.doGenerateRedteam = doGenerateRedteam;
exports.redteamGenerateCommand = redteamGenerateCommand;
const chalk_1 = __importDefault(require("chalk"));
const crypto_1 = require("crypto");
const dedent_1 = __importDefault(require("dedent"));
const fs = __importStar(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const zod_validation_error_1 = require("zod-validation-error");
const __1 = require("../");
const cache_1 = require("../../cache");
const cliState_1 = __importDefault(require("../../cliState"));
const constants_1 = require("../../constants");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const providers_1 = require("../../providers");
const telemetry_1 = __importDefault(require("../../telemetry"));
const util_1 = require("../../util");
const load_1 = require("../../util/config/load");
const manage_1 = require("../../util/config/manage");
const invariant_1 = __importDefault(require("../../util/invariant"));
const redteam_1 = require("../../validators/redteam");
const constants_2 = require("../constants");
const remoteGeneration_1 = require("../remoteGeneration");
const discover_1 = require("./discover");
function getConfigHash(configPath) {
    const content = fs.readFileSync(configPath, 'utf8');
    return (0, crypto_1.createHash)('md5').update(`${constants_1.VERSION}:${content}`).digest('hex');
}
async function doGenerateRedteam(options) {
    (0, util_1.setupEnv)(options.envFile);
    if (!options.cache) {
        logger_1.default.info('Cache is disabled');
        (0, cache_1.disableCache)();
    }
    let testSuite;
    let redteamConfig;
    const configPath = options.config || options.defaultConfigPath;
    const outputPath = options.output || 'redteam.yaml';
    // Check for updates to the config file and decide whether to generate
    let shouldGenerate = options.force;
    if (!options.force && fs.existsSync(outputPath) && configPath && fs.existsSync(configPath)) {
        // Skip hash check for .burp files since they're not YAML
        if (!outputPath.endsWith('.burp')) {
            const redteamContent = js_yaml_1.default.load(fs.readFileSync(outputPath, 'utf8'));
            const storedHash = redteamContent.metadata?.configHash;
            const currentHash = getConfigHash(configPath);
            shouldGenerate = storedHash !== currentHash;
            if (!shouldGenerate) {
                logger_1.default.warn('No changes detected in redteam configuration. Skipping generation (use --force to generate anyway)');
                return redteamContent;
            }
        }
    }
    else {
        shouldGenerate = true;
    }
    let targetPurposeDiscoveryResult;
    if (configPath) {
        const resolved = await (0, load_1.resolveConfigs)({
            config: [configPath],
        }, options.defaultConfig || {});
        testSuite = resolved.testSuite;
        redteamConfig = resolved.config.redteam;
        // If automatic purpose discovery is enabled, remote generation is enabled, and a config is provided that contains at least one target,
        // discover the purpose from the target:
        if (!(0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_REDTEAM_PURPOSE_DISCOVERY_AGENT', true) &&
            !(0, remoteGeneration_1.neverGenerateRemote)() &&
            resolved.config.providers &&
            Array.isArray(resolved.config.providers)) {
            (0, invariant_1.default)(resolved.config.providers.length > 0, 'At least one provider must be provided in the config file');
            const providers = await (0, providers_1.loadApiProviders)(resolved.config.providers);
            try {
                if (testSuite.prompts.length > 1) {
                    logger_1.default.warn('More than one prompt provided, only the first prompt will be used for purpose discovery');
                }
                targetPurposeDiscoveryResult = await (0, discover_1.doTargetPurposeDiscovery)(providers[0], testSuite.prompts[0]);
            }
            catch (error) {
                logger_1.default.error(`Discovery failed from error, skipping: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    else if (options.purpose) {
        // There is a purpose, so we can just have a dummy test suite for standalone invocation
        testSuite = {
            prompts: [],
            providers: [],
            tests: [],
        };
    }
    else {
        logger_1.default.info(chalk_1.default.red(`\nCan't generate without configuration - run ${chalk_1.default.yellow.bold((0, util_1.isRunningUnderNpx)() ? 'npx promptfoo redteam init' : 'promptfoo redteam init')} first`));
        return null;
    }
    const mergedPurpose = (0, discover_1.mergeTargetPurposeDiscoveryResults)(redteamConfig?.purpose ?? options.purpose, targetPurposeDiscoveryResult);
    const startTime = Date.now();
    telemetry_1.default.record('command_used', {
        name: 'generate redteam - started',
        numPrompts: testSuite.prompts.length,
        numTestsExisting: (testSuite.tests || []).length,
        plugins: redteamConfig?.plugins?.map((p) => (typeof p === 'string' ? p : p.id)) || [],
        strategies: redteamConfig?.strategies?.map((s) => (typeof s === 'string' ? s : s.id)) || [],
    });
    await telemetry_1.default.send();
    let plugins;
    // If plugins are defined in the config file
    if (redteamConfig?.plugins && redteamConfig.plugins.length > 0) {
        plugins = redteamConfig.plugins.map((plugin) => {
            // Base configuration that all plugins will have
            const pluginConfig = {
                // Handle both string-style ('pluginName') and object-style ({ id: 'pluginName' }) plugins
                id: typeof plugin === 'string' ? plugin : plugin.id,
                // Use plugin-specific numTests if available, otherwise fall back to global settings
                numTests: (typeof plugin === 'object' && plugin.numTests) ||
                    options.numTests ||
                    redteamConfig?.numTests,
            };
            // If plugin has additional config options, include them
            if (typeof plugin === 'object' && plugin.config) {
                pluginConfig.config = plugin.config;
            }
            return pluginConfig;
        });
    }
    else {
        // If no plugins specified, use default plugins
        plugins = Array.from(constants_2.DEFAULT_PLUGINS).map((plugin) => ({
            id: plugin,
            numTests: options.numTests ?? redteamConfig?.numTests,
        }));
    }
    // override plugins with command line options
    if (Array.isArray(options.plugins) && options.plugins.length > 0) {
        plugins = options.plugins.map((plugin) => ({
            id: plugin.id,
            numTests: plugin.numTests || options.numTests || redteamConfig?.numTests,
            ...(plugin.config && { config: plugin.config }),
        }));
    }
    (0, invariant_1.default)(plugins && Array.isArray(plugins) && plugins.length > 0, 'No plugins found');
    let strategies = redteamConfig?.strategies ?? constants_2.DEFAULT_STRATEGIES.map((s) => ({ id: s }));
    if (options.strategies) {
        strategies = options.strategies;
    }
    const strategyObjs = strategies.map((s) => typeof s === 'string' ? { id: s } : s);
    try {
        logger_1.default.debug(`plugins: ${plugins.map((p) => p.id).join(', ')}`);
        logger_1.default.debug(`strategies: ${strategyObjs.map((s) => s.id ?? s).join(', ')}`);
    }
    catch (error) {
        logger_1.default.error('Error logging plugins and strategies. One did not have a valid id.');
        logger_1.default.error(`Error details: ${error instanceof Error ? error.message : String(error)}`);
    }
    const config = {
        injectVar: redteamConfig?.injectVar || options.injectVar,
        language: redteamConfig?.language || options.language,
        maxConcurrency: options.maxConcurrency,
        numTests: redteamConfig?.numTests ?? options.numTests,
        entities: redteamConfig?.entities,
        plugins,
        provider: redteamConfig?.provider || options.provider,
        purpose: mergedPurpose,
        strategies: strategyObjs,
        delay: redteamConfig?.delay || options.delay,
        sharing: redteamConfig?.sharing || options.sharing,
        excludeTargetOutputFromAgenticAttackGeneration: redteamConfig?.excludeTargetOutputFromAgenticAttackGeneration,
    };
    const parsedConfig = redteam_1.RedteamConfigSchema.safeParse(config);
    if (!parsedConfig.success) {
        logger_1.default.error('Invalid redteam configuration:');
        logger_1.default.error((0, zod_validation_error_1.fromError)(parsedConfig.error).toString());
        throw new Error('Invalid redteam configuration');
    }
    const targetLabels = testSuite.providers
        .map((provider) => provider?.label)
        .filter(Boolean);
    const { testCases: redteamTests, purpose, entities, injectVar: finalInjectVar, } = await (0, __1.synthesize)({
        ...parsedConfig.data,
        language: config.language,
        numTests: config.numTests,
        prompts: testSuite.prompts.map((prompt) => prompt.raw),
        maxConcurrency: config.maxConcurrency,
        delay: config.delay,
        abortSignal: options.abortSignal,
        targetLabels,
        showProgressBar: options.progressBar !== false,
    });
    if (redteamTests.length === 0) {
        logger_1.default.warn('No test cases generated. Please check for errors and try again.');
        return null;
    }
    const updatedRedteamConfig = {
        purpose,
        entities,
        strategies: strategyObjs || [],
        plugins: plugins || [],
        sharing: config.sharing,
    };
    let ret;
    if (options.output && options.output.endsWith('.burp')) {
        // Write in Burp Intruder compatible format
        const outputLines = redteamTests
            .map((test) => {
            const value = String(test.vars?.[finalInjectVar] ?? '');
            if (options.burpEscapeJson) {
                return encodeURIComponent(JSON.stringify(value).slice(1, -1));
            }
            return encodeURIComponent(value);
        })
            .filter((line) => line.length > 0)
            .join('\n');
        fs.writeFileSync(options.output, outputLines);
        logger_1.default.info(chalk_1.default.green(`Wrote ${redteamTests.length} test cases to ${chalk_1.default.bold(options.output)}`));
        // No need to return anything, Burp outputs are only invoked via command line.
        return {};
    }
    else if (options.output) {
        const existingYaml = configPath
            ? js_yaml_1.default.load(fs.readFileSync(configPath, 'utf8'))
            : {};
        const updatedYaml = {
            ...existingYaml,
            defaultTest: {
                ...(existingYaml.defaultTest || {}),
                metadata: {
                    ...(existingYaml.defaultTest?.metadata || {}),
                    purpose,
                    entities,
                },
            },
            tests: redteamTests,
            redteam: { ...(existingYaml.redteam || {}), ...updatedRedteamConfig },
            metadata: {
                ...(existingYaml.metadata || {}),
                ...(configPath && redteamTests.length > 0
                    ? { configHash: getConfigHash(configPath) }
                    : { configHash: 'force-regenerate' }),
                ...(targetPurposeDiscoveryResult ? { targetPurposeDiscoveryResult } : {}),
            },
        };
        ret = (0, manage_1.writePromptfooConfig)(updatedYaml, options.output);
        (0, util_1.printBorder)();
        const relativeOutputPath = path_1.default.relative(process.cwd(), options.output);
        logger_1.default.info(`Wrote ${redteamTests.length} test cases to ${relativeOutputPath}`);
        if (!options.inRedteamRun) {
            // Provider cleanup step
            try {
                const provider = testSuite.providers[0];
                if (provider && typeof provider.cleanup === 'function') {
                    const cleanupResult = provider.cleanup();
                    if (cleanupResult instanceof Promise) {
                        await cleanupResult;
                    }
                }
            }
            catch (cleanupErr) {
                logger_1.default.warn(`Error during provider cleanup: ${cleanupErr}`);
            }
            const commandPrefix = (0, util_1.isRunningUnderNpx)() ? 'npx promptfoo' : 'promptfoo';
            logger_1.default.info('\n' +
                chalk_1.default.green(`Run ${chalk_1.default.bold(relativeOutputPath === 'redteam.yaml'
                    ? `${commandPrefix} redteam eval`
                    : `${commandPrefix} redteam eval -c ${relativeOutputPath}`)} to run the red team!`));
        }
        (0, util_1.printBorder)();
    }
    else if (options.write && configPath) {
        const existingConfig = js_yaml_1.default.load(fs.readFileSync(configPath, 'utf8'));
        existingConfig.defaultTest = {
            ...(existingConfig.defaultTest || {}),
            metadata: {
                ...(existingConfig.defaultTest?.metadata || {}),
                purpose,
                entities,
            },
        };
        existingConfig.tests = [...(existingConfig.tests || []), ...redteamTests];
        existingConfig.redteam = { ...(existingConfig.redteam || {}), ...updatedRedteamConfig };
        // Add the result of target purpose discovery to metadata if available
        existingConfig.metadata = {
            ...(existingConfig.metadata || {}),
            configHash: getConfigHash(configPath),
            ...(targetPurposeDiscoveryResult ? { targetPurposeDiscoveryResult } : {}),
        };
        ret = (0, manage_1.writePromptfooConfig)(existingConfig, configPath);
        logger_1.default.info(`\nWrote ${redteamTests.length} new test cases to ${path_1.default.relative(process.cwd(), configPath)}`);
        const commandPrefix = (0, util_1.isRunningUnderNpx)() ? 'npx promptfoo' : 'promptfoo';
        const command = configPath.endsWith('promptfooconfig.yaml')
            ? `${commandPrefix} eval`
            : `${commandPrefix} eval -c ${path_1.default.relative(process.cwd(), configPath)}`;
        logger_1.default.info('\n' + chalk_1.default.green(`Run ${chalk_1.default.bold(`${command}`)} to run the red team!`));
    }
    else {
        ret = (0, manage_1.writePromptfooConfig)({ tests: redteamTests }, 'redteam.yaml');
    }
    telemetry_1.default.record('command_used', {
        duration: Math.round((Date.now() - startTime) / 1000),
        name: 'generate redteam',
        numPrompts: testSuite.prompts.length,
        numTestsExisting: (testSuite.tests || []).length,
        numTestsGenerated: redteamTests.length,
        plugins: plugins.map((p) => p.id),
        strategies: strategies.map((s) => (typeof s === 'string' ? s : s.id)),
    });
    await telemetry_1.default.send();
    return ret;
}
function redteamGenerateCommand(program, command, defaultConfig, defaultConfigPath) {
    program
        .command(command) // generate or redteam depending on if called from redteam or generate
        .description('Generate adversarial test cases')
        .option('-c, --config [path]', 'Path to configuration file. Defaults to promptfooconfig.yaml')
        .option('-o, --output [path]', 'Path to output file')
        .option('-w, --write', 'Write results to promptfoo configuration file', false)
        .option('--purpose <purpose>', 'Set the system purpose. If not set, the system purpose will be inferred from the config file')
        .option('--provider <provider>', `Provider to use for generating adversarial tests. Defaults to: ${constants_2.REDTEAM_MODEL}`)
        .option('--injectVar <varname>', 'Override the {{variable}} that represents user input in the prompt. Default value is inferred from your prompts')
        .option('--plugins <plugins>', (0, dedent_1.default) `Comma-separated list of plugins to use. Use 'default' to include default plugins.

        Defaults to:
        - default (includes: ${Array.from(constants_2.DEFAULT_PLUGINS).sort().join(', ')})

        Optional:
        - ${Array.from(constants_2.ADDITIONAL_PLUGINS).sort().join(', ')}
      `, (val) => val.split(',').map((x) => x.trim()))
        .option('--strategies <strategies>', (0, dedent_1.default) `Comma-separated list of strategies to use. Use 'default' to include default strategies.

        Defaults to:
        - default (includes: ${Array.from(constants_2.DEFAULT_STRATEGIES).sort().join(', ')})

        Optional:
        - ${Array.from(constants_2.ADDITIONAL_STRATEGIES).sort().join(', ')}
      `, (val) => val.split(',').map((x) => x.trim()))
        .option('-n, --num-tests <number>', 'Number of test cases to generate per plugin', (val) => (Number.isInteger(val) ? val : Number.parseInt(val, 10)), undefined)
        .option('--language <language>', 'Specify the language for generated tests. Defaults to English')
        .option('--no-cache', 'Do not read or write results to disk cache', false)
        .option('-j, --max-concurrency <number>', 'Maximum number of concurrent API calls', (val) => Number.parseInt(val, 10), defaultConfig.evaluateOptions?.maxConcurrency || 5)
        .option('--delay <number>', 'Delay in milliseconds between plugin API calls', (val) => Number.parseInt(val, 10))
        .option('--remote', 'Force remote inference wherever possible', false)
        .option('--force', 'Force generation even if no changes are detected', false)
        .option('--no-progress-bar', 'Do not show progress bar')
        .option('--burp-escape-json', 'Escape quotes in Burp payloads', false)
        .action((opts) => {
        if (opts.remote) {
            cliState_1.default.remote = true;
        }
        if ((0, remoteGeneration_1.shouldGenerateRemote)()) {
            logger_1.default.debug('Remote generation enabled');
        }
        else {
            logger_1.default.debug('Remote generation disabled');
        }
        try {
            let overrides = {};
            if (opts.plugins && opts.plugins.length > 0) {
                const parsed = redteam_1.RedteamConfigSchema.safeParse({
                    plugins: opts.plugins,
                    strategies: opts.strategies,
                    numTests: opts.numTests,
                });
                if (!parsed.success) {
                    logger_1.default.error('Invalid options:');
                    parsed.error.errors.forEach((err) => {
                        logger_1.default.error(`  ${err.path.join('.')}: ${err.message}`);
                    });
                    process.exit(1);
                }
                overrides = parsed.data;
            }
            if (!opts.write && !opts.output) {
                logger_1.default.info('No output file specified, writing to redteam.yaml in the current directory');
                opts.output = 'redteam.yaml';
            }
            const validatedOpts = redteam_1.RedteamGenerateOptionsSchema.parse({
                ...opts,
                ...overrides,
                defaultConfig,
                defaultConfigPath,
            });
            doGenerateRedteam(validatedOpts);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                logger_1.default.error('Invalid options:');
                error.errors.forEach((err) => {
                    logger_1.default.error(`  ${err.path.join('.')}: ${err.message}`);
                });
            }
            else {
                logger_1.default.error(`An unexpected error occurred during generation: ${error instanceof Error ? error.message : String(error)}\n${error instanceof Error ? error.stack : ''}`);
            }
            process.exit(1);
        }
    });
}
//# sourceMappingURL=generate.js.map