import type { ProviderResponse } from '../../types';
import type { EnvOverrides } from '../../types/env';
import { AnthropicGenericProvider } from './generic';
import type { AnthropicMessageOptions } from './types';
export declare class AnthropicMessagesProvider extends AnthropicGenericProvider {
    config: AnthropicMessageOptions;
    private mcpClient;
    private initializationPromise;
    static ANTHROPIC_MODELS: {
        id: string;
        cost: {
            input: number;
            output: number;
        };
    }[];
    static ANTHROPIC_MODELS_NAMES: string[];
    constructor(modelName: string, options?: {
        id?: string;
        config?: AnthropicMessageOptions;
        env?: EnvOverrides;
    });
    private initializeMCP;
    cleanup(): Promise<void>;
    toString(): string;
    callApi(prompt: string): Promise<ProviderResponse>;
}
//# sourceMappingURL=messages.d.ts.map