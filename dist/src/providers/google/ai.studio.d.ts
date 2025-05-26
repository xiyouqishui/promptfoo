import type { ApiProvider, ProviderResponse, CallApiContextParams, ProviderEmbeddingResponse } from '../../types';
import type { EnvOverrides } from '../../types/env';
import type { CompletionOptions } from './types';
declare class AIStudioGenericProvider implements ApiProvider {
    modelName: string;
    config: CompletionOptions;
    env?: EnvOverrides;
    constructor(modelName: string, options?: {
        config?: CompletionOptions;
        id?: string;
        env?: EnvOverrides;
    });
    id(): string;
    toString(): string;
    getApiHost(): string | undefined;
    getApiKey(): string | undefined;
    callApi(prompt: string): Promise<ProviderResponse>;
}
export declare class AIStudioChatProvider extends AIStudioGenericProvider {
    private mcpClient;
    private initializationPromise;
    constructor(modelName: string, options?: {
        config?: CompletionOptions;
        id?: string;
        env?: EnvOverrides;
    });
    private initializeMCP;
    callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse>;
    callGemini(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse>;
    cleanup(): Promise<void>;
}
export declare class GoogleEmbeddingProvider extends AIStudioGenericProvider {
    constructor(modelName: string, options?: {
        config?: CompletionOptions;
        id?: string;
        env?: EnvOverrides;
    });
    callApi(): Promise<ProviderResponse>;
    callEmbeddingApi(text: string): Promise<ProviderEmbeddingResponse>;
}
export {};
//# sourceMappingURL=ai.studio.d.ts.map