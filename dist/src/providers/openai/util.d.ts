import type { TokenUsage } from '../../types';
import type { ProviderConfig } from '../shared';
export declare const OPENAI_CHAT_MODELS: {
    id: string;
    cost: {
        input: number;
        output: number;
    };
}[];
export declare const OPENAI_COMPLETION_MODELS: ({
    id: string;
    cost: {
        input: number;
        output: number;
    };
} | {
    id: string;
    cost?: undefined;
})[];
export declare const OPENAI_REALTIME_MODELS: {
    id: string;
    type: string;
    cost: {
        input: number;
        output: number;
        audioInput: number;
        audioOutput: number;
    };
}[];
export declare function calculateOpenAICost(modelName: string, config: ProviderConfig, promptTokens?: number, completionTokens?: number, audioPromptTokens?: number, audioCompletionTokens?: number): number | undefined;
export declare function failApiCall(err: any): {
    error: string;
};
export declare function getTokenUsage(data: any, cached: boolean): Partial<TokenUsage>;
export interface OpenAiFunction {
    name: string;
    description?: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}
export interface OpenAiTool {
    type: 'function';
    function: OpenAiFunction;
}
export declare function validateFunctionCall(output: string | object, functions?: OpenAiFunction[], vars?: Record<string, string | object>): void;
export declare function formatOpenAiError(data: {
    error: {
        message: string;
        type?: string;
        code?: string;
    };
}): string;
//# sourceMappingURL=util.d.ts.map