"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiResponsesProvider = void 0;
const _1 = require(".");
const cache_1 = require("../../cache");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const util_1 = require("../../util");
const file_1 = require("../../util/file");
const shared_1 = require("../shared");
const util_2 = require("./util");
const util_3 = require("./util");
class OpenAiResponsesProvider extends _1.OpenAiGenericProvider {
    constructor(modelName, options = {}) {
        super(modelName, options);
        this.config = options.config || {};
    }
    isReasoningModel() {
        return (this.modelName.startsWith('o1') ||
            this.modelName.startsWith('o3') ||
            this.modelName.startsWith('o4') ||
            this.modelName === 'codex-mini-latest');
    }
    supportsTemperature() {
        // OpenAI's o1 and o3 models don't support temperature but some 3rd
        // party reasoning models do.
        return !this.isReasoningModel();
    }
    getOpenAiBody(prompt, context, callApiOptions) {
        const config = {
            ...this.config,
            ...context?.prompt?.config,
        };
        let input;
        try {
            const parsedJson = JSON.parse(prompt);
            if (Array.isArray(parsedJson)) {
                input = parsedJson;
            }
            else {
                input = prompt;
            }
        }
        catch {
            input = prompt;
        }
        const isReasoningModel = this.isReasoningModel();
        const maxOutputTokens = config.max_output_tokens ??
            (isReasoningModel
                ? (0, envars_1.getEnvInt)('OPENAI_MAX_COMPLETION_TOKENS')
                : (0, envars_1.getEnvInt)('OPENAI_MAX_TOKENS', 1024));
        const temperature = this.supportsTemperature()
            ? (config.temperature ?? (0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 0))
            : undefined;
        const reasoningEffort = isReasoningModel
            ? (0, util_1.renderVarsInObject)(config.reasoning_effort, context?.vars)
            : undefined;
        const instructions = config.instructions;
        let textFormat;
        if (config.response_format) {
            if (config.response_format.type === 'json_object') {
                textFormat = {
                    format: {
                        type: 'json_object',
                    },
                };
                // IMPORTANT: json_object format requires the word 'json' in the input prompt
            }
            else if (config.response_format.type === 'json_schema') {
                const schema = (0, file_1.maybeLoadFromExternalFile)((0, util_1.renderVarsInObject)(config.response_format.schema || config.response_format.json_schema?.schema, context?.vars));
                const schemaName = config.response_format.json_schema?.name ||
                    config.response_format.name ||
                    'response_schema';
                textFormat = {
                    format: {
                        type: 'json_schema',
                        name: schemaName,
                        schema,
                        strict: true,
                    },
                };
            }
            else {
                textFormat = { format: { type: 'text' } };
            }
        }
        else {
            textFormat = { format: { type: 'text' } };
        }
        const body = {
            model: this.modelName,
            input,
            ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
            ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
            ...(temperature ? { temperature } : {}),
            ...(instructions ? { instructions } : {}),
            ...(config.top_p !== undefined || (0, envars_1.getEnvString)('OPENAI_TOP_P')
                ? { top_p: config.top_p ?? (0, envars_1.getEnvFloat)('OPENAI_TOP_P', 1) }
                : {}),
            ...(config.tools
                ? { tools: (0, util_1.maybeLoadToolsFromExternalFile)(config.tools, context?.vars) }
                : {}),
            ...(config.tool_choice ? { tool_choice: config.tool_choice } : {}),
            ...(config.previous_response_id ? { previous_response_id: config.previous_response_id } : {}),
            text: textFormat,
            ...(config.truncation ? { truncation: config.truncation } : {}),
            ...(config.metadata ? { metadata: config.metadata } : {}),
            ...('parallel_tool_calls' in config
                ? { parallel_tool_calls: Boolean(config.parallel_tool_calls) }
                : {}),
            ...(config.stream ? { stream: config.stream } : {}),
            ...('store' in config ? { store: Boolean(config.store) } : {}),
            ...(config.user ? { user: config.user } : {}),
            ...(config.passthrough || {}),
        };
        return { body, config };
    }
    async callApi(prompt, context, callApiOptions) {
        if (!this.getApiKey()) {
            throw new Error('OpenAI API key is not set. Set the OPENAI_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        const { body, config } = this.getOpenAiBody(prompt, context, callApiOptions);
        logger_1.default.debug(`Calling OpenAI Responses API: ${JSON.stringify(body)}`);
        let data, status, statusText;
        let cached = false;
        try {
            ({ data, cached, status, statusText } = await (0, cache_1.fetchWithCache)(`${this.getApiUrl()}/responses`, {
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
        logger_1.default.debug(`\tOpenAI Responses API response: ${JSON.stringify(data)}`);
        if (data.error) {
            await data.deleteFromCache?.();
            return {
                error: (0, util_3.formatOpenAiError)(data),
            };
        }
        try {
            // Find the assistant message in the output
            const output = data.output;
            if (!output || !Array.isArray(output) || output.length === 0) {
                return {
                    error: `Invalid response format: Missing output array`,
                };
            }
            let result = '';
            let refusal = '';
            let isRefusal = false;
            // Process all output items
            for (const item of output) {
                if (item.type === 'function_call') {
                    result = JSON.stringify(item);
                }
                else if (item.type === 'message' && item.role === 'assistant') {
                    if (item.content) {
                        for (const contentItem of item.content) {
                            if (contentItem.type === 'output_text') {
                                result += contentItem.text;
                            }
                            else if (contentItem.type === 'tool_use' || contentItem.type === 'function_call') {
                                result = JSON.stringify(contentItem);
                            }
                            else if (contentItem.type === 'refusal') {
                                refusal = contentItem.refusal;
                                isRefusal = true;
                            }
                        }
                    }
                    else if (item.refusal) {
                        refusal = item.refusal;
                        isRefusal = true;
                    }
                }
                else if (item.type === 'tool_result') {
                    result = JSON.stringify(item);
                }
            }
            if (isRefusal) {
                return {
                    output: refusal,
                    tokenUsage: (0, util_3.getTokenUsage)(data, cached),
                    isRefusal: true,
                    cached,
                    cost: (0, util_2.calculateOpenAICost)(this.modelName, config, data.usage?.input_tokens, data.usage?.output_tokens, 0, 0),
                    raw: data,
                };
            }
            if (config.response_format?.type === 'json_schema' && typeof result === 'string') {
                try {
                    result = JSON.parse(result);
                }
                catch (error) {
                    logger_1.default.error(`Failed to parse JSON output: ${error}`);
                }
            }
            const tokenUsage = (0, util_3.getTokenUsage)(data, cached);
            return {
                output: result,
                tokenUsage,
                cached,
                cost: (0, util_2.calculateOpenAICost)(this.modelName, config, data.usage?.input_tokens, data.usage?.output_tokens, 0, 0),
                raw: data,
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
exports.OpenAiResponsesProvider = OpenAiResponsesProvider;
OpenAiResponsesProvider.OPENAI_RESPONSES_MODEL_NAMES = [
    'gpt-4o',
    'gpt-4o-2024-08-06',
    'gpt-4.1',
    'gpt-4.1-2025-04-14',
    'gpt-4.1-mini',
    'gpt-4.1-mini-2025-04-14',
    'gpt-4.1-nano',
    'gpt-4.1-nano-2025-04-14',
    'o1',
    'o1-preview',
    'o1-mini',
    'o1-pro',
    'o3',
    'o3-2025-04-16',
    'o4-mini',
    'o4-mini-2025-04-16',
    'o3-mini',
    'gpt-4.5-preview',
    'gpt-4.5-preview-2025-02-27',
    'codex-mini-latest',
];
//# sourceMappingURL=responses.js.map