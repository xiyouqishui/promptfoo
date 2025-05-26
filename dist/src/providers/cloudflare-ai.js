"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareAiChatCompletionProvider = exports.CloudflareAiCompletionProvider = exports.CloudflareAiEmbeddingProvider = void 0;
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const invariant_1 = __importDefault(require("../util/invariant"));
const shared_1 = require("./shared");
class CloudflareAiGenericProvider {
    constructor(deploymentName, options = {}) {
        const { config, id, env } = options;
        this.env = env;
        this.deploymentName = deploymentName;
        this.config = config || {};
        this.id = id ? () => id : this.id;
    }
    getApiConfig() {
        const apiTokenCandidate = this.config?.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.CLOUDFLARE_API_KEY ||
            (0, envars_1.getEnvString)('CLOUDFLARE_API_KEY');
        (0, invariant_1.default)(apiTokenCandidate, 'Cloudflare API token required. Supply it via config apiKey or apiKeyEnvar, or the CLOUDFLARE_API_KEY environment variable');
        const accountIdCandidate = this.config?.accountId ||
            (this.config?.accountIdEnvar
                ? (0, envars_1.getEnvString)(this.config.accountIdEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.CLOUDFLARE_ACCOUNT_ID ||
            (0, envars_1.getEnvString)('CLOUDFLARE_ACCOUNT_ID');
        (0, invariant_1.default)(accountIdCandidate, 'Cloudflare account ID required. Supply it via config apiKey or apiKeyEnvar, or the CLOUDFLARE_ACCOUNT_ID environment variable');
        (0, invariant_1.default)(apiTokenCandidate, 'Cloudflare API token required. Supply it via config apiKey or apiKeyEnvar, or the CLOUDFLARE_API_KEY environment variable');
        return {
            apiToken: apiTokenCandidate,
            accountId: accountIdCandidate,
        };
    }
    /**
     * @see https://developers.cloudflare.com/api/operations/workers-ai-post-run-model
     */
    getApiBaseUrl() {
        const { accountId } = this.getApiConfig();
        return this.config.apiBaseUrl || `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
    }
    /**
     * @see https://developers.cloudflare.com/api/operations/workers-ai-post-run-model
     */
    buildUrl() {
        return `${this.getApiBaseUrl()}/ai/run/${this.deploymentName}`;
    }
    id() {
        return `cloudflare-ai:${this.modelType}:${this.deploymentName}`;
    }
    toString() {
        return `[Cloudflare AI Provider ${this.deploymentName}]`;
    }
    buildApiHeaders() {
        const { apiToken } = this.getApiConfig();
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken}`,
        };
    }
    /**
     * Cloudflare does not report usage but if it starts to pipe it through its response we can
     * fill in this implementation
     */
    getTokenUsageFromResponse(_response) {
        // TODO: Figure out token usage for invoked + cache situations
        const tokenUsage = {
            cached: undefined,
            completion: undefined,
            prompt: undefined,
            total: undefined,
        };
        return tokenUsage;
    }
    /**
     * Handles the actual marshalling of Cloudflare API response data into the response types expected
     * by inheriting consumers
     *
     * This is meant to be used internally across the inheriting providers
     * @param body
     * @returns
     */
    async handleApiCall(body) {
        let data;
        let cached;
        logger_1.default.debug(`Calling Cloudflare AI API: ${JSON.stringify(body)}`);
        const url = this.buildUrl();
        try {
            ({ data, cached } = (await (0, cache_1.fetchWithCache)(url, {
                method: 'POST',
                headers: this.buildApiHeaders(),
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS)));
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`\tCloudflare AI API response: ${JSON.stringify(data)}`);
        const tokenUsage = this.getTokenUsageFromResponse(data);
        if (!data.success) {
            return {
                error: `API response error: ${JSON.stringify(data.errors)} (messages: ${String(data.messages)} -- URL: ${url}): ${JSON.stringify(data)}`,
                tokenUsage,
            };
        }
        return {
            cached,
            data: data,
            tokenUsage,
        };
    }
    async callApi(prompt, context, callApiOptions) {
        throw new Error('Not implemented');
    }
}
class CloudflareAiEmbeddingProvider extends CloudflareAiGenericProvider {
    constructor() {
        super(...arguments);
        this.modelType = 'embedding';
    }
    async callEmbeddingApi(text) {
        const body = {
            text,
        };
        const cfResponse = await this.handleApiCall(body);
        if ('error' in cfResponse) {
            return { error: cfResponse.error };
        }
        const { data, tokenUsage, cached } = cfResponse;
        try {
            const embedding = data.result.data[0];
            if (!embedding) {
                logger_1.default.error(`No data could be found in the Cloudflare API response: ${JSON.stringify(data)}`);
                throw new Error('No embedding returned');
            }
            const ret = {
                cached,
                embedding,
                tokenUsage,
            };
            return ret;
        }
        catch (err) {
            return {
                error: `API response error: ${String(err)}: ${JSON.stringify(data)}`,
                tokenUsage,
            };
        }
    }
}
exports.CloudflareAiEmbeddingProvider = CloudflareAiEmbeddingProvider;
class CloudflareAiCompletionProvider extends CloudflareAiGenericProvider {
    constructor() {
        super(...arguments);
        this.modelType = 'completion';
    }
    async callApi(prompt, context, callApiOptions) {
        const body = {
            prompt,
            max_tokens: this.config.max_tokens,
            temperature: this.config.temperature,
            top_p: this.config.top_p,
            presence_penalty: this.config.presence_penalty,
            frequency_penalty: this.config.frequency_penalty,
            lora: this.config.lora,
            repetition_penalty: this.config.repetition_penalty,
            seed: this.config.seed,
            top_k: this.config.top_k,
        };
        const cfResponse = await this.handleApiCall(body);
        if ('error' in cfResponse) {
            return { error: cfResponse.error };
        }
        const { data, cached, tokenUsage } = cfResponse;
        return {
            output: data.result.response,
            tokenUsage,
            cached,
        };
    }
}
exports.CloudflareAiCompletionProvider = CloudflareAiCompletionProvider;
class CloudflareAiChatCompletionProvider extends CloudflareAiGenericProvider {
    constructor() {
        super(...arguments);
        this.modelType = 'chat';
    }
    async callApi(prompt, context, callApiOptions) {
        const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
        const body = {
            messages,
            max_tokens: this.config.max_tokens,
            temperature: this.config.temperature,
            top_p: this.config.top_p,
            presence_penalty: this.config.presence_penalty,
            frequency_penalty: this.config.frequency_penalty,
            lora: this.config.lora,
            repetition_penalty: this.config.repetition_penalty,
            seed: this.config.seed,
            top_k: this.config.top_k,
        };
        const cfResponse = await this.handleApiCall(body);
        if ('error' in cfResponse) {
            return { error: cfResponse.error };
        }
        const { data, cached, tokenUsage } = cfResponse;
        return {
            output: data.result.response,
            tokenUsage,
            cached,
        };
    }
}
exports.CloudflareAiChatCompletionProvider = CloudflareAiChatCompletionProvider;
//# sourceMappingURL=cloudflare-ai.js.map