"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEmbeddingProvider = exports.DefaultGradingProvider = exports.VertexEmbeddingProvider = exports.VertexChatProvider = void 0;
const cache_1 = require("../../cache");
const cliState_1 = __importDefault(require("../../cliState"));
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const json_1 = require("../../util/json");
const client_1 = require("../mcp/client");
const transform_1 = require("../mcp/transform");
const shared_1 = require("../shared");
const util_1 = require("./util");
class VertexGenericProvider {
    constructor(modelName, options = {}) {
        const { config, id, env } = options;
        this.env = env;
        this.modelName = modelName;
        this.config = config || {};
        this.id = id ? () => id : this.id;
    }
    id() {
        return `vertex:${this.modelName}`;
    }
    toString() {
        return `[Google Vertex Provider ${this.modelName}]`;
    }
    getApiHost() {
        return (this.config.apiHost ||
            this.env?.VERTEX_API_HOST ||
            (0, envars_1.getEnvString)('VERTEX_API_HOST') ||
            `${this.getRegion()}-aiplatform.googleapis.com`);
    }
    async getProjectId() {
        return ((await (0, util_1.getGoogleClient)()).projectId ||
            this.config.projectId ||
            this.env?.VERTEX_PROJECT_ID ||
            (0, envars_1.getEnvString)('VERTEX_PROJECT_ID'));
    }
    getApiKey() {
        return this.config.apiKey || this.env?.VERTEX_API_KEY || (0, envars_1.getEnvString)('VERTEX_API_KEY');
    }
    getRegion() {
        return (this.config.region ||
            this.env?.VERTEX_REGION ||
            (0, envars_1.getEnvString)('VERTEX_REGION') ||
            'us-central1');
    }
    getPublisher() {
        return (this.config.publisher ||
            this.env?.VERTEX_PUBLISHER ||
            (0, envars_1.getEnvString)('VERTEX_PUBLISHER') ||
            'google');
    }
    getApiVersion() {
        return (this.config.apiVersion ||
            this.env?.VERTEX_API_VERSION ||
            (0, envars_1.getEnvString)('VERTEX_API_VERSION') ||
            'v1');
    }
    // @ts-ignore: Prompt is not used in this implementation
    async callApi(prompt) {
        throw new Error('Not implemented');
    }
}
class VertexChatProvider extends VertexGenericProvider {
    // TODO(ian): Completion models
    // https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versioning#gemini-model-versions
    constructor(modelName, options = {}) {
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
        if (this.modelName.includes('claude')) {
            return this.callClaudeApi(prompt, context);
        }
        else if (this.modelName.includes('gemini')) {
            return this.callGeminiApi(prompt, context);
        }
        else if (this.modelName.includes('llama')) {
            return this.callLlamaApi(prompt, context);
        }
        return this.callPalm2Api(prompt);
    }
    async callClaudeApi(prompt, context) {
        const messages = (0, shared_1.parseChatPrompt)(prompt, [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: prompt,
                    },
                ],
            },
        ]);
        const body = {
            anthropic_version: this.config.anthropicVersion || this.config.anthropic_version || 'vertex-2023-10-16',
            stream: false,
            max_tokens: this.config.max_tokens || this.config.maxOutputTokens || 512,
            temperature: this.config.temperature,
            top_p: this.config.top_p || this.config.topP,
            top_k: this.config.top_k || this.config.topK,
            messages,
        };
        logger_1.default.debug(`Preparing to call Claude API with body: ${JSON.stringify(body)}`);
        const cache = await (0, cache_1.getCache)();
        const cacheKey = `vertex:claude:${this.modelName}:${JSON.stringify(body)}`;
        let cachedResponse;
        if ((0, cache_1.isCacheEnabled)()) {
            cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                const parsedCachedResponse = JSON.parse(cachedResponse);
                const tokenUsage = parsedCachedResponse.tokenUsage;
                if (tokenUsage) {
                    tokenUsage.cached = tokenUsage.total;
                }
                logger_1.default.debug(`Returning cached response: ${cachedResponse}`);
                return { ...parsedCachedResponse, cached: true };
            }
        }
        let data;
        try {
            const { client, projectId } = await (0, util_1.getGoogleClient)();
            const url = `https://${this.getApiHost()}/v1/projects/${projectId}/locations/${this.getRegion()}/publishers/anthropic/models/${this.modelName}:rawPredict`;
            const res = await client.request({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                data: body,
                timeout: shared_1.REQUEST_TIMEOUT_MS,
            });
            data = res.data;
            logger_1.default.debug(`Claude API response: ${JSON.stringify(data)}`);
        }
        catch (err) {
            const error = err;
            if (error.response && error.response.data) {
                logger_1.default.debug(`Claude API error:\n${JSON.stringify(error.response.data)}`);
                return {
                    error: `API call error: ${JSON.stringify(error.response.data)}`,
                };
            }
            logger_1.default.debug(`Claude API error:\n${JSON.stringify(err)}`);
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        try {
            // Extract the text from the response
            let output = '';
            if (data.content && data.content.length > 0) {
                for (const part of data.content) {
                    if (part.type === 'text') {
                        output += part.text;
                    }
                }
            }
            if (!output) {
                return {
                    error: `No output found in Claude API response: ${JSON.stringify(data)}`,
                };
            }
            // Extract token usage information
            const tokenUsage = {
                total: data.usage.input_tokens + data.usage.output_tokens || 0,
                prompt: data.usage.input_tokens || 0,
                completion: data.usage.output_tokens || 0,
            };
            const response = {
                cached: false,
                output,
                tokenUsage,
            };
            if ((0, cache_1.isCacheEnabled)()) {
                await cache.set(cacheKey, JSON.stringify(response));
            }
            return response;
        }
        catch (err) {
            return {
                error: `Claude API response error: ${String(err)}. Response data: ${JSON.stringify(data)}`,
            };
        }
    }
    async callGeminiApi(prompt, context) {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        // https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini#gemini-pro
        const { contents, systemInstruction } = (0, util_1.geminiFormatAndSystemInstructions)(prompt, context?.vars, this.config.systemInstruction);
        // --- MCP tool injection logic ---
        const mcpTools = this.mcpClient ? (0, transform_1.transformMCPToolsToGoogle)(this.mcpClient.getAllTools()) : [];
        const allTools = [
            ...mcpTools,
            ...(this.config.tools ? (0, util_1.loadFile)(this.config.tools, context?.vars) : []),
        ];
        // --- End MCP tool injection logic ---
        // https://ai.google.dev/api/rest/v1/models/streamGenerateContent
        const body = {
            contents: contents,
            generationConfig: {
                context: this.config.context,
                examples: this.config.examples,
                stopSequences: this.config.stopSequences,
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxOutputTokens,
                topP: this.config.topP,
                topK: this.config.topK,
                ...this.config.generationConfig,
            },
            ...(this.config.safetySettings ? { safetySettings: this.config.safetySettings } : {}),
            ...(this.config.toolConfig ? { toolConfig: this.config.toolConfig } : {}),
            ...(allTools.length > 0 ? { tools: allTools } : {}),
            ...(systemInstruction ? { systemInstruction } : {}),
        };
        logger_1.default.debug(`Preparing to call Google Vertex API (Gemini) with body: ${JSON.stringify(body)}`);
        const cache = await (0, cache_1.getCache)();
        const cacheKey = `vertex:${this.modelName}:${JSON.stringify(body)}`;
        let response;
        let cachedResponse;
        if ((0, cache_1.isCacheEnabled)()) {
            cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                const parsedCachedResponse = JSON.parse(cachedResponse);
                const tokenUsage = parsedCachedResponse.tokenUsage;
                if (tokenUsage) {
                    tokenUsage.cached = tokenUsage.total;
                }
                logger_1.default.debug(`Returning cached response: ${cachedResponse}`);
                response = { ...parsedCachedResponse, cached: true };
            }
        }
        if (response === undefined) {
            let data;
            try {
                const { client, projectId } = await (0, util_1.getGoogleClient)();
                const url = `https://${this.getApiHost()}/${this.getApiVersion()}/projects/${projectId}/locations/${this.getRegion()}/publishers/${this.getPublisher()}/models/${this.modelName}:streamGenerateContent`;
                const res = await client.request({
                    url,
                    method: 'POST',
                    data: body,
                    timeout: shared_1.REQUEST_TIMEOUT_MS,
                });
                data = res.data;
                logger_1.default.debug(`Gemini API response: ${JSON.stringify(data)}`);
            }
            catch (err) {
                const geminiError = err;
                if (geminiError.response &&
                    geminiError.response.data &&
                    geminiError.response.data[0] &&
                    geminiError.response.data[0].error) {
                    const errorDetails = geminiError.response.data[0].error;
                    const code = errorDetails.code;
                    const message = errorDetails.message;
                    const status = errorDetails.status;
                    logger_1.default.debug(`Gemini API error:\n${JSON.stringify(errorDetails)}`);
                    return {
                        error: `API call error: Status ${status}, Code ${code}, Message:\n\n${message}`,
                    };
                }
                logger_1.default.debug(`Gemini API error:\n${JSON.stringify(err)}`);
                return {
                    error: `API call error: ${String(err)}`,
                };
            }
            try {
                const dataWithError = data;
                const error = dataWithError[0]?.error;
                if (error) {
                    return {
                        error: `Error ${error.code}: ${error.message}`,
                    };
                }
                const dataWithResponse = data;
                let output;
                for (const datum of dataWithResponse) {
                    const candidate = (0, util_1.getCandidate)(datum);
                    if (candidate.finishReason && candidate.finishReason === 'SAFETY') {
                        const finishReason = 'Content was blocked due to safety settings.';
                        if (cliState_1.default.config?.redteam) {
                            // Refusals are not errors during redteams, they're actually successes.
                            return { output: finishReason };
                        }
                        return { error: finishReason };
                    }
                    else if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                        // e.g. MALFORMED_FUNCTION_CALL
                        return {
                            error: `Finish reason ${candidate.finishReason}: ${JSON.stringify(data)}`,
                        };
                    }
                    else if (datum.promptFeedback?.blockReason) {
                        const blockReason = `Content was blocked due to safety settings: ${datum.promptFeedback.blockReason}`;
                        if (cliState_1.default.config?.redteam) {
                            // Refusals are not errors during redteams, they're actually successes.
                            return { output: blockReason };
                        }
                        return { error: blockReason };
                    }
                    else if (candidate.content?.parts) {
                        output = (0, util_1.mergeParts)(output, (0, util_1.formatCandidateContents)(candidate));
                    }
                    else {
                        return {
                            error: `No output found in response: ${JSON.stringify(data)}`,
                        };
                    }
                }
                const lastData = dataWithResponse[dataWithResponse.length - 1];
                const tokenUsage = {
                    total: lastData.usageMetadata?.totalTokenCount || 0,
                    prompt: lastData.usageMetadata?.promptTokenCount || 0,
                    completion: lastData.usageMetadata?.candidatesTokenCount || 0,
                };
                response = {
                    cached: false,
                    output,
                    tokenUsage,
                    metadata: {},
                };
                // Extract search grounding metadata from candidates
                const candidateWithMetadata = dataWithResponse
                    .map((datum) => (0, util_1.getCandidate)(datum))
                    .find((candidate) => candidate.groundingMetadata ||
                    candidate.groundingChunks ||
                    candidate.groundingSupports ||
                    candidate.webSearchQueries);
                if (candidateWithMetadata) {
                    response.metadata = {
                        ...(candidateWithMetadata.groundingMetadata && {
                            groundingMetadata: candidateWithMetadata.groundingMetadata,
                        }),
                        ...(candidateWithMetadata.groundingChunks && {
                            groundingChunks: candidateWithMetadata.groundingChunks,
                        }),
                        ...(candidateWithMetadata.groundingSupports && {
                            groundingSupports: candidateWithMetadata.groundingSupports,
                        }),
                        ...(candidateWithMetadata.webSearchQueries && {
                            webSearchQueries: candidateWithMetadata.webSearchQueries,
                        }),
                    };
                }
                if ((0, cache_1.isCacheEnabled)()) {
                    await cache.set(cacheKey, JSON.stringify(response));
                }
            }
            catch (err) {
                return {
                    error: `Gemini API response error: ${String(err)}. Response data: ${JSON.stringify(data)}`,
                };
            }
        }
        try {
            // Handle function tool callbacks
            if (this.config.functionToolCallbacks && (0, json_1.isValidJson)(response.output)) {
                const structured_output = JSON.parse(response.output);
                if (structured_output.functionCall) {
                    const results = [];
                    const functionName = structured_output.functionCall.name;
                    if (this.config.functionToolCallbacks[functionName]) {
                        try {
                            const functionResult = await this.config.functionToolCallbacks[functionName](JSON.stringify(typeof structured_output.functionCall.args === 'string'
                                ? JSON.parse(structured_output.functionCall.args)
                                : structured_output.functionCall.args));
                            results.push(functionResult);
                        }
                        catch (error) {
                            logger_1.default.error(`Error executing function ${functionName}: ${error}`);
                        }
                    }
                    if (results.length > 0) {
                        response = {
                            cached: response.cached,
                            output: results.join('\n'),
                            tokenUsage: response.tokenUsage,
                        };
                    }
                }
            }
        }
        catch (err) {
            return {
                error: `Tool callback error: ${String(err)}.`,
            };
        }
        return response;
    }
    async callPalm2Api(prompt) {
        const instances = (0, shared_1.parseChatPrompt)(prompt, [
            {
                messages: [
                    {
                        author: 'user',
                        content: prompt,
                    },
                ],
            },
        ]);
        const body = {
            instances,
            parameters: {
                context: this.config.context,
                examples: this.config.examples,
                safetySettings: this.config.safetySettings,
                stopSequences: this.config.stopSequences,
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxOutputTokens,
                topP: this.config.topP,
                topK: this.config.topK,
            },
        };
        logger_1.default.debug(`Calling Vertex Palm2 API: ${JSON.stringify(body)}`);
        const cache = await (0, cache_1.getCache)();
        const cacheKey = `vertex:palm2:${JSON.stringify(body)}`;
        let cachedResponse;
        if ((0, cache_1.isCacheEnabled)()) {
            cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                const parsedCachedResponse = JSON.parse(cachedResponse);
                const tokenUsage = parsedCachedResponse.tokenUsage;
                if (tokenUsage) {
                    tokenUsage.cached = tokenUsage.total;
                }
                logger_1.default.debug(`Returning cached response: ${cachedResponse}`);
                return { ...parsedCachedResponse, cached: true };
            }
        }
        let data;
        try {
            const { client, projectId } = await (0, util_1.getGoogleClient)();
            const url = `https://${this.getApiHost()}/${this.getApiVersion()}/projects/${projectId}/locations/${this.getRegion()}/publishers/${this.getPublisher()}/models/${this.modelName}:predict`;
            const res = await client.request({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: body,
                timeout: shared_1.REQUEST_TIMEOUT_MS,
            });
            data = res.data;
        }
        catch (err) {
            return {
                error: `API call error: ${JSON.stringify(err)}`,
            };
        }
        logger_1.default.debug(`Vertex Palm2 API response: ${JSON.stringify(data)}`);
        try {
            if (data.error) {
                return {
                    error: `Error ${data.error.code}: ${data.error.message}`,
                };
            }
            const output = data.predictions?.[0].candidates[0].content;
            const response = {
                output,
                cached: false,
            };
            if ((0, cache_1.isCacheEnabled)()) {
                await cache.set(cacheKey, JSON.stringify(response));
            }
            return response;
        }
        catch (err) {
            return {
                error: `API response error: ${String(err)}: ${JSON.stringify(data)}`,
            };
        }
    }
    async callLlamaApi(prompt, context) {
        // Validate region for Llama models (only available in us-central1)
        const region = this.getRegion();
        if (region !== 'us-central1') {
            return {
                error: `Llama models are only available in the us-central1 region. Current region: ${region}. Please set region: 'us-central1' in your configuration.`,
            };
        }
        // Parse the chat prompt into Llama format
        const messages = (0, shared_1.parseChatPrompt)(prompt, [
            {
                role: 'user',
                content: prompt,
            },
        ]);
        // Validate llama_guard_settings if provided
        const llamaGuardSettings = this.config.llamaConfig?.safetySettings?.llama_guard_settings;
        if (llamaGuardSettings !== undefined &&
            (typeof llamaGuardSettings !== 'object' || llamaGuardSettings === null)) {
            return {
                error: `Invalid llama_guard_settings: must be an object, received ${typeof llamaGuardSettings}`,
            };
        }
        // Extract safety settings from config - default to enabled if not specified
        const modelSafetySettings = {
            enabled: this.config.llamaConfig?.safetySettings?.enabled !== false, // Default to true
            llama_guard_settings: llamaGuardSettings || {},
        };
        // Prepare the request body for Llama models
        const body = {
            model: `meta/${this.modelName}`,
            messages,
            max_tokens: this.config.maxOutputTokens || 1024,
            stream: false,
            temperature: this.config.temperature,
            top_p: this.config.topP,
            top_k: this.config.topK,
            extra_body: {
                google: {
                    model_safety_settings: modelSafetySettings,
                },
            },
        };
        logger_1.default.debug(`Preparing to call Llama API with body: ${JSON.stringify(body)}`);
        const cache = await (0, cache_1.getCache)();
        const cacheKey = `vertex:llama:${this.modelName}:${JSON.stringify(body)}`;
        let cachedResponse;
        if ((0, cache_1.isCacheEnabled)()) {
            cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                const parsedCachedResponse = JSON.parse(cachedResponse);
                const tokenUsage = parsedCachedResponse.tokenUsage;
                if (tokenUsage) {
                    tokenUsage.cached = tokenUsage.total;
                }
                logger_1.default.debug(`Returning cached response: ${cachedResponse}`);
                return { ...parsedCachedResponse, cached: true };
            }
        }
        let data;
        try {
            const { client, projectId } = await (0, util_1.getGoogleClient)();
            // Llama models use a different endpoint format
            const url = `https://${this.getRegion()}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${this.getRegion()}/endpoints/openapi/chat/completions`;
            const res = await client.request({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                data: body,
                timeout: shared_1.REQUEST_TIMEOUT_MS,
            });
            data = res.data;
            logger_1.default.debug(`Llama API response: ${JSON.stringify(data)}`);
        }
        catch (err) {
            const error = err;
            if (error.response && error.response.data) {
                logger_1.default.debug(`Llama API error:\n${JSON.stringify(error.response.data)}`);
                return {
                    error: `API call error: ${JSON.stringify(error.response.data)}`,
                };
            }
            logger_1.default.debug(`Llama API error:\n${JSON.stringify(err)}`);
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        try {
            // Extract the completion text from the response
            let output = '';
            if (data.choices && data.choices.length > 0) {
                output = data.choices[0].message.content;
            }
            if (!output) {
                return {
                    error: `No output found in Llama API response: ${JSON.stringify(data)}`,
                };
            }
            // Extract token usage information if available
            const tokenUsage = {
                total: data.usage?.total_tokens || 0,
                prompt: data.usage?.prompt_tokens || 0,
                completion: data.usage?.completion_tokens || 0,
            };
            const response = {
                cached: false,
                output,
                tokenUsage,
            };
            if ((0, cache_1.isCacheEnabled)()) {
                await cache.set(cacheKey, JSON.stringify(response));
            }
            return response;
        }
        catch (err) {
            return {
                error: `Llama API response error: ${String(err)}. Response data: ${JSON.stringify(data)}`,
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
exports.VertexChatProvider = VertexChatProvider;
class VertexEmbeddingProvider {
    constructor(modelName, config = {}, env) {
        this.modelName = modelName;
        this.config = config;
        this.env = env;
    }
    id() {
        return `vertex:${this.modelName}`;
    }
    getRegion() {
        return this.config.region || 'us-central1';
    }
    getApiVersion() {
        return this.config.apiVersion || 'v1';
    }
    async callApi() {
        throw new Error('Vertex API does not provide text inference.');
    }
    async callEmbeddingApi(input) {
        // See https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings#get_text_embeddings_for_a_snippet_of_text
        const body = {
            instances: [{ content: input }],
            parameters: {
                autoTruncate: this.config.autoTruncate || false,
            },
        };
        let data;
        try {
            const { client, projectId } = await (0, util_1.getGoogleClient)();
            const url = `https://${this.getRegion()}-aiplatform.googleapis.com/${this.getApiVersion()}/projects/${projectId}/locations/${this.getRegion()}/publishers/google/models/${this.modelName}:predict`;
            const res = await client.request({
                url,
                method: 'POST',
                data: body,
            });
            data = res.data;
        }
        catch (err) {
            logger_1.default.error(`Vertex API call error: ${err}`);
            throw err;
        }
        logger_1.default.debug(`Vertex embeddings API response: ${JSON.stringify(data)}`);
        try {
            const embedding = data.predictions[0].embeddings.values;
            const tokenCount = data.predictions[0].embeddings.statistics.token_count;
            return {
                embedding,
                tokenUsage: {
                    total: tokenCount,
                },
            };
        }
        catch (err) {
            logger_1.default.error(`Error parsing Vertex embeddings API response: ${err}`);
            throw err;
        }
    }
}
exports.VertexEmbeddingProvider = VertexEmbeddingProvider;
exports.DefaultGradingProvider = new VertexChatProvider('gemini-1.5-pro');
exports.DefaultEmbeddingProvider = new VertexEmbeddingProvider('text-embedding-004');
//# sourceMappingURL=vertex.js.map