"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleEmbeddingProvider = exports.AIStudioChatProvider = void 0;
const cache_1 = require("../../cache");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const util_1 = require("../../util");
const file_1 = require("../../util/file");
const templates_1 = require("../../util/templates");
const client_1 = require("../mcp/client");
const transform_1 = require("../mcp/transform");
const shared_1 = require("../shared");
const shared_2 = require("./shared");
const util_2 = require("./util");
const DEFAULT_API_HOST = 'generativelanguage.googleapis.com';
class AIStudioGenericProvider {
    constructor(modelName, options = {}) {
        const { config, id, env } = options;
        this.env = env;
        this.modelName = modelName;
        this.config = config || {};
        this.id = id ? () => id : this.id;
    }
    id() {
        return `google:${this.modelName}`;
    }
    toString() {
        return `[Google AI Studio Provider ${this.modelName}]`;
    }
    getApiHost() {
        const apiHost = this.config.apiHost ||
            this.env?.GOOGLE_API_HOST ||
            this.env?.PALM_API_HOST ||
            (0, envars_1.getEnvString)('GOOGLE_API_HOST') ||
            (0, envars_1.getEnvString)('PALM_API_HOST') ||
            DEFAULT_API_HOST;
        if (apiHost) {
            return (0, templates_1.getNunjucksEngine)().renderString(apiHost, {});
        }
        return undefined;
    }
    getApiKey() {
        const apiKey = this.config.apiKey ||
            this.env?.GOOGLE_API_KEY ||
            this.env?.PALM_API_KEY ||
            (0, envars_1.getEnvString)('GOOGLE_API_KEY') ||
            (0, envars_1.getEnvString)('PALM_API_KEY');
        if (apiKey) {
            return (0, templates_1.getNunjucksEngine)().renderString(apiKey, {});
        }
        return undefined;
    }
    // @ts-ignore: Prompt is not used in this implementation
    async callApi(prompt) {
        throw new Error('Not implemented');
    }
}
class AIStudioChatProvider extends AIStudioGenericProvider {
    constructor(modelName, options = {}) {
        if (!shared_2.CHAT_MODELS.includes(modelName)) {
            logger_1.default.debug(`Using unknown Google chat model: ${modelName}`);
        }
        super(modelName, options);
        this.mcpClient = null;
        this.initializationPromise = null;
        if (this.config.mcp?.enabled) {
            this.initializationPromise = this.initializeMCP();
        }
    }
    async initializeMCP() {
        this.mcpClient = new client_1.MCPClient(this.config.mcp);
        await this.mcpClient.initialize();
    }
    async callApi(prompt, context) {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        if (!this.getApiKey()) {
            throw new Error('Google API key is not set. Set the GOOGLE_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        const isGemini = this.modelName.startsWith('gemini');
        if (isGemini) {
            return this.callGemini(prompt, context);
        }
        // https://developers.generativeai.google/tutorials/curl_quickstart
        // https://ai.google.dev/api/rest/v1beta/models/generateMessage
        const messages = (0, shared_1.parseChatPrompt)(prompt, [{ content: prompt }]);
        const body = {
            prompt: { messages },
            temperature: this.config.temperature,
            topP: this.config.topP,
            topK: this.config.topK,
            safetySettings: this.config.safetySettings,
            stopSequences: this.config.stopSequences,
            maxOutputTokens: this.config.maxOutputTokens,
        };
        logger_1.default.debug(`Calling Google API: ${JSON.stringify(body)}`);
        let data, cached = false;
        try {
            ({ data, cached } = (await (0, cache_1.fetchWithCache)(`https://${this.getApiHost()}/v1beta3/models/${this.modelName}:generateMessage?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS, 'json', false)));
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`\tGoogle API response: ${JSON.stringify(data)}`);
        if (!data?.candidates || data.candidates.length === 0) {
            return {
                error: `API did not return any candidate responses: ${JSON.stringify(data)}`,
            };
        }
        try {
            const output = data.candidates[0].content;
            return {
                output,
                tokenUsage: cached
                    ? {
                        cached: data.usageMetadata?.totalTokenCount,
                        total: data.usageMetadata?.totalTokenCount,
                        numRequests: 0,
                    }
                    : {
                        prompt: data.usageMetadata?.promptTokenCount,
                        completion: data.usageMetadata?.candidatesTokenCount,
                        total: data.usageMetadata?.totalTokenCount,
                        numRequests: 1,
                    },
                raw: data,
                cached,
            };
        }
        catch (err) {
            return {
                error: `API response error: ${String(err)}: ${JSON.stringify(data)}`,
            };
        }
    }
    async callGemini(prompt, context) {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        const { contents, systemInstruction } = (0, util_2.geminiFormatAndSystemInstructions)(prompt, context?.vars, this.config.systemInstruction);
        // Determine API version based on model
        const apiVersion = this.modelName === 'gemini-2.0-flash-thinking-exp' ? 'v1alpha' : 'v1beta';
        // --- MCP tool injection logic ---
        const mcpTools = this.mcpClient ? (0, transform_1.transformMCPToolsToGoogle)(this.mcpClient.getAllTools()) : [];
        const allTools = [
            ...mcpTools,
            ...(this.config.tools ? (0, util_2.loadFile)(this.config.tools, context?.vars) : []),
        ];
        // --- End MCP tool injection logic ---
        const body = {
            contents,
            generationConfig: {
                ...(this.config.temperature !== undefined && { temperature: this.config.temperature }),
                ...(this.config.topP !== undefined && { topP: this.config.topP }),
                ...(this.config.topK !== undefined && { topK: this.config.topK }),
                ...(this.config.stopSequences !== undefined && {
                    stopSequences: this.config.stopSequences,
                }),
                ...(this.config.maxOutputTokens !== undefined && {
                    maxOutputTokens: this.config.maxOutputTokens,
                }),
                ...this.config.generationConfig,
            },
            safetySettings: this.config.safetySettings,
            ...(this.config.toolConfig ? { toolConfig: this.config.toolConfig } : {}),
            ...(allTools.length > 0 ? { tools: allTools } : {}),
            ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
        };
        if (this.config.responseSchema) {
            if (body.generationConfig.response_schema) {
                throw new Error('`responseSchema` provided but `generationConfig.response_schema` already set.');
            }
            const schema = (0, file_1.maybeLoadFromExternalFile)((0, util_1.renderVarsInObject)(this.config.responseSchema, context?.vars));
            body.generationConfig.response_schema = schema;
            body.generationConfig.response_mime_type = 'application/json';
        }
        logger_1.default.debug(`Calling Google API: ${JSON.stringify(body)}`);
        let data;
        let cached = false;
        try {
            ({ data, cached } = (await (0, cache_1.fetchWithCache)(`https://${this.getApiHost()}/${apiVersion}/models/${this.modelName}:generateContent?key=${this.getApiKey()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS, 'json', false)));
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`\tGoogle API response: ${JSON.stringify(data)}`);
        let output, candidate;
        try {
            candidate = (0, util_2.getCandidate)(data);
            output = (0, util_2.formatCandidateContents)(candidate);
        }
        catch (err) {
            return {
                error: `${String(err)}`,
            };
        }
        try {
            let guardrails;
            if (data.promptFeedback?.safetyRatings || candidate.safetyRatings) {
                const flaggedInput = data.promptFeedback?.safetyRatings?.some((r) => r.probability !== 'NEGLIGIBLE');
                const flaggedOutput = candidate.safetyRatings?.some((r) => r.probability !== 'NEGLIGIBLE');
                const flagged = flaggedInput || flaggedOutput;
                guardrails = {
                    flaggedInput,
                    flaggedOutput,
                    flagged,
                };
            }
            return {
                output,
                tokenUsage: cached
                    ? {
                        cached: data.usageMetadata?.totalTokenCount,
                        total: data.usageMetadata?.totalTokenCount,
                        numRequests: 0,
                    }
                    : {
                        prompt: data.usageMetadata?.promptTokenCount,
                        completion: data.usageMetadata?.candidatesTokenCount,
                        total: data.usageMetadata?.totalTokenCount,
                        numRequests: 1,
                    },
                raw: data,
                cached,
                ...(guardrails && { guardrails }),
                metadata: {
                    ...(candidate.groundingChunks && { groundingChunks: candidate.groundingChunks }),
                    ...(candidate.groundingMetadata && { groundingMetadata: candidate.groundingMetadata }),
                    ...(candidate.groundingSupports && { groundingSupports: candidate.groundingSupports }),
                    ...(candidate.webSearchQueries && { webSearchQueries: candidate.webSearchQueries }),
                },
            };
        }
        catch (err) {
            return {
                error: `API response error: ${String(err)}: ${JSON.stringify(data)}`,
            };
        }
    }
    async cleanup() {
        if (this.mcpClient) {
            await this.initializationPromise;
            await this.mcpClient.cleanup();
            this.mcpClient = null;
        }
    }
}
exports.AIStudioChatProvider = AIStudioChatProvider;
class GoogleEmbeddingProvider extends AIStudioGenericProvider {
    constructor(modelName, options = {}) {
        super(modelName, options);
    }
    async callApi() {
        throw new Error('Embedding provider does not support callApi. Use callEmbeddingApi instead.');
    }
    async callEmbeddingApi(text) {
        if (!this.getApiKey()) {
            throw new Error('Google API key is not set for embedding');
        }
        // Format request body according to the API spec
        const body = {
            model: `models/${this.modelName}`,
            content: {
                parts: [
                    {
                        text,
                    },
                ],
            },
        };
        // Use embedContent endpoint
        const endpoint = 'embedContent';
        const url = `https://${this.getApiHost()}/v1/models/${this.modelName}:${endpoint}?key=${this.getApiKey()}`;
        logger_1.default.debug(`Calling Google Embedding API: ${url} with body: ${JSON.stringify(body)}`);
        let data, _cached = false;
        try {
            ({ data, cached: _cached } = await (0, cache_1.fetchWithCache)(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS, 'json', false));
        }
        catch (err) {
            logger_1.default.error(`Google Embedding API call error: ${err}`);
            throw err;
        }
        logger_1.default.debug(`Google Embedding API response: ${JSON.stringify(data)}`);
        try {
            // The embedding is returned in data.embedding.values
            const embedding = data.embedding?.values;
            if (!embedding) {
                throw new Error('No embedding values found in Google Embedding API response');
            }
            return {
                embedding,
                tokenUsage: {
                    prompt: 0,
                    completion: 0,
                    total: 0,
                    numRequests: 1,
                },
            };
        }
        catch (err) {
            logger_1.default.error(`Error processing Google Embedding API response: ${JSON.stringify(data)}`);
            throw err;
        }
    }
}
exports.GoogleEmbeddingProvider = GoogleEmbeddingProvider;
//# sourceMappingURL=ai.studio.js.map