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
exports.BAMProvider = void 0;
exports.convertResponse = convertResponse;
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const shared_1 = require("./shared");
function convertResponse(response) {
    const totalGeneratedTokens = response.results.reduce((acc, result) => acc + result.generated_token_count, 0);
    const tokenUsage = {
        total: totalGeneratedTokens,
        prompt: response.results[0]?.input_token_count || 0,
        completion: totalGeneratedTokens - (response.results[0]?.input_token_count || 0),
    };
    const providerResponse = {
        error: undefined,
        output: response.results.map((result) => result.generated_text).join(', '),
        tokenUsage,
        cost: undefined,
        cached: undefined,
        logProbs: undefined,
    };
    return providerResponse;
}
class BAMProvider {
    constructor(modelName, options = {}) {
        const { id, config, env, moderations } = options;
        this.env = env;
        this.modelName = modelName;
        this.config = config;
        this.moderations = moderations;
        this.id = id ? () => id : this.id;
        this.apiKey = (0, envars_1.getEnvString)('BAM_API_KEY');
    }
    id() {
        return `bam:chat:${this.modelName || 'ibm/granite-13b-chat-v2'}`;
    }
    toString() {
        return `[BAM chat Provider ${this.modelName || 'ibm/granite-13b-chat-v2'}]`;
    }
    getApiKey() {
        return (this.config?.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.BAM_API_KEY ||
            (0, envars_1.getEnvString)('BAM_API_KEY'));
    }
    async getClient() {
        if (!this.client) {
            const { Client } = await Promise.resolve().then(() => __importStar(require('@ibm-generative-ai/node-sdk')));
            this.client = new Client({
                apiKey: this.apiKey,
                endpoint: 'https://bam-api.res.ibm.com/',
            });
        }
        return this.client;
    }
    async callApi(prompt) {
        if (!this.apiKey) {
            throw new Error('BAM API key is not set. Set the BAM_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        try {
            const cache = await (0, cache_1.getCache)();
            const params = {
                model_id: this.modelName,
                input: prompt,
                ...(this.config ? { parameters: this.config } : {}),
                ...(this.moderations ? { moderations: this.moderations } : {}),
            };
            const cacheKey = `bam:${JSON.stringify(params)}`;
            if ((0, cache_1.isCacheEnabled)()) {
                // Try to get the cached response
                const cachedResponse = await cache.get(cacheKey);
                if (cachedResponse) {
                    logger_1.default.debug(`Returning cached response for ${prompt}: ${cachedResponse}`);
                    return {
                        output: JSON.parse(cachedResponse),
                        tokenUsage: {},
                    };
                }
            }
            const signal = AbortSignal.timeout(shared_1.REQUEST_TIMEOUT_MS);
            const client = await this.getClient();
            const result = await client.text.generation.create(params, { signal });
            return convertResponse(result);
        }
        catch (err) {
            logger_1.default.error(`BAM API call error: ${String(err)}`);
            return {
                error: `API call error: ${String(err)}`,
            };
        }
    }
}
exports.BAMProvider = BAMProvider;
//# sourceMappingURL=bam.js.map