"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereEmbeddingProvider = exports.CohereChatCompletionProvider = void 0;
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const shared_1 = require("./shared");
class CohereChatCompletionProvider {
    constructor(modelName, options = {}) {
        const { config, id, env } = options;
        this.apiKey = config?.apiKey || env?.COHERE_API_KEY || (0, envars_1.getEnvString)('COHERE_API_KEY') || '';
        this.modelName = modelName;
        if (!CohereChatCompletionProvider.COHERE_CHAT_MODELS.includes(this.modelName)) {
            logger_1.default.warn(`Using unknown Cohere chat model: ${this.modelName}`);
        }
        this.id = id ? () => id : this.id;
        this.config = config || {};
    }
    id() {
        return `cohere:${this.modelName}`;
    }
    async callApi(prompt) {
        if (!this.apiKey) {
            return { error: 'Cohere API key is not set. Please provide a valid apiKey.' };
        }
        const defaultParams = {
            chatHistory: [],
            connectors: [],
            prompt_truncation: 'OFF',
            search_queries_only: false,
            documents: [],
            temperature: 0.3,
            k: 0,
            p: 0.75,
            frequency_penalty: 0,
            presence_penalty: 0,
        };
        const params = { ...defaultParams, ...this.config };
        let body;
        try {
            const promptObj = JSON.parse(prompt);
            if (typeof promptObj === 'object' && promptObj !== null) {
                body = {
                    ...params,
                    ...promptObj,
                    model: this.modelName,
                };
            }
            else {
                throw new Error('Prompt is not a JSON object');
            }
        }
        catch {
            body = {
                message: prompt,
                ...params,
                model: this.modelName,
            };
        }
        logger_1.default.debug(`Calling Cohere API: ${JSON.stringify(body)}`);
        let data, cached = false;
        try {
            ({ data, cached } = (await (0, cache_1.fetchWithCache)('https://api.cohere.ai/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                    'X-Client-Name': (0, envars_1.getEnvString)('COHERE_CLIENT_NAME') || 'promptfoo',
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS)));
            logger_1.default.debug(`Cohere chat API response: ${JSON.stringify(data)}`);
            if (data.message) {
                return { error: data.message };
            }
            const tokenUsage = {
                cached: cached ? data.token_count?.total_tokens || 0 : 0,
                total: data.token_count?.total_tokens || 0,
                prompt: data.token_count?.prompt_tokens || 0,
                completion: data.token_count?.response_tokens || 0,
            };
            let output = data.text;
            if (this.config.showSearchQueries && data.search_queries) {
                output +=
                    '\n\nSearch Queries:\n' +
                        data.search_queries
                            .map((query) => query.text)
                            .join('\n');
            }
            if (this.config.showDocuments && data.documents) {
                output +=
                    '\n\nDocuments:\n' +
                        data.documents
                            .map((doc) => JSON.stringify(doc))
                            .join('\n');
            }
            return {
                cached,
                output,
                tokenUsage,
            };
        }
        catch (error) {
            logger_1.default.error(`API call error: ${error}`);
            return { error: `API call error: ${error}` };
        }
    }
}
exports.CohereChatCompletionProvider = CohereChatCompletionProvider;
CohereChatCompletionProvider.COHERE_CHAT_MODELS = [
    'command',
    'command-light',
    'command-light-nightly',
    'command-nightly',
    'command-r',
    'command-r-plus',
    'command-r-v1',
];
class CohereEmbeddingProvider {
    constructor(modelName, config = {}, env) {
        this.modelName = modelName;
        this.config = config;
        this.env = env;
    }
    id() {
        return `cohere:${this.modelName}`;
    }
    getApiKey() {
        return (this.config.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.COHERE_API_KEY ||
            (0, envars_1.getEnvString)('COHERE_API_KEY'));
    }
    getApiUrl() {
        return this.config.apiBaseUrl || 'https://api.cohere.com/v1';
    }
    async callApi() {
        throw new Error('Cohere API does not provide text inference.');
    }
    async callEmbeddingApi(input) {
        if (!this.getApiKey()) {
            throw new Error('Cohere API key must be set for embedding');
        }
        const body = {
            model: this.modelName,
            texts: [input],
            input_type: 'classification',
            truncate: this.config.truncate || 'NONE',
        };
        let data;
        try {
            ({ data } = (await (0, cache_1.fetchWithCache)(`${this.getApiUrl()}/embed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getApiKey()}`,
                    'X-Client-Name': (0, envars_1.getEnvString)('COHERE_CLIENT_NAME') || 'promptfoo',
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS)));
        }
        catch (err) {
            logger_1.default.error(`API call error: ${err}`);
            throw err;
        }
        logger_1.default.debug(`\tCohere embeddings API response: ${JSON.stringify(data)}`);
        const embedding = data?.embeddings?.[0];
        if (!embedding) {
            throw new Error('No embedding found in Cohere embeddings API response');
        }
        return {
            embedding,
            tokenUsage: {
                prompt: data.meta?.billed_units?.input_tokens || 0,
                total: data.meta?.billed_units?.input_tokens || 0,
            },
        };
    }
}
exports.CohereEmbeddingProvider = CohereEmbeddingProvider;
//# sourceMappingURL=cohere.js.map