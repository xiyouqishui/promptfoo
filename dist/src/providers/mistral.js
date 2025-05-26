"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralEmbeddingProvider = exports.MistralChatCompletionProvider = void 0;
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const shared_1 = require("./shared");
const MISTRAL_CHAT_MODELS = [
    ...['open-mistral-7b', 'mistral-tiny', 'mistral-tiny-2312'].map((id) => ({
        id,
        cost: {
            input: 0.25 / 1000000,
            output: 0.25 / 1000000,
        },
    })),
    ...[
        'open-mistral-nemo',
        'open-mistral-nemo-2407',
        'mistral-tiny-2407',
        'mistral-tiny-latest',
    ].map((id) => ({
        id,
        cost: {
            input: 0.3 / 1000000,
            output: 0.3 / 1000000,
        },
    })),
    ...['mistral-small-2402', 'mistral-small-latest'].map((id) => ({
        id,
        cost: {
            input: 1 / 1000000,
            output: 3 / 1000000,
        },
    })),
    ...['mistral-medium-2312', 'mistral-medium', 'mistral-medium-latest'].map((id) => ({
        id,
        cost: {
            input: 2.7 / 1000000,
            output: 8.1 / 1000000,
        },
    })),
    {
        id: 'mistral-large-2402',
        cost: {
            input: 4 / 1000000,
            output: 12 / 1000000,
        },
    },
    ...['mistral-large-2407', 'mistral-large-latest'].map((id) => ({
        id,
        cost: {
            input: 3 / 1000000,
            output: 9 / 1000000,
        },
    })),
    ...['codestral-2405', 'codestral-latest'].map((id) => ({
        id,
        cost: {
            input: 1 / 1000000,
            output: 3 / 1000000,
        },
    })),
    ...['codestral-mamba-2407', 'open-codestral-mamba', 'codestral-mamba-latest'].map((id) => ({
        id,
        cost: {
            input: 0.25 / 1000000,
            output: 0.25 / 1000000,
        },
    })),
    ...['open-mixtral-8x7b', 'mistral-small', 'mistral-small-2312'].map((id) => ({
        id,
        cost: {
            input: 0.7 / 1000000,
            output: 0.7 / 1000000,
        },
    })),
    ...['open-mixtral-8x22b', 'open-mixtral-8x22b-2404'].map((id) => ({
        id,
        cost: {
            input: 2 / 1000000,
            output: 6 / 1000000,
        },
    })),
];
const MISTRAL_EMBEDDING_MODELS = [
    {
        id: 'mistral-embed',
        cost: {
            input: 0.1 / 1000000,
            output: 0.1 / 1000000,
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
function calculateMistralCost(modelName, config, promptTokens, completionTokens) {
    return (0, shared_1.calculateCost)(modelName, config, promptTokens, completionTokens, [
        ...MISTRAL_CHAT_MODELS,
        ...MISTRAL_EMBEDDING_MODELS,
    ]);
}
class MistralChatCompletionProvider {
    constructor(modelName, options = {}) {
        if (!MistralChatCompletionProvider.MISTRAL_CHAT_MODELS_NAMES.includes(modelName)) {
            logger_1.default.warn(`Using unknown Mistral chat model: ${modelName}`);
        }
        const { id, config, env } = options;
        this.env = env;
        this.modelName = modelName;
        this.id = id ? () => id : this.id;
        this.config = config || {};
    }
    id() {
        return `mistral:${this.modelName}`;
    }
    toString() {
        return `[Mistral Provider ${this.modelName}]`;
    }
    getApiUrlDefault() {
        return 'https://api.mistral.ai/v1';
    }
    getApiUrl() {
        const apiHost = this.config.apiHost || this.env?.MISTRAL_API_HOST || (0, envars_1.getEnvString)('MISTRAL_API_HOST');
        if (apiHost) {
            return `https://${apiHost}/v1`;
        }
        return (this.config.apiBaseUrl ||
            this.env?.MISTRAL_API_BASE_URL ||
            (0, envars_1.getEnvString)('MISTRAL_API_BASE_URL') ||
            this.getApiUrlDefault());
    }
    getApiKey() {
        logger_1.default.debug(`Mistral apiKeyenvar: ${this.config.apiKeyEnvar}`);
        const apiKeyCandidate = this.config?.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.MISTRAL_API_KEY ||
            (0, envars_1.getEnvString)('MISTRAL_API_KEY');
        return apiKeyCandidate;
    }
    async callApi(prompt) {
        if (!this.getApiKey()) {
            throw new Error('Mistral API key is not set. Set the MISTRAL_API_KEY environment variable or add `apiKey` or `apiKeyEnvar` to the provider config.');
        }
        const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
        const params = {
            model: this.modelName,
            messages,
            temperature: this.config?.temperature,
            top_p: this.config?.top_p || 1,
            max_tokens: this.config?.max_tokens || 1024,
            safe_prompt: this.config?.safe_prompt || false,
            random_seed: this.config?.random_seed || null,
            ...(this.config.response_format ? { response_format: this.config.response_format } : {}),
        };
        const cacheKey = `mistral:${JSON.stringify(params)}`;
        if ((0, cache_1.isCacheEnabled)()) {
            const cache = (0, cache_1.getCache)();
            if (cache) {
                const cachedResult = await cache.get(cacheKey);
                if (cachedResult) {
                    logger_1.default.debug(`Returning cached response for ${prompt}: ${JSON.stringify(cachedResult)}`);
                    return {
                        ...cachedResult,
                        tokenUsage: {
                            ...cachedResult.tokenUsage,
                            cached: cachedResult.tokenUsage?.total,
                        },
                    };
                }
            }
        }
        const url = `${this.getApiUrl()}/chat/completions`;
        logger_1.default.debug(`Mistral API request: ${url} ${JSON.stringify(params)}`);
        let data, cached = false;
        try {
            ({ data, cached } = (await (0, cache_1.fetchWithCache)(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getApiKey()}`,
                },
                body: JSON.stringify(params),
            }, shared_1.REQUEST_TIMEOUT_MS)));
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`Mistral API response: ${JSON.stringify(data)}`);
        if (data.error) {
            return {
                error: `API call error: ${data.error}`,
            };
        }
        if (!data.choices || !data.choices[0] || !data.choices[0].message.content) {
            return {
                error: `Malformed response data: ${JSON.stringify(data)}`,
            };
        }
        const result = {
            output: data.choices[0].message.content,
            tokenUsage: getTokenUsage(data, cached),
            cached,
            cost: calculateMistralCost(this.modelName, this.config, data.usage?.prompt_tokens, data.usage?.completion_tokens),
        };
        if ((0, cache_1.isCacheEnabled)()) {
            try {
                await (0, cache_1.getCache)().set(cacheKey, result);
            }
            catch (err) {
                logger_1.default.error(`Failed to cache response: ${String(err)}`);
            }
        }
        return result;
    }
}
exports.MistralChatCompletionProvider = MistralChatCompletionProvider;
MistralChatCompletionProvider.MISTRAL_CHAT_MODELS = MISTRAL_CHAT_MODELS;
MistralChatCompletionProvider.MISTRAL_CHAT_MODELS_NAMES = MISTRAL_CHAT_MODELS.map((model) => model.id);
class MistralEmbeddingProvider {
    constructor(options = {}) {
        const { config, env } = options;
        this.modelName = 'mistral-embed';
        this.config = config || {};
        this.env = env;
    }
    id() {
        return `mistral:embedding:${this.modelName}`;
    }
    toString() {
        return `[Mistral Embedding Provider ${this.modelName}]`;
    }
    getApiUrlDefault() {
        return 'https://api.mistral.ai/v1';
    }
    getApiUrl() {
        const apiHost = this.config.apiHost || this.env?.MISTRAL_API_HOST || (0, envars_1.getEnvString)('MISTRAL_API_HOST');
        if (apiHost) {
            return `https://${apiHost}/v1`;
        }
        return (this.config.apiBaseUrl ||
            this.env?.MISTRAL_API_BASE_URL ||
            (0, envars_1.getEnvString)('MISTRAL_API_BASE_URL') ||
            this.getApiUrlDefault());
    }
    getApiKey() {
        logger_1.default.debug(`Mistral apiKeyenvar: ${this.config.apiKeyEnvar}`);
        const apiKeyCandidate = this.config?.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.MISTRAL_API_KEY ||
            (0, envars_1.getEnvString)('MISTRAL_API_KEY');
        return apiKeyCandidate;
    }
    async callApi(text) {
        try {
            const embeddingResponse = await this.callEmbeddingApi(text);
            return {
                output: JSON.stringify(embeddingResponse.embedding),
                tokenUsage: embeddingResponse.tokenUsage,
                cost: embeddingResponse.cost,
            };
        }
        catch (err) {
            return {
                error: `Embedding API call error: ${String(err)}`,
            };
        }
    }
    async callEmbeddingApi(text) {
        if (!this.getApiKey()) {
            throw new Error('Mistral API key must be set for embedding');
        }
        const body = {
            model: this.modelName,
            input: text,
        };
        const url = `${this.getApiUrl()}/embeddings`;
        logger_1.default.debug(`Mistral Embedding API request: ${url} ${JSON.stringify(body)}`);
        let data;
        let cached = false;
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
            logger_1.default.error(`API call error: ${err}`);
            throw err;
        }
        logger_1.default.debug(`Mistral Embedding API response: ${JSON.stringify(data)}`);
        try {
            const embedding = data?.data?.[0]?.embedding;
            if (!embedding) {
                throw new Error('No embedding found in Mistral Embedding API response');
            }
            const tokenUsage = getTokenUsage(data, cached);
            const promptTokens = tokenUsage.prompt || 0;
            const completionTokens = 0; // Embeddings don't have completion tokens
            return {
                embedding,
                tokenUsage: {
                    ...tokenUsage,
                    completion: completionTokens,
                },
                cost: calculateMistralCost(this.modelName, this.config, promptTokens, completionTokens),
            };
        }
        catch (err) {
            logger_1.default.error(data.error?.message || 'Unknown error');
            throw err;
        }
    }
}
exports.MistralEmbeddingProvider = MistralEmbeddingProvider;
//# sourceMappingURL=mistral.js.map