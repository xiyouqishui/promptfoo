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
exports.WatsonXProvider = void 0;
exports.generateConfigHash = generateConfigHash;
exports.clearModelSpecsCache = clearModelSpecsCache;
exports.calculateWatsonXCost = calculateWatsonXCost;
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const invariant_1 = __importDefault(require("../util/invariant"));
const shared_1 = require("./shared");
const ConfigSchema = zod_1.z.object({
    apiKey: zod_1.z.string().optional(),
    apiKeyEnvar: zod_1.z.string().optional(),
    apiBearerToken: zod_1.z.string().optional(),
    apiBearerTokenEnvar: zod_1.z.string().optional(),
    serviceUrl: zod_1.z.string().optional(),
    version: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
    modelId: zod_1.z.string().optional(),
    maxNewTokens: zod_1.z.number().optional(),
});
const TextGenResponseSchema = zod_1.z.object({
    model_id: zod_1.z.string(),
    model_version: zod_1.z.string(),
    created_at: zod_1.z.string(),
    results: zod_1.z.array(zod_1.z.object({
        generated_text: zod_1.z.string(),
        generated_token_count: zod_1.z.number().optional(),
        input_token_count: zod_1.z.number().optional(),
        stop_reason: zod_1.z.string().optional(),
    })),
});
const TIER_PRICING = {
    class_1: 0.6,
    class_2: 1.8,
    class_3: 5.0,
    class_c1: 0.1,
    class_5: 0.25,
    class_7: 16.0,
    class_8: 0.15,
    class_9: 0.35,
    class_10: 2.0,
    class_11: 0.005,
    class_12: 0.2,
};
function convertResponse(response) {
    const firstResult = response.results && response.results[0];
    if (!firstResult) {
        throw new Error('No results returned from text generation API.');
    }
    const totalGeneratedTokens = firstResult.generated_token_count || 0;
    const promptTokens = firstResult.input_token_count || 0;
    const completionTokens = totalGeneratedTokens - promptTokens;
    const tokenUsage = {
        total: totalGeneratedTokens,
        prompt: promptTokens,
        completion: completionTokens >= 0 ? completionTokens : totalGeneratedTokens,
    };
    const providerResponse = {
        error: undefined,
        output: firstResult.generated_text || '',
        tokenUsage,
        cost: undefined,
        cached: undefined,
        logProbs: undefined,
    };
    return providerResponse;
}
function sortObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    }
    const sortedKeys = Object.keys(obj)
        .filter((key) => obj[key] !== undefined)
        .sort();
    const result = {};
    sortedKeys.forEach((key) => {
        result[key] = sortObject(obj[key]);
    });
    return result;
}
function generateConfigHash(config) {
    const sortedConfig = sortObject(config);
    return crypto_1.default.createHash('md5').update(JSON.stringify(sortedConfig)).digest('hex');
}
async function fetchModelSpecs() {
    try {
        const { data } = await (0, cache_1.fetchWithCache)('https://us-south.ml.cloud.ibm.com/ml/v1/foundation_model_specs?version=2023-09-30', {
            headers: {
                'Content-Type': 'application/json',
            },
        }, shared_1.REQUEST_TIMEOUT_MS);
        // Handle string response that needs to be parsed
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        return parsedData?.resources || [];
    }
    catch (error) {
        logger_1.default.error(`Failed to fetch model specs: ${error}`);
        return [];
    }
}
let modelSpecsCache = null;
function clearModelSpecsCache() {
    modelSpecsCache = null;
}
async function getModelSpecs() {
    if (!modelSpecsCache) {
        const specs = await fetchModelSpecs();
        modelSpecsCache = specs.map((spec) => ({
            id: spec.model_id,
            cost: {
                input: TIER_PRICING[spec.input_tier.toLowerCase()] / 1e6 || 0,
                output: TIER_PRICING[spec.output_tier.toLowerCase()] / 1e6 || 0,
            },
        }));
    }
    return modelSpecsCache;
}
async function calculateWatsonXCost(modelName, config, promptTokens, completionTokens) {
    if (!promptTokens || !completionTokens) {
        return undefined;
    }
    const models = await getModelSpecs();
    const model = models.find((m) => m.id === modelName);
    if (!model) {
        return undefined;
    }
    const cost = (0, shared_1.calculateCost)(modelName, config, promptTokens, completionTokens, models);
    return cost;
}
class WatsonXProvider {
    constructor(modelName, options) {
        const validationResult = ConfigSchema.safeParse(options.config);
        if (!validationResult.success) {
            const errors = validationResult.error.errors.map((e) => e.message).join(', ');
            throw new Error(`WatsonXProvider requires a valid config. Issues: ${errors}`);
        }
        const validatedConfig = validationResult.data;
        const { env } = options;
        this.modelName = modelName;
        this.options = options;
        this.env = env;
        this.config = validatedConfig;
    }
    id() {
        return `watsonx:${this.modelName}`;
    }
    toString() {
        return `[Watsonx Provider ${this.modelName}]`;
    }
    async getAuth() {
        const { IamAuthenticator, BearerTokenAuthenticator } = await Promise.resolve().then(() => __importStar(require('ibm-cloud-sdk-core')));
        const apiKey = this.config.apiKey ||
            (this.config.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.WATSONX_AI_APIKEY ||
            (0, envars_1.getEnvString)('WATSONX_AI_APIKEY');
        const bearerToken = this.config.apiBearerToken ||
            (this.config.apiBearerTokenEnvar
                ? (0, envars_1.getEnvString)(this.config.apiBearerTokenEnvar) ||
                    this.env?.[this.config.apiBearerTokenEnvar]
                : undefined) ||
            this.env?.WATSONX_AI_BEARER_TOKEN ||
            (0, envars_1.getEnvString)('WATSONX_AI_BEARER_TOKEN');
        const authType = this.env?.WATSONX_AI_AUTH_TYPE || (0, envars_1.getEnvString)('WATSONX_AI_AUTH_TYPE');
        if (authType === 'iam' && apiKey) {
            logger_1.default.info('Using IAM Authentication based on WATSONX_AI_AUTH_TYPE.');
            return new IamAuthenticator({ apikey: apiKey });
        }
        else if (authType === 'bearertoken' && bearerToken) {
            logger_1.default.info('Using Bearer Token Authentication based on WATSONX_AI_AUTH_TYPE.');
            return new BearerTokenAuthenticator({ bearerToken });
        }
        if (apiKey) {
            logger_1.default.info('Using IAM Authentication.');
            return new IamAuthenticator({ apikey: apiKey });
        }
        else if (bearerToken) {
            logger_1.default.info('Using Bearer Token Authentication.');
            return new BearerTokenAuthenticator({ bearerToken });
        }
        else {
            throw new Error('Authentication credentials not provided. Please set either `WATSONX_AI_APIKEY` for IAM Authentication or `WATSONX_AI_BEARER_TOKEN` for Bearer Token Authentication.');
        }
    }
    getProjectId() {
        const projectId = this.options.config.projectId ||
            (this.options.config.projectIdEnvar
                ? (0, envars_1.getEnvString)(this.options.config.projectIdEnvar) ||
                    this.env?.[this.options.config.projectIdEnvar]
                : undefined) ||
            this.env?.WATSONX_AI_PROJECT_ID ||
            (0, envars_1.getEnvString)('WATSONX_AI_PROJECT_ID');
        (0, invariant_1.default)(projectId && projectId.trim() !== '', 'WatsonX project ID is not set. Set the WATSONX_AI_PROJECT_ID environment variable or add `projectId` to the provider config.');
        return projectId;
    }
    getModelId() {
        if (!this.modelName) {
            throw new Error('Model name must be specified.');
        }
        if (this.modelName.includes(':')) {
            const parts = this.modelName.split(':');
            if (parts.length < 2 || !parts[1]) {
                throw new Error(`Unable to extract modelId from modelName: ${this.modelName}`);
            }
            return parts[1];
        }
        const modelId = this.options.config.modelId || this.modelName;
        (0, invariant_1.default)(modelId, 'Model ID is required for WatsonX API call.');
        return modelId;
    }
    async getClient() {
        if (this.client) {
            return this.client;
        }
        const authenticator = await this.getAuth();
        const { WatsonXAI } = await Promise.resolve().then(() => __importStar(require('@ibm-cloud/watsonx-ai')));
        this.client = WatsonXAI.newInstance({
            version: this.options.config.version || '2023-05-29',
            serviceUrl: this.options.config.serviceUrl || 'https://us-south.ml.cloud.ibm.com',
            authenticator,
        });
        return this.client;
    }
    async callApi(prompt) {
        const client = await this.getClient();
        const modelId = this.getModelId();
        const projectId = this.getProjectId();
        const cache = (0, cache_1.getCache)();
        const configHash = generateConfigHash(this.options.config);
        const cacheKey = `watsonx:${this.modelName}:${configHash}:${prompt}`;
        const cacheEnabled = (0, cache_1.isCacheEnabled)();
        if (cacheEnabled) {
            const cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                logger_1.default.debug(`Watsonx: Returning cached response for prompt "${prompt}" with config "${configHash}": ${cachedResponse}`);
                return JSON.parse(cachedResponse);
            }
        }
        try {
            const textGenRequestParametersModel = {
                max_new_tokens: this.options.config.maxNewTokens || 100,
            };
            const params = {
                input: prompt,
                modelId,
                projectId,
                parameters: textGenRequestParametersModel,
            };
            const apiResponse = await client.generateText(params);
            const parsedResponse = TextGenResponseSchema.safeParse(apiResponse.result);
            if (!parsedResponse.success) {
                logger_1.default.error(`Watsonx: Invalid response structure for response: ${JSON.stringify(apiResponse.result)}, errors: ${JSON.stringify(parsedResponse.error.errors)}`);
                throw new Error(`Invalid API response structure: ${JSON.stringify(parsedResponse.error.errors)}`);
            }
            const textGenResponse = parsedResponse.data;
            const providerResponse = convertResponse(textGenResponse);
            providerResponse.cost = await calculateWatsonXCost(this.modelName, this.options.config, providerResponse.tokenUsage?.prompt, providerResponse.tokenUsage?.completion);
            if ((0, cache_1.isCacheEnabled)()) {
                await cache.set(cacheKey, JSON.stringify(providerResponse));
            }
            return providerResponse;
        }
        catch (err) {
            logger_1.default.error(`Watsonx: API call error: ${String(err)}`);
            return {
                error: `API call error: ${String(err)}`,
                output: '',
                tokenUsage: {},
            };
        }
    }
}
exports.WatsonXProvider = WatsonXProvider;
//# sourceMappingURL=watsonx.js.map