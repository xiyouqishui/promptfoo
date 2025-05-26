"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureModerationProvider = exports.AZURE_MODERATION_MODELS = void 0;
exports.parseAzureModerationResponse = parseAzureModerationResponse;
exports.handleApiError = handleApiError;
exports.getModerationCacheKey = getModerationCacheKey;
const cache_1 = require("../../cache");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const shared_1 = require("../shared");
const generic_1 = require("./generic");
exports.AZURE_MODERATION_MODELS = [
    { id: 'text-content-safety', maxTokens: 10000, capabilities: ['text'] },
];
function parseAzureModerationResponse(data) {
    try {
        logger_1.default.debug(`Azure Content Safety API response: ${JSON.stringify(data)}`);
        if (!data) {
            logger_1.default.error('Azure Content Safety API returned invalid response: null or undefined');
            return { flags: [] };
        }
        const categories = data.categoriesAnalysis || [];
        const blocklistMatches = data.blocklistsMatch || data.blocklistsMatch || data.blocklists_match || [];
        if (!categories || categories.length === 0) {
            return { flags: [] };
        }
        const flags = [];
        for (const analysis of categories) {
            if (analysis.severity > 0) {
                const confidence = analysis.severity / 7;
                flags.push({
                    code: analysis.category.toLowerCase(),
                    description: `Content flagged for ${analysis.category}`,
                    confidence,
                });
            }
        }
        for (const match of blocklistMatches || []) {
            flags.push({
                code: `blocklist:${match.blocklistName}`,
                description: `Content matched blocklist item: ${match.blocklistItemText}`,
                confidence: 1.0,
            });
        }
        return { flags };
    }
    catch (error) {
        logger_1.default.error(`Error parsing Azure Content Safety API response: ${error}`);
        return { flags: [], error: 'Failed to parse moderation response' };
    }
}
function handleApiError(err, data) {
    logger_1.default.error(`Azure moderation API error: ${err}${data ? `, ${data}` : ''}`);
    return { error: err.message || 'Unknown error', flags: [] };
}
function getModerationCacheKey(modelName, config, content) {
    return `azure-moderation:${modelName}:${JSON.stringify(content)}`;
}
class AzureModerationProvider extends generic_1.AzureGenericProvider {
    constructor(modelName = 'text-content-safety', options = {}) {
        super(modelName, options);
        const { config, env } = options;
        this.modelName = modelName;
        this.configWithHeaders = config || {};
        this.apiVersion =
            config?.apiVersion ||
                env?.AZURE_CONTENT_SAFETY_API_VERSION ||
                (0, envars_1.getEnvString)('AZURE_CONTENT_SAFETY_API_VERSION') ||
                '2024-09-01';
        this.endpoint =
            config?.endpoint ||
                env?.AZURE_CONTENT_SAFETY_ENDPOINT ||
                (0, envars_1.getEnvString)('AZURE_CONTENT_SAFETY_ENDPOINT');
        if (!AzureModerationProvider.MODERATION_MODEL_IDS.includes(modelName)) {
            logger_1.default.warn(`Using unknown Azure moderation model: ${modelName}`);
        }
    }
    getContentSafetyApiKey() {
        const extendedEnv = this.env;
        return (this.configWithHeaders.apiKey ||
            (this.configWithHeaders.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.configWithHeaders.apiKeyEnvar) ||
                    (this.env && this.configWithHeaders.apiKeyEnvar in this.env
                        ? this.env[this.configWithHeaders.apiKeyEnvar]
                        : undefined)
                : undefined) ||
            extendedEnv?.AZURE_CONTENT_SAFETY_API_KEY ||
            (0, envars_1.getEnvString)('AZURE_CONTENT_SAFETY_API_KEY') ||
            this.getApiKey());
    }
    async callModerationApi(userPrompt, assistantResponse) {
        await this.ensureInitialized();
        const apiKey = this.configWithHeaders.apiKey || this.getContentSafetyApiKey() || this.getApiKeyOrThrow();
        const endpoint = this.endpoint;
        if (!endpoint) {
            return handleApiError(new Error('Azure Content Safety endpoint is not set. Set the AZURE_CONTENT_SAFETY_ENDPOINT environment variable or add `endpoint` to the provider config.'));
        }
        if (apiKey) {
            const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
            logger_1.default.debug(`Using Azure Content Safety API key: ${maskedKey}`);
        }
        else {
            logger_1.default.error('No Azure Content Safety API key found');
            return handleApiError(new Error('Azure Content Safety API key is not set. Set the AZURE_CONTENT_SAFETY_API_KEY environment variable or add `apiKey` to the provider config.'));
        }
        const useCache = (0, cache_1.isCacheEnabled)();
        let cacheKey = '';
        if (useCache) {
            cacheKey = getModerationCacheKey(this.modelName, this.configWithHeaders, assistantResponse);
            const cache = await (0, cache_1.getCache)();
            const cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                logger_1.default.debug('Returning cached Azure moderation response');
                return cachedResponse;
            }
        }
        try {
            const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
            const url = `${cleanEndpoint}/contentsafety/text:analyze?api-version=${this.apiVersion}`;
            const headers = {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': apiKey,
                ...(this.configWithHeaders.headers || {}),
            };
            const body = {
                text: assistantResponse,
                categories: ['Hate', 'Sexual', 'SelfHarm', 'Violence'],
                blocklistNames: this.configWithHeaders.blocklistNames || [],
                haltOnBlocklistHit: this.configWithHeaders.haltOnBlocklistHit ?? false,
                outputType: 'FourSeverityLevels',
                ...(this.configWithHeaders.passthrough || {}),
            };
            logger_1.default.debug(`Making Azure Content Safety API request to: ${url}`);
            logger_1.default.debug(`Request body: ${JSON.stringify(body)}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), shared_1.REQUEST_TIMEOUT_MS);
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                logger_1.default.error(`Azure Content Safety API error: ${response.status} ${response.statusText}`);
                logger_1.default.error(`Error details: ${errorText}`);
                let errorMessage = `Azure Content Safety API returned ${response.status}: ${response.statusText}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error && errorJson.error.message) {
                        errorMessage += ` - ${errorJson.error.message}`;
                    }
                }
                catch {
                    errorMessage += ` - ${errorText}`;
                }
                return handleApiError(new Error(errorMessage));
            }
            const data = await response.json();
            const result = parseAzureModerationResponse(data);
            if (useCache && cacheKey) {
                const cache = await (0, cache_1.getCache)();
                await cache.set(cacheKey, result);
            }
            return result;
        }
        catch (err) {
            return handleApiError(err);
        }
    }
}
exports.AzureModerationProvider = AzureModerationProvider;
AzureModerationProvider.MODERATION_MODELS = exports.AZURE_MODERATION_MODELS;
AzureModerationProvider.MODERATION_MODEL_IDS = exports.AZURE_MODERATION_MODELS.map((model) => model.id);
//# sourceMappingURL=moderation.js.map