"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI21ChatCompletionProvider = void 0;
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const shared_1 = require("./shared");
const AI21_CHAT_MODELS = [
    {
        id: 'jamba-1.5-mini',
        cost: {
            input: 0.2 / 1000000,
            output: 0.4 / 1000000,
        },
    },
    {
        id: 'jamba-1.5-large',
        cost: {
            input: 2 / 1000000,
            output: 8 / 1000000,
        },
    },
];
function getTokenUsage(data, cached) {
    if (data.usage) {
        if (cached) {
            return { cached: data.usage.total_tokens, total: data.usage.total_tokens };
        }
        else {
            return {
                total: data.usage.total_tokens,
                prompt: data.usage.prompt_tokens || 0,
                completion: data.usage.completion_tokens || 0,
            };
        }
    }
    return {};
}
function calculateAI21Cost(modelName, config, promptTokens, completionTokens) {
    return (0, shared_1.calculateCost)(modelName, config, promptTokens, completionTokens, AI21_CHAT_MODELS);
}
class AI21ChatCompletionProvider {
    constructor(modelName, options = {}) {
        if (!AI21ChatCompletionProvider.AI21_CHAT_MODELS_NAMES.includes(modelName)) {
            logger_1.default.warn(`Using unknown AI21 chat model: ${modelName}`);
        }
        const { id, config, env } = options;
        this.env = env;
        this.modelName = modelName;
        this.id = id ? () => id : this.id;
        this.config = config || {};
    }
    id() {
        return `ai21:${this.modelName}`;
    }
    toString() {
        return `[AI21 Provider ${this.modelName}]`;
    }
    getApiUrlDefault() {
        return 'https://api.ai21.com/studio/v1';
    }
    getApiUrl() {
        return (this.config.apiBaseUrl ||
            this.env?.AI21_API_BASE_URL ||
            (0, envars_1.getEnvString)('AI21_API_BASE_URL') ||
            this.getApiUrlDefault());
    }
    getApiKey() {
        logger_1.default.debug(`AI21 apiKeyenvar: ${this.config.apiKeyEnvar}`);
        return (this.config.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.AI21_API_KEY ||
            (0, envars_1.getEnvString)('AI21_API_KEY'));
    }
    async callApi(prompt) {
        if (!this.getApiKey()) {
            throw new Error('AI21 API key is not set. Set the AI21_API_KEY environment variable or add `apiKey` or `apiKeyEnvar` to the provider config.');
        }
        const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
        const body = {
            model: this.modelName,
            messages,
            temperature: this.config?.temperature ?? 0.1,
            top_p: this.config?.top_p || 1,
            max_tokens: this.config?.max_tokens || 1024,
            n: 1,
            stop: [],
            response_format: this.config.response_format || { type: 'text' },
        };
        const url = `${this.getApiUrl()}/chat/completions`;
        logger_1.default.debug(`AI21 API request: ${url} ${JSON.stringify(body)}`);
        let data, cached = false;
        try {
            ({ data, cached } = (await (0, cache_1.fetchWithCache)(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getApiKey()}`,
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS)));
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`AI21 API response: ${JSON.stringify(data)}`);
        if (data.error) {
            return {
                error: `API call error: ${data.error}`,
            };
        }
        // Ensure the expected shape of the API response to avoid accessing
        // properties of undefined
        if (!data.choices?.[0] || !data.choices[0].message?.content) {
            return {
                error: `Malformed response data: ${JSON.stringify(data)}`,
            };
        }
        return {
            output: data.choices[0].message.content,
            tokenUsage: getTokenUsage(data, cached),
            cached,
            cost: calculateAI21Cost(this.modelName, this.config, data.usage?.prompt_tokens, data.usage?.completion_tokens),
        };
    }
}
exports.AI21ChatCompletionProvider = AI21ChatCompletionProvider;
AI21ChatCompletionProvider.AI21_CHAT_MODELS = AI21_CHAT_MODELS;
AI21ChatCompletionProvider.AI21_CHAT_MODELS_NAMES = AI21_CHAT_MODELS.map((model) => model.id);
//# sourceMappingURL=ai21.js.map