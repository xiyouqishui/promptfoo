import type { BedrockRuntime, Trace } from '@aws-sdk/client-bedrock-runtime';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import type { EnvOverrides } from '../types/env';
import type { ApiEmbeddingProvider, ApiProvider, CallApiContextParams, ProviderEmbeddingResponse, ProviderResponse } from '../types/providers';
import type { TokenUsage } from '../types/shared';
export declare const coerceStrToNum: (value: string | number | undefined) => number | undefined;
interface BedrockOptions {
    accessKeyId?: string;
    profile?: string;
    region?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    guardrailIdentifier?: string;
    guardrailVersion?: string;
    trace?: Trace;
    showThinking?: boolean;
}
export interface TextGenerationOptions {
    maxTokenCount?: number;
    stopSequences?: Array<string>;
    temperature?: number;
    topP?: number;
}
interface BedrockTextGenerationOptions extends BedrockOptions {
    textGenerationConfig?: TextGenerationOptions;
}
interface BedrockClaudeLegacyCompletionOptions extends BedrockOptions {
    max_tokens_to_sample?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
}
export interface BedrockClaudeMessagesCompletionOptions extends BedrockOptions {
    max_tokens?: number;
    temperature?: number;
    anthropic_version?: string;
    tools?: {
        name: string;
        description: string;
        input_schema: any;
    }[];
    tool_choice?: {
        type: 'any' | 'auto' | 'tool';
        name?: string;
    };
    thinking?: {
        type: 'enabled';
        budget_tokens: number;
    };
}
interface BedrockLlamaGenerationOptions extends BedrockOptions {
    temperature?: number;
    top_p?: number;
    max_gen_len?: number;
    max_new_tokens?: number;
}
interface BedrockCohereCommandGenerationOptions extends BedrockOptions {
    temperature?: number;
    p?: number;
    k?: number;
    max_tokens?: number;
    stop_sequences?: Array<string>;
    return_likelihoods?: string;
    stream?: boolean;
    num_generations?: number;
    logit_bias?: Record<string, number>;
    truncate?: string;
}
interface BedrockCohereCommandRGenerationOptions extends BedrockOptions {
    message?: string;
    chat_history?: Array<{
        role: 'USER' | 'CHATBOT';
        message: string;
    }>;
    documents?: Array<{
        title: string;
        snippet: string;
    }>;
    search_queries_only?: boolean;
    preamble?: string;
    max_tokens?: number;
    temperature?: number;
    p?: number;
    k?: number;
    prompt_truncation?: string;
    frequency_penalty?: number;
    presence_penalty?: number;
    seed?: number;
    return_prompt?: boolean;
    tools?: Array<{
        name: string;
        description: string;
        parameter_definitions: Record<string, {
            description: string;
            type: string;
            required: boolean;
        }>;
    }>;
    tool_results?: Array<{
        call: {
            name: string;
            parameters: Record<string, string>;
        };
        outputs: Array<{
            text: string;
        }>;
    }>;
    stop_sequences?: Array<string>;
    raw_prompting?: boolean;
}
interface CohereCommandRRequestParams {
    message: string;
    chat_history: {
        role: 'USER' | 'CHATBOT';
        message: string;
    }[];
    documents?: {
        title: string;
        snippet: string;
    }[];
    search_queries_only?: boolean;
    preamble?: string;
    max_tokens?: number;
    temperature?: number;
    p?: number;
    k?: number;
    prompt_truncation?: string;
    frequency_penalty?: number;
    presence_penalty?: number;
    seed?: number;
    return_prompt?: boolean;
    tools?: {
        name: string;
        description: string;
        parameter_definitions: {
            [parameterName: string]: {
                description: string;
                type: string;
                required: boolean;
            };
        };
    }[];
    tool_results?: {
        call: {
            name: string;
            parameters: {
                [parameterName: string]: string;
            };
        };
        outputs: {
            text: string;
        }[];
    }[];
    stop_sequences?: string[];
    raw_prompting?: boolean;
}
interface BedrockMistralGenerationOptions extends BedrockOptions {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
}
export interface BedrockAI21GenerationOptions extends BedrockOptions {
    frequency_penalty?: number;
    max_tokens?: number;
    presence_penalty?: number;
    response_format?: {
        type: 'json_object' | 'text';
    };
    stop?: string[];
    temperature?: number;
    top_p?: number;
}
export interface BedrockAmazonNovaGenerationOptions extends BedrockOptions {
    interfaceConfig?: {
        max_new_tokens?: number;
        temperature?: number;
        top_p?: number;
        top_k?: number;
        stopSequences?: string[];
    };
    toolConfig?: {
        tools?: {
            toolSpec: {
                name: string;
                description?: string;
                inputSchema: {
                    json: {
                        type: 'object';
                        properties: {
                            [propertyName: string]: {
                                description: string;
                                type: string;
                            };
                        };
                        required: string[];
                    };
                };
            };
        }[];
        toolChoice?: {
            any?: any;
            auto?: any;
            tool?: {
                name: string;
            };
        };
    };
}
export type ContentType = 'AUDIO' | 'TEXT' | 'TOOL';
export type AudioMediaType = 'audio/wav' | 'audio/lpcm' | 'audio/mulaw' | 'audio/mpeg';
export type TextMediaType = 'text/plain' | 'application/json';
export interface AudioConfiguration {
    readonly mediaType: AudioMediaType;
    readonly sampleRateHertz: number;
    readonly sampleSizeBits: number;
    readonly channelCount: number;
    readonly encoding: string;
    readonly audioType: 'SPEECH';
}
export interface TextConfiguration {
    readonly contentType: ContentType;
    readonly mediaType: TextMediaType;
}
export interface BedrockAmazonNovaSonicGenerationOptions extends BedrockOptions {
    interfaceConfig?: {
        max_new_tokens?: number;
        temperature?: number;
        top_p?: number;
        top_k?: number;
        stopSequences?: string[];
    };
    audioInputConfiguration?: Omit<AudioConfiguration, 'voiceId'>;
    audioOutputConfiguration?: Omit<AudioConfiguration, 'mediaType'> & {
        mediaType: 'audio/lpcm';
        voiceId?: 'matthew' | 'tiffany' | 'amy';
    };
    textInputConfiguration?: TextConfiguration;
    textOutputConfiguration?: Omit<TextConfiguration, 'mediaType'> & {
        mediaType: 'text/plain';
    };
    toolConfig?: {
        tools?: {
            toolSpec: {
                name: string;
                description?: string;
                inputSchema: {
                    json: {
                        type: 'object';
                        properties: {
                            [propertyName: string]: {
                                description: string;
                                type: string;
                            };
                        };
                        required: string[];
                    };
                };
            };
        }[];
        toolChoice?: 'any' | 'auto' | string;
    };
}
export interface BedrockDeepseekGenerationOptions extends BedrockOptions {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stop?: string[];
}
export interface IBedrockModel {
    params: (config: BedrockOptions, prompt: string, stop: string[], modelName?: string) => any;
    output: (config: BedrockOptions, responseJson: any) => any;
    tokenUsage?: (responseJson: any, promptText: string) => TokenUsage;
}
export declare function parseValue(value: string | number, defaultValue: any): string | number;
export declare function addConfigParam(params: any, key: string, configValue: any, envValue?: string | number | undefined, defaultValue?: any): void;
export declare enum LlamaVersion {
    V2 = 2,
    V3 = 3,
    V3_1 = 3.1,
    V3_2 = 3.2,
    V3_3 = 3.3,
    V4 = 4
}
export interface LlamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export declare const formatPromptLlama2Chat: (messages: LlamaMessage[]) => string;
export declare const formatPromptLlama3Instruct: (messages: LlamaMessage[]) => string;
export declare const formatPromptLlama4: (messages: LlamaMessage[]) => string;
export declare const getLlamaModelHandler: (version: LlamaVersion) => {
    params: (config: BedrockLlamaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
        prompt: string;
        temperature?: number;
        top_p?: number;
        max_gen_len?: number;
    };
    output: (config: BedrockOptions, responseJson: any) => any;
    tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
};
export declare const BEDROCK_MODEL: {
    AI21: {
        params: (config: BedrockAI21GenerationOptions, prompt: string, stop?: string[], modelName?: string) => any;
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    AMAZON_NOVA: {
        params: (config: BedrockAmazonNovaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => any;
        output: (config: BedrockOptions, responseJson: any) => string | undefined;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    CLAUDE_COMPLETION: {
        params: (config: BedrockClaudeLegacyCompletionOptions, prompt: string, stop: string[], modelName?: string) => any;
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    CLAUDE_MESSAGES: {
        params: (config: BedrockClaudeMessagesCompletionOptions, prompt: string, stop?: string[], modelName?: string) => any;
        output: (config: BedrockClaudeMessagesCompletionOptions, responseJson: any) => string;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    TITAN_TEXT: {
        params: (config: BedrockTextGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
            inputText: string;
            textGenerationConfig: any;
        };
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    LLAMA2: {
        params: (config: BedrockLlamaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
            prompt: string;
            temperature?: number;
            top_p?: number;
            max_gen_len?: number;
        };
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    LLAMA3: {
        params: (config: BedrockLlamaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
            prompt: string;
            temperature?: number;
            top_p?: number;
            max_gen_len?: number;
        };
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    LLAMA3_1: {
        params: (config: BedrockLlamaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
            prompt: string;
            temperature?: number;
            top_p?: number;
            max_gen_len?: number;
        };
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    LLAMA3_2: {
        params: (config: BedrockLlamaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
            prompt: string;
            temperature?: number;
            top_p?: number;
            max_gen_len?: number;
        };
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    LLAMA3_3: {
        params: (config: BedrockLlamaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
            prompt: string;
            temperature?: number;
            top_p?: number;
            max_gen_len?: number;
        };
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    LLAMA4: {
        params: (config: BedrockLlamaGenerationOptions, prompt: string, stop?: string[], modelName?: string) => {
            prompt: string;
            temperature?: number;
            top_p?: number;
            max_gen_len?: number;
        };
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    COHERE_COMMAND: {
        params: (config: BedrockCohereCommandGenerationOptions, prompt: string, stop?: string[], modelName?: string) => any;
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    COHERE_COMMAND_R: {
        params: (config: BedrockCohereCommandRGenerationOptions, prompt: string, stop?: string[], modelName?: string) => CohereCommandRRequestParams;
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    DEEPSEEK: {
        params: (config: BedrockDeepseekGenerationOptions, prompt: string, stop?: string[], modelName?: string) => any;
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    MISTRAL: {
        params: (config: BedrockMistralGenerationOptions, prompt: string, stop: string[], modelName?: string) => any;
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
    MISTRAL_LARGE_2407: {
        params: (config: BedrockMistralGenerationOptions, prompt: string, stop: string[], modelName?: string) => any;
        output: (config: BedrockOptions, responseJson: any) => any;
        tokenUsage: (responseJson: any, promptText: string) => TokenUsage;
    };
};
export declare const AWS_BEDROCK_MODELS: Record<string, IBedrockModel>;
export declare abstract class AwsBedrockGenericProvider {
    modelName: string;
    env?: EnvOverrides;
    bedrock?: BedrockRuntime;
    config: BedrockOptions;
    constructor(modelName: string, options?: {
        config?: BedrockOptions;
        id?: string;
        env?: EnvOverrides;
    });
    id(): string;
    toString(): string;
    getCredentials(): Promise<AwsCredentialIdentity | AwsCredentialIdentityProvider | undefined>;
    getBedrockInstance(): Promise<BedrockRuntime>;
    getRegion(): string;
}
export declare class AwsBedrockCompletionProvider extends AwsBedrockGenericProvider implements ApiProvider {
    static AWS_BEDROCK_COMPLETION_MODELS: string[];
    callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse>;
}
export declare class AwsBedrockEmbeddingProvider extends AwsBedrockGenericProvider implements ApiEmbeddingProvider {
    callApi(): Promise<ProviderEmbeddingResponse>;
    callEmbeddingApi(text: string): Promise<ProviderEmbeddingResponse>;
}
export {};
//# sourceMappingURL=bedrock.d.ts.map