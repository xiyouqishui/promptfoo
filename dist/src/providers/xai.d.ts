import type { ApiProvider, ProviderOptions } from '../types';
import { OpenAiChatCompletionProvider } from './openai/chat';
import type { OpenAiCompletionOptions } from './openai/types';
type XAIConfig = {
    region?: string;
    reasoning_effort?: 'low' | 'high';
} & OpenAiCompletionOptions;
type XAIProviderOptions = Omit<ProviderOptions, 'config'> & {
    config?: {
        config?: XAIConfig;
    };
};
export declare const XAI_CHAT_MODELS: ({
    id: string;
    cost: {
        input: number;
        output: number;
    };
    aliases: string[];
} | {
    id: string;
    cost: {
        input: number;
        output: number;
    };
    aliases?: undefined;
})[];
/**
 * Calculate xAI Grok cost based on model name and token usage
 */
export declare function calculateXAICost(modelName: string, config: any, promptTokens?: number, completionTokens?: number, reasoningTokens?: number): number | undefined;
export declare class XAIProvider extends OpenAiChatCompletionProvider {
    protected get apiKey(): string | undefined;
    protected isReasoningModel(): boolean;
    protected supportsTemperature(): boolean;
    constructor(modelName: string, providerOptions: XAIProviderOptions);
    id(): string;
    toString(): string;
    toJSON(): {
        provider: string;
        model: string;
        config: {
            apiKey?: string;
            apiKeyEnvar?: string;
            apiKeyRequired?: boolean;
            apiHost?: string;
            apiBaseUrl?: string;
            organization?: string;
            cost?: number;
            headers?: {
                [key: string]: string;
            };
            temperature?: number;
            max_completion_tokens?: number;
            max_tokens?: number;
            top_p?: number;
            frequency_penalty?: number;
            presence_penalty?: number;
            best_of?: number;
            functions?: import("./openai/util").OpenAiFunction[];
            function_call?: "none" | "auto" | {
                name: string;
            };
            tools?: import("./openai/util").OpenAiTool[];
            tool_choice?: "none" | "auto" | "required" | {
                type: "function";
                function?: {
                    name: string;
                };
            };
            tool_resources?: Record<string, any>;
            showThinking?: boolean;
            response_format?: {
                type: "json_object";
            } | {
                type: "json_schema";
                json_schema: {
                    name: string;
                    strict: boolean;
                    schema: {
                        type: "object";
                        properties: Record<string, any>;
                        required?: string[];
                        additionalProperties: false;
                    };
                };
            };
            stop?: string[];
            seed?: number;
            passthrough?: object;
            reasoning_effort?: import("./openai/types").ReasoningEffort;
            modalities?: string[];
            audio?: {
                bitrate?: string;
                format?: string | "wav" | "mp3" | "flac" | "opus" | "pcm16" | "aac";
                speed?: number;
                voice?: string;
            };
            instructions?: string;
            max_output_tokens?: number;
            metadata?: Record<string, string>;
            parallel_tool_calls?: boolean;
            previous_response_id?: string;
            store?: boolean;
            stream?: boolean;
            truncation?: "auto" | "disabled";
            user?: string;
            functionToolCallbacks?: Record<import("openai").OpenAI.FunctionDefinition["name"], (arg: string) => Promise<string>>;
            mcp?: import("./mcp/types").MCPConfig;
        };
    };
    callApi(prompt: string, context?: any, callApiOptions?: any): Promise<any>;
}
export declare function createXAIProvider(providerPath: string, options?: XAIProviderOptions): ApiProvider;
export {};
//# sourceMappingURL=xai.d.ts.map