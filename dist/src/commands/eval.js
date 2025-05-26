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
exports.showRedteamProviderLabelMissingWarning = showRedteamProviderLabelMissingWarning;
exports.formatTokenUsage = formatTokenUsage;
exports.doEval = doEval;
exports.evalCommand = evalCommand;
const chalk_1 = __importDefault(require("chalk"));
const chokidar_1 = __importDefault(require("chokidar"));
const dedent_1 = __importDefault(require("dedent"));
const fs_1 = __importDefault(require("fs"));
const path = __importStar(require("path"));
const zod_1 = require("zod");
const zod_validation_error_1 = require("zod-validation-error");
const cache_1 = require("../cache");
const cliState_1 = __importDefault(require("../cliState"));
const envars_1 = require("../envars");
const evaluator_1 = require("../evaluator");
const accounts_1 = require("../globalConfig/accounts");
const cloud_1 = require("../globalConfig/cloud");
const logger_1 = __importStar(require("../logger"));
const migrate_1 = require("../migrate");
const eval_1 = __importDefault(require("../models/eval"));
const providers_1 = require("../providers");
const share_1 = require("../share");
const table_1 = require("../table");
const telemetry_1 = __importDefault(require("../telemetry"));
const types_1 = require("../types");
const types_2 = require("../types");
const providers_2 = require("../types/providers");
const util_1 = require("../util");
const util_2 = require("../util");
const default_1 = require("../util/config/default");
const load_1 = require("../util/config/load");
const file_1 = require("../util/file");
const formatDuration_1 = require("../util/formatDuration");
const invariant_1 = __importDefault(require("../util/invariant"));
const filterProviders_1 = require("./eval/filterProviders");
const filterTests_1 = require("./eval/filterTests");
const share_2 = require("./share");
const EvalCommandSchema = types_2.CommandLineOptionsSchema.extend({
    help: zod_1.z.boolean().optional(),
    interactiveProviders: zod_1.z.boolean().optional(),
    remote: zod_1.z.boolean().optional(),
}).partial();
function showRedteamProviderLabelMissingWarning(testSuite) {
    const hasProviderWithoutLabel = testSuite.providers.some((p) => !p.label);
    if (hasProviderWithoutLabel) {
        logger_1.default.warn((0, dedent_1.default) `
      ${chalk_1.default.bold.yellow('Warning')}: Your target (provider) does not have a label specified.

      Labels are used to uniquely identify redteam targets. Please set a meaningful and unique label (e.g., 'helpdesk-search-agent') for your targets/providers in your redteam config.

      Provider ID will be used as a fallback if no label is specified.
      `);
    }
}
/**
 * Format token usage for display in CLI output
 */
