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
exports.DEFAULT_MAX_CONCURRENCY = void 0;
exports.isAllowedPrompt = isAllowedPrompt;
exports.newTokenUsage = newTokenUsage;
exports.runEval = runEval;
exports.calculateThreadsPerBar = calculateThreadsPerBar;
exports.generateVarCombinations = generateVarCombinations;
exports.evaluate = evaluate;
const async_1 = __importDefault(require("async"));
const chalk_1 = __importDefault(require("chalk"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const crypto_1 = require("crypto");
const glob_1 = require("glob");
const path = __importStar(require("path"));
const readline_1 = __importDefault(require("readline"));
const assertions_1 = require("./assertions");
const cache_1 = require("./cache");
const cliState_1 = __importDefault(require("./cliState"));
const signal_1 = require("./database/signal");
const envars_1 = require("./envars");
const evaluatorHelpers_1 = require("./evaluatorHelpers");
const logger_1 = __importDefault(require("./logger"));
const prompt_1 = require("./models/prompt");
const warnings_1 = require("./providers/azure/warnings");
const pandamonium_1 = require("./redteam/providers/pandamonium");
const suggestions_1 = require("./suggestions");
const telemetry_1 = __importDefault(require("./telemetry"));
const types_1 = require("./types");
const providers_1 = require("./types/providers");
const writeToFile_1 = require("./util/exportToFile/writeToFile");
const loadFunction_1 = require("./util/functions/loadFunction");
const invariant_1 = __importDefault(require("./util/invariant"));
const json_1 = require("./util/json");
const time_1 = require("./util/time");
const transform_1 = require("./util/transform");
exports.DEFAULT_MAX_CONCURRENCY = 4;
function updateAssertionMetrics(metrics, assertionTokens) {
    if (!metrics.tokenUsage.assertions) {
        metrics.tokenUsage.assertions = {
            total: 0,
            prompt: 0,
            completion: 0,
            cached: 0,
        };
    }
    const assertions = metrics.tokenUsage.assertions;
    assertions.total = (assertions.total ?? 0) + (assertionTokens.total ?? 0);
    assertions.prompt = (assertions.prompt ?? 0) + (assertionTokens.prompt ?? 0);
    assertions.completion = (assertions.completion ?? 0) + (assertionTokens.completion ?? 0);
    assertions.cached = (assertions.cached ?? 0) + (assertionTokens.cached ?? 0);
    if (assertionTokens.numRequests) {
        assertions.numRequests = (assertions.numRequests ?? 0) + assertionTokens.numRequests;
    }
    if (assertionTokens.completionDetails) {
        if (!assertions.completionDetails) {
            assertions.completionDetails = {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
            };
        }
        assertions.completionDetails.reasoning =
            (assertions.completionDetails.reasoning ?? 0) +
                (assertionTokens.completionDetails.reasoning ?? 0);
        assertions.completionDetails.acceptedPrediction =
            (assertions.completionDetails.acceptedPrediction ?? 0) +
                (assertionTokens.completionDetails.acceptedPrediction ?? 0);
        assertions.completionDetails.rejectedPrediction =
            (assertions.completionDetails.rejectedPrediction ?? 0) +
                (assertionTokens.completionDetails.rejectedPrediction ?? 0);
    }
}
/**
 * Validates if a given prompt is allowed based on the provided list of allowed
 * prompt labels. Providers can be configured with a `prompts` attribute, which
 * corresponds to an array of prompt labels. Labels can either refer to a group
 * (for example from a file) or to individual prompts. If the attribute is
 * present, this function validates that the prompt labels fit the matching
 * criteria of the provider. Examples:
 *
 * - `prompts: ['examplePrompt']` matches `examplePrompt` exactly
 * - `prompts: ['exampleGroup:*']` matches any prompt that starts with `exampleGroup:`
 *
 * If no `prompts` attribute is present, all prompts are allowed by default.
 *
 * @param prompt - The prompt object to check.
 * @param allowedPrompts - The list of allowed prompt labels.
 * @returns Returns true if the prompt is allowed, false otherwise.
 */
function isAllowedPrompt(prompt, allowedPrompts) {
    return (!Array.isArray(allowedPrompts) ||
        allowedPrompts.includes(prompt.label) ||
        allowedPrompts.some((allowedPrompt) => prompt.label.startsWith(`${allowedPrompt}:`)));
}
function newTokenUsage() {
    return {
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
}
/**
 * Runs a single test case.
 * @param options - The options for running the test case.
 * {
 *   provider - The provider to use for the test case.
 *   prompt - The raw prompt to use for the test case.
 *   test - The test case to run with assertions, etc.
 *   delay - A delay in ms to wait before any provider calls
 *   nunjucksFilters - The nunjucks filters to use for the test case.
 *   evaluateOptions - Currently unused
 *   testIdx - The index of the test case among all tests (row in the results table).
 *   promptIdx - The index of the prompt among all prompts (column in the results table).
 *   conversations - Evals can be run serially across multiple turns of a conversation. This gives access to the conversation history.
 *   registers - The registers to use for the test case to store values for later tests.
 *   isRedteam - Whether the test case is a redteam test case.
 * }
 * @returns The result of the test case.
 */
async function runEval({ provider, prompt, // raw prompt
test, delay, nunjucksFilters: filters, evaluateOptions, testIdx, promptIdx, conversations, registers, isRedteam, allTests, concurrency, abortSignal, }) {
    // Use the original prompt to set the label, not renderedPrompt
    const promptLabel = prompt.label;
    provider.delay ?? (provider.delay = delay ?? (0, envars_1.getEnvInt)('PROMPTFOO_DELAY_MS', 0));
    (0, invariant_1.default)(typeof provider.delay === 'number', `Provider delay should be set for ${provider.label}`);
    // Set up the special _conversation variable
    const vars = test.vars || {};
    const conversationKey = `${provider.label || provider.id()}:${prompt.id}${test.metadata?.conversationId ? `:${test.metadata.conversationId}` : ''}`;
    const usesConversation = prompt.raw.includes('_conversation');
    if (!(0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_CONVERSATION_VAR') &&
        !test.options?.disableConversationVar &&
        usesConversation) {
        vars._conversation = conversations?.[conversationKey] || [];
    }
    // Overwrite vars with any saved register values
    Object.assign(vars, registers);
    // Initialize these outside try block so they're in scope for the catch
    const setup = {
        provider: {
            id: provider.id(),
            label: provider.label,
            config: provider.config,
        },
        prompt: {
            raw: '',
            label: promptLabel,
            config: prompt.config,
        },
        vars,
    };
    let latencyMs = 0;
    try {
        // Render the prompt
        const renderedPrompt = await (0, evaluatorHelpers_1.renderPrompt)(prompt, vars, filters, provider);
        let renderedJson = undefined;
        try {
            renderedJson = JSON.parse(renderedPrompt);
        }
        catch { }
        setup.prompt.raw = renderedPrompt;
        const startTime = Date.now();
        let response = {
            output: '',
            tokenUsage: {},
            cost: 0,
            cached: false,
        };
        if (test.providerOutput) {
            response.output = test.providerOutput;
        }
        else if (typeof test.provider === 'object' &&
            typeof test.provider.id === 'function' &&
            test.provider.id() === 'promptfoo:redteam:pandamonium') {
            if (!(0, pandamonium_1.isPandamoniumProvider)(test.provider)) {
                throw new Error('Provider identified as pandamonium but does not have required methods');
            }
            return await test.provider.runPandamonium(provider, test, allTests || [], concurrency);
        }
        else {
            const activeProvider = (0, providers_1.isApiProvider)(test.provider) ? test.provider : provider;
            logger_1.default.debug(`Provider type: ${activeProvider.id()}`);
            response = await activeProvider.callApi(renderedPrompt, {
                // Always included
                vars,
                // Part of these may be removed in python and script providers, but every Javascript provider gets them
                prompt,
                filters,
                originalProvider: provider,
                test,
                // All of these are removed in python and script providers, but every Javascript provider gets them
                logger: logger_1.default,
                fetchWithCache: cache_1.fetchWithCache,
                getCache: cache_1.getCache,
            }, abortSignal ? { abortSignal } : undefined);
            logger_1.default.debug(`Provider response properties: ${Object.keys(response).join(', ')}`);
            logger_1.default.debug(`Provider response cached property explicitly: ${response.cached}`);
        }
        const endTime = Date.now();
        latencyMs = endTime - startTime;
        let conversationLastInput = undefined;
        if (renderedJson && Array.isArray(renderedJson)) {
            const lastElt = renderedJson[renderedJson.length - 1];
            // Use the `content` field if present (OpenAI chat format)
            conversationLastInput = lastElt?.content || lastElt;
        }
        if (conversations) {
            conversations[conversationKey] = conversations[conversationKey] || [];
            conversations[conversationKey].push({
                prompt: renderedJson || renderedPrompt,
                input: conversationLastInput || renderedJson || renderedPrompt,
                output: response.output || '',
                metadata: response.metadata,
            });
        }
        logger_1.default.debug(`Evaluator response = ${JSON.stringify(response).substring(0, 100)}...`);
        logger_1.default.debug(`Evaluator checking cached flag: response.cached = ${Boolean(response.cached)}, provider.delay = ${provider.delay}`);
        if (!response.cached && provider.delay > 0) {
            logger_1.default.debug(`Sleeping for ${provider.delay}ms`);
            await (0, time_1.sleep)(provider.delay);
        }
        else if (response.cached) {
            logger_1.default.debug(`Skipping delay because response is cached`);
        }
        const ret = {
            ...setup,
            response,
            success: false,
            failureReason: types_1.ResultFailureReason.NONE,
            score: 0,
            namedScores: {},
            latencyMs,
            cost: response.cost,
            metadata: {
                ...test.metadata,
                ...response.metadata,
            },
            promptIdx,
            testIdx,
            testCase: test,
            promptId: prompt.id || '',
            tokenUsage: newTokenUsage(),
        };
        (0, invariant_1.default)(ret.tokenUsage, 'This is always defined, just doing this to shut TS up');
        if (response.error) {
            ret.error = response.error;
            ret.failureReason = types_1.ResultFailureReason.ERROR;
            ret.success = false;
        }
        else if (response.output === null || response.output === undefined) {
            // NOTE: empty output often indicative of guardrails, so behavior differs for red teams.
            if (isRedteam) {
                ret.success = true;
            }
            else {
                ret.success = false;
                ret.score = 0;
                ret.error = 'No output';
            }
        }
        else {
            // Create a copy of response so we can potentially mutate it.
            const processedResponse = { ...response };
            const transforms = [
                provider.transform, // Apply provider transform first
                // NOTE: postprocess is deprecated. Use the first defined transform.
                [test.options?.transform, test.options?.postprocess].find((s) => s),
            ]
                .flat()
                .filter((s) => typeof s === 'string');
            for (const t of transforms) {
                processedResponse.output = await (0, transform_1.transform)(t, processedResponse.output, {
                    vars,
                    prompt,
                });
            }
            (0, invariant_1.default)(processedResponse.output != null, 'Response output should not be null');
            const checkResult = await (0, assertions_1.runAssertions)({
                prompt: renderedPrompt,
                provider,
                providerResponse: processedResponse,
                test,
                latencyMs: response.cached ? undefined : latencyMs,
                assertScoringFunction: test.assertScoringFunction,
            });
            if (!checkResult.pass) {
                ret.error = checkResult.reason;
                ret.failureReason = types_1.ResultFailureReason.ASSERT;
            }
            ret.success = checkResult.pass;
            ret.score = checkResult.score;
            ret.namedScores = checkResult.namedScores || {};
            if (checkResult.tokensUsed) {
                ret.tokenUsage.total += checkResult.tokensUsed.total || 0;
                ret.tokenUsage.prompt += checkResult.tokensUsed.prompt || 0;
                ret.tokenUsage.completion += checkResult.tokensUsed.completion || 0;
                ret.tokenUsage.cached += checkResult.tokensUsed.cached || 0;
                ret.tokenUsage.numRequests += checkResult.tokensUsed.numRequests || 1;
                if (checkResult.tokensUsed.completionDetails) {
                    ret.tokenUsage.completionDetails.reasoning +=
                        checkResult.tokensUsed.completionDetails.reasoning || 0;
                    ret.tokenUsage.completionDetails.acceptedPrediction +=
                        checkResult.tokensUsed.completionDetails.acceptedPrediction || 0;
                    ret.tokenUsage.completionDetails.rejectedPrediction +=
                        checkResult.tokensUsed.completionDetails.rejectedPrediction || 0;
                }
            }
            ret.response = processedResponse;
            ret.gradingResult = checkResult;
        }
        // Update token usage stats
        if (response.tokenUsage) {
            ret.tokenUsage.total += response.tokenUsage.total || 0;
            ret.tokenUsage.prompt += response.tokenUsage.prompt || 0;
            ret.tokenUsage.completion += response.tokenUsage.completion || 0;
            ret.tokenUsage.cached += response.tokenUsage.cached || 0;
            ret.tokenUsage.numRequests += response.tokenUsage.numRequests || 1;
            if (response.tokenUsage.completionDetails) {
                ret.tokenUsage.completionDetails.reasoning +=
                    response.tokenUsage.completionDetails.reasoning || 0;
                ret.tokenUsage.completionDetails.acceptedPrediction +=
                    response.tokenUsage.completionDetails.acceptedPrediction || 0;
                ret.tokenUsage.completionDetails.rejectedPrediction +=
                    response.tokenUsage.completionDetails.rejectedPrediction || 0;
            }
        }
        if (test.options?.storeOutputAs && ret.response?.output && registers) {
            // Save the output in a register for later use
            registers[test.options.storeOutputAs] = ret.response.output;
        }
        return [ret];
    }
    catch (err) {
        return [
            {
                ...setup,
                error: String(err) + '\n\n' + err.stack,
                success: false,
                failureReason: types_1.ResultFailureReason.ERROR,
                score: 0,
                namedScores: {},
                latencyMs,
                promptIdx,
                testIdx,
                testCase: test,
                promptId: prompt.id || '',
            },
        ];
    }
}
/**
 * Calculates the number of threads allocated to a specific progress bar.
 * @param concurrency Total number of concurrent threads
 * @param numProgressBars Total number of progress bars
 * @param barIndex Index of the progress bar (0-based)
 * @returns Number of threads allocated to this progress bar
 */
function calculateThreadsPerBar(concurrency, numProgressBars, barIndex) {
    const minThreadsPerBar = Math.floor(concurrency / numProgressBars);
    const extraThreads = concurrency % numProgressBars;
    return barIndex < extraThreads ? minThreadsPerBar + 1 : minThreadsPerBar;
}
function generateVarCombinations(vars) {
    const keys = Object.keys(vars);
    const combinations = [{}];
    for (const key of keys) {
        let values = [];
        if (typeof vars[key] === 'string' && vars[key].startsWith('file://')) {
            const filePath = vars[key].slice('file://'.length);
            const resolvedPath = path.resolve(cliState_1.default.basePath || '', filePath);
            const filePaths = (0, glob_1.globSync)(resolvedPath.replace(/\\/g, '/'));
            values = filePaths.map((path) => `file://${path}`);
            if (values.length === 0) {
                throw new Error(`No files found for variable ${key} at path ${resolvedPath}`);
            }
        }
        else {
            values = Array.isArray(vars[key]) ? vars[key] : [vars[key]];
        }
        // Check if it's an array but not a string array
        if (Array.isArray(vars[key]) && typeof vars[key][0] !== 'string') {
            values = [vars[key]];
        }
        const newCombinations = [];
        for (const combination of combinations) {
            for (const value of values) {
                newCombinations.push({ ...combination, [key]: value });
            }
        }
        combinations.length = 0;
        combinations.push(...newCombinations);
    }
    return combinations;
}
class Evaluator {
    constructor(testSuite, evalRecord, options) {
        this.testSuite = testSuite;
        this.evalRecord = evalRecord;
        this.options = options;
        this.stats = {
            successes: 0,
            failures: 0,
            errors: 0,
            tokenUsage: newTokenUsage(),
        };
        this.conversations = {};
        this.registers = {};
        const jsonlFiles = Array.isArray(evalRecord.config.outputPath)
            ? evalRecord.config.outputPath.filter((p) => p.endsWith('.jsonl'))
            : evalRecord.config.outputPath?.endsWith('.jsonl')
                ? [evalRecord.config.outputPath]
                : [];
        this.fileWriters = jsonlFiles.map((p) => new writeToFile_1.JsonlFileWriter(p));
    }
    async evaluate() {
        const { testSuite, options } = this;
        const vars = new Set();
        const checkAbort = () => {
            if (options.abortSignal?.aborted) {
                throw new Error('Operation cancelled');
            }
        };
        // Add abort checks at key points
        checkAbort();
        const prompts = [];
        const assertionTypes = new Set();
        const rowsWithSelectBestAssertion = new Set();
        await (0, evaluatorHelpers_1.runExtensionHook)(testSuite.extensions, 'beforeAll', { suite: testSuite });
        if (options.generateSuggestions) {
            // TODO(ian): Move this into its own command/file
            logger_1.default.info(`Generating prompt variations...`);
            const { prompts: newPrompts, error } = await (0, suggestions_1.generatePrompts)(testSuite.prompts[0].raw, 1);
            if (error || !newPrompts) {
                throw new Error(`Failed to generate prompts: ${error}`);
            }
            logger_1.default.info(chalk_1.default.blue('Generated prompts:'));
            let numAdded = 0;
            for (const prompt of newPrompts) {
                logger_1.default.info('--------------------------------------------------------');
                logger_1.default.info(`${prompt}`);
                logger_1.default.info('--------------------------------------------------------');
                // Ask the user if they want to continue
                await new Promise((resolve) => {
                    const rl = readline_1.default.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    rl.question(`${chalk_1.default.blue('Do you want to test this prompt?')} (y/N): `, async (answer) => {
                        rl.close();
                        if (answer.toLowerCase().startsWith('y')) {
                            testSuite.prompts.push({ raw: prompt, label: prompt });
                            numAdded++;
                        }
                        else {
                            logger_1.default.info('Skipping this prompt.');
                        }
                        resolve(true);
                    });
                });
            }
            if (numAdded < 1) {
                logger_1.default.info(chalk_1.default.red('No prompts selected. Aborting.'));
                process.exitCode = 1;
                return this.evalRecord;
            }
        }
        // Split prompts by provider
        // Order matters - keep provider in outer loop to reduce need to swap models during local inference.
        for (const provider of testSuite.providers) {
            for (const prompt of testSuite.prompts) {
                // Check if providerPromptMap exists and if it contains the current prompt's label
                const providerKey = provider.label || provider.id();
                if (!isAllowedPrompt(prompt, testSuite.providerPromptMap?.[providerKey])) {
                    continue;
                }
                const completedPrompt = {
                    ...prompt,
                    id: (0, prompt_1.generateIdFromPrompt)(prompt),
                    provider: providerKey,
                    label: prompt.label,
                    metrics: {
                        score: 0,
                        testPassCount: 0,
                        testFailCount: 0,
                        testErrorCount: 0,
                        assertPassCount: 0,
                        assertFailCount: 0,
                        totalLatencyMs: 0,
                        tokenUsage: {
                            total: 0,
                            prompt: 0,
                            completion: 0,
                            cached: 0,
                            numRequests: 0,
                        },
                        namedScores: {},
                        namedScoresCount: {},
                        cost: 0,
                    },
                };
                prompts.push(completedPrompt);
            }
        }
        // Aggregate all vars across test cases
        let tests = testSuite.tests && testSuite.tests.length > 0
            ? testSuite.tests
            : testSuite.scenarios
                ? []
                : [
                    {
                    // Dummy test for cases when we're only comparing raw prompts.
                    },
                ];
        // Build scenarios and add to tests
        if (testSuite.scenarios && testSuite.scenarios.length > 0) {
            telemetry_1.default.recordAndSendOnce('feature_used', {
                feature: 'scenarios',
            });
            for (const scenario of testSuite.scenarios) {
                for (const data of scenario.config) {
                    // Merge defaultTest with scenario config
                    const scenarioTests = (scenario.tests || [
                        {
                        // Dummy test for cases when we're only comparing raw prompts.
                        },
                    ]).map((test) => {
                        return {
                            ...testSuite.defaultTest,
                            ...data,
                            ...test,
                            vars: {
                                ...testSuite.defaultTest?.vars,
                                ...data.vars,
                                ...test.vars,
                            },
                            options: {
                                ...testSuite.defaultTest?.options,
                                ...test.options,
                            },
                            assert: [
                                // defaultTest.assert is omitted because it will be added to each test case later
                                ...(data.assert || []),
                                ...(test.assert || []),
                            ],
                            metadata: {
                                ...testSuite.defaultTest?.metadata,
                                ...data.metadata,
                                ...test.metadata,
                            },
                        };
                    });
                    // Add scenario tests to tests
                    tests = tests.concat(scenarioTests);
                }
            }
        }
        (0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests);
        // Prepare vars
        const varNames = new Set();
        const varsWithSpecialColsRemoved = [];
        const inputTransformDefault = testSuite?.defaultTest?.options?.transformVars;
        for (const testCase of tests) {
            testCase.vars = { ...testSuite.defaultTest?.vars, ...testCase?.vars };
            if (testCase.vars) {
                const varWithSpecialColsRemoved = {};
                const inputTransformForIndividualTest = testCase.options?.transformVars;
                const inputTransform = inputTransformForIndividualTest || inputTransformDefault;
                if (inputTransform) {
                    const transformContext = {
                        prompt: {},
                        uuid: (0, crypto_1.randomUUID)(),
                    };
                    const transformedVars = await (0, transform_1.transform)(inputTransform, testCase.vars, transformContext, true, transform_1.TransformInputType.VARS);
                    (0, invariant_1.default)(typeof transformedVars === 'object', 'Transform function did not return a valid object');
                    testCase.vars = { ...testCase.vars, ...transformedVars };
                }
                for (const varName of Object.keys(testCase.vars)) {
                    varNames.add(varName);
                    varWithSpecialColsRemoved[varName] = testCase.vars[varName];
                }
                varsWithSpecialColsRemoved.push(varWithSpecialColsRemoved);
            }
        }
        // Set up eval cases
        const runEvalOptions = [];
        let testIdx = 0;
        let concurrency = options.maxConcurrency || exports.DEFAULT_MAX_CONCURRENCY;
        for (let index = 0; index < tests.length; index++) {
            const testCase = tests[index];
            (0, invariant_1.default)(Array.isArray(testSuite.defaultTest?.assert || []), `defaultTest.assert is not an array in test case #${index + 1}`);
            (0, invariant_1.default)(Array.isArray(testCase.assert || []), `testCase.assert is not an array in test case #${index + 1}`);
            // Handle default properties
            testCase.assert = [...(testSuite.defaultTest?.assert || []), ...(testCase.assert || [])];
            testCase.threshold = testCase.threshold ?? testSuite.defaultTest?.threshold;
            testCase.options = { ...testSuite.defaultTest?.options, ...testCase.options };
            testCase.metadata = { ...testSuite.defaultTest?.metadata, ...testCase.metadata };
            testCase.provider = testCase.provider || testSuite.defaultTest?.provider;
            testCase.assertScoringFunction =
                testCase.assertScoringFunction || testSuite.defaultTest?.assertScoringFunction;
            if (typeof testCase.assertScoringFunction === 'string') {
                const { filePath: resolvedPath, functionName } = (0, loadFunction_1.parseFileUrl)(testCase.assertScoringFunction);
                testCase.assertScoringFunction = await (0, loadFunction_1.loadFunction)({
                    filePath: resolvedPath,
                    functionName,
                });
            }
            const prependToPrompt = testCase.options?.prefix || testSuite.defaultTest?.options?.prefix || '';
            const appendToPrompt = testCase.options?.suffix || testSuite.defaultTest?.options?.suffix || '';
            // Finalize test case eval
            const varCombinations = (0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_VAR_EXPANSION') || testCase.options.disableVarExpansion
                ? [testCase.vars]
                : generateVarCombinations(testCase.vars || {});
            const numRepeat = this.options.repeat || 1;
            for (let repeatIndex = 0; repeatIndex < numRepeat; repeatIndex++) {
                for (const vars of varCombinations) {
                    let promptIdx = 0;
                    // Order matters - keep provider in outer loop to reduce need to swap models during local inference.
                    for (const provider of testSuite.providers) {
                        for (const prompt of testSuite.prompts) {
                            const providerKey = provider.label || provider.id();
                            if (!isAllowedPrompt(prompt, testSuite.providerPromptMap?.[providerKey])) {
                                continue;
                            }
                            runEvalOptions.push({
                                delay: options.delay || 0,
                                provider,
                                prompt: {
                                    ...prompt,
                                    raw: prependToPrompt + prompt.raw + appendToPrompt,
                                },
                                test: { ...testCase, vars, options: testCase.options },
                                nunjucksFilters: testSuite.nunjucksFilters,
                                testIdx,
                                promptIdx,
                                repeatIndex,
                                evaluateOptions: options,
                                conversations: this.conversations,
                                registers: this.registers,
                                isRedteam: this.testSuite.redteam != null,
                                allTests: runEvalOptions,
                                concurrency,
                                abortSignal: options.abortSignal,
                            });
                            promptIdx++;
                        }
                    }
                    testIdx++;
                }
            }
        }
        // Determine run parameters
        if (concurrency > 1) {
            const usesConversation = prompts.some((p) => p.raw.includes('_conversation'));
            const usesStoreOutputAs = tests.some((t) => t.options?.storeOutputAs);
            if (usesConversation) {
                logger_1.default.info(`Setting concurrency to 1 because the ${chalk_1.default.cyan('_conversation')} variable is used.`);
                concurrency = 1;
            }
            else if (usesStoreOutputAs) {
                logger_1.default.info(`Setting concurrency to 1 because storeOutputAs is used.`);
                concurrency = 1;
            }
        }
        // Actually run the eval
        let numComplete = 0;
        const processEvalStep = async (evalStep, index) => {
            if (typeof index !== 'number') {
                throw new Error('Expected index to be a number');
            }
            await (0, evaluatorHelpers_1.runExtensionHook)(testSuite.extensions, 'beforeEach', {
                test: evalStep.test,
            });
            const rows = await runEval(evalStep);
            for (const row of rows) {
                for (const varName of Object.keys(row.vars)) {
                    vars.add(varName);
                }
                // Print token usage for model-graded assertions and add to stats
                if (row.gradingResult?.tokensUsed && row.testCase?.assert) {
                    for (const assertion of row.testCase.assert) {
                        if (assertions_1.MODEL_GRADED_ASSERTION_TYPES.has(assertion.type)) {
                            const tokensUsed = row.gradingResult.tokensUsed;
                            if (!this.stats.tokenUsage.assertions) {
                                this.stats.tokenUsage.assertions = {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                };
                            }
                            const assertions = this.stats.tokenUsage.assertions;
                            assertions.total = (assertions.total ?? 0) + (tokensUsed.total ?? 0);
                            assertions.prompt = (assertions.prompt ?? 0) + (tokensUsed.prompt ?? 0);
                            assertions.completion = (assertions.completion ?? 0) + (tokensUsed.completion ?? 0);
                            assertions.cached = (assertions.cached ?? 0) + (tokensUsed.cached ?? 0);
                            break;
                        }
                    }
                }
                // capture metrics
                if (row.success) {
                    this.stats.successes++;
                }
                else if (row.failureReason === types_1.ResultFailureReason.ERROR) {
                    this.stats.errors++;
                }
                else {
                    this.stats.failures++;
                }
                if (row.tokenUsage) {
                    this.stats.tokenUsage.total += row.tokenUsage.total || 0;
                    this.stats.tokenUsage.prompt += row.tokenUsage.prompt || 0;
                    this.stats.tokenUsage.completion += row.tokenUsage.completion || 0;
                    this.stats.tokenUsage.cached += row.tokenUsage.cached || 0;
                    this.stats.tokenUsage.numRequests += row.tokenUsage.numRequests || 1;
                    if (row.tokenUsage.completionDetails) {
                        this.stats.tokenUsage.completionDetails.reasoning +=
                            row.tokenUsage.completionDetails.reasoning || 0;
                        this.stats.tokenUsage.completionDetails.acceptedPrediction +=
                            row.tokenUsage.completionDetails.acceptedPrediction || 0;
                        this.stats.tokenUsage.completionDetails.rejectedPrediction +=
                            row.tokenUsage.completionDetails.rejectedPrediction || 0;
                    }
                }
                if (evalStep.test.assert?.some((a) => a.type === 'select-best')) {
                    rowsWithSelectBestAssertion.add(row.testIdx);
                }
                for (const assert of evalStep.test.assert || []) {
                    if (assert.type) {
                        assertionTypes.add(assert.type);
                    }
                }
                numComplete++;
                try {
                    await this.evalRecord.addResult(row);
                }
                catch (error) {
                    logger_1.default.error(`Error saving result: ${error} ${(0, json_1.safeJsonStringify)(row)}`);
                }
                for (const writer of this.fileWriters) {
                    await writer.write(row);
                }
                const { promptIdx } = row;
                const metrics = prompts[promptIdx].metrics;
                (0, invariant_1.default)(metrics, 'Expected prompt.metrics to be set');
                metrics.score += row.score;
                for (const [key, value] of Object.entries(row.namedScores)) {
                    // Update named score value
                    metrics.namedScores[key] = (metrics.namedScores[key] || 0) + value;
                    // Count assertions contributing to this named score
                    let contributingAssertions = 0;
                    row.gradingResult?.componentResults?.forEach((result) => {
                        if (result.assertion?.metric === key) {
                            contributingAssertions++;
                        }
                    });
                    metrics.namedScoresCount[key] =
                        (metrics.namedScoresCount[key] || 0) + (contributingAssertions || 1);
                }
                if (testSuite.derivedMetrics) {
                    const math = await Promise.resolve().then(() => __importStar(require('mathjs')));
                    for (const metric of testSuite.derivedMetrics) {
                        if (metrics.namedScores[metric.name] === undefined) {
                            metrics.namedScores[metric.name] = 0;
                        }
                        try {
                            if (typeof metric.value === 'function') {
                                metrics.namedScores[metric.name] = metric.value(metrics.namedScores, evalStep);
                            }
                            else {
                                const evaluatedValue = math.evaluate(metric.value, metrics.namedScores);
                                metrics.namedScores[metric.name] = evaluatedValue;
                            }
                        }
                        catch (error) {
                            logger_1.default.debug(`Could not evaluate derived metric '${metric.name}': ${error.message}`);
                        }
                    }
                }
                metrics.testPassCount += row.success ? 1 : 0;
                if (!row.success) {
                    if (row.failureReason === types_1.ResultFailureReason.ERROR) {
                        metrics.testErrorCount += 1;
                    }
                    else {
                        metrics.testFailCount += 1;
                    }
                }
                metrics.assertPassCount +=
                    row.gradingResult?.componentResults?.filter((r) => r.pass).length || 0;
                metrics.assertFailCount +=
                    row.gradingResult?.componentResults?.filter((r) => !r.pass).length || 0;
                metrics.totalLatencyMs += row.latencyMs || 0;
                metrics.tokenUsage.cached =
                    (metrics.tokenUsage.cached || 0) + (row.response?.tokenUsage?.cached || 0);
                metrics.tokenUsage.completion =
                    (metrics.tokenUsage.completion || 0) + (row.response?.tokenUsage?.completion || 0);
                metrics.tokenUsage.prompt =
                    (metrics.tokenUsage.prompt || 0) + (row.response?.tokenUsage?.prompt || 0);
                metrics.tokenUsage.total =
                    (metrics.tokenUsage.total || 0) + (row.response?.tokenUsage?.total || 0);
                metrics.tokenUsage.numRequests =
                    (metrics.tokenUsage.numRequests || 0) + (row.response?.tokenUsage?.numRequests || 1);
                metrics.tokenUsage.completionDetails = {
                    reasoning: (metrics.tokenUsage.completionDetails?.reasoning || 0) +
                        (row.response?.tokenUsage?.completionDetails?.reasoning || 0),
                    acceptedPrediction: (metrics.tokenUsage.completionDetails?.acceptedPrediction || 0) +
                        (row.response?.tokenUsage?.completionDetails?.acceptedPrediction || 0),
                    rejectedPrediction: (metrics.tokenUsage.completionDetails?.rejectedPrediction || 0) +
                        (row.response?.tokenUsage?.completionDetails?.rejectedPrediction || 0),
                };
                // Add assertion token usage to the metrics
                if (row.gradingResult?.tokensUsed) {
                    updateAssertionMetrics(metrics, row.gradingResult.tokensUsed);
                }
                metrics.cost += row.cost || 0;
                await (0, evaluatorHelpers_1.runExtensionHook)(testSuite.extensions, 'afterEach', {
                    test: evalStep.test,
                    result: row,
                });
                if (options.progressCallback) {
                    options.progressCallback(numComplete, runEvalOptions.length, index, evalStep, metrics);
                }
            }
        };
        // Add a wrapper function that implements timeout
        const processEvalStepWithTimeout = async (evalStep, index) => {
            // Get timeout value from options or environment, defaults to 0 (no timeout)
            const timeoutMs = options.timeoutMs || (0, envars_1.getEvalTimeoutMs)();
            if (timeoutMs <= 0) {
                // No timeout, process normally
                return processEvalStep(evalStep, index);
            }
            // Create an AbortController to cancel the request if it times out
            const abortController = new AbortController();
            const { signal } = abortController;
            // Add the abort signal to the evalStep
            const evalStepWithSignal = {
                ...evalStep,
                abortSignal: signal,
            };
            try {
                return await Promise.race([
                    processEvalStep(evalStepWithSignal, index),
                    new Promise((_, reject) => {
                        const timeoutId = setTimeout(() => {
                            // Abort any ongoing requests
                            abortController.abort();
                            // If the provider has a cleanup method, call it
                            if (typeof evalStep.provider.cleanup === 'function') {
                                try {
                                    evalStep.provider.cleanup();
                                }
                                catch (cleanupErr) {
                                    logger_1.default.warn(`Error during provider cleanup: ${cleanupErr}`);
                                }
                            }
                            reject(new Error(`Evaluation timed out after ${timeoutMs}ms`));
                            // Clear the timeout to prevent memory leaks
                            clearTimeout(timeoutId);
                        }, timeoutMs);
                    }),
                ]);
            }
            catch (error) {
                // Create and add an error result for timeout
                const timeoutResult = {
                    provider: {
                        id: evalStep.provider.id(),
                        label: evalStep.provider.label,
                        config: evalStep.provider.config,
                    },
                    prompt: {
                        raw: evalStep.prompt.raw,
                        label: evalStep.prompt.label,
                        config: evalStep.prompt.config,
                    },
                    vars: evalStep.test.vars || {},
                    error: `Evaluation timed out after ${timeoutMs}ms: ${String(error)}`,
                    success: false,
                    failureReason: types_1.ResultFailureReason.ERROR, // Using ERROR for timeouts
                    score: 0,
                    namedScores: {},
                    latencyMs: timeoutMs,
                    promptIdx: evalStep.promptIdx,
                    testIdx: evalStep.testIdx,
                    testCase: evalStep.test,
                    promptId: evalStep.prompt.id || '',
                };
                // Add the timeout result to the evaluation record
                await this.evalRecord.addResult(timeoutResult);
                // Update stats
                this.stats.errors++;
                // Update prompt metrics
                const { promptIdx } = timeoutResult;
                const metrics = prompts[promptIdx].metrics;
                if (metrics) {
                    metrics.testErrorCount += 1;
                    metrics.totalLatencyMs += timeoutMs;
                }
                // Progress callback
                if (options.progressCallback) {
                    options.progressCallback(numComplete, runEvalOptions.length, typeof index === 'number' ? index : 0, evalStep, metrics || {
                        score: 0,
                        testPassCount: 0,
                        testFailCount: 0,
                        testErrorCount: 1,
                        assertPassCount: 0,
                        assertFailCount: 0,
                        totalLatencyMs: timeoutMs,
                        tokenUsage: {
                            total: 0,
                            prompt: 0,
                            completion: 0,
                            cached: 0,
                            numRequests: 0,
                        },
                        namedScores: {},
                        namedScoresCount: {},
                        cost: 0,
                    });
                }
            }
        };
        // Set up main progress bars
        let multibar;
        let multiProgressBars = [];
        const originalProgressCallback = this.options.progressCallback;
        const isWebUI = Boolean(cliState_1.default.webUI);
        this.options.progressCallback = (completed, total, index, evalStep, metrics) => {
            if (originalProgressCallback) {
                originalProgressCallback(completed, total, index, evalStep, metrics);
            }
            if (isWebUI) {
                const provider = evalStep.provider.label || evalStep.provider.id();
                const vars = Object.entries(evalStep.test.vars || {})
                    .map(([k, v]) => `${k}=${v}`)
                    .join(' ')
                    .slice(0, 50)
                    .replace(/\n/g, ' ');
                logger_1.default.info(`[${numComplete}/${total}] Running ${provider} with vars: ${vars}`);
            }
            else if (multibar && evalStep) {
                const numProgressBars = Math.min(concurrency, 20);
                // Calculate which progress bar to use
                const progressBarIndex = index % numProgressBars;
                const progressbar = multiProgressBars[progressBarIndex];
                // Calculate how many threads are assigned to this progress bar
                const threadsForThisBar = calculateThreadsPerBar(concurrency, numProgressBars, progressBarIndex);
                progressbar.increment({
                    provider: evalStep.provider.label || evalStep.provider.id(),
                    prompt: evalStep.prompt.raw.slice(0, 10).replace(/\n/g, ' '),
                    vars: Object.entries(evalStep.test.vars || {})
                        .map(([k, v]) => `${k}=${v}`)
                        .join(' ')
                        .slice(0, 10)
                        .replace(/\n/g, ' '),
                    activeThreads: threadsForThisBar,
                });
            }
            else {
                logger_1.default.debug(`Eval #${index + 1} complete (${numComplete} of ${runEvalOptions.length})`);
            }
        };
        const createMultiBars = async (evalOptions) => {
            // Only create progress bars if not in web UI mode
            if (isWebUI) {
                return;
            }
            const numProgressBars = Math.min(concurrency, 20);
            const showThreadCounts = concurrency > numProgressBars;
            multibar = new cli_progress_1.default.MultiBar({
                format: showThreadCounts
                    ? 'Group {groupId} [{bar}] {percentage}% | {value}/{total} | {activeThreads}/{maxThreads} threads | {provider} "{prompt}" {vars}'
                    : 'Group {groupId} [{bar}] {percentage}% | {value}/{total} | {provider} "{prompt}" {vars}',
                hideCursor: true,
            }, cli_progress_1.default.Presets.shades_classic);
            if (!multibar) {
                return;
            }
            const stepsPerProgressBar = Math.floor(evalOptions.length / numProgressBars);
            const remainingSteps = evalOptions.length % numProgressBars;
            multiProgressBars = [];
            for (let i = 0; i < numProgressBars; i++) {
                const totalSteps = i < remainingSteps ? stepsPerProgressBar + 1 : stepsPerProgressBar;
                if (totalSteps > 0) {
                    // Calculate how many threads are assigned to this progress bar
                    const threadsForThisBar = calculateThreadsPerBar(concurrency, numProgressBars, i);
                    const progressbar = multibar.create(totalSteps, 0, {
                        groupId: `${i + 1}/${numProgressBars}`,
                        provider: '',
                        prompt: '',
                        vars: '',
                        activeThreads: 0,
                        maxThreads: threadsForThisBar,
                    });
                    multiProgressBars.push(progressbar);
                }
            }
        };
        // Run the evals
        if (this.options.showProgressBar) {
            await createMultiBars(runEvalOptions);
        }
        // Separate serial and concurrent eval options
        const serialRunEvalOptions = [];
        const concurrentRunEvalOptions = [];
        for (const evalOption of runEvalOptions) {
            if (evalOption.test.options?.runSerially) {
                serialRunEvalOptions.push(evalOption);
            }
            else {
                concurrentRunEvalOptions.push(evalOption);
            }
        }
        if (serialRunEvalOptions.length > 0) {
            // Run serial evaluations first
            logger_1.default.info(`Running ${serialRunEvalOptions.length} serial evaluations...`);
            for (const evalStep of serialRunEvalOptions) {
                if (isWebUI) {
                    const provider = evalStep.provider.label || evalStep.provider.id();
                    const vars = Object.entries(evalStep.test.vars || {})
                        .map(([k, v]) => `${k}=${v}`)
                        .join(' ')
                        .slice(0, 50)
                        .replace(/\n/g, ' ');
                    logger_1.default.info(`[${numComplete}/${serialRunEvalOptions.length}] Running ${provider} with vars: ${vars}`);
                }
                await processEvalStepWithTimeout(evalStep, serialRunEvalOptions.indexOf(evalStep));
            }
        }
        // Then run concurrent evaluations
        logger_1.default.info(`Running ${concurrentRunEvalOptions.length} concurrent evaluations with up to ${concurrency} threads...`);
        await async_1.default.forEachOfLimit(concurrentRunEvalOptions, concurrency, async (evalStep, index) => {
            checkAbort();
            await processEvalStepWithTimeout(evalStep, index);
        });
        // Do we have to run comparisons between row outputs?
        const compareRowsCount = rowsWithSelectBestAssertion.size;
        let progressBar;
        if (compareRowsCount > 0 && multibar && !isWebUI) {
            progressBar = multibar.create(compareRowsCount, 0, {
                provider: 'Running model-graded comparisons',
                prompt: '',
                vars: '',
            });
        }
        let compareCount = 0;
        for (const testIdx of rowsWithSelectBestAssertion) {
            compareCount++;
            if (isWebUI) {
                logger_1.default.info(`Running model-graded comparison ${compareCount} of ${compareRowsCount}...`);
            }
            const resultsToCompare = this.evalRecord.persisted
                ? await this.evalRecord.fetchResultsByTestIdx(testIdx)
                : this.evalRecord.results.filter((r) => r.testIdx === testIdx);
            if (resultsToCompare.length === 0) {
                logger_1.default.warn(`Expected results to be found for test index ${testIdx}`);
                continue;
            }
            const compareAssertion = resultsToCompare[0].testCase.assert?.find((a) => a.type === 'select-best');
            if (compareAssertion) {
                const outputs = resultsToCompare.map((r) => r.response?.output || '');
                const gradingResults = await (0, assertions_1.runCompareAssertion)(resultsToCompare[0].testCase, compareAssertion, outputs);
                for (let index = 0; index < resultsToCompare.length; index++) {
                    const result = resultsToCompare[index];
                    const gradingResult = gradingResults[index];
                    if (result.gradingResult) {
                        result.gradingResult.tokensUsed = result.gradingResult.tokensUsed || {
                            total: 0,
                            prompt: 0,
                            completion: 0,
                        };
                        // Use the helper function instead of direct updates
                        if (gradingResult.tokensUsed) {
                            if (!result.gradingResult.tokensUsed) {
                                result.gradingResult.tokensUsed = {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                };
                            }
                            // Update the metrics using the helper function
                            updateAssertionMetrics({ tokenUsage: { assertions: result.gradingResult.tokensUsed } }, gradingResult.tokensUsed);
                            // Also update the metrics for the eval
                            if (gradingResult.tokensUsed && result.testCase?.assert) {
                                for (const assertion of result.testCase.assert) {
                                    if (assertions_1.MODEL_GRADED_ASSERTION_TYPES.has(assertion.type)) {
                                        updateAssertionMetrics({ tokenUsage: this.stats.tokenUsage }, gradingResult.tokensUsed);
                                        break;
                                    }
                                }
                            }
                        }
                        result.success = result.gradingResult.pass =
                            result.gradingResult.pass && gradingResult.pass;
                        if (!gradingResult.pass) {
                            // Failure overrides the reason and the score
                            result.gradingResult.reason = gradingResult.reason;
                            result.score = result.gradingResult.score = gradingResult.score;
                        }
                        if (!result.gradingResult.componentResults) {
                            result.gradingResult.componentResults = [];
                        }
                        result.gradingResult.componentResults.push(gradingResult);
                    }
                    else {
                        result.gradingResult = gradingResult;
                    }
                    if (this.evalRecord.persisted) {
                        await result.save();
                    }
                }
                if (progressBar) {
                    progressBar.increment({
                        prompt: resultsToCompare[0].prompt.raw.slice(0, 10).replace(/\n/g, ''),
                    });
                }
                else if (!isWebUI) {
                    logger_1.default.debug(`Model-graded comparison #${compareCount} of ${compareRowsCount} complete`);
                }
            }
        }
        await this.evalRecord.addPrompts(prompts);
        // Finish up
        if (multibar) {
            multibar.stop();
        }
        if (progressBar) {
            progressBar.stop();
        }
        this.evalRecord.setVars(vars);
        await (0, evaluatorHelpers_1.runExtensionHook)(testSuite.extensions, 'afterAll', {
            prompts: this.evalRecord.prompts,
            results: this.evalRecord.results,
            suite: testSuite,
        });
        telemetry_1.default.record('eval_ran', {
            numPrompts: prompts.length,
            numTests: prompts.reduce((acc, p) => acc +
                (p.metrics?.testPassCount || 0) +
                (p.metrics?.testFailCount || 0) +
                (p.metrics?.testErrorCount || 0), 0),
            numVars: varNames.size,
            numProviders: testSuite.providers.length,
            numRepeat: options.repeat || 1,
            providerPrefixes: Array.from(new Set(testSuite.providers.map((p) => {
                const idParts = p.id().split(':');
                return idParts.length > 1 ? idParts[0] : 'unknown';
            }))).sort(),
            assertionTypes: Array.from(assertionTypes).sort(),
            eventSource: options.eventSource || 'default',
            ci: (0, envars_1.isCI)(),
            hasAnyPass: this.evalRecord.prompts.some((p) => p.metrics?.testPassCount && p.metrics.testPassCount > 0),
            // FIXME(ian): Does this work?  I think redteam is only on the config, not testSuite.
            // isRedteam: Boolean(testSuite.redteam),
        });
        // Update database signal file after all results are written
        (0, signal_1.updateSignalFile)();
        return this.evalRecord;
    }
}
function evaluate(testSuite, evalRecord, options) {
    const ev = new Evaluator(testSuite, evalRecord, options);
    return ev.evaluate();
}
//# sourceMappingURL=evaluator.js.map