"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoyageEmbeddingProvider = void 0;
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const shared_1 = require("./shared");
class VoyageEmbeddingProvider {
    constructor(modelName, config = {}, env) {
        this.modelName = modelName;
        this.config = config;
        this.env = env;
    }
    id() {
        return `voyage:${this.modelName}`;
    }
    getApiKey() {
        const apiKeyCandidate = this.config?.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) || this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.VOYAGE_API_KEY ||
            (0, envars_1.getEnvString)('VOYAGE_API_KEY');
        return apiKeyCandidate;
    }
    getApiUrl() {
        return (this.config.apiBaseUrl ||
            this.env?.VOYAGE_API_BASE_URL ||
            (0, envars_1.getEnvString)('VOYAGE_API_BASE_URL') ||
            'https://api.voyageai.com/v1');
    }
    async callApi() {
        throw new Error('Voyage API does not provide text inference.');
    }
    async callEmbeddingApi(input) {
        if (!this.getApiKey()) {
            throw new Error('Voyage API key must be set for similarity comparison');
        }
        const body = {
            input: [input],
            model: this.modelName,
        };
        let data;
        try {
            ({ data } = (await (0, cache_1.fetchWithCache)(`${this.getApiUrl()}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getApiKey()}`,
                    ...this.config.headers,
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS)));
        }
        catch (err) {
            logger_1.default.error(`API call error: ${err}`);
            throw err;
        }
        logger_1.default.debug(`\tVoyage embeddings API response: ${JSON.stringify(data)}`);
        try {
            const embedding = data?.data?.[0]?.embedding;
            if (!embedding) {
                throw new Error('No embedding found in Voyage embeddings API response');
            }
            return {
                embedding,
                tokenUsage: {
                    total: data.usage.total_tokens,
                },
            };
        }
        catch (err) {
            logger_1.default.error(data.error.message);
            throw err;
        }
    }
}
exports.VoyageEmbeddingProvider = VoyageEmbeddingProvider;
//# sourceMappingURL=voyage.js.map