"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicMessagesProvider = void 0;
const sdk_1 = require("@anthropic-ai/sdk");
const cache_1 = require("../../cache");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const util_1 = require("../../util");
const client_1 = require("../mcp/client");
const transform_1 = require("../mcp/transform");
const generic_1 = require("./generic");
const util_2 = require("./util");
class AnthropicMessagesProvider extends generic_1.AnthropicGenericProvider {
    constructor(modelName, options = {}) {
        if (!AnthropicMessagesProvider.ANTHROPIC_MODELS_NAMES.includes(modelName)) {
            logger_1.default.warn(`Using unknown Anthropic model: ${modelName}`);
        }
        super(modelName, options);
        this.mcpClient = null;
        this.initializationPromise = null;
        const { id } = options;
        this.id = id ? () => id : this.id;
        // Start initialization if MCP is enabled
        if (this.config.mcp?.enabled) {
            this.initializationPromise = this.initializeMCP();
        }
    }
    async initializeMCP() {
        this.mcpClient = new client_1.MCPClient(this.config.mcp);
        await this.mcpClient.initialize();
    }
    async cleanup() {
        if (this.mcpClient) {
            await this.initializationPromise;
            await this.mcpClient.cleanup();
            this.mcpClient = null;
        }
    }
    toString() {
        if (!this.modelName) {
            throw new Error('Anthropic model name is not set. Please provide a valid model name.');
        }
        return `[Anthropic Messages Provider ${this.modelName}]`;
    }
    async callApi(prompt) {
        // Wait for MCP initialization if it's in progress
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        if (!this.apiKey) {
            throw new Error('Anthropic API key is not set. Set the ANTHROPIC_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        if (!this.modelName) {
            throw new Error('Anthropic model name is not set. Please provide a valid model name.');
        }
        const { system, extractedMessages, thinking } = (0, util_2.parseMessages)(prompt);
        // Get MCP tools if client is initialized
        let mcpTools = [];
        if (this.mcpClient) {
            mcpTools = (0, transform_1.transformMCPToolsToAnthropic)(this.mcpClient.getAllTools());
        }
        const fileTools = (0, util_1.maybeLoadToolsFromExternalFile)(this.config.tools) || [];
        const allTools = [...mcpTools, ...fileTools];
        const params = {
            model: this.modelName,
            ...(system ? { system } : {}),
            max_tokens: this.config?.max_tokens ||
                (0, envars_1.getEnvInt)('ANTHROPIC_MAX_TOKENS', this.config.thinking || thinking ? 2048 : 1024),
            messages: extractedMessages,
            stream: false,
            temperature: this.config.thinking || thinking
                ? this.config.temperature
                : this.config.temperature || (0, envars_1.getEnvFloat)('ANTHROPIC_TEMPERATURE', 0),
            ...(allTools.length > 0 ? { tools: allTools } : {}),
            ...(this.config.tool_choice ? { tool_choice: this.config.tool_choice } : {}),
            ...(this.config.thinking || thinking ? { thinking: this.config.thinking || thinking } : {}),
            ...(typeof this.config?.extra_body === 'object' && this.config.extra_body
                ? this.config.extra_body
                : {}),
        };
        logger_1.default.debug(`Calling Anthropic Messages API: ${JSON.stringify(params)}`);
        const headers = {
            ...(this.config.headers || {}),
        };
        // Add beta features header if specified
        if (this.config.beta?.length) {
            headers['anthropic-beta'] = this.config.beta.join(',');
        }
        const cache = await (0, cache_1.getCache)();
        const cacheKey = `anthropic:${JSON.stringify(params)}`;
        if ((0, cache_1.isCacheEnabled)()) {
            // Try to get the cached response
            const cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                logger_1.default.debug(`Returning cached response for ${prompt}: ${cachedResponse}`);
                try {
                    const parsedCachedResponse = JSON.parse(cachedResponse);
                    return {
                        output: (0, util_2.outputFromMessage)(parsedCachedResponse, this.config.showThinking ?? true),
                        tokenUsage: (0, util_2.getTokenUsage)(parsedCachedResponse, true),
                        cost: (0, util_2.calculateAnthropicCost)(this.modelName, this.config, parsedCachedResponse.usage?.input_tokens, parsedCachedResponse.usage?.output_tokens),
                    };
                }
                catch {
                    // Could be an old cache item, which was just the text content from TextBlock.
                    return {
                        output: cachedResponse,
                        tokenUsage: {},
                    };
                }
            }
        }
        try {
            const response = await this.anthropic.messages.create(params, {
                ...(typeof headers === 'object' && Object.keys(headers).length > 0 ? { headers } : {}),
            });
            logger_1.default.debug(`Anthropic Messages API response: ${JSON.stringify(response)}`);
            if ((0, cache_1.isCacheEnabled)()) {
                try {
                    await cache.set(cacheKey, JSON.stringify(response));
                }
                catch (err) {
                    logger_1.default.error(`Failed to cache response: ${String(err)}`);
                }
            }
            if ('stream' in response) {
                // Handle streaming response
                return {
                    output: 'Streaming response not supported in this context',
                    error: 'Streaming should be disabled for this use case',
                };
            }
            return {
                output: (0, util_2.outputFromMessage)(response, this.config.showThinking ?? true),
                tokenUsage: (0, util_2.getTokenUsage)(response, false),
                cost: (0, util_2.calculateAnthropicCost)(this.modelName, this.config, response.usage?.input_tokens, response.usage?.output_tokens),
            };
        }
        catch (err) {
            logger_1.default.error(`Anthropic Messages API call error: ${err instanceof Error ? err.message : String(err)}`);
            if (err instanceof sdk_1.APIError && err.error) {
                const errorDetails = err.error;
                return {
                    error: `API call error: ${errorDetails.error.message}, status ${err.status}, type ${errorDetails.error.type}`,
                };
            }
            return {
                error: `API call error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    }
}
exports.AnthropicMessagesProvider = AnthropicMessagesProvider;
AnthropicMessagesProvider.ANTHROPIC_MODELS = util_2.ANTHROPIC_MODELS;
AnthropicMessagesProvider.ANTHROPIC_MODELS_NAMES = util_2.ANTHROPIC_MODELS.map((model) => model.id);
//# sourceMappingURL=messages.js.map