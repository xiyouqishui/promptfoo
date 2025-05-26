"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiChatCompletionProvider = void 0;
const _1 = require(".");
const cache_1 = require("../../cache");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const util_1 = require("../../util");
const file_1 = require("../../util/file");
const client_1 = require("../mcp/client");
const transform_1 = require("../mcp/transform");
const shared_1 = require("../shared");
const util_2 = require("./util");
const util_3 = require("./util");
class OpenAiChatCompletionProvider extends _1.OpenAiGenericProvider {
    constructor(modelName, options = {}) {
        if (!OpenAiChatCompletionProvider.OPENAI_CHAT_MODEL_NAMES.includes(modelName)) {
            logger_1.default.debug(`Using unknown OpenAI chat model: ${modelName}`);
        }
        super(modelName, options);
        this.mcpClient = null;
        this.initializationPromise = null;
        this.config = options.config || {};
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
    isReasoningModel() {
        return (this.modelName.startsWith('o1') ||
            this.modelName.startsWith('o3') ||
            this.modelName.startsWith('o4'));
    }
    supportsTemperature() {
        // OpenAI's o1 and o3 models don't support temperature but some 3rd
        // party reasoning models do.
        return !this.isReasoningModel();
    }
    getOpenAiBody(prompt, context, callApiOptions) {
        // Merge configs from the provider and the prompt
        const config = {
            ...this.config,
            ...context?.prompt?.config,
        };
        const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
        const isReasoningModel = this.isReasoningModel();
        const maxCompletionTokens = isReasoningModel
            ? (config.max_completion_tokens ?? (0, envars_1.getEnvInt)('OPENAI_MAX_COMPLETION_TOKENS'))
            : undefined;
        const maxTokens = isReasoningModel
            ? undefined
            : (config.max_tokens ?? (0, envars_1.getEnvInt)('OPENAI_MAX_TOKENS', 1024));
        const temperature = this.supportsTemperature()
            ? (config.temperature ?? (0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 0))
            : undefined;
        const reasoningEffort = isReasoningModel
            ? (0, util_1.renderVarsInObject)(config.reasoning_effort, context?.vars)
            : undefined;
        // --- MCP tool injection logic ---
        const mcpTools = this.mcpClient ? (0, transform_1.transformMCPToolsToOpenAi)(this.mcpClient.getAllTools()) : [];
        const fileTools = config.tools
            ? (0, util_1.maybeLoadToolsFromExternalFile)(config.tools, context?.vars) || []
            : [];
        const allTools = [...mcpTools, ...fileTools];
        // --- End MCP tool injection logic ---
        const body = {
            model: this.modelName,
            messages,
            seed: config.seed,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
            ...(maxCompletionTokens ? { max_completion_tokens: maxCompletionTokens } : {}),
            ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
            ...(temperature ? { temperature } : {}),
            ...(config.top_p !== undefined || (0, envars_1.getEnvString)('OPENAI_TOP_P')
                ? { top_p: config.top_p ?? (0, envars_1.getEnvFloat)('OPENAI_TOP_P', 1) }
                : {}),
            ...(config.presence_penalty !== undefined || (0, envars_1.getEnvString)('OPENAI_PRESENCE_PENALTY')
                ? {
                    presence_penalty: config.presence_penalty ?? (0, envars_1.getEnvFloat)('OPENAI_PRESENCE_PENALTY', 0),
                }
                : {}),
            ...(config.frequency_penalty !== undefined || (0, envars_1.getEnvString)('OPENAI_FREQUENCY_PENALTY')
                ? {
                    frequency_penalty: config.frequency_penalty ?? (0, envars_1.getEnvFloat)('OPENAI_FREQUENCY_PENALTY', 0),
                }
                : {}),
            ...(config.functions
                ? {
                    functions: (0, file_1.maybeLoadFromExternalFile)((0, util_1.renderVarsInObject)(config.functions, context?.vars)),
                }
                : {}),
            ...(config.function_call ? { function_call: config.function_call } : {}),
            ...(allTools.length > 0 ? { tools: allTools } : {}),
            ...(config.tool_choice ? { tool_choice: config.tool_choice } : {}),
            ...(config.tool_resources ? { tool_resources: config.tool_resources } : {}),
            ...(config.response_format
                ? {
                    response_format: (0, file_1.maybeLoadFromExternalFile)((0, util_1.renderVarsInObject)(config.response_format, context?.vars)),
                }
                : {}),
            ...(callApiOptions?.includeLogProbs ? { logprobs: callApiOptions.includeLogProbs } : {}),
            ...(config.stop ? { stop: config.stop } : {}),
            ...(config.passthrough || {}),
            ...(this.modelName.includes('audio')
                ? {
                    modalities: config.modalities || ['text', 'audio'],
                    audio: config.audio || { voice: 'alloy', format: 'wav' },
                }
                : {}),
        };
        return { body, config };
    }
    async callApi(prompt, context, callApiOptions) {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        if (this.requiresApiKey() && !this.getApiKey()) {
            throw new Error('OpenAI API key is not set. Set the OPENAI_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        const { body, config } = this.getOpenAiBody(prompt, context, callApiOptions);
        logger_1.default.debug(`Calling OpenAI API: ${JSON.stringify(body)}`);
        let data, status, statusText;
        let cached = false;
        try {
            ({ data, cached, status, statusText } = await (0, cache_1.fetchWithCache)(`${this.getApiUrl()}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getApiKey()}`,
                    ...(this.getOrganization() ? { 'OpenAI-Organization': this.getOrganization() } : {}),
                    ...config.headers,
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS));
            if (status < 200 || status >= 300) {
                return {
                    error: `API error: ${status} ${statusText}\n${typeof data === 'string' ? data : JSON.stringify(data)}`,
                };
            }
        }
        catch (err) {
            logger_1.default.error(`API call error: ${String(err)}`);
            await data?.deleteFromCache?.();
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`\tOpenAI chat completions API response: ${JSON.stringify(data)}`);
        if (data.error) {
            await data.deleteFromCache?.();
            return {
                error: (0, util_3.formatOpenAiError)(data),
            };
        }
        try {
            const message = data.choices[0].message;
            if (message.refusal) {
                return {
                    output: message.refusal,
                    tokenUsage: (0, util_3.getTokenUsage)(data, cached),
                    isRefusal: true,
                };
            }
            let output = '';
            if (message.reasoning) {
                output = message.reasoning;
            }
            else if (message.content && (message.function_call || message.tool_calls)) {
                if (Array.isArray(message.tool_calls) && message.tool_calls.length === 0) {
                    output = message.content;
                }
                else {
                    output = message;
                }
            }
            else if (message.content === null ||
                message.content === undefined ||
                (message.content === '' && message.tool_calls)) {
                output = message.function_call || message.tool_calls;
            }
            else {
                output = message.content;
            }
            const logProbs = data.choices[0].logprobs?.content?.map((logProbObj) => logProbObj.logprob);
            // Handle structured output
            if (config.response_format?.type === 'json_schema' && typeof output === 'string') {
                try {
                    output = JSON.parse(output);
                }
                catch (error) {
                    logger_1.default.error(`Failed to parse JSON output: ${error}`);
                }
            }
            // Handle function tool callbacks
            const functionCalls = message.function_call ? [message.function_call] : message.tool_calls;
            if (functionCalls && config.functionToolCallbacks) {
                const results = [];
                for (const functionCall of functionCalls) {
                    const functionName = functionCall.name || functionCall.function?.name;
                    if (config.functionToolCallbacks[functionName]) {
                        try {
                            const functionResult = await config.functionToolCallbacks[functionName](functionCall.arguments || functionCall.function?.arguments);
                            results.push(functionResult);
                        }
                        catch (error) {
                            logger_1.default.error(`Error executing function ${functionName}: ${error}`);
                        }
                    }
                }
                if (results.length > 0) {
                    return {
                        output: results.join('\n'),
                        tokenUsage: (0, util_3.getTokenUsage)(data, cached),
                        cached,
                        logProbs,
                        cost: (0, util_2.calculateOpenAICost)(this.modelName, config, data.usage?.prompt_tokens, data.usage?.completion_tokens, data.usage?.audio_prompt_tokens, data.usage?.audio_completion_tokens),
                    };
                }
            }
            // Handle DeepSeek reasoning model's reasoning_content by prepending it to the output
            if (message.reasoning_content &&
                typeof message.reasoning_content === 'string' &&
                typeof output === 'string' &&
                (this.config.showThinking ?? true)) {
                output = `Thinking: ${message.reasoning_content}\n\n${output}`;
            }
            if (message.audio) {
                return {
                    output: message.audio.transcript || '',
                    audio: {
                        id: message.audio.id,
                        expiresAt: message.audio.expires_at,
                        data: message.audio.data,
                        transcript: message.audio.transcript,
                        format: message.audio.format || 'wav',
                    },
                    tokenUsage: (0, util_3.getTokenUsage)(data, cached),
                    cached,
                    logProbs,
                    cost: (0, util_2.calculateOpenAICost)(this.modelName, config, data.usage?.prompt_tokens, data.usage?.completion_tokens, data.usage?.audio_prompt_tokens, data.usage?.audio_completion_tokens),
                };
            }
            return {
                output,
                tokenUsage: (0, util_3.getTokenUsage)(data, cached),
                cached,
                logProbs,
                cost: (0, util_2.calculateOpenAICost)(this.modelName, config, data.usage?.prompt_tokens, data.usage?.completion_tokens, data.usage?.audio_prompt_tokens, data.usage?.audio_completion_tokens),
            };
        }
        catch (err) {
            await data?.deleteFromCache?.();
            return {
                error: `API error: ${String(err)}: ${JSON.stringify(data)}`,
            };
        }
    }
}
exports.OpenAiChatCompletionProvider = OpenAiChatCompletionProvider;
OpenAiChatCompletionProvider.OPENAI_CHAT_MODELS = util_3.OPENAI_CHAT_MODELS;
OpenAiChatCompletionProvider.OPENAI_CHAT_MODEL_NAMES = util_3.OPENAI_CHAT_MODELS.map((model) => model.id);
//# sourceMappingURL=chat.js.map