function formatTokenUsage(type, usage) {
    const parts = [];
    if (usage.total !== undefined) {
        parts.push(`${type} tokens: ${usage.total.toLocaleString()}`);
    }
    if (usage.prompt !== undefined) {
        parts.push(`Prompt tokens: ${usage.prompt.toLocaleString()}`);
    }
    if (usage.completion !== undefined) {
        parts.push(`Completion tokens: ${usage.completion.toLocaleString()}`);
    }
    if (usage.cached !== undefined) {
        parts.push(`Cached tokens: ${usage.cached.toLocaleString()}`);
    }
    if (usage.completionDetails?.reasoning !== undefined) {
        parts.push(`Reasoning tokens: ${usage.completionDetails.reasoning.toLocaleString()}`);
    }
    return parts.join(' / ');
}
async function doEval(cmdObj, defaultConfig, defaultConfigPath, evaluateOptions) {
    (0, util_2.setupEnv)(cmdObj.envPath);
    let config = undefined;
    let testSuite = undefined;
    let _basePath = undefined;
    const runEvaluation = async (initialization) => {
        const startTime = Date.now();
        telemetry_1.default.record('command_used', {
            name: 'eval - started',
            watch: Boolean(cmdObj.watch),
            // Only set when redteam is enabled for sure, because we don't know if config is loaded yet
            ...(Boolean(config?.redteam) && { isRedteam: true }),
        });
        await telemetry_1.default.send();
        if (cmdObj.write) {
            await (0, migrate_1.runDbMigrations)();
        }
        // Reload default config - because it may have changed.
        if (defaultConfigPath) {
            const configDir = path.dirname(defaultConfigPath);
            const configName = path.basename(defaultConfigPath, path.extname(defaultConfigPath));
            const { defaultConfig: newDefaultConfig } = await (0, default_1.loadDefaultConfig)(configDir, configName);
            defaultConfig = newDefaultConfig;
        }
        if (cmdObj.config !== undefined) {
            const configPaths = Array.isArray(cmdObj.config) ? cmdObj.config : [cmdObj.config];
            for (const configPath of configPaths) {
                if (fs_1.default.existsSync(configPath) && fs_1.default.statSync(configPath).isDirectory()) {
                    const { defaultConfig: dirConfig, defaultConfigPath: newConfigPath } = await (0, default_1.loadDefaultConfig)(configPath);
                    if (newConfigPath) {
                        cmdObj.config = cmdObj.config.filter((path) => path !== configPath);
                        cmdObj.config.push(newConfigPath);
                        defaultConfig = { ...defaultConfig, ...dirConfig };
                    }
                    else {
                        logger_1.default.warn(`No configuration file found in directory: ${configPath}`);
                    }
                }
            }
        }
        // Misc settings
        const iterations = cmdObj.repeat ?? Number.NaN;
        const repeat = Number.isSafeInteger(cmdObj.repeat) && iterations > 0 ? iterations : 1;
        if (!cmdObj.cache || repeat > 1) {
            logger_1.default.info('Cache is disabled.');
            (0, cache_1.disableCache)();
        }
        ({ config, testSuite, basePath: _basePath } = await (0, load_1.resolveConfigs)(cmdObj, defaultConfig));
        // Check if config has redteam section but no test cases
        if (config.redteam &&
            (!testSuite.tests || testSuite.tests.length === 0) &&
            (!testSuite.scenarios || testSuite.scenarios.length === 0)) {
            logger_1.default.warn(chalk_1.default.yellow((0, dedent_1.default) `
        Warning: Config file has a redteam section but no test cases.
        Did you mean to run ${chalk_1.default.bold('promptfoo redteam generate')} instead?
        `));
        }
        // Ensure evaluateOptions from the config file are applied
        if (config.evaluateOptions) {
            evaluateOptions = {
                ...config.evaluateOptions,
                ...evaluateOptions,
            };
        }
        let maxConcurrency = cmdObj.maxConcurrency;
        const delay = cmdObj.delay ?? 0;
        if (delay > 0) {
            maxConcurrency = 1;
            logger_1.default.info(`Running at concurrency=1 because ${delay}ms delay was requested between API calls`);
        }
        const filterOptions = {
            failing: cmdObj.filterFailing,
            errorsOnly: cmdObj.filterErrorsOnly,
            firstN: cmdObj.filterFirstN,
            metadata: cmdObj.filterMetadata,
            pattern: cmdObj.filterPattern,
            sample: cmdObj.filterSample,
        };
        testSuite.tests = await (0, filterTests_1.filterTests)(testSuite, filterOptions);
        if (config.redteam &&
            config.redteam.plugins &&
            config.redteam.plugins.length > 0 &&
            testSuite.tests &&
            testSuite.tests.length > 0) {
            await (0, accounts_1.promptForEmailUnverified)();
            await (0, accounts_1.checkEmailStatusOrExit)();
        }
        testSuite.providers = (0, filterProviders_1.filterProviders)(testSuite.providers, cmdObj.filterProviders || cmdObj.filterTargets);
        const options = {
            ...evaluateOptions,
            showProgressBar: (0, logger_1.getLogLevel)() === 'debug' ? false : cmdObj.progressBar,
            repeat,
            delay: !Number.isNaN(delay) && delay > 0 ? delay : undefined,
            maxConcurrency,
        };
        if (cmdObj.grader) {
            testSuite.defaultTest = testSuite.defaultTest || {};
            testSuite.defaultTest.options = testSuite.defaultTest.options || {};
            testSuite.defaultTest.options.provider = await (0, providers_1.loadApiProvider)(cmdObj.grader);
        }
        if (cmdObj.var) {
            testSuite.defaultTest = testSuite.defaultTest || {};
            testSuite.defaultTest.vars = { ...testSuite.defaultTest.vars, ...cmdObj.var };
        }
        if (cmdObj.generateSuggestions) {
            options.generateSuggestions = true;
        }
        // load scenarios or tests from an external file
        if (testSuite.scenarios) {
            testSuite.scenarios = (await (0, file_1.maybeLoadFromExternalFile)(testSuite.scenarios));
        }
        for (const scenario of testSuite.scenarios || []) {
            if (scenario.tests) {
                scenario.tests = await (0, file_1.maybeLoadFromExternalFile)(scenario.tests);
            }
        }
        const testSuiteSchema = types_1.TestSuiteSchema.safeParse(testSuite);
        if (!testSuiteSchema.success) {
            const validationError = (0, zod_validation_error_1.fromError)(testSuiteSchema.error);
            logger_1.default.warn(chalk_1.default.yellow((0, dedent_1.default) `
      TestSuite Schema Validation Error:

        ${validationError.toString()}

      Please review your promptfooconfig.yaml configuration.`));
        }
        const evalRecord = cmdObj.write
            ? await eval_1.default.create(config, testSuite.prompts)
            : new eval_1.default(config);
        // Run the evaluation!!!!!!
        const ret = await (0, evaluator_1.evaluate)(testSuite, evalRecord, {
            ...options,
            eventSource: 'cli',
            abortSignal: evaluateOptions.abortSignal,
        });
        // Clear results from memory to avoid memory issues
        evalRecord.clearResults();
        const wantsToShare = cmdObj.share && config.sharing;
        const shareableUrl = wantsToShare && (0, share_1.isSharingEnabled)(evalRecord) ? await (0, share_1.createShareableUrl)(evalRecord) : null;
        let successes = 0;
        let failures = 0;
        let errors = 0;
        const tokenUsage = {
            total: 0,
            prompt: 0,
            completion: 0,
            cached: 0,
            numRequests: 0,
            completionDetails: {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
            },
            assertions: {
                total: 0,
                prompt: 0,
                completion: 0,
                cached: 0,
                completionDetails: {
                    reasoning: 0,
                    acceptedPrediction: 0,
                    rejectedPrediction: 0,
                },
            },
        };
        // Calculate our total successes and failures
        for (const prompt of evalRecord.prompts) {
            if (prompt.metrics?.testPassCount) {
                successes += prompt.metrics.testPassCount;
            }
            if (prompt.metrics?.testFailCount) {
                failures += prompt.metrics.testFailCount;
            }
            if (prompt.metrics?.testErrorCount) {
                errors += prompt.metrics.testErrorCount;
            }
            tokenUsage.total += prompt.metrics?.tokenUsage?.total || 0;
            tokenUsage.prompt += prompt.metrics?.tokenUsage?.prompt || 0;
            tokenUsage.completion += prompt.metrics?.tokenUsage?.completion || 0;
            tokenUsage.cached += prompt.metrics?.tokenUsage?.cached || 0;
            tokenUsage.numRequests += prompt.metrics?.tokenUsage?.numRequests || 0;
            if (prompt.metrics?.tokenUsage?.completionDetails) {
                tokenUsage.completionDetails.reasoning +=
                    prompt.metrics.tokenUsage.completionDetails.reasoning || 0;
                tokenUsage.completionDetails.acceptedPrediction +=
                    prompt.metrics.tokenUsage.completionDetails.acceptedPrediction || 0;
                tokenUsage.completionDetails.rejectedPrediction +=
                    prompt.metrics.tokenUsage.completionDetails.rejectedPrediction || 0;
            }
            if (prompt.metrics?.tokenUsage?.assertions) {
                tokenUsage.assertions.total += prompt.metrics.tokenUsage.assertions.total || 0;
                tokenUsage.assertions.prompt += prompt.metrics.tokenUsage.assertions.prompt || 0;
                tokenUsage.assertions.completion += prompt.metrics.tokenUsage.assertions.completion || 0;
                tokenUsage.assertions.cached += prompt.metrics.tokenUsage.assertions.cached || 0;
                if (prompt.metrics.tokenUsage.assertions.completionDetails) {
                    tokenUsage.assertions.completionDetails.reasoning +=
                        prompt.metrics.tokenUsage.assertions.completionDetails.reasoning || 0;
                    tokenUsage.assertions.completionDetails.acceptedPrediction +=
                        prompt.metrics.tokenUsage.assertions.completionDetails.acceptedPrediction || 0;
                    tokenUsage.assertions.completionDetails.rejectedPrediction +=
                        prompt.metrics.tokenUsage.assertions.completionDetails.rejectedPrediction || 0;
                }
            }
        }
        const totalTests = successes + failures + errors;
        const passRate = (successes / totalTests) * 100;
        if (cmdObj.table && (0, logger_1.getLogLevel)() !== 'debug' && totalTests < 500) {
            const table = await evalRecord.getTable();
            // Output CLI table
            const outputTable = (0, table_1.generateTable)(table);
            logger_1.default.info('\n' + outputTable.toString());
            if (table.body.length > 25) {
                const rowsLeft = table.body.length - 25;
                logger_1.default.info(`... ${rowsLeft} more row${rowsLeft === 1 ? '' : 's'} not shown ...\n`);
            }
        }
        else if (failures !== 0) {
            logger_1.default.debug(`At least one evaluation failure occurred. This might be caused by the underlying call to the provider, or a test failure. Context: \n${JSON.stringify(evalRecord.prompts)}`);
        }
        if (totalTests >= 500) {
            logger_1.default.info('Skipping table output because there are more than 500 tests.');
        }
        const { outputPath } = config;
        // We're removing JSONL from paths since we already wrote to that during the evaluation
        const paths = (Array.isArray(outputPath) ? outputPath : [outputPath]).filter((p) => typeof p === 'string' && p.length > 0 && !p.endsWith('.jsonl'));
        if (paths.length) {
            await (0, util_2.writeMultipleOutputs)(paths, evalRecord, shareableUrl);
            logger_1.default.info(chalk_1.default.yellow(`Writing output to ${paths.join(', ')}`));
        }
        (0, util_2.printBorder)();
        if (cmdObj.write) {
            if (shareableUrl) {
                logger_1.default.info(`${chalk_1.default.green('✔')} Evaluation complete: ${shareableUrl}`);
            }
            else if (wantsToShare && !(0, share_1.isSharingEnabled)(evalRecord)) {
                (0, share_2.notCloudEnabledShareInstructions)();
            }
            else {
                logger_1.default.info(`${chalk_1.default.green('✔')} Evaluation complete. ID: ${chalk_1.default.cyan(evalRecord.id)}\n`);
                logger_1.default.info(`» Run ${chalk_1.default.greenBright.bold('promptfoo view')} to use the local web viewer`);
                if (cloud_1.cloudConfig.isEnabled()) {
                    logger_1.default.info(`» Run ${chalk_1.default.greenBright.bold('promptfoo share')} to create a shareable URL`);
                }
                else {
                    logger_1.default.info(`» Do you want to share this with your team? Sign up for free at ${chalk_1.default.greenBright.bold('https://promptfoo.app')}`);
                }
                logger_1.default.info(`» This project needs your feedback. What's one thing we can improve? ${chalk_1.default.greenBright.bold('https://forms.gle/YFLgTe1dKJKNSCsU7')}`);
            }
        }
        else {
            logger_1.default.info(`${chalk_1.default.green('✔')} Evaluation complete`);
        }
        (0, util_2.printBorder)();
        // Format and display duration
        const duration = Math.round((Date.now() - startTime) / 1000);
        const durationDisplay = (0, formatDuration_1.formatDuration)(duration);
        const isRedteam = Boolean(config.redteam);
        logger_1.default.info(chalk_1.default.green.bold(`Successes: ${successes}`));
        logger_1.default.info(chalk_1.default.red.bold(`Failures: ${failures}`));
        if (!Number.isNaN(errors)) {
            logger_1.default.info(chalk_1.default.red.bold(`Errors: ${errors}`));
        }
        if (!Number.isNaN(passRate)) {
            logger_1.default.info(chalk_1.default.blue.bold(`Pass Rate: ${passRate.toFixed(2)}%`));
        }
        logger_1.default.info(chalk_1.default.blue.bold(`Duration: ${durationDisplay} (concurrency: ${maxConcurrency})`));
        if (tokenUsage.total > 0) {
            const evalTokens = {
                total: tokenUsage.total,
                prompt: tokenUsage.prompt,
                completion: tokenUsage.completion,
                cached: tokenUsage.cached,
                completionDetails: tokenUsage.completionDetails,
            };
            if (isRedteam) {
                logger_1.default.info(`Model probes: ${tokenUsage.numRequests.toLocaleString()} / ${formatTokenUsage('eval', evalTokens)}`);
            }
            else {
                logger_1.default.info(formatTokenUsage('Eval', evalTokens));
            }
            if (tokenUsage.assertions.total > 0) {
                logger_1.default.info(formatTokenUsage('Grading', tokenUsage.assertions));
            }
            const combinedTotal = evalTokens.total + tokenUsage.assertions.total;
            logger_1.default.info(`Total tokens: ${combinedTotal.toLocaleString()} (eval: ${evalTokens.total.toLocaleString()} + Grading: ${tokenUsage.assertions.total.toLocaleString()})`);
        }
        telemetry_1.default.record('command_used', {
            name: 'eval',
            watch: Boolean(cmdObj.watch),
            duration: Math.round((Date.now() - startTime) / 1000),
            isRedteam,
        });
        await telemetry_1.default.send();
        if (cmdObj.watch) {
            if (initialization) {
                const configPaths = (cmdObj.config || [defaultConfigPath]).filter(Boolean);
                if (!configPaths.length) {
                    logger_1.default.error('Could not locate config file(s) to watch');
                    process.exitCode = 1;
                    return ret;
                }
                const basePath = path.dirname(configPaths[0]);
                const promptPaths = Array.isArray(config.prompts)
                    ? config.prompts
                        .map((p) => {
                        if (typeof p === 'string' && p.startsWith('file://')) {
                            return path.resolve(basePath, p.slice('file://'.length));
                        }
                        else if (typeof p === 'object' && p.id && p.id.startsWith('file://')) {
                            return path.resolve(basePath, p.id.slice('file://'.length));
                        }
                        return null;
                    })
                        .filter(Boolean)
                    : [];
                const providerPaths = Array.isArray(config.providers)
                    ? config.providers
                        .map((p) => typeof p === 'string' && p.startsWith('file://')
                        ? path.resolve(basePath, p.slice('file://'.length))
                        : null)
                        .filter(Boolean)
                    : [];
                const varPaths = Array.isArray(config.tests)
                    ? config.tests
                        .flatMap((t) => {
                        if (typeof t === 'string' && t.startsWith('file://')) {
                            return path.resolve(basePath, t.slice('file://'.length));
                        }
                        else if (typeof t !== 'string' && t.vars) {
                            return Object.values(t.vars).flatMap((v) => {
                                if (typeof v === 'string' && v.startsWith('file://')) {
                                    return path.resolve(basePath, v.slice('file://'.length));
                                }
                                return [];
                            });
                        }
                        return [];
                    })
                        .filter(Boolean)
                    : [];
                const watchPaths = Array.from(new Set([...configPaths, ...promptPaths, ...providerPaths, ...varPaths]));
                const watcher = chokidar_1.default.watch(watchPaths, { ignored: /^\./, persistent: true });
                watcher
                    .on('change', async (path) => {
                    (0, util_2.printBorder)();
                    logger_1.default.info(`File change detected: ${path}`);
                    (0, util_2.printBorder)();
                    (0, default_1.clearConfigCache)();
                    await runEvaluation();
                })
                    .on('error', (error) => logger_1.default.error(`Watcher error: ${error}`))
                    .on('ready', () => watchPaths.forEach((watchPath) => logger_1.default.info(`Watching for file changes on ${watchPath} ...`)));
            }
        }
        else {
            const passRateThreshold = (0, envars_1.getEnvFloat)('PROMPTFOO_PASS_RATE_THRESHOLD', 100);
            const failedTestExitCode = (0, envars_1.getEnvInt)('PROMPTFOO_FAILED_TEST_EXIT_CODE', 100);
            if (passRate < (Number.isFinite(passRateThreshold) ? passRateThreshold : 100)) {
                if ((0, envars_1.getEnvFloat)('PROMPTFOO_PASS_RATE_THRESHOLD') !== undefined) {
                    logger_1.default.info(chalk_1.default.white(`Pass rate ${chalk_1.default.red.bold(passRate.toFixed(2))}${chalk_1.default.red('%')} is below the threshold of ${chalk_1.default.red.bold(passRateThreshold)}${chalk_1.default.red('%')}`));
                }
                logger_1.default.info('Done.');
                process.exitCode = Number.isSafeInteger(failedTestExitCode) ? failedTestExitCode : 100;
                return ret;
            }
            else {
                logger_1.default.info('Done.');
            }
        }
        if (testSuite.redteam) {
            showRedteamProviderLabelMissingWarning(testSuite);
        }
        // Clean up any WebSocket connections
        if (testSuite.providers.length > 0) {
            for (const provider of testSuite.providers) {
                if ((0, providers_2.isApiProvider)(provider)) {
                    const cleanup = provider?.cleanup?.();
                    if (cleanup instanceof Promise) {
                        await cleanup;
                    }
                }
            }
        }
        return ret;
    };
    return await runEvaluation(true /* initialization */);
}
function evalCommand(program, defaultConfig, defaultConfigPath) {
    const evaluateOptions = {};
    if (defaultConfig.evaluateOptions) {
        evaluateOptions.generateSuggestions = defaultConfig.evaluateOptions.generateSuggestions;
        evaluateOptions.maxConcurrency = defaultConfig.evaluateOptions.maxConcurrency;
        evaluateOptions.showProgressBar = defaultConfig.evaluateOptions.showProgressBar;
    }
    const evalCmd = program
        .command('eval')
        .description('Evaluate prompts')
        // Core configuration
        .option('-c, --config <paths...>', 'Path to configuration file. Automatically loads promptfooconfig.yaml')
        // Input sources
        .option('-a, --assertions <path>', 'Path to assertions file')
        .option('-p, --prompts <paths...>', 'Paths to prompt files (.txt)')
        .option('-r, --providers <name or path...>', 'One of: openai:chat, openai:completion, openai:<model name>, or path to custom API caller module')
        .option('-t, --tests <path>', 'Path to CSV with test cases')
        .option('-v, --vars <path>', 'Path to CSV with test cases (alias for --tests)', defaultConfig?.commandLineOptions?.vars)
        .option('--model-outputs <path>', 'Path to JSON containing list of LLM output strings')
        // Prompt modification
        .option('--prompt-prefix <path>', 'This prefix is prepended to every prompt', defaultConfig.defaultTest?.options?.prefix)
        .option('--prompt-suffix <path>', 'This suffix is appended to every prompt.', defaultConfig.defaultTest?.options?.suffix)
        .option('--var <key=value>', 'Set a variable in key=value format', (value, previous) => {
        const [key, val] = value.split('=');
        if (!key || val === undefined) {
            throw new Error('--var must be specified in key=value format.');
        }
        return { ...previous, [key]: val };
    }, {})
        // Execution control
        .option('-j, --max-concurrency <number>', 'Maximum number of concurrent API calls', defaultConfig.evaluateOptions?.maxConcurrency
        ? String(defaultConfig.evaluateOptions.maxConcurrency)
        : `${evaluator_1.DEFAULT_MAX_CONCURRENCY}`)
        .option('--repeat <number>', 'Number of times to run each test', defaultConfig.evaluateOptions?.repeat ? String(defaultConfig.evaluateOptions.repeat) : '1')
        .option('--delay <number>', 'Delay between each test (in milliseconds)', defaultConfig.evaluateOptions?.delay ? String(defaultConfig.evaluateOptions.delay) : '0')
        .option('--no-cache', 'Do not read or write results to disk cache', defaultConfig?.commandLineOptions?.cache ?? defaultConfig?.evaluateOptions?.cache)
        .option('--remote', 'Force remote inference wherever possible (used for red teams)', false)
        // Filtering and subset selection
        .option('-n, --filter-first-n <number>', 'Only run the first N tests')
        .option('--filter-pattern <pattern>', 'Only run tests whose description matches the regular expression pattern')
        .option('--filter-providers, --filter-targets <providers>', 'Only run tests with these providers (regex match)')
        .option('--filter-sample <number>', 'Only run a random sample of N tests')
        .option('--filter-failing <path or id>', 'Path to json output file or eval ID to filter failing tests from')
        .option('--filter-errors-only <path or id>', 'Path to json output file or eval ID to filter error tests from')
        .option('--filter-metadata <key=value>', 'Only run tests whose metadata matches the key=value pair (e.g. --filter-metadata pluginId=debug-access)')
        // Output configuration
        .option('-o, --output <paths...>', 'Path to output file (csv, txt, json, yaml, yml, html), default is no output file')
        .option('--table', 'Output table in CLI', defaultConfig?.commandLineOptions?.table ?? true)
        .option('--no-table', 'Do not output table in CLI', defaultConfig?.commandLineOptions?.table)
        .option('--table-cell-max-length <number>', 'Truncate console table cells to this length', '250')
        .option('--share', 'Create a shareable URL', defaultConfig?.commandLineOptions?.share)
        .option('--no-write', 'Do not write results to promptfoo directory', defaultConfig?.commandLineOptions?.write)
        // Additional features
        .option('--grader <provider>', 'Model that will grade outputs', defaultConfig?.commandLineOptions?.grader)
        .option('--suggest-prompts <number>', 'Generate N new prompts and append them to the prompt list')
        .option('-w, --watch', 'Watch for changes in config and re-run')
        // Miscellaneous
        .option('--description <description>', 'Description of the eval run')
        .option('--no-progress-bar', 'Do not show progress bar')
        .action(async (opts, command) => {
        let validatedOpts;
        try {
            validatedOpts = EvalCommandSchema.parse(opts);
        }
        catch (err) {
            const validationError = (0, zod_validation_error_1.fromError)(err);
            logger_1.default.error((0, dedent_1.default) `
        Invalid command options:
        ${validationError.toString()}
        `);
            process.exitCode = 1;
            return;
        }
        if (command.args.length > 0) {
            logger_1.default.warn(`Unknown command: ${command.args[0]}. Did you mean -c ${command.args[0]}?`);
        }
        if (validatedOpts.help) {
            evalCmd.help();
            return;
        }
        if (validatedOpts.interactiveProviders) {
            const runCommand = (0, util_1.isRunningUnderNpx)() ? 'npx promptfoo eval' : 'promptfoo eval';
            logger_1.default.warn(chalk_1.default.yellow((0, dedent_1.default) `
          Warning: The --interactive-providers option has been removed.

          Instead, use -j 1 to run evaluations with a concurrency of 1:
          ${chalk_1.default.green(`${runCommand} -j 1`)}
        `));
            process.exitCode = 2;
            return;
        }
        if (validatedOpts.remote) {
            cliState_1.default.remote = true;
        }
        for (const maybeFilePath of validatedOpts.output ?? []) {
            const { data: extension } = types_1.OutputFileExtension.safeParse(maybeFilePath.split('.').pop()?.toLowerCase());
            (0, invariant_1.default)(extension, `Unsupported output file format: ${maybeFilePath}. Please use one of: ${types_1.OutputFileExtension.options.join(', ')}.`);
        }
        doEval(validatedOpts, defaultConfig, defaultConfigPath, evaluateOptions);
    });
    return evalCmd;
}
//# sourceMappingURL=eval.js.map