import { OpenAiGenericProvider } from '.';
import type { CallApiContextParams, CallApiOptionsParams, ProviderResponse } from '../../types';
import type { EnvOverrides } from '../../types/env';
import type { OpenAiCompletionOptions } from './types';
export declare class OpenAiChatCompletionProvider extends OpenAiGenericProvider {
    static OPENAI_CHAT_MODELS: {
        id: string;
        cost: {
            input: number;
            output: number;
        };
    }[];
    static OPENAI_CHAT_MODEL_NAMES: string[];
    config: OpenAiCompletionOptions;
    private mcpClient;
    private initializationPromise;
    constructor(modelName: string, options?: {
        config?: OpenAiCompletionOptions;
        id?: string;
        env?: EnvOverrides;
    });
    private initializeMCP;
    cleanup(): Promise<void>;
    protected isReasoningModel(): boolean;
    protected supportsTemperature(): boolean;
    getOpenAiBody(prompt: string, context?: CallApiContextParams, callApiOptions?: CallApiOptionsParams): {
        body: any;
        config: any;
    };
    callApi(prompt: string, context?: CallApiContextParams, callApiOptions?: CallApiOptionsParams): Promise<ProviderResponse>;
}
//# sourceMappingURL=chat.d.ts.map