"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adalineGateway = exports.AdalineGatewayCachePlugin = exports.AdalineGatewayChatProvider = exports.AdalineGatewayEmbeddingProvider = exports.AdalineGatewayGenericProvider = void 0;
const anthropic_1 = require("@adaline/anthropic");
const azure_1 = require("@adaline/azure");
const gateway_1 = require("@adaline/gateway");
const google_1 = require("@adaline/google");
const groq_1 = require("@adaline/groq");
const open_router_1 = require("@adaline/open-router");
const openai_1 = require("@adaline/openai");
const together_ai_1 = require("@adaline/together-ai");
const vertex_1 = require("@adaline/vertex");
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const util_1 = require("../util");
const json_1 = require("../util/json");
const messages_1 = require("./anthropic/messages");
const util_2 = require("./anthropic/util");
const chat_1 = require("./azure/chat");
const embedding_1 = require("./azure/embedding");
const util_3 = require("./azure/util");
const ai_studio_1 = require("./google/ai.studio");
const util_4 = require("./google/util");
const vertex_2 = require("./google/vertex");
const groq_2 = require("./groq");
const chat_2 = require("./openai/chat");
const embedding_2 = require("./openai/embedding");
const util_5 = require("./openai/util");
const shared_1 = require("./shared");
const voyage_1 = require("./voyage");
// Allows Adaline Gateway to R/W Promptfoo's cache
class AdalineGatewayCachePlugin {
    async get(key) {
        const cache = await (0, cache_1.getCache)();
        return cache.get(key);
    }
    async set(key, value) {
        const cache = await (0, cache_1.getCache)();
        cache.set(key, value);
    }
    // Gateway will never invoke this method
    async delete(key) {
        throw new Error('Not implemented');
    }
    // Gateway will never invoke this method
    async clear() {
        throw new Error('Not implemented');
    }
}
exports.AdalineGatewayCachePlugin = AdalineGatewayCachePlugin;
// Adaline Gateway singleton
class AdalineGateway {
    getGateway() {
        if (!this.gateway) {
            this.gateway = new gateway_1.Gateway({
                queueOptions: {
                    maxConcurrentTasks: 4,
                    retryCount: 2,
                    retry: {
                        initialDelay: (0, envars_1.getEnvInt)('PROMPTFOO_REQUEST_BACKOFF_MS', 5000),
                        exponentialFactor: 2,
                    },
                    timeout: shared_1.REQUEST_TIMEOUT_MS,
                },
                completeChatCache: new AdalineGatewayCachePlugin(),
                getEmbeddingsCache: new AdalineGatewayCachePlugin(),
            });
        }
        return this.gateway;
    }
}
const adalineGateway = new AdalineGateway();
exports.adalineGateway = adalineGateway;
class AdalineGatewayGenericProvider {
    constructor(providerName, modelName, options = {}) {
        this.modelName = modelName;
        this.providerName = providerName;
        this.providerOptions = options;
        const { config, id, env } = options;
        this.env = env;
        this.config = config || {};
        this.id = id ? () => id : this.id;
        this.gateway = adalineGateway.getGateway();
    }
    id() {
        return `adaline:${this.providerName}:${this.modelName}`;
    }
    toString() {
        return `[Adaline Gateway ${this.providerName}:${this.modelName}]`;
    }
    // @ts-ignore: Params are not used in this implementation
    async callApi(prompt, context, callApiOptions) {
        throw new Error('Not implemented');
    }
}
exports.AdalineGatewayGenericProvider = AdalineGatewayGenericProvider;
class AdalineGatewayEmbeddingProvider extends AdalineGatewayGenericProvider {
    async callEmbeddingApi(text) {
        try {
            let gatewayEmbeddingModel;
            const gatewayEmbeddingRequests = {
                modality: 'text',
                requests: [text],
            };
            if (this.providerName === 'openai') {
                const provider = new openai_1.OpenAI();
                const parentClass = new embedding_2.OpenAiEmbeddingProvider(this.modelName, this.providerOptions);
                const apiKey = parentClass.getApiKey();
                if (!apiKey) {
                    throw new Error('OpenAI API key is not set. Set the OPENAI_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayEmbeddingModel = provider.embeddingModel({
                    apiKey,
                    modelName: this.modelName,
                    baseUrl: parentClass.getApiUrl(),
                });
            }
            else if (this.providerName === 'vertex') {
                const provider = new vertex_1.Vertex();
                const parentClass = new vertex_2.VertexEmbeddingProvider(this.modelName, this.providerOptions);
                const { client, projectId } = await (0, util_4.getGoogleClient)();
                const token = await client.getAccessToken();
                gatewayEmbeddingModel = provider.embeddingModel({
                    modelName: this.modelName,
                    accessToken: token.token,
                    location: parentClass.getRegion(),
                    projectId,
                });
            }
            else if (this.providerName === 'voyage') {
                const provider = new anthropic_1.Anthropic();
                const parentClass = new voyage_1.VoyageEmbeddingProvider(this.modelName, this.providerOptions);
                const apiKey = parentClass.getApiKey();
                if (!apiKey) {
                    throw new Error('Voyage API key is not set. Set the VOYAGE_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayEmbeddingModel = provider.embeddingModel({
                    apiKey,
                    modelName: this.modelName,
                });
            }
            else if (this.providerName === 'azureopenai') {
                const provider = new azure_1.Azure();
                const parentClass = new embedding_1.AzureEmbeddingProvider(this.modelName, this.providerOptions);
                gatewayEmbeddingModel = provider.embeddingModel({
                    apiKey: parentClass.getApiKeyOrThrow(),
                    deploymentId: this.modelName,
                    baseUrl: parentClass.getApiBaseUrl(),
                });
            }
            else {
                throw new Error(`Unsupported provider: ${this.providerName} on Adaline Gateway`);
            }
            const gatewayRequest = {
                model: gatewayEmbeddingModel,
                config: {},
                embeddingRequests: gatewayEmbeddingRequests,
                options: {
                    enableCache: (0, cache_1.isCacheEnabled)(),
                    customHeaders: this.config.headers,
                },
            };
            logger_1.default.debug(`Adaline Gateway Embedding API Request: ${(0, json_1.safeJsonStringify)(gatewayRequest)}`);
            const response = (await this.gateway.getEmbeddings(gatewayRequest));
            logger_1.default.debug(`Adaline Gateway Embedding API Response: ${(0, json_1.safeJsonStringify)(response)}`);
            const embedding = response.response.embeddings[0].embedding;
            return {
                embedding,
                tokenUsage: {
                    total: response.response.usage?.totalTokens,
                    cached: response.cached ? response.response.usage?.totalTokens : 0,
                },
            };
        }
        catch (error) {
            logger_1.default.error(`Error calling embedding API on Adaline Gateway: ${error}`);
            throw error;
        }
    }
}
exports.AdalineGatewayEmbeddingProvider = AdalineGatewayEmbeddingProvider;
class AdalineGatewayChatProvider extends AdalineGatewayGenericProvider {
    constructor(providerName, modelName, options = {}) {
        super(providerName, modelName, options);
        this.config = options.config || {};
    }
    checkRequestFormat(prompt) {
        const checkFormatRequestUsingConfig = () => {
            if (this.config.tools && this.config.tools.length > 0) {
                if ('definition' in this.config.tools[0]) {
                    // valid tool in config and sufficiently in gateway format
                    return { formatType: 'gateway' };
                }
                else if ('function' in this.config.tools[0]) {
                    // valid tool in config and sufficiently in openai format
                    return { formatType: 'openai' };
                }
            }
            // check if any gateway specific config is present
            if ('maxTokens' in this.config ||
                'topP' in this.config ||
                'topK' in this.config ||
                'minP' in this.config ||
                'frequencyPenalty' in this.config ||
                'presencePenalty' in this.config ||
                'repetitionPenalty' in this.config ||
                'logProbs' in this.config ||
                'responseFormat' in this.config ||
                'responseSchema' in this.config ||
                'toolChoice' in this.config) {
                return { formatType: 'gateway' };
            }
            // no gateway specific config is present, assume openai format
            return { formatType: 'openai' };
        };
        const trimmedPrompt = prompt.trim();
        try {
            // try to parse the prompt as JSON and check if it matches openai or gateway format
            const objPrompt = JSON.parse(trimmedPrompt);
            if (Array.isArray(objPrompt) && objPrompt.length > 0) {
                if ('content' in objPrompt[0]) {
                    if (typeof objPrompt[0].content === 'string' ||
                        (Array.isArray(objPrompt[0].content) &&
                            objPrompt[0].content.length > 0 &&
                            'type' in objPrompt[0].content[0])) {
                        // JSON prompt sufficiently matches openai format
                        return { formatType: 'openai' };
                    }
                    else if (Array.isArray(objPrompt[0].content) &&
                        objPrompt[0].content.length > 0 &&
                        'modality' in objPrompt[0].content[0]) {
                        // JSON prompt sufficiently matches gateway format
                        return { formatType: 'gateway' };
                    }
                }
                else {
                    // JSON prompt does not match openai or gateway format, could just be a valid JSON message to be sent to the model
                    return checkFormatRequestUsingConfig();
                }
            }
            // JSON prompt does not match openai or gateway format, could just be a valid JSON message to be sent to the model
            return checkFormatRequestUsingConfig();
        }
        catch {
            // prompt is not a valid JSON string, check if it matches openai or gateway format using config
            return checkFormatRequestUsingConfig();
        }
    }
    async callApi(prompt, context, callApiOptions) {
        let gatewayChatModel;
        let gatewayConfig;
        let gatewayMessages;
        let gatewayTools;
        // gateway provider can also handle prompts in openai format
        let formatType;
        try {
            formatType = this.checkRequestFormat(prompt).formatType;
            logger_1.default.debug(`Calling Adaline Gateway Chat API with prompt format: ${formatType}`);
            if (formatType === 'openai') {
                // create a temp openai provider to get the entire body that would have been sent to openai
                const openAiProvider = new chat_2.OpenAiChatCompletionProvider(this.modelName, this.providerOptions);
                const { body } = openAiProvider.getOpenAiBody(prompt, context, callApiOptions);
                // create a temp gateway openai model to transform the body to gateway types
                const gatewayOpenAiDummyModel = new openai_1.OpenAI().chatModel({
                    modelName: 'gpt-4o',
                    apiKey: 'random-api-key',
                });
                // create gateway types from the body
                const gatewayRequest = gatewayOpenAiDummyModel.transformModelRequest(body);
                gatewayConfig = gatewayRequest.config;
                gatewayMessages = gatewayRequest.messages;
                gatewayTools = gatewayRequest.tools;
            }
            else {
                // prompt is in gateway format
                const _config = this.config;
                gatewayConfig = {
                    maxTokens: _config.maxTokens,
                    temperature: _config.temperature,
                    topP: _config.topP,
                    topK: _config.topK,
                    minP: _config.minP,
                    frequencyPenalty: _config.frequencyPenalty,
                    presencePenalty: _config.presencePenalty,
                    repetitionPenalty: _config.repetitionPenalty,
                    stop: _config.stop,
                    seed: _config.seed,
                    logProbs: callApiOptions?.includeLogProbs === true || _config.logProbs,
                    toolChoice: _config.toolChoice,
                    responseFormat: _config.responseFormat,
                    responseSchema: _config.responseSchema,
                    safetySettings: _config.safetySettings,
                };
                gatewayMessages = (0, shared_1.parseChatPrompt)(prompt, [
                    { role: 'user', content: [{ modality: 'text', value: prompt }] },
                ]);
                gatewayTools = _config.tools
                    ? (0, util_1.maybeLoadToolsFromExternalFile)(_config.tools)
                    : undefined;
            }
            if (this.providerName === 'openai') {
                const provider = new openai_1.OpenAI();
                const parentClass = new chat_2.OpenAiChatCompletionProvider(this.modelName, this.providerOptions);
                const apiKey = parentClass.getApiKey();
                if (!apiKey) {
                    throw new Error('OpenAI API key is not set. Set the OPENAI_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayChatModel = provider.chatModel({
                    apiKey,
                    modelName: this.modelName,
                    baseUrl: parentClass.getApiUrl(),
                    organization: parentClass.getOrganization(),
                });
                gatewayConfig.temperature =
                    gatewayConfig.temperature ?? (0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 0);
                gatewayConfig.maxTokens = gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('OPENAI_MAX_TOKENS', 1024);
                gatewayConfig.maxTokens =
                    gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('OPENAI_MAX_COMPLETION_TOKENS');
                gatewayConfig.topP = gatewayConfig.topP ?? (0, envars_1.getEnvFloat)('OPENAI_TOP_P', 1);
                gatewayConfig.frequencyPenalty =
                    gatewayConfig.frequencyPenalty ?? (0, envars_1.getEnvFloat)('OPENAI_FREQUENCY_PENALTY', 0);
                gatewayConfig.presencePenalty =
                    gatewayConfig.presencePenalty ?? (0, envars_1.getEnvFloat)('OPENAI_PRESENCE_PENALTY', 0);
            }
            else if (this.providerName === 'vertex') {
                const provider = new vertex_1.Vertex();
                const parentClass = new vertex_2.VertexChatProvider(this.modelName, this.providerOptions);
                const { client, projectId } = await (0, util_4.getGoogleClient)();
                const token = await client.getAccessToken();
                if (token === null) {
                    throw new Error('Vertex API token is not set. Please configure the Google Cloud SDK');
                }
                gatewayChatModel = provider.chatModel({
                    modelName: this.modelName,
                    accessToken: token.token,
                    location: parentClass.getRegion(),
                    projectId,
                });
            }
            else if (this.providerName === 'google') {
                const provider = new google_1.Google();
                const parentClass = new ai_studio_1.AIStudioChatProvider(this.modelName, this.providerOptions);
                const apiKey = parentClass.getApiKey();
                if (!apiKey) {
                    throw new Error('Google API key is not set. Set the GOOGLE_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayChatModel = provider.chatModel({
                    apiKey,
                    modelName: this.modelName,
                    baseUrl: `https://${parentClass.getApiHost()}/v1beta`,
                });
            }
            else if (this.providerName === 'azureopenai') {
                const provider = new azure_1.Azure();
                const parentClass = new chat_1.AzureChatCompletionProvider(this.modelName, this.providerOptions);
                const apiKey = parentClass.getApiKeyOrThrow();
                gatewayChatModel = provider.chatModel({
                    apiKey,
                    deploymentId: this.modelName,
                    baseUrl: parentClass.getApiBaseUrl(),
                });
                gatewayConfig.temperature =
                    gatewayConfig.temperature ?? (0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 0);
                gatewayConfig.maxTokens = gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('OPENAI_MAX_TOKENS', 1024);
                gatewayConfig.topP = gatewayConfig.topP ?? (0, envars_1.getEnvFloat)('OPENAI_TOP_P', 1);
                gatewayConfig.frequencyPenalty =
                    gatewayConfig.frequencyPenalty ?? (0, envars_1.getEnvFloat)('OPENAI_FREQUENCY_PENALTY', 0);
                gatewayConfig.presencePenalty =
                    gatewayConfig.presencePenalty ?? (0, envars_1.getEnvFloat)('OPENAI_PRESENCE_PENALTY', 0);
            }
            else if (this.providerName === 'anthropic') {
                const provider = new anthropic_1.Anthropic();
                const parentClass = new messages_1.AnthropicMessagesProvider(this.modelName, this.providerOptions);
                const apiKey = parentClass.getApiKey();
                if (!apiKey) {
                    throw new Error('Anthropic API key is not set. Set the ANTHROPIC_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayChatModel = provider.chatModel({
                    apiKey,
                    modelName: this.modelName,
                });
                gatewayConfig.temperature =
                    gatewayConfig.temperature ?? (0, envars_1.getEnvFloat)('ANTHROPIC_TEMPERATURE', 0);
                gatewayConfig.maxTokens =
                    gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('ANTHROPIC_MAX_TOKENS', 1024);
            }
            else if (this.providerName === 'groq') {
                const provider = new groq_1.Groq();
                const parentClass = new groq_2.GroqProvider(this.modelName, this.providerOptions);
                const apiKey = parentClass.getApiKey();
                if (!apiKey) {
                    throw new Error('Groq API key is not set. Set the GROQ_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayChatModel = provider.chatModel({
                    apiKey,
                    modelName: this.modelName,
                });
            }
            else if (this.providerName === 'openrouter') {
                const provider = new open_router_1.OpenRouter();
                const apiKey = this.config.apiKey || (0, envars_1.getEnvString)('OPENROUTER_API_KEY');
                if (!apiKey) {
                    throw new Error('OpenRouter API key is not set. Set the OPENROUTER_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayChatModel = provider.chatModel({
                    apiKey,
                    modelName: this.modelName,
                });
                gatewayConfig.temperature =
                    gatewayConfig.temperature ?? (0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 0);
                gatewayConfig.maxTokens = gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('OPENAI_MAX_TOKENS', 1024);
                gatewayConfig.maxTokens =
                    gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('OPENAI_MAX_COMPLETION_TOKENS');
                gatewayConfig.topP = gatewayConfig.topP ?? (0, envars_1.getEnvFloat)('OPENAI_TOP_P', 1);
                gatewayConfig.frequencyPenalty =
                    gatewayConfig.frequencyPenalty ?? (0, envars_1.getEnvFloat)('OPENAI_FREQUENCY_PENALTY', 0);
                gatewayConfig.presencePenalty =
                    gatewayConfig.presencePenalty ?? (0, envars_1.getEnvFloat)('OPENAI_PRESENCE_PENALTY', 0);
            }
            else if (this.providerName === 'togetherai') {
                const provider = new together_ai_1.TogetherAI();
                const apiKey = this.config.apiKey || (0, envars_1.getEnvString)('TOGETHER_API_KEY');
                if (!apiKey) {
                    throw new Error('TogetherAI API key is not set. Set the TOGETHER_API_KEY environment variable or add `apiKey` to the provider config.');
                }
                gatewayChatModel = provider.chatModel({
                    apiKey,
                    modelName: this.modelName,
                });
                gatewayConfig.temperature =
                    gatewayConfig.temperature ?? (0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 0);
                gatewayConfig.maxTokens = gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('OPENAI_MAX_TOKENS', 1024);
                gatewayConfig.maxTokens =
                    gatewayConfig.maxTokens ?? (0, envars_1.getEnvFloat)('OPENAI_MAX_COMPLETION_TOKENS');
                gatewayConfig.topP = gatewayConfig.topP ?? (0, envars_1.getEnvFloat)('OPENAI_TOP_P', 1);
                gatewayConfig.frequencyPenalty =
                    gatewayConfig.frequencyPenalty ?? (0, envars_1.getEnvFloat)('OPENAI_FREQUENCY_PENALTY', 0);
                gatewayConfig.presencePenalty =
                    gatewayConfig.presencePenalty ?? (0, envars_1.getEnvFloat)('OPENAI_PRESENCE_PENALTY', 0);
            }
            else {
                throw new Error(`Unsupported provider on Adaline Gateway: ${this.providerName}`);
            }
        }
        catch (error) {
            logger_1.default.error(`Adaline Gateway Chat API request error: ${String(error)}`);
            return {
                error: `request error: ${String(error)}`,
            };
        }
        let response;
        const gatewayRequest = {
            model: gatewayChatModel,
            config: gatewayConfig,
            messages: gatewayMessages,
            tools: gatewayTools,
            options: {
                enableCache: (0, cache_1.isCacheEnabled)(),
                customHeaders: this.config.headers,
            },
        };
        logger_1.default.debug(`Adaline Gateway Chat API request: ${(0, json_1.safeJsonStringify)(gatewayRequest)}`);
        try {
            response = (await this.gateway.completeChat(gatewayRequest));
            logger_1.default.debug(`Adaline Gateway Chat API response: ${(0, json_1.safeJsonStringify)(response)}`);
        }
        catch (error) {
            logger_1.default.error(`Adaline Gateway Chat API response error: ${String(error)}`);
            return {
                error: `API response error: ${String(error)} : ${(0, json_1.safeJsonStringify)(gatewayRequest)}`,
            };
        }
        try {
            let output = '';
            if (response.response.messages[0].content.length === 1 &&
                response.response.messages[0].content[0].modality === 'text') {
                output = response.response.messages[0].content[0].value;
                if (gatewayConfig.responseFormat === 'json_schema' && typeof output === 'string') {
                    try {
                        output = JSON.parse(output);
                    }
                    catch (error) {
                        throw new Error(`Failed to parse JSON output: ${error}`);
                    }
                }
            }
            else {
                if (formatType === 'openai') {
                    // convert gateway message type to openai message type if it's more than just text content
                    if (response.response.messages[0].content.filter((content) => content.modality === 'text')
                        .length > 0) {
                        // response has both text and tool-call content
                        output = {
                            content: response.response.messages[0].content
                                .filter((content) => content.modality === 'text')
                                .map((content) => content.value)
                                .join(' '),
                            tool_calls: response.response.messages[0].content
                                .filter((content) => content.modality === 'tool-call')
                                .map((content) => {
                                return {
                                    id: content.id,
                                    type: 'function',
                                    function: {
                                        name: content.name,
                                        arguments: content.arguments,
                                    },
                                };
                            }),
                        };
                    }
                    else {
                        // response has only tool-call content
                        output = response.response.messages[0].content
                            .filter((content) => content.modality === 'tool-call')
                            .map((content) => {
                            return {
                                id: content.id,
                                type: 'function',
                                function: {
                                    name: content.name,
                                    arguments: content.arguments,
                                },
                            };
                        });
                    }
                }
                else {
                    output = response.response.messages[0].content;
                }
            }
            let cost;
            const costConfig = { cost: this.config.cost };
            if (this.providerName === 'openai') {
                cost = (0, util_5.calculateOpenAICost)(this.modelName, costConfig, response.response.usage?.promptTokens, response.response.usage?.completionTokens);
            }
            else if (this.providerName === 'azureopenai') {
                cost = (0, util_3.calculateAzureCost)(this.modelName, {}, response.response.usage?.promptTokens, response.response.usage?.completionTokens);
            }
            else if (this.providerName === 'anthropic') {
                cost = (0, util_2.calculateAnthropicCost)(this.modelName, costConfig, response.response.usage?.promptTokens, response.response.usage?.completionTokens);
            }
            const logProbs = response.response.logProbs?.map((logProb) => logProb.logProb);
            const tokenUsage = {};
            if (response.cached) {
                tokenUsage.cached = response.response.usage?.totalTokens;
                tokenUsage.total = response.response.usage?.totalTokens;
            }
            else {
                tokenUsage.prompt = response.response.usage?.promptTokens;
                tokenUsage.completion = response.response.usage?.completionTokens;
                tokenUsage.total = response.response.usage?.totalTokens;
            }
            return {
                output,
                tokenUsage,
                cached: response.cached,
                cost,
                logProbs,
            };
        }
        catch (error) {
            logger_1.default.error(`Adaline Gateway Chat API post response error: ${String(error)}`);
            return {
                error: `API post response error: ${String(error)} : ${(0, json_1.safeJsonStringify)(response)}`,
            };
        }
    }
}
exports.AdalineGatewayChatProvider = AdalineGatewayChatProvider;
//# sourceMappingURL=adaline.gateway.js.map