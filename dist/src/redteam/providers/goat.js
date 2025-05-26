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
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const constants_1 = require("../../constants");
const evaluatorHelpers_1 = require("../../evaluatorHelpers");
const accounts_1 = require("../../globalConfig/accounts");
const logger_1 = __importDefault(require("../../logger"));
const telemetry_1 = __importDefault(require("../../telemetry"));
const invariant_1 = __importDefault(require("../../util/invariant"));
const json_1 = require("../../util/json");
const time_1 = require("../../util/time");
const remoteGeneration_1 = require("../remoteGeneration");
const shared_1 = require("./shared");
class GoatProvider {
    id() {
        return 'promptfoo:redteam:goat';
    }
    constructor(options = {}) {
        if ((0, remoteGeneration_1.neverGenerateRemote)()) {
            throw new Error(`GOAT strategy requires remote grading to be enabled`);
        }
        this.stateful = options.stateful ?? (options.stateless == null ? true : !options.stateless);
        logger_1.default.debug(`[GOAT] Constructor options: ${JSON.stringify({
            injectVar: options.injectVar,
            maxTurns: options.maxTurns,
            stateful: options.stateful,
        })}`);
        if (options.stateless !== undefined) {
            telemetry_1.default.recordOnce('feature_used', {
                feature: 'stateless',
                state: String(options.stateless),
            });
        }
        (0, invariant_1.default)(typeof options.injectVar === 'string', 'Expected injectVar to be set');
        this.injectVar = options.injectVar;
        this.maxTurns = options.maxTurns || 5;
        this.excludeTargetOutputFromAgenticAttackGeneration = Boolean(options.excludeTargetOutputFromAgenticAttackGeneration);
    }
    async callApi(prompt, context, options) {
        let response = undefined;
        logger_1.default.debug(`[GOAT] callApi context: ${(0, json_1.safeJsonStringify)(context)}`);
        (0, invariant_1.default)(context?.originalProvider, 'Expected originalProvider to be set');
        (0, invariant_1.default)(context?.vars, 'Expected vars to be set');
        const targetProvider = context?.originalProvider;
        (0, invariant_1.default)(targetProvider, 'Expected originalProvider to be set');
        const messages = [];
        const totalTokenUsage = {
            total: 0,
            prompt: 0,
            completion: 0,
            numRequests: 0,
            cached: 0,
        };
        let lastTargetResponse = undefined;
        let assertToUse;
        let graderPassed;
        const { getGraderById } = await Promise.resolve().then(() => __importStar(require('../graders')));
        let test;
        if (context?.test) {
            test = context?.test;
            assertToUse = test?.assert?.find((a) => a.type);
        }
        let previousAttackerMessage = '';
        let previousTargetOutput = '';
        for (let turn = 0; turn < this.maxTurns; turn++) {
            try {
                let body;
                let failureReason;
                if (this.excludeTargetOutputFromAgenticAttackGeneration && turn > 0) {
                    body = JSON.stringify({
                        goal: context?.vars[this.injectVar],
                        targetOutput: previousTargetOutput,
                        attackAttempt: previousAttackerMessage,
                        task: 'extract-goat-failure',
                    });
                    logger_1.default.debug(`[GOAT] Sending request to ${(0, remoteGeneration_1.getRemoteGenerationUrl)()}: ${body}`);
                    response = await fetch((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                        body,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        method: 'POST',
                    });
                    const data = (await response.json());
                    if (!data.message) {
                        logger_1.default.info(`[GOAT] Invalid message from GOAT, skipping turn: ${JSON.stringify(data)}`);
                        continue;
                    }
                    failureReason = data.message;
                    logger_1.default.debug(`[GOAT] Previous attack attempt failure reason: ${failureReason}`);
                }
                body = JSON.stringify({
                    goal: context?.vars[this.injectVar],
                    i: turn,
                    messages: this.excludeTargetOutputFromAgenticAttackGeneration
                        ? messages.filter((m) => m.role !== 'assistant')
                        : messages,
                    prompt: context?.prompt?.raw,
                    task: 'goat',
                    version: constants_1.VERSION,
                    email: (0, accounts_1.getUserEmail)(),
                    excludeTargetOutputFromAgenticAttackGeneration: this.excludeTargetOutputFromAgenticAttackGeneration,
                    failureReason,
                });
                logger_1.default.debug(`[GOAT] Sending request to ${(0, remoteGeneration_1.getRemoteGenerationUrl)()}: ${body}`);
                response = await fetch((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                    body,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                });
                const data = await response.json();
                if (typeof data?.message !== 'object' || !data.message?.content || !data.message?.role) {
                    logger_1.default.info(`[GOAT] Invalid message from GOAT, skipping turn: ${JSON.stringify(data)}`);
                    continue;
                }
                const attackerMessage = data.message;
                previousAttackerMessage = attackerMessage?.content;
                const targetVars = {
                    ...context.vars,
                    [this.injectVar]: attackerMessage.content,
                };
                const renderedAttackerPrompt = await (0, evaluatorHelpers_1.renderPrompt)(context.prompt, targetVars, context.filters, targetProvider);
                messages.push({
                    role: attackerMessage.role,
                    content: renderedAttackerPrompt,
                });
                if (data.tokenUsage) {
                    totalTokenUsage.total += data.tokenUsage.total || 0;
                    totalTokenUsage.prompt += data.tokenUsage.prompt || 0;
                    totalTokenUsage.completion += data.tokenUsage.completion || 0;
                    totalTokenUsage.cached += data.tokenUsage.cached || 0;
                    totalTokenUsage.numRequests += data.tokenUsage.numRequests ?? 1;
                }
                logger_1.default.debug((0, dedent_1.default) `
          ${chalk_1.default.bold.green(`GOAT turn ${turn} history:`)}
          ${chalk_1.default.cyan(JSON.stringify(messages, null, 2))}
        `);
                const targetPrompt = this.stateful
                    ? messages[messages.length - 1].content
                    : JSON.stringify(messages);
                logger_1.default.debug(`GOAT turn ${turn} target prompt: ${renderedAttackerPrompt}`);
                const targetResponse = await targetProvider.callApi(targetPrompt, context, options);
                if (!targetResponse.cached && targetProvider.delay && targetProvider.delay > 0) {
                    logger_1.default.debug(`Sleeping for ${targetProvider.delay}ms`);
                    await (0, time_1.sleep)(targetProvider.delay);
                }
                logger_1.default.debug(`GOAT turn ${turn} target response: ${(0, json_1.safeJsonStringify)(targetResponse)}`);
                if (targetResponse.sessionId) {
                    context = context ?? { vars: {}, prompt: { raw: '', label: 'target' } };
                    context.vars.sessionId = targetResponse.sessionId;
                }
                if (targetResponse.error) {
                    throw new Error(`[GOAT] Target returned an error: ${targetResponse.error}`);
                }
                (0, invariant_1.default)(targetResponse.output, `[GOAT] Expected target response output to be set, but got: ${(0, json_1.safeJsonStringify)(targetResponse)}`);
                const stringifiedOutput = typeof targetResponse.output === 'string'
                    ? targetResponse.output
                    : (0, json_1.safeJsonStringify)(targetResponse.output);
                if (!stringifiedOutput) {
                    logger_1.default.debug(`[GOAT] Target response output is not a string or JSON: ${(0, json_1.safeJsonStringify)(targetResponse)}`);
                    continue;
                }
                previousTargetOutput = stringifiedOutput;
                messages.push({
                    role: 'assistant',
                    content: stringifiedOutput,
                });
                if (targetResponse.tokenUsage) {
                    totalTokenUsage.total += targetResponse.tokenUsage.total || 0;
                    totalTokenUsage.prompt += targetResponse.tokenUsage.prompt || 0;
                    totalTokenUsage.completion += targetResponse.tokenUsage.completion || 0;
                    totalTokenUsage.numRequests += targetResponse.tokenUsage.numRequests ?? 1;
                    totalTokenUsage.cached += targetResponse.tokenUsage.cached || 0;
                }
                else {
                    totalTokenUsage.numRequests += 1;
                }
                lastTargetResponse = targetResponse;
                const grader = assertToUse ? getGraderById(assertToUse.type) : undefined;
                if (test && grader) {
                    const { grade } = await grader.getResult(attackerMessage.content, stringifiedOutput, test, targetProvider, assertToUse && 'value' in assertToUse ? assertToUse.value : undefined);
                    graderPassed = grade.pass;
                    if (grade.tokensUsed) {
                        totalTokenUsage.total += grade.tokensUsed.total || 0;
                        totalTokenUsage.prompt += grade.tokensUsed.prompt || 0;
                        totalTokenUsage.completion += grade.tokensUsed.completion || 0;
                        totalTokenUsage.cached += grade.tokensUsed.cached || 0;
                    }
                    else {
                        totalTokenUsage.numRequests = (totalTokenUsage.numRequests || 0) + 1;
                    }
                }
                if (graderPassed === false) {
                    break;
                }
            }
            catch (err) {
                logger_1.default.error(`Error in GOAT turn ${turn}: ${err}`);
            }
        }
        delete context?.vars?.sessionId;
        return {
            output: (0, shared_1.getLastMessageContent)(messages, 'assistant') || '',
            metadata: {
                redteamFinalPrompt: (0, shared_1.getLastMessageContent)(messages, 'user') || '',
                messages: messages,
                stopReason: graderPassed === false ? 'Grader failed' : 'Max turns reached',
                redteamHistory: (0, shared_1.messagesToRedteamHistory)(messages),
            },
            tokenUsage: totalTokenUsage,
            guardrails: lastTargetResponse?.guardrails,
        };
    }
}
exports.default = GoatProvider;
//# sourceMappingURL=goat.js.map