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
exports.AwsBedrockEmbeddingProvider = exports.AwsBedrockCompletionProvider = exports.AwsBedrockGenericProvider = exports.AWS_BEDROCK_MODELS = exports.BEDROCK_MODEL = exports.getLlamaModelHandler = exports.formatPromptLlama4 = exports.formatPromptLlama3Instruct = exports.formatPromptLlama2Chat = exports.LlamaVersion = exports.coerceStrToNum = void 0;
exports.parseValue = parseValue;
exports.addConfigParam = addConfigParam;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const dedent_1 = __importDefault(require("dedent"));
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const telemetry_1 = __importDefault(require("../telemetry"));
const util_1 = require("../util");
const util_2 = require("./anthropic/util");
const bedrockUtil_1 = require("./bedrockUtil");
const shared_1 = require("./shared");
// Utility function to coerce string values to numbers
const coerceStrToNum = (value) => value === undefined ? undefined : typeof value === 'string' ? Number(value) : value;
exports.coerceStrToNum = coerceStrToNum;
function parseValue(value, defaultValue) {
    if (typeof defaultValue === 'number') {
        if (typeof value === 'string') {
            return Number.isNaN(Number.parseFloat(value)) ? defaultValue : Number.parseFloat(value);
        }
        return value;
    }
    return value;
}
function addConfigParam(params, key, configValue, envValue, defaultValue) {
    if (configValue !== undefined || envValue !== undefined || defaultValue !== undefined) {
        params[key] =
            configValue ?? (envValue === undefined ? defaultValue : parseValue(envValue, defaultValue));
    }
}
var LlamaVersion;
(function (LlamaVersion) {
    LlamaVersion[LlamaVersion["V2"] = 2] = "V2";
    LlamaVersion[LlamaVersion["V3"] = 3] = "V3";
    LlamaVersion[LlamaVersion["V3_1"] = 3.1] = "V3_1";
    LlamaVersion[LlamaVersion["V3_2"] = 3.2] = "V3_2";
    LlamaVersion[LlamaVersion["V3_3"] = 3.3] = "V3_3";
    LlamaVersion[LlamaVersion["V4"] = 4] = "V4";
})(LlamaVersion || (exports.LlamaVersion = LlamaVersion = {}));
// see https://github.com/meta-llama/llama/blob/main/llama/generation.py#L284-L395
const formatPromptLlama2Chat = (messages) => {
    if (messages.length === 0) {
        return '';
    }
    let formattedPrompt = '<s>';
    let systemMessageIncluded = false;
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        switch (message.role) {
            case 'system':
                if (!systemMessageIncluded) {
                    formattedPrompt += `[INST] <<SYS>>\n${message.content.trim()}\n<</SYS>>\n\n`;
                    systemMessageIncluded = true;
                }
                break;
            case 'user':
                if (i === 0 && !systemMessageIncluded) {
                    formattedPrompt += `[INST] ${message.content.trim()} [/INST]`;
                }
                else if (i === 0 && systemMessageIncluded) {
                    formattedPrompt += `${message.content.trim()} [/INST]`;
                }
                else if (i > 0 && messages[i - 1].role === 'assistant') {
                    formattedPrompt += `<s>[INST] ${message.content.trim()} [/INST]`;
                }
                else {
                    formattedPrompt += `${message.content.trim()} [/INST]`;
                }
                break;
            case 'assistant':
                formattedPrompt += ` ${message.content.trim()} </s>`;
                break;
            default:
                throw new Error(`Unexpected role: ${message.role}`);
        }
    }
    return formattedPrompt;
};
exports.formatPromptLlama2Chat = formatPromptLlama2Chat;
const formatPromptLlama3Instruct = (messages) => {
    let formattedPrompt = '<|begin_of_text|>';
    for (const message of messages) {
        formattedPrompt += (0, dedent_1.default) `
      <|start_header_id|>${message.role}<|end_header_id|>

      ${message.content.trim()}<|eot_id|>`;
    }
    formattedPrompt += '<|start_header_id|>assistant<|end_header_id|>';
    return formattedPrompt;
};
exports.formatPromptLlama3Instruct = formatPromptLlama3Instruct;
// Llama 4 format uses different tags
const formatPromptLlama4 = (messages) => {
    let formattedPrompt = '<|begin_of_text|>';
    for (const message of messages) {
        formattedPrompt += (0, dedent_1.default) `<|header_start|>${message.role}<|header_end|>

${message.content.trim()}<|eot|>`;
    }
    // Add assistant header for completion
    formattedPrompt += '<|header_start|>assistant<|header_end|>';
    return formattedPrompt;
};
exports.formatPromptLlama4 = formatPromptLlama4;
const getLlamaModelHandler = (version) => {
    if (![
        LlamaVersion.V2,
        LlamaVersion.V3,
        LlamaVersion.V3_1,
        LlamaVersion.V3_2,
        LlamaVersion.V3_3,
        LlamaVersion.V4,
    ].includes(version)) {
        throw new Error(`Unsupported LLAMA version: ${version}`);
    }
    return {
        params: (config, prompt, stop, modelName) => {
            const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
            let finalPrompt;
            switch (version) {
                case LlamaVersion.V2:
                    finalPrompt = (0, exports.formatPromptLlama2Chat)(messages);
                    break;
                case LlamaVersion.V3:
                case LlamaVersion.V3_1:
                case LlamaVersion.V3_2:
                case LlamaVersion.V3_3:
                    finalPrompt = (0, exports.formatPromptLlama3Instruct)(messages);
                    break;
                case LlamaVersion.V4:
                    finalPrompt = (0, exports.formatPromptLlama4)(messages);
                    break;
                default:
                    throw new Error(`Unsupported LLAMA version: ${version}`);
            }
            const params = {
                prompt: finalPrompt,
            };
            addConfigParam(params, 'temperature', config?.temperature, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TEMPERATURE'), 0);
            addConfigParam(params, 'top_p', config?.top_p, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TOP_P'), 1);
            addConfigParam(params, 'max_gen_len', config?.max_gen_len, (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_GEN_LEN'), 1024);
            return params;
        },
        output: (config, responseJson) => responseJson?.generation,
        tokenUsage: (responseJson, promptText) => {
            if (responseJson?.usage) {
                return {
                    prompt: (0, exports.coerceStrToNum)(responseJson.usage.prompt_tokens),
                    completion: (0, exports.coerceStrToNum)(responseJson.usage.completion_tokens),
                    total: (0, exports.coerceStrToNum)(responseJson.usage.total_tokens),
                    numRequests: 1,
                };
            }
            // Check for Llama-specific token count fields
            const promptTokens = responseJson?.prompt_token_count;
            const completionTokens = responseJson?.generation_token_count;
            if (promptTokens !== undefined && completionTokens !== undefined) {
                const promptTokensNum = (0, exports.coerceStrToNum)(promptTokens);
                const completionTokensNum = (0, exports.coerceStrToNum)(completionTokens);
                return {
                    prompt: promptTokensNum,
                    completion: completionTokensNum,
                    total: (promptTokensNum ?? 0) + (completionTokensNum ?? 0),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    };
};
exports.getLlamaModelHandler = getLlamaModelHandler;
exports.BEDROCK_MODEL = {
    AI21: {
        params: (config, prompt, stop, modelName) => {
            const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
            const params = {
                messages,
            };
            addConfigParam(params, 'max_tokens', config?.max_tokens, (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_TOKENS'), undefined);
            addConfigParam(params, 'temperature', config?.temperature, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TEMPERATURE'), 0);
            addConfigParam(params, 'top_p', config?.top_p, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TOP_P'), 1.0);
            addConfigParam(params, 'stop', config?.stop, (0, envars_1.getEnvString)('AWS_BEDROCK_STOP'));
            addConfigParam(params, 'frequency_penalty', config?.frequency_penalty, (0, envars_1.getEnvFloat)('AWS_BEDROCK_FREQUENCY_PENALTY'));
            addConfigParam(params, 'presence_penalty', config?.presence_penalty, (0, envars_1.getEnvFloat)('AWS_BEDROCK_PRESENCE_PENALTY'));
            return params;
        },
        output: (config, responseJson) => {
            if (responseJson.error) {
                throw new Error(`AI21 API error: ${responseJson.error}`);
            }
            return responseJson.choices?.[0]?.message?.content;
        },
        tokenUsage: (responseJson, promptText) => {
            if (responseJson?.usage) {
                return {
                    prompt: (0, exports.coerceStrToNum)(responseJson.usage.prompt_tokens),
                    completion: (0, exports.coerceStrToNum)(responseJson.usage.completion_tokens),
                    total: (0, exports.coerceStrToNum)(responseJson.usage.total_tokens),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    },
    AMAZON_NOVA: {
        params: (config, prompt, stop, modelName) => {
            let messages;
            let systemPrompt;
            try {
                const parsed = JSON.parse(prompt);
                if (Array.isArray(parsed)) {
                    messages = parsed
                        .map((msg) => ({
                        role: msg.role,
                        content: Array.isArray(msg.content) ? msg.content : [{ text: msg.content }],
                    }))
                        .filter((msg) => msg.role !== 'system');
                    const systemMessage = parsed.find((msg) => msg.role === 'system');
                    if (systemMessage) {
                        systemPrompt = [{ text: systemMessage.content }];
                    }
                }
                else {
                    const { system, extractedMessages } = (0, bedrockUtil_1.novaParseMessages)(prompt);
                    messages = extractedMessages;
                    if (system) {
                        systemPrompt = [{ text: system }];
                    }
                }
            }
            catch {
                const { system, extractedMessages } = (0, bedrockUtil_1.novaParseMessages)(prompt);
                messages = extractedMessages;
                if (system) {
                    systemPrompt = [{ text: system }];
                }
            }
            const params = { messages };
            if (systemPrompt) {
                addConfigParam(params, 'system', systemPrompt, undefined, undefined);
            }
            const inferenceConfig = config.interfaceConfig ? { ...config.interfaceConfig } : {};
            addConfigParam(inferenceConfig, 'max_new_tokens', config?.interfaceConfig?.max_new_tokens, (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_TOKENS'), undefined);
            addConfigParam(inferenceConfig, 'temperature', config?.interfaceConfig?.temperature, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TEMPERATURE'), 0);
            addConfigParam(params, 'inferenceConfig', inferenceConfig, undefined, undefined);
            addConfigParam(params, 'toolConfig', config.toolConfig, undefined, undefined);
            return params;
        },
        output: (config, responseJson) => (0, bedrockUtil_1.novaOutputFromMessage)(responseJson),
        tokenUsage: (responseJson, promptText) => {
            const usage = responseJson?.usage;
            if (!usage) {
                return {
                    prompt: undefined,
                    completion: undefined,
                    total: undefined,
                    numRequests: 1,
                };
            }
            return {
                prompt: (0, exports.coerceStrToNum)(usage.inputTokens),
                completion: (0, exports.coerceStrToNum)(usage.outputTokens),
                total: (0, exports.coerceStrToNum)(usage.totalTokens),
                numRequests: 1,
            };
        },
    },
    CLAUDE_COMPLETION: {
        params: (config, prompt, stop, modelName) => {
            const params = {
                prompt: `${sdk_1.default.HUMAN_PROMPT} ${prompt} ${sdk_1.default.AI_PROMPT}`,
                stop_sequences: stop,
            };
            addConfigParam(params, 'max_tokens_to_sample', config?.max_tokens_to_sample, (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_TOKENS'), 1024);
            addConfigParam(params, 'temperature', config?.temperature, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TEMPERATURE'), 0);
            return params;
        },
        output: (config, responseJson) => responseJson?.completion,
        tokenUsage: (responseJson, promptText) => {
            if (!responseJson?.usage) {
                return {
                    prompt: undefined,
                    completion: undefined,
                    total: undefined,
                    numRequests: 1,
                };
            }
            const usage = responseJson.usage;
            // Get input tokens
            const inputTokens = usage.input_tokens || usage.prompt_tokens;
            const inputTokensNum = (0, exports.coerceStrToNum)(inputTokens);
            // Get output tokens
            const outputTokens = usage.output_tokens || usage.completion_tokens;
            const outputTokensNum = (0, exports.coerceStrToNum)(outputTokens);
            // Get or calculate total tokens
            let totalTokens = usage.totalTokens || usage.total_tokens;
            if (totalTokens == null && inputTokensNum !== undefined && outputTokensNum !== undefined) {
                totalTokens = inputTokensNum + outputTokensNum;
            }
            return {
                prompt: inputTokensNum,
                completion: outputTokensNum,
                total: (0, exports.coerceStrToNum)(totalTokens),
                numRequests: 1,
            };
        },
    },
    CLAUDE_MESSAGES: {
        params: (config, prompt, stop, modelName) => {
            let messages;
            let systemPrompt;
            try {
                const parsed = JSON.parse(prompt);
                if (Array.isArray(parsed)) {
                    const systemMessages = parsed.filter((msg) => msg.role === 'system');
                    const nonSystemMessages = parsed.filter((msg) => msg.role !== 'system');
                    // NOTE: Claude models handle system prompts differently than OpenAI models.
                    // For compatibility with prompts designed for OpenAI like the factuality
                    // llm-as-a-judge prompts, we convert lone system messages into user messages
                    // since Bedrock Claude doesn't support system-only prompts.
                    if (systemMessages.length === 1 && nonSystemMessages.length === 0) {
                        // If only system message, convert to user message
                        messages = [
                            {
                                role: 'user',
                                content: Array.isArray(systemMessages[0].content)
                                    ? systemMessages[0].content
                                    : [{ type: 'text', text: systemMessages[0].content }],
                            },
                        ];
                        systemPrompt = undefined;
                    }
                    else {
                        // Normal case - keep system message as system prompt
                        messages = nonSystemMessages.map((msg) => ({
                            role: msg.role,
                            content: Array.isArray(msg.content)
                                ? msg.content
                                : [{ type: 'text', text: msg.content }],
                        }));
                        systemPrompt = systemMessages[0]?.content;
                    }
                }
                else {
                    const { system, extractedMessages } = (0, util_2.parseMessages)(prompt);
                    messages = extractedMessages;
                    systemPrompt = system;
                }
            }
            catch {
                const { system, extractedMessages } = (0, util_2.parseMessages)(prompt);
                messages = extractedMessages;
                systemPrompt = system;
            }
            const params = { messages };
            addConfigParam(params, 'anthropic_version', config?.anthropic_version, undefined, 'bedrock-2023-05-31');
            addConfigParam(params, 'max_tokens', config?.max_tokens, (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_TOKENS'), 1024);
            addConfigParam(params, 'temperature', config?.temperature, undefined, 0);
            addConfigParam(params, 'anthropic_version', config?.anthropic_version, undefined, 'bedrock-2023-05-31');
            addConfigParam(params, 'tools', (0, util_1.maybeLoadToolsFromExternalFile)(config?.tools), undefined, undefined);
            addConfigParam(params, 'tool_choice', config?.tool_choice, undefined, undefined);
            addConfigParam(params, 'thinking', config?.thinking, undefined, undefined);
            if (systemPrompt) {
                addConfigParam(params, 'system', systemPrompt, undefined, undefined);
            }
            return params;
        },
        output: (config, responseJson) => {
            return (0, util_2.outputFromMessage)(responseJson, config?.showThinking ?? true);
        },
        tokenUsage: (responseJson, promptText) => {
            if (!responseJson?.usage) {
                return {
                    prompt: undefined,
                    completion: undefined,
                    total: undefined,
                    numRequests: 1,
                };
            }
            const usage = responseJson.usage;
            // Get input tokens
            const inputTokens = usage.input_tokens || usage.prompt_tokens;
            const inputTokensNum = (0, exports.coerceStrToNum)(inputTokens);
            // Get output tokens
            const outputTokens = usage.output_tokens || usage.completion_tokens;
            const outputTokensNum = (0, exports.coerceStrToNum)(outputTokens);
            // Get or calculate total tokens
            let totalTokens = usage.totalTokens || usage.total_tokens;
            if ((totalTokens === null || totalTokens === undefined) &&
                inputTokensNum !== undefined &&
                outputTokensNum !== undefined) {
                totalTokens = inputTokensNum + outputTokensNum;
            }
            return {
                prompt: inputTokensNum,
                completion: outputTokensNum,
                total: (0, exports.coerceStrToNum)(totalTokens),
                numRequests: 1,
            };
        },
    },
    TITAN_TEXT: {
        params: (config, prompt, stop, modelName) => {
            const textGenerationConfig = {};
            addConfigParam(textGenerationConfig, 'maxTokenCount', config?.textGenerationConfig?.maxTokenCount, (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_TOKENS'), 1024);
            addConfigParam(textGenerationConfig, 'temperature', config?.textGenerationConfig?.temperature, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TEMPERATURE'), 0);
            addConfigParam(textGenerationConfig, 'topP', config?.textGenerationConfig?.topP, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TOP_P'), 1);
            addConfigParam(textGenerationConfig, 'stopSequences', config?.textGenerationConfig?.stopSequences, undefined, stop);
            return { inputText: prompt, textGenerationConfig };
        },
        output: (config, responseJson) => responseJson?.results[0]?.outputText,
        tokenUsage: (responseJson, promptText) => {
            // If token usage is provided by the API, use it
            if (responseJson?.usage) {
                return {
                    prompt: (0, exports.coerceStrToNum)(responseJson.usage.prompt_tokens),
                    completion: (0, exports.coerceStrToNum)(responseJson.usage.completion_tokens),
                    total: (0, exports.coerceStrToNum)(responseJson.usage.total_tokens),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    },
    LLAMA2: (0, exports.getLlamaModelHandler)(LlamaVersion.V2),
    LLAMA3: (0, exports.getLlamaModelHandler)(LlamaVersion.V3),
    LLAMA3_1: (0, exports.getLlamaModelHandler)(LlamaVersion.V3_1),
    LLAMA3_2: (0, exports.getLlamaModelHandler)(LlamaVersion.V3_2),
    LLAMA3_3: (0, exports.getLlamaModelHandler)(LlamaVersion.V3_3),
    LLAMA4: (0, exports.getLlamaModelHandler)(LlamaVersion.V4),
    COHERE_COMMAND: {
        params: (config, prompt, stop, modelName) => {
            const params = { prompt };
            addConfigParam(params, 'temperature', config?.temperature, (0, envars_1.getEnvFloat)('COHERE_TEMPERATURE'), 0);
            addConfigParam(params, 'p', config?.p, (0, envars_1.getEnvFloat)('COHERE_P'), 1);
            addConfigParam(params, 'k', config?.k, (0, envars_1.getEnvInt)('COHERE_K'), 0);
            addConfigParam(params, 'max_tokens', config?.max_tokens, (0, envars_1.getEnvInt)('COHERE_MAX_TOKENS'), 1024);
            addConfigParam(params, 'return_likelihoods', config?.return_likelihoods, undefined, 'NONE');
            addConfigParam(params, 'stream', config?.stream, undefined, false);
            addConfigParam(params, 'num_generations', config?.num_generations, undefined, 1);
            addConfigParam(params, 'logit_bias', config?.logit_bias, undefined, {});
            addConfigParam(params, 'truncate', config?.truncate, undefined, 'NONE');
            addConfigParam(params, 'stop_sequences', stop, undefined, undefined);
            return params;
        },
        output: (config, responseJson) => responseJson?.generations[0]?.text,
        tokenUsage: (responseJson, promptText) => {
            if (responseJson?.meta?.billed_units) {
                const inputTokens = (0, exports.coerceStrToNum)(responseJson.meta.billed_units.input_tokens);
                const outputTokens = (0, exports.coerceStrToNum)(responseJson.meta.billed_units.output_tokens);
                return {
                    prompt: inputTokens,
                    completion: outputTokens,
                    total: (inputTokens ?? 0) + (outputTokens ?? 0),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    },
    COHERE_COMMAND_R: {
        params: (config, prompt, stop, modelName) => {
            const messages = (0, shared_1.parseChatPrompt)(prompt, [{ role: 'user', content: prompt }]);
            const lastMessage = messages[messages.length - 1].content;
            if (!messages.every((m) => typeof m.content === 'string')) {
                throw new Error(`Message content must be a string, but got: ${JSON.stringify(messages)}`);
            }
            const params = {
                message: lastMessage,
                chat_history: messages.slice(0, messages.length - 1).map((m) => ({
                    role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
                    message: m.content,
                })),
            };
            addConfigParam(params, 'documents', config?.documents);
            addConfigParam(params, 'search_queries_only', config?.search_queries_only);
            addConfigParam(params, 'preamble', config?.preamble);
            addConfigParam(params, 'max_tokens', config?.max_tokens);
            addConfigParam(params, 'temperature', config?.temperature);
            addConfigParam(params, 'p', config?.p);
            addConfigParam(params, 'k', config?.k);
            addConfigParam(params, 'prompt_truncation', config?.prompt_truncation);
            addConfigParam(params, 'frequency_penalty', config?.frequency_penalty);
            addConfigParam(params, 'presence_penalty', config?.presence_penalty);
            addConfigParam(params, 'seed', config?.seed);
            addConfigParam(params, 'return_prompt', config?.return_prompt);
            addConfigParam(params, 'tools', (0, util_1.maybeLoadToolsFromExternalFile)(config?.tools));
            addConfigParam(params, 'tool_results', config?.tool_results);
            addConfigParam(params, 'stop_sequences', stop);
            addConfigParam(params, 'raw_prompting', config?.raw_prompting);
            return params;
        },
        output: (config, responseJson) => responseJson?.text,
        tokenUsage: (responseJson, promptText) => {
            if (responseJson?.meta?.billed_units) {
                const inputTokens = (0, exports.coerceStrToNum)(responseJson.meta.billed_units.input_tokens);
                const outputTokens = (0, exports.coerceStrToNum)(responseJson.meta.billed_units.output_tokens);
                return {
                    prompt: inputTokens,
                    completion: outputTokens,
                    total: (inputTokens ?? 0) + (outputTokens ?? 0),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    },
    DEEPSEEK: {
        params: (config, prompt, stop, modelName) => {
            const wrappedPrompt = `
${prompt}
<think>\n`;
            const params = {
                prompt: wrappedPrompt,
            };
            addConfigParam(params, 'max_tokens', config?.max_tokens, (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_TOKENS'), undefined);
            addConfigParam(params, 'temperature', config?.temperature, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TEMPERATURE'), 0);
            addConfigParam(params, 'top_p', config?.top_p, (0, envars_1.getEnvFloat)('AWS_BEDROCK_TOP_P'), 1.0);
            return params;
        },
        output: (config, responseJson) => {
            if (responseJson.error) {
                throw new Error(`DeepSeek API error: ${responseJson.error}`);
            }
            if (responseJson.choices && Array.isArray(responseJson.choices)) {
                const choice = responseJson.choices[0];
                if (choice && choice.text) {
                    const fullResponse = choice.text;
                    const [thinking, finalResponse] = fullResponse.split('</think>');
                    if (!thinking || !finalResponse) {
                        return fullResponse;
                    }
                    if (config.showThinking !== false) {
                        return fullResponse;
                    }
                    return finalResponse.trim();
                }
            }
            return undefined;
        },
        tokenUsage: (responseJson, promptText) => {
            if (responseJson?.usage) {
                return {
                    prompt: (0, exports.coerceStrToNum)(responseJson.usage.prompt_tokens),
                    completion: (0, exports.coerceStrToNum)(responseJson.usage.completion_tokens),
                    total: (0, exports.coerceStrToNum)(responseJson.usage.total_tokens),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    },
    MISTRAL: {
        params: (config, prompt, stop, modelName) => {
            const params = { prompt, stop };
            addConfigParam(params, 'max_tokens', config?.max_tokens, (0, envars_1.getEnvInt)('MISTRAL_MAX_TOKENS'), 1024);
            addConfigParam(params, 'temperature', config?.temperature, (0, envars_1.getEnvFloat)('MISTRAL_TEMPERATURE'), 0);
            addConfigParam(params, 'top_p', config?.top_p, (0, envars_1.getEnvFloat)('MISTRAL_TOP_P'), 1);
            addConfigParam(params, 'top_k', config?.top_k, (0, envars_1.getEnvFloat)('MISTRAL_TOP_K'), 0);
            return params;
        },
        output: (config, responseJson) => {
            if (!responseJson?.outputs || !Array.isArray(responseJson.outputs)) {
                return undefined;
            }
            return responseJson.outputs[0]?.text;
        },
        tokenUsage: (responseJson, promptText) => {
            if (responseJson?.usage) {
                return {
                    prompt: (0, exports.coerceStrToNum)(responseJson.usage.prompt_tokens),
                    completion: (0, exports.coerceStrToNum)(responseJson.usage.completion_tokens),
                    total: (0, exports.coerceStrToNum)(responseJson.usage.total_tokens),
                    numRequests: 1,
                };
            }
            // Some models may return token information at the root level
            if (responseJson?.prompt_tokens !== undefined &&
                responseJson?.completion_tokens !== undefined) {
                const promptTokens = (0, exports.coerceStrToNum)(responseJson.prompt_tokens);
                const completionTokens = (0, exports.coerceStrToNum)(responseJson.completion_tokens);
                let totalTokens = responseJson.total_tokens;
                if (!totalTokens && promptTokens !== undefined && completionTokens !== undefined) {
                    totalTokens = promptTokens + completionTokens;
                }
                return {
                    prompt: promptTokens,
                    completion: completionTokens,
                    total: (promptTokens ?? 0) + (completionTokens ?? 0),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    },
    MISTRAL_LARGE_2407: {
        params: (config, prompt, stop, modelName) => {
            const params = { prompt, stop };
            addConfigParam(params, 'max_tokens', config?.max_tokens, (0, envars_1.getEnvInt)('MISTRAL_MAX_TOKENS'), 1024);
            addConfigParam(params, 'temperature', config?.temperature, (0, envars_1.getEnvFloat)('MISTRAL_TEMPERATURE'), 0);
            addConfigParam(params, 'top_p', config?.top_p, (0, envars_1.getEnvFloat)('MISTRAL_TOP_P'), 1);
            // Note: mistral.mistral-large-2407-v1:0 doesn't support top_k parameter
            return params;
        },
        output: (config, responseJson) => {
            if (responseJson?.choices && Array.isArray(responseJson.choices)) {
                return responseJson.choices[0]?.message?.content;
            }
            return undefined;
        },
        tokenUsage: (responseJson, promptText) => {
            // Chat completion format (used by mistral-large-2407-v1:0)
            if (responseJson?.prompt_tokens !== undefined &&
                responseJson?.completion_tokens !== undefined) {
                const promptTokens = (0, exports.coerceStrToNum)(responseJson.prompt_tokens);
                const completionTokens = (0, exports.coerceStrToNum)(responseJson.completion_tokens);
                return {
                    prompt: promptTokens,
                    completion: completionTokens,
                    total: (promptTokens ?? 0) + (completionTokens ?? 0),
                    numRequests: 1,
                };
            }
            // Handle usage object format
            if (responseJson?.usage?.prompt_tokens !== undefined &&
                responseJson?.usage?.completion_tokens !== undefined) {
                const promptTokens = (0, exports.coerceStrToNum)(responseJson.usage.prompt_tokens);
                const completionTokens = (0, exports.coerceStrToNum)(responseJson.usage.completion_tokens);
                let totalTokens = responseJson.usage.total_tokens;
                if (!totalTokens && promptTokens !== undefined && completionTokens !== undefined) {
                    totalTokens = promptTokens + completionTokens;
                }
                return {
                    prompt: promptTokens,
                    completion: completionTokens,
                    total: (promptTokens ?? 0) + (completionTokens ?? 0),
                    numRequests: 1,
                };
            }
            // Return undefined values when token counts aren't provided by the API
            return {
                prompt: undefined,
                completion: undefined,
                total: undefined,
                numRequests: 1,
            };
        },
    },
};
exports.AWS_BEDROCK_MODELS = {
    'ai21.jamba-1-5-large-v1:0': exports.BEDROCK_MODEL.AI21,
    'ai21.jamba-1-5-mini-v1:0': exports.BEDROCK_MODEL.AI21,
    'amazon.nova-lite-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'amazon.nova-micro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'amazon.nova-pro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'amazon.nova-premier-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'amazon.titan-text-express-v1': exports.BEDROCK_MODEL.TITAN_TEXT,
    'amazon.titan-text-lite-v1': exports.BEDROCK_MODEL.TITAN_TEXT,
    'amazon.titan-text-premier-v1:0': exports.BEDROCK_MODEL.TITAN_TEXT,
    'anthropic.claude-3-5-haiku-20241022-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'anthropic.claude-3-5-sonnet-20240620-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'anthropic.claude-3-5-sonnet-20241022-v2:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'anthropic.claude-3-7-sonnet-20250219-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'anthropic.claude-3-haiku-20240307-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'anthropic.claude-3-opus-20240229-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'anthropic.claude-3-sonnet-20240229-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'anthropic.claude-instant-v1': exports.BEDROCK_MODEL.CLAUDE_COMPLETION,
    'anthropic.claude-v1': exports.BEDROCK_MODEL.CLAUDE_COMPLETION,
    'anthropic.claude-v2': exports.BEDROCK_MODEL.CLAUDE_COMPLETION,
    'anthropic.claude-v2:1': exports.BEDROCK_MODEL.CLAUDE_COMPLETION,
    'cohere.command-light-text-v14': exports.BEDROCK_MODEL.COHERE_COMMAND,
    'cohere.command-r-plus-v1:0': exports.BEDROCK_MODEL.COHERE_COMMAND_R,
    'cohere.command-r-v1:0': exports.BEDROCK_MODEL.COHERE_COMMAND_R,
    'cohere.command-text-v14': exports.BEDROCK_MODEL.COHERE_COMMAND,
    'deepseek.r1-v1:0': exports.BEDROCK_MODEL.DEEPSEEK,
    'meta.llama2-13b-chat-v1': exports.BEDROCK_MODEL.LLAMA2,
    'meta.llama2-70b-chat-v1': exports.BEDROCK_MODEL.LLAMA2,
    'meta.llama3-1-405b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_1,
    'meta.llama3-1-70b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_1,
    'meta.llama3-1-8b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_1,
    'meta.llama3-2-3b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_2,
    'meta.llama3-70b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3,
    'meta.llama3-8b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3,
    'meta.llama4-scout-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
    'meta.llama4-maverick-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
    'mistral.mistral-7b-instruct-v0:2': exports.BEDROCK_MODEL.MISTRAL,
    'mistral.mistral-large-2402-v1:0': exports.BEDROCK_MODEL.MISTRAL,
    'mistral.mistral-large-2407-v1:0': exports.BEDROCK_MODEL.MISTRAL_LARGE_2407,
    'mistral.mistral-small-2402-v1:0': exports.BEDROCK_MODEL.MISTRAL,
    'mistral.mixtral-8x7b-instruct-v0:1': exports.BEDROCK_MODEL.MISTRAL,
    // APAC Models
    'apac.amazon.nova-lite-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'apac.amazon.nova-micro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'apac.amazon.nova-pro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'apac.amazon.nova-premier-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'apac.anthropic.claude-3-5-sonnet-20240620-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'apac.anthropic.claude-3-haiku-20240307-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'apac.anthropic.claude-3-sonnet-20240229-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'apac.meta.llama4-scout-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
    'apac.meta.llama4-maverick-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
    // EU Models
    'eu.amazon.nova-lite-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'eu.amazon.nova-micro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'eu.amazon.nova-pro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'eu.amazon.nova-premier-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'eu.anthropic.claude-3-5-sonnet-20240620-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'eu.anthropic.claude-3-7-sonnet-20250219-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'eu.anthropic.claude-3-haiku-20240307-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'eu.anthropic.claude-3-sonnet-20240229-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'eu.meta.llama3-2-1b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_2,
    'eu.meta.llama3-2-3b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_2,
    'eu.meta.llama4-scout-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
    'eu.meta.llama4-maverick-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
    // Gov Cloud Models
    'us-gov.anthropic.claude-3-5-sonnet-20240620-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us-gov.anthropic.claude-3-haiku-20240307-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    // US Models
    'us.amazon.nova-lite-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'us.amazon.nova-micro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'us.amazon.nova-pro-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'us.amazon.nova-premier-v1:0': exports.BEDROCK_MODEL.AMAZON_NOVA,
    'us.anthropic.claude-3-5-haiku-20241022-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us.anthropic.claude-3-5-sonnet-20240620-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us.anthropic.claude-3-5-sonnet-20241022-v2:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us.anthropic.claude-3-7-sonnet-20250219-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us.anthropic.claude-3-haiku-20240307-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us.anthropic.claude-3-opus-20240229-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us.anthropic.claude-3-sonnet-20240229-v1:0': exports.BEDROCK_MODEL.CLAUDE_MESSAGES,
    'us.deepseek.r1-v1:0': exports.BEDROCK_MODEL.DEEPSEEK,
    'us.meta.llama3-1-405b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_1,
    'us.meta.llama3-1-70b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_1,
    'us.meta.llama3-1-8b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_1,
    'us.meta.llama3-2-11b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_2,
    'us.meta.llama3-2-1b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_2,
    'us.meta.llama3-2-3b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_2,
    'us.meta.llama3-2-90b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_2,
    'us.meta.llama3-3-70b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA3_3,
    'us.meta.llama4-scout-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
    'us.meta.llama4-maverick-17b-instruct-v1:0': exports.BEDROCK_MODEL.LLAMA4,
};
// See https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
function getHandlerForModel(modelName) {
    const ret = exports.AWS_BEDROCK_MODELS[modelName];
    if (ret) {
        return ret;
    }
    if (modelName.startsWith('ai21.')) {
        return exports.BEDROCK_MODEL.AI21;
    }
    if (modelName.includes('amazon.nova')) {
        return exports.BEDROCK_MODEL.AMAZON_NOVA;
    }
    if (modelName.includes('anthropic.claude')) {
        return exports.BEDROCK_MODEL.CLAUDE_MESSAGES;
    }
    if (modelName.startsWith('meta.llama2')) {
        return exports.BEDROCK_MODEL.LLAMA2;
    }
    if (modelName.includes('meta.llama3-1')) {
        return exports.BEDROCK_MODEL.LLAMA3_1;
    }
    if (modelName.includes('meta.llama3-2')) {
        return exports.BEDROCK_MODEL.LLAMA3_2;
    }
    if (modelName.includes('meta.llama3-3')) {
        return exports.BEDROCK_MODEL.LLAMA3_3;
    }
    if (modelName.includes('meta.llama4')) {
        return exports.BEDROCK_MODEL.LLAMA4;
    }
    if (modelName.includes('meta.llama3')) {
        return exports.BEDROCK_MODEL.LLAMA3;
    }
    if (modelName.startsWith('cohere.command-r')) {
        return exports.BEDROCK_MODEL.COHERE_COMMAND_R;
    }
    if (modelName.startsWith('cohere.command')) {
        return exports.BEDROCK_MODEL.COHERE_COMMAND;
    }
    if (modelName.startsWith('mistral.')) {
        return exports.BEDROCK_MODEL.MISTRAL;
    }
    if (modelName.startsWith('deepseek.')) {
        return exports.BEDROCK_MODEL.DEEPSEEK;
    }
    throw new Error(`Unknown Amazon Bedrock model: ${modelName}`);
}
class AwsBedrockGenericProvider {
    constructor(modelName, options = {}) {
        const { config, id, env } = options;
        this.env = env;
        this.modelName = modelName;
        this.config = config || {};
        this.id = id ? () => id : this.id;
        if (this.config.guardrailIdentifier) {
            telemetry_1.default.recordAndSendOnce('feature_used', {
                feature: 'guardrail',
                provider: 'bedrock',
            });
        }
    }
    id() {
        return `bedrock:${this.modelName}`;
    }
    toString() {
        return `[Amazon Bedrock Provider ${this.modelName}]`;
    }
    async getCredentials() {
        if (this.config.accessKeyId && this.config.secretAccessKey) {
            logger_1.default.debug(`Using credentials from config file`);
            return {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey,
                sessionToken: this.config.sessionToken,
            };
        }
        if (this.config.profile) {
            logger_1.default.debug(`Using SSO profile: ${this.config.profile}`);
            const { fromSSO } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/credential-provider-sso')));
            return fromSSO({ profile: this.config.profile });
        }
        logger_1.default.debug(`No explicit credentials in config, falling back to AWS default chain`);
        return undefined;
    }
    async getBedrockInstance() {
        if (!this.bedrock) {
            let handler;
            // set from https://www.npmjs.com/package/proxy-agent
            if ((0, envars_1.getEnvString)('HTTP_PROXY') || (0, envars_1.getEnvString)('HTTPS_PROXY')) {
                try {
                    const { NodeHttpHandler } = await Promise.resolve().then(() => __importStar(require('@smithy/node-http-handler')));
                    const { ProxyAgent } = await Promise.resolve().then(() => __importStar(require('proxy-agent')));
                    handler = new NodeHttpHandler({
                        httpsAgent: new ProxyAgent(),
                    });
                }
                catch {
                    throw new Error(`The @smithy/node-http-handler package is required as a peer dependency. Please install it in your project or globally.`);
                }
            }
            try {
                const { BedrockRuntime } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-bedrock-runtime')));
                const credentials = await this.getCredentials();
                const bedrock = new BedrockRuntime({
                    region: this.getRegion(),
                    maxAttempts: (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_RETRIES', 10),
                    retryMode: 'adaptive',
                    ...(credentials ? { credentials } : {}),
                    ...(handler ? { requestHandler: handler } : {}),
                });
                this.bedrock = bedrock;
            }
            catch (err) {
                logger_1.default.error(`Error creating BedrockRuntime: ${err}`);
                throw new Error('The @aws-sdk/client-bedrock-runtime package is required as a peer dependency. Please install it in your project or globally.');
            }
        }
        return this.bedrock;
    }
    getRegion() {
        return (this.config?.region ||
            this.env?.AWS_BEDROCK_REGION ||
            (0, envars_1.getEnvString)('AWS_BEDROCK_REGION') ||
            'us-east-1');
    }
}
exports.AwsBedrockGenericProvider = AwsBedrockGenericProvider;
class AwsBedrockCompletionProvider extends AwsBedrockGenericProvider {
    async callApi(prompt, context) {
        let stop;
        try {
            stop = (0, envars_1.getEnvString)('AWS_BEDROCK_STOP') ? JSON.parse((0, envars_1.getEnvString)('AWS_BEDROCK_STOP')) : [];
        }
        catch (err) {
            throw new Error(`BEDROCK_STOP is not a valid JSON string: ${err}`);
        }
        let model = getHandlerForModel(this.modelName);
        if (!model) {
            logger_1.default.warn(`Unknown Amazon Bedrock model: ${this.modelName}. Assuming its API is Claude-like.`);
            model = exports.BEDROCK_MODEL.CLAUDE_MESSAGES;
        }
        const params = model.params({ ...this.config, ...context?.prompt.config }, prompt, stop, this.modelName);
        logger_1.default.debug(`Calling Amazon Bedrock API: ${JSON.stringify(params)}`);
        const cache = await (0, cache_1.getCache)();
        const cacheKey = `bedrock:${this.modelName}:${JSON.stringify(params)}`;
        if ((0, cache_1.isCacheEnabled)()) {
            // Try to get the cached response
            const cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                logger_1.default.debug(`Returning cached response for ${prompt}: ${cachedResponse}`);
                return {
                    output: model.output(this.config, JSON.parse(cachedResponse)),
                    tokenUsage: {},
                };
            }
        }
        let response;
        try {
            const bedrockInstance = await this.getBedrockInstance();
            try {
                const testCredentials = await bedrockInstance.config.credentials?.();
                logger_1.default.debug(`Actual credentials being used: ${testCredentials?.accessKeyId
                    ? `accessKeyId starts with: ${testCredentials.accessKeyId.substring(0, 4)}...`
                    : 'no explicit credentials (using instance metadata)'}`);
            }
            catch (credErr) {
                logger_1.default.debug(`Error getting credentials: ${credErr}`);
            }
            response = await bedrockInstance.invokeModel({
                modelId: this.modelName,
                ...(this.config.guardrailIdentifier
                    ? { guardrailIdentifier: String(this.config.guardrailIdentifier) }
                    : {}),
                ...(this.config.guardrailVersion
                    ? { guardrailVersion: String(this.config.guardrailVersion) }
                    : {}),
                ...(this.config.trace ? { trace: this.config.trace } : {}),
                accept: 'application/json',
                contentType: 'application/json',
                body: JSON.stringify(params),
            });
        }
        catch (err) {
            return {
                error: `Bedrock API invoke model error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`Amazon Bedrock API response: ${response.body.transformToString()}`);
        if ((0, cache_1.isCacheEnabled)()) {
            try {
                await cache.set(cacheKey, new TextDecoder().decode(response.body));
            }
            catch (err) {
                logger_1.default.error(`Failed to cache response: ${String(err)}`);
            }
        }
        try {
            const output = JSON.parse(new TextDecoder().decode(response.body));
            let tokenUsage = {};
            if (model.tokenUsage) {
                tokenUsage = model.tokenUsage(output, prompt);
                logger_1.default.debug(`Token usage from model handler: ${JSON.stringify(tokenUsage)}`);
            }
            else {
                // Get token counts, converting strings to numbers
                const promptTokens = output.usage?.inputTokens ??
                    output.usage?.input_tokens ??
                    output.usage?.prompt_tokens ??
                    output.prompt_tokens ??
                    output.prompt_token_count;
                const completionTokens = output.usage?.outputTokens ??
                    output.usage?.output_tokens ??
                    output.usage?.completion_tokens ??
                    output.completion_tokens ??
                    output.generation_token_count;
                const promptTokensNum = (0, exports.coerceStrToNum)(promptTokens);
                const completionTokensNum = (0, exports.coerceStrToNum)(completionTokens);
                // Get total tokens from API or calculate it
                let totalTokens = output.usage?.totalTokens ?? output.usage?.total_tokens ?? output.total_tokens;
                if (!totalTokens && promptTokensNum !== undefined && completionTokensNum !== undefined) {
                    totalTokens = promptTokensNum + completionTokensNum;
                }
                tokenUsage = {
                    prompt: promptTokensNum,
                    completion: completionTokensNum,
                    total: (promptTokensNum ?? 0) + (completionTokensNum ?? 0),
                    numRequests: 1,
                };
                // If we couldn't extract any token counts but have a response, track usage for metrics
                if (tokenUsage.prompt === undefined &&
                    tokenUsage.completion === undefined &&
                    tokenUsage.total === undefined &&
                    output) {
                    logger_1.default.debug(`No explicit token counts found for ${this.modelName}, tracking request count only`);
                }
                else {
                    logger_1.default.debug(`Extracted token usage: ${JSON.stringify(tokenUsage)}`);
                }
            }
            if (!tokenUsage.numRequests) {
                tokenUsage.numRequests = 1;
            }
            return {
                output: model.output(this.config, output),
                tokenUsage,
                ...(output['amazon-bedrock-guardrailAction']
                    ? {
                        guardrails: {
                            flagged: output['amazon-bedrock-guardrailAction'] === 'INTERVENED',
                        },
                    }
                    : {}),
            };
        }
        catch (err) {
            logger_1.default.error(`Bedrock API response error: ${String(err)}: ${JSON.stringify(response)}`);
            return {
                error: `API response error: ${String(err)}: ${JSON.stringify(response)}`,
            };
        }
    }
}
exports.AwsBedrockCompletionProvider = AwsBedrockCompletionProvider;
AwsBedrockCompletionProvider.AWS_BEDROCK_COMPLETION_MODELS = Object.keys(exports.AWS_BEDROCK_MODELS);
class AwsBedrockEmbeddingProvider extends AwsBedrockGenericProvider {
    async callApi() {
        throw new Error('callApi is not implemented for embedding provider');
    }
    async callEmbeddingApi(text) {
        const params = this.modelName.includes('cohere.embed')
            ? {
                texts: [text],
            }
            : {
                inputText: text,
            };
        logger_1.default.debug(`Calling AWS Bedrock API for embeddings: ${JSON.stringify(params)}`);
        let response;
        try {
            const bedrockInstance = await this.getBedrockInstance();
            response = await bedrockInstance.invokeModel({
                modelId: this.modelName,
                accept: 'application/json',
                contentType: 'application/json',
                body: JSON.stringify(params),
            });
        }
        catch (err) {
            return {
                error: `API call error: ${String(err)}`,
            };
        }
        logger_1.default.debug(`AWS Bedrock API response (embeddings): ${JSON.stringify(response.body.transformToString())}`);
        try {
            const data = JSON.parse(response.body.transformToString());
            // Titan Text API returns embeddings in the `embedding` field
            // Cohere API returns embeddings in the `embeddings` field
            const embedding = data?.embedding || data?.embeddings;
            if (!embedding) {
                throw new Error('No embedding found in AWS Bedrock API response');
            }
            return {
                embedding,
            };
        }
        catch (err) {
            return {
                error: `API response error: ${String(err)}: ${JSON.stringify(response.body.transformToString())}`,
            };
        }
    }
}
exports.AwsBedrockEmbeddingProvider = AwsBedrockEmbeddingProvider;
//# sourceMappingURL=bedrock.js.map