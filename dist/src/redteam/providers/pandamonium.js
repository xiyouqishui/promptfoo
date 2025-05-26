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
exports.isPandamoniumProvider = void 0;
const async_1 = __importDefault(require("async"));
const zod_1 = require("zod");
const fetch_1 = require("../../fetch");
const accounts_1 = require("../../globalConfig/accounts");
const cloud_1 = require("../../globalConfig/cloud");
const logger_1 = __importDefault(require("../../logger"));
const invariant_1 = __importDefault(require("../../util/invariant"));
const remoteGeneration_1 = require("../remoteGeneration");
/**
 * Type guard for RedteamPandamoniumProvider
 * Checks if a provider is a RedteamPandamoniumProvider by verifying it has the runPandamonium method
 */
const isPandamoniumProvider = (provider) => {
    return (typeof provider === 'object' &&
        provider !== null &&
        'runPandamonium' in provider &&
        typeof provider['runPandamonium'] === 'function');
};
exports.isPandamoniumProvider = isPandamoniumProvider;
const CURRENT_VERSION = 1;
const TIMEOUT = 120000;
const StartResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    iteration: zod_1.z.number(),
    pendingPlugins: zod_1.z.array(zod_1.z.string()),
    version: zod_1.z.number(),
});
const PandamoniumTestSchema = zod_1.z.object({
    pluginId: zod_1.z.string(),
    prompt: zod_1.z.string(),
    program: zod_1.z.string(),
    testIdx: zod_1.z.number(),
});
/**
 * Response schema for /next and /success.
 * Returns testCases (which may be empty), run id, current iteration, and pending plugins.
 */
