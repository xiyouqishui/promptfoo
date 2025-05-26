"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptfooSimulatedUserProvider = exports.PromptfooChatCompletionProvider = exports.PromptfooHarmfulCompletionProvider = void 0;
const cache_1 = require("../cache");
const constants_1 = require("../constants");
const fetch_1 = require("../fetch");
const accounts_1 = require("../globalConfig/accounts");
const logger_1 = __importDefault(require("../logger"));
const remoteGeneration_1 = require("../redteam/remoteGeneration");
const shared_1 = require("./shared");
class PromptfooHarmfulCompletionProvider {
    constructor(options) {
        this.harmCategory = options.harmCategory;
        this.n = options.n;
        this.purpose = options.purpose;
    }
    id() {
        return `promptfoo:redteam:${this.harmCategory}`;
    }
    toString() {
        return `[Promptfoo Harmful Completion Provider ${this.purpose} - ${this.harmCategory}]`;
    }
    async callApi(prompt, context, callApiOptions) {
        const body = {
            email: (0, accounts_1.getUserEmail)(),
            harmCategory: this.harmCategory,
            n: this.n,
            purpose: this.purpose,
            version: constants_1.VERSION,
        };
        try {
            logger_1.default.debug(`[HarmfulCompletionProvider] Calling generate harmful API (${(0, remoteGeneration_1.getRemoteGenerationUrlForUnaligned)()}) with body: ${JSON.stringify(body)}`);
            // We're using the promptfoo API to avoid having users provide their own unaligned model.
            const response = await (0, fetch_1.fetchWithRetries)((0, remoteGeneration_1.getRemoteGenerationUrlForUnaligned)(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }, 580000, 2);
            if (!response.ok) {
                throw new Error(`API call failed with status ${response.status}: ${await response.text()}`);
            }
            const data = await response.json();
            logger_1.default.debug(`[HarmfulCompletionProvider] API call response: ${JSON.stringify(data)}`);
            const validOutputs = (Array.isArray(data.output) ? data.output : [data.output]).filter((item) => typeof item === 'string' && item.length > 0);
            return {
                output: validOutputs,
            };
        }
        catch (err) {
            logger_1.default.info(`[HarmfulCompletionProvider] ${err}`);
            return {
                error: `[HarmfulCompletionProvider] ${err}`,
            };
        }
    }
}
exports.PromptfooHarmfulCompletionProvider = PromptfooHarmfulCompletionProvider;
class PromptfooChatCompletionProvider {
    constructor(options) {
        this.options = options;
    }
    id() {
        return this.options.id || 'promptfoo:chatcompletion';
    }
    toString() {
        return `[Promptfoo Chat Completion Provider]`;
    }
    async callApi(prompt, context, callApiOptions) {
        const body = {
            jsonOnly: this.options.jsonOnly,
            preferSmallModel: this.options.preferSmallModel,
            prompt,
            step: context?.prompt.label,
            task: this.options.task,
            email: (0, accounts_1.getUserEmail)(),
        };
        try {
            const { data, status, statusText } = await (0, cache_1.fetchWithCache)((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS);
            const { result, tokenUsage } = data;
            if (!result) {
                logger_1.default.error(`Error from promptfoo completion provider. Status: ${status} ${statusText} ${JSON.stringify(data)} `);
                return {
                    error: 'LLM did not return a result, likely refusal',
                };
            }
            return {
                output: result,
                tokenUsage,
            };
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
    }
}
exports.PromptfooChatCompletionProvider = PromptfooChatCompletionProvider;
class PromptfooSimulatedUserProvider {
    constructor(options = {}) {
        this.options = options;
    }
    id() {
        return this.options.id || 'promptfoo:agent';
    }
    toString() {
        return '[Promptfoo Agent Provider]';
    }
    async callApi(prompt, context, callApiOptions) {
        const messages = JSON.parse(prompt);
        const body = {
            task: 'tau',
            instructions: this.options.instructions,
            history: messages,
            email: (0, accounts_1.getUserEmail)(),
            version: constants_1.VERSION,
        };
        logger_1.default.debug(`Calling promptfoo agent API with body: ${JSON.stringify(body)}`);
        try {
            const response = await (0, fetch_1.fetchWithRetries)((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS);
            if (!response.ok) {
                throw new Error(`API call failed with status ${response.status}: ${await response.text()}`);
            }
            const data = (await response.json());
            return {
                output: data.result,
                tokenUsage: data.tokenUsage,
            };
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
    }
}
exports.PromptfooSimulatedUserProvider = PromptfooSimulatedUserProvider;
//# sourceMappingURL=promptfoo.js.map