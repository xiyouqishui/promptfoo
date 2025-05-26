"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureChatCompletionProvider = void 0;
const cache_1 = require("../../cache");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const util_1 = require("../../util");
const file_1 = require("../../util/file");
const invariant_1 = __importDefault(require("../../util/invariant"));
const client_1 = require("../mcp/client");
const transform_1 = require("../mcp/transform");
const shared_1 = require("../shared");
const defaults_1 = require("./defaults");
const generic_1 = require("./generic");
const util_2 = require("./util");
class AzureChatCompletionProvider extends generic_1.AzureGenericProvider {
    constructor(...args) {
        super(...args);
        this.mcpClient = null;
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
    /**
     * Check if the current deployment is configured as a reasoning model
     */
    isReasoningModel() {
        return !!this.config.isReasoningModel || !!this.config.o1;
    }
    getOpenAiBody(prompt, context, callApiOptions) {
        const config = {
            ...this.config,
            ...context?.prompt?.config,
        };
        // Parse chat prompt
        const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
        // Response format with variable rendering
        const responseFormat = config.response_format
            ? {
                response_format: (0, file_1.maybeLoadFromExternalFile)((0, util_1.renderVarsInObject)(config.response_format, context?.vars)),
            }
            : {};
        // Check if this is configured as a reasoning model
        const isReasoningModel = this.isReasoningModel();
        // Get max tokens based on model type
        const maxTokens = config.max_tokens ?? (0, envars_1.getEnvInt)('OPENAI_MAX_TOKENS', 1024);
        const maxCompletionTokens = config.max_completion_tokens;
        // Get reasoning effort for reasoning models
        const reasoningEffort = config.reasoning_effort ?? 'medium';
        // --- MCP tool injection logic ---
        const mcpTools = this.mcpClient ? (0, transform_1.transformMCPToolsToOpenAi)(this.mcpClient.getAllTools()) : [];
        const fileTools = config.tools
            ? (0, util_1.maybeLoadToolsFromExternalFile)(config.tools, context?.vars) || []
            : [];
        const allTools = [...mcpTools, ...fileTools];
        // --- End MCP tool injection logic ---
        // Build the request body
        const body = {
            model: this.deploymentName,
            messages,
            ...(isReasoningModel
                ? {
                    max_completion_tokens: maxCompletionTokens ?? maxTokens,
                    reasoning_effort: (0, util_1.renderVarsInObject)(reasoningEffort, context?.vars),
                }
                : {
                    max_tokens: maxTokens,
                    temperature: config.temperature ?? (0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 0),
                }),
            top_p: config.top_p ?? (0, envars_1.getEnvFloat)('OPENAI_TOP_P', 1),
            presence_penalty: config.presence_penalty ?? (0, envars_1.getEnvFloat)('OPENAI_PRESENCE_PENALTY', 0),
            frequency_penalty: config.frequency_penalty ?? (0, envars_1.getEnvFloat)('OPENAI_FREQUENCY_PENALTY', 0),
            ...(config.seed === undefined ? {} : { seed: config.seed }),
            ...(config.functions
                ? {
                    functions: (0, file_1.maybeLoadFromExternalFile)((0, util_1.renderVarsInObject)(config.functions, context?.vars)),
                }
                : {}),
            ...(config.function_call ? { function_call: config.function_call } : {}),
            ...(allTools.length > 0 ? { tools: allTools } : {}),
            ...(config.tool_choice ? { tool_choice: config.tool_choice } : {}),
            ...(config.deployment_id ? { deployment_id: config.deployment_id } : {}),
            ...(config.dataSources ? { dataSources: config.dataSources } : {}),
            ...responseFormat,
            ...(callApiOptions?.includeLogProbs ? { logprobs: callApiOptions.includeLogProbs } : {}),
            ...(config.stop ? { stop: config.stop } : {}),
            ...(config.passthrough || {}),
        };
        logger_1.default.debug(`Azure API request body: ${JSON.stringify(body)}`);
        return { body, config };
    }
    async callApi(prompt, context, callApiOptions) {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        await this.ensureInitialized();
        (0, invariant_1.default)(this.authHeaders, 'auth headers are not initialized');
        if (!this.getApiBaseUrl()) {
            throw new Error('Azure API host must be set.');
        }
        const { body, config } = this.getOpenAiBody(prompt, context, callApiOptions);
        let data;
        let cached = false;
        try {
            const url = config.dataSources
                ? `${this.getApiBaseUrl()}/openai/deployments/${this.deploymentName}/extensions/chat/completions?api-version=${config.apiVersion || defaults_1.DEFAULT_AZURE_API_VERSION}`
                : `${this.getApiBaseUrl()}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${config.apiVersion || defaults_1.DEFAULT_AZURE_API_VERSION}`;
            const { data: responseData, cached: isCached, status, } = await (0, cache_1.fetchWithCache)(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.authHeaders,
                },
                body: JSON.stringify(body),
            }, shared_1.REQUEST_TIMEOUT_MS);
            cached = isCached;
            // Handle the response data
            if (typeof responseData === 'string') {
                try {
                    data = JSON.parse(responseData);
                }
                catch {
                    return {
                        error: `API returned invalid JSON response (status ${status}): ${responseData}\n\nRequest body: ${JSON.stringify(body, null, 2)}`,
                    };
                }
            }
            else {
                data = responseData;
            }
        }
        catch (err) {
            return {
                error: `API call error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
        logger_1.default.debug(`Azure API response: ${JSON.stringify(data)}`);
        try {
            if (data.error) {
                if (data.error.code === 'content_filter' && data.error.status === 400) {
                    return {
                        output: data.error.message,
                        guardrails: {
                            flagged: true,
                            flaggedInput: true,
                            flaggedOutput: false,
                        },
                    };
                }
                return {
                    error: `API response error: ${data.error.code} ${data.error.message}`,
                };
            }
            const hasDataSources = !!config.dataSources;
            const choice = hasDataSources
                ? data.choices.find((choice) => choice.message.role === 'assistant')
                : data.choices[0];
            const message = choice?.message;
            // Handle structured output
            let output = message.content;
            if (output == null) {
                if (choice.finish_reason === 'content_filter') {
                    output =
                        "The generated content was filtered due to triggering Azure OpenAI Service's content filtering system.";
                }
                else {
                    // Restore tool_calls and function_call handling
                    output = message.tool_calls ?? message.function_call;
                }
            }
            else if (config.response_format?.type === 'json_schema' ||
                config.response_format?.type === 'json_object') {
                try {
                    output = JSON.parse(output);
                }
                catch (err) {
                    logger_1.default.error(`Failed to parse JSON output: ${err}. Output was: ${output}`);
                }
            }
            const logProbs = data.choices[0].logprobs?.content?.map((logProbObj) => logProbObj.logprob);
            const contentFilterResults = data.choices[0]?.content_filter_results;
            const promptFilterResults = data.prompt_filter_results;
            const guardrailsTriggered = !!((contentFilterResults && Object.keys(contentFilterResults).length > 0) ||
                (promptFilterResults && promptFilterResults.length > 0));
            const flaggedInput = promptFilterResults?.some((result) => Object.values(result.content_filter_results).some((filter) => filter.filtered)) ?? false;
            const flaggedOutput = Object.values(contentFilterResults || {}).some((filter) => filter.filtered);
            return {
                output,
                tokenUsage: cached
                    ? { cached: data.usage?.total_tokens, total: data?.usage?.total_tokens }
                    : {
                        total: data.usage?.total_tokens,
                        prompt: data.usage?.prompt_tokens,
                        completion: data.usage?.completion_tokens,
                        ...(data.usage?.completion_tokens_details
                            ? {
                                completionDetails: {
                                    reasoning: data.usage.completion_tokens_details.reasoning_tokens,
                                    acceptedPrediction: data.usage.completion_tokens_details.accepted_prediction_tokens,
                                    rejectedPrediction: data.usage.completion_tokens_details.rejected_prediction_tokens,
                                },
                            }
                            : {}),
                    },
                cached,
                logProbs,
                cost: (0, util_2.calculateAzureCost)(this.deploymentName, config, data.usage?.prompt_tokens, data.usage?.completion_tokens),
                ...(guardrailsTriggered
                    ? {
                        guardrails: {
                            flaggedInput,
                            flaggedOutput,
                            flagged: flaggedInput || flaggedOutput,
                        },
                    }
                    : {}),
            };
        }
        catch (err) {
            return {
                error: `API response error: ${String(err)}: ${JSON.stringify(data)}`,
            };
        }
    }
}
exports.AzureChatCompletionProvider = AzureChatCompletionProvider;
//# sourceMappingURL=chat.js.map