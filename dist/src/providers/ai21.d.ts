import type { EnvVarKey } from '../envars';
import type { ApiProvider, ProviderResponse } from '../types';
import type { EnvOverrides } from '../types/env';
interface AI21ChatCompletionOptions {
    apiKey?: string;
    apiKeyEnvar?: EnvVarKey;
    apiBaseUrl?: string;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    response_format?: {
        type: 'json_object' | 'text';
    };
    cost?: number;
}
export declare class AI21ChatCompletionProvider implements ApiProvider {
    modelName: string;
    config: AI21ChatCompletionOptions;
    env?: EnvOverrides;
    static AI21_CHAT_MODELS: {
        id: string;
        cost: {
            input: number;
            output: number;
        };
    }[];
    static AI21_CHAT_MODELS_NAMES: string[];
    constructor(modelName: string, options?: {
        id?: string;
        config?: AI21ChatCompletionOptions;
        env?: EnvOverrides;
    });
    id(): string;
    toString(): string;
    getApiUrlDefault(): string;
    getApiUrl(): string;
    getApiKey(): string | undefined;
    callApi(prompt: string): Promise<ProviderResponse>;
}
export {};
//# sourceMappingURL=ai21.d.ts.map