const NextResponseSchema = zod_1.z.object({
    testCases: zod_1.z.array(PandamoniumTestSchema).optional().default([]),
    id: zod_1.z.string(),
    iteration: zod_1.z.number(),
    pendingPlugins: zod_1.z.array(zod_1.z.string()),
});
class RedteamPandamoniumProvider {
    log(message, level) {
        logger_1.default[level](`[panda] ${this.currentTurn ? `[Iteration ${this.currentTurn}]` : ''} - ${message}`);
    }
    id() {
        return 'promptfoo:redteam:pandamonium';
    }
    constructor(options = {}) {
        if ((0, remoteGeneration_1.neverGenerateRemote)()) {
            throw new Error(`Remote generation is disabled. Pandamonium requires remote generation.`);
        }
        this.stateful = options.stateful ?? false;
        this.currentTurn = 0;
        this.baseUrl = cloud_1.cloudConfig.getApiHost() + '/api/pandamonium';
        this.currentTestIdx = 0;
        this.log(`Constructor options: ${JSON.stringify({
            injectVar: options.injectVar,
            maxTurns: options.maxTurns,
            stateful: options.stateful,
        })}`, 'debug');
        (0, invariant_1.default)(typeof options.injectVar === 'string', 'Expected injectVar to be set');
        this.injectVar = options.injectVar;
        this.maxTurns = options.maxTurns || 500;
    }
    async callApi(prompt, context) {
        throw new Error('Pandamonium is not a real provider. Call runPandamonium instead.');
    }
    /**
     * Bootstraps the pandamonium run:
     * 1. Prepares the test cases payload.
     * 2. Starts the run by calling the /start API.
     * 3. Iteratively gets new test cases, evaluates them via the target provider,
     *    and (if a jailbreak is found) reports the success.
     */
    async runPandamonium(targetProvider, test, allTests, concurrency = 4) {
        const results = [];
        this.currentTestIdx = Math.max(...allTests.map((t) => t.testIdx));
        this.log(`Starting pandamonium run, hold on tight`, 'info');
        // Create payload for the /start request.
        const testCasesPayload = this.prepareTestCases(allTests);
        try {
            // Start the run
            const startData = await this.startRun(testCasesPayload);
            if (startData.version !== CURRENT_VERSION) {
                throw new Error(`Your client is out of date. Please update to the latest version.`);
            }
            const runId = startData.id;
            // Main iteration loop
            for (let turn = 0; turn < this.maxTurns; turn++) {
                this.currentTurn = turn;
                this.log(`Starting iteration ${turn}`, 'debug');
                const nextData = await this.fetchNextIteration(runId);
                if (!nextData.testCases || nextData.testCases.length === 0) {
                    this.log(`No more test cases received from the server, we're done!`, 'info');
                    break;
                }
                this.log(`Got ${nextData.testCases.length} new probes. ${nextData.pendingPlugins.length} Plugins still to jailbreak: ${nextData.pendingPlugins.join(', ')}`, 'info');
                // Evaluate all test cases
                const evalResults = await this.evaluateTestCases(nextData.testCases, targetProvider, allTests, concurrency);
                if (!evalResults || evalResults.length === 0) {
                    this.log(`No results from target provider, continuing`, 'info');
                    continue;
                }
                this.log(`Results from target: ${evalResults.length}`, 'debug');
                results.push(...evalResults.map((r) => r.result));
                // Check for a successful jailbreak
                const successfulResult = evalResults.find((r) => !r.result.success);
                if (successfulResult) {
                    this.log(`We got a successful jailbreak after ${results.length} probes with program: ${successfulResult.program} - prompt: ${successfulResult.result.prompt.raw}`, 'debug');
                    // Report success
                    await this.reportSuccess(runId, successfulResult);
                }
            }
            this.log(`Pandamonium run complete. ${results.length} probes were sent.`, 'info');
            return results;
        }
        catch (err) {
            this.log(`Error during pandamonium run: ${err}`, 'error');
        }
        this.log(`Epic Panda fail, no jailbreak found after ${results.length} probes. :(`, 'info');
        return results;
    }
    /**
     * Extracts tests which are not part of another strategy and groups them by plugin.
     */
    prepareTestCases(allTests) {
        return allTests.reduce((acc, t) => {
            if (t.test.metadata?.strategyId) {
                return acc;
            }
            const pluginId = t.test.metadata?.pluginId;
            (0, invariant_1.default)(t.test.vars, 'Expected test vars to be set');
            const injectVarName = Object.keys(t.test.vars).find((key) => key !== 'harmCateogry');
            if (!injectVarName) {
                this.log(`No injectVar found for test ${JSON.stringify(t.test)}`, 'error');
                return acc;
            }
            const prompt = t.test.vars[injectVarName];
            const existing = acc.find((item) => item.pluginId === pluginId);
            if (existing) {
                existing.prompts.push({ prompt, testIdx: t.testIdx });
            }
            else {
                acc.push({ pluginId, prompts: [{ prompt, testIdx: t.testIdx }] });
            }
            return acc;
        }, []);
    }
    /**
     * Calls the /start endpoint to kick off the pandamonium run.
     */
    async startRun(testCases) {
        const response = await (0, fetch_1.fetchWithRetries)(`${this.baseUrl}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                testCases,
                email: (0, accounts_1.getUserEmail)(),
            }),
        }, TIMEOUT);
        const data = await response.json();
        return StartResponseSchema.parse(data);
    }
    /**
     * Fetches iteration data by calling the /next endpoint.
     */
    async fetchNextIteration(runId) {
        const response = await (0, fetch_1.fetchWithRetries)(`${this.baseUrl}/next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: runId,
                email: (0, accounts_1.getUserEmail)(),
            }),
        }, TIMEOUT);
        const data = await response.json();
        return NextResponseSchema.parse(data);
    }
    /**
     * Evaluates multiple test cases using the target provider with limited concurrency.
     */
    async evaluateTestCases(tests, targetProvider, allTests, concurrency) {
        const results = [];
        let promptCounter = 0;
        await async_1.default.forEachOfLimit(tests, concurrency, async (test, _index) => {
            promptCounter++;
            this.log(`Sending prompt ${promptCounter}/${tests.length} to target provider`, 'debug');
            const evaluation = await this.evaluateSingleTest(test, targetProvider, allTests);
            if (evaluation) {
                results.push(evaluation);
            }
        });
        return results;
    }
    /**
     * Evaluates a single test case by:
     *   - Finding the originating test in the full list.
     *   - Building a deep-copied test with updated vars and metadata.
     *   - Using runEval (imported on demand) to execute the test.
     */
    async evaluateSingleTest(test, targetProvider, allTests) {
        const originalTest = allTests.find((t) => t.testIdx === test.testIdx);
        if (!originalTest) {
            this.log(`Original test not found for testIdx ${test.testIdx}`, 'error');
            return null;
        }
        const vars = { ...originalTest.test.vars, prompt: test.prompt };
        // Deep copy the test to avoid mutating the original test and prevent circular references.
        const testForEval = JSON.parse(JSON.stringify(originalTest.test));
        testForEval.provider = undefined;
        if (Array.isArray(testForEval.assert)) {
            testForEval.assert = testForEval.assert.map((a) => ({
                ...a,
                metric: `${a.metric}/Pandamonium`,
            }));
        }
        testForEval.metadata = {
            ...testForEval.metadata,
            strategyId: 'pandamonium',
        };
        try {
            const { runEval } = await Promise.resolve().then(() => __importStar(require('../../evaluator')));
            const evalResults = await runEval({
                provider: targetProvider,
                prompt: { raw: test.prompt, label: test.prompt },
                delay: 0,
                test: { ...testForEval, vars },
                testIdx: this.currentTestIdx++,
                promptIdx: 0,
                repeatIndex: 0,
                isRedteam: true,
            });
            const result = evalResults[0];
            return { result, program: test.program, pluginId: test.pluginId };
        }
        catch (error) {
            this.log(`Error evaluating test ${JSON.stringify(test)}: ${error}`, 'info');
            return null;
        }
    }
    /**
     * Reports a successful jailbreak by calling the /success endpoint.
     */
    async reportSuccess(runId, successfulResult) {
        await (0, fetch_1.fetchWithRetries)(`${this.baseUrl}/success`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: runId,
                pluginId: successfulResult.pluginId,
                h4rm3lProgram: successfulResult.program,
                email: (0, accounts_1.getUserEmail)(),
            }),
        }, TIMEOUT);
    }
}
exports.default = RedteamPandamoniumProvider;
//# sourceMappingURL=pandamonium.js.map