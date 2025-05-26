import type { ApiProvider, CallApiContextParams, CallApiOptionsParams, ProviderResponse } from '../types';
import type { EnvOverrides } from '../types/env';
interface PromptfooHarmfulCompletionOptions {
    harmCategory: string;
    n: number;
    purpose: string;
}
export declare class PromptfooHarmfulCompletionProvider implements ApiProvider {
    harmCategory: string;
    n: number;
    purpose: string;
    constructor(options: PromptfooHarmfulCompletionOptions);
    id(): string;
    toString(): string;
    callApi(prompt: string, context?: CallApiContextParams, callApiOptions?: CallApiOptionsParams): Promise<ProviderResponse & {
        output?: string[];
    }>;
}
interface PromptfooChatCompletionOptions {
    env?: EnvOverrides;
    id?: string;
    jsonOnly: boolean;
    preferSmallModel: boolean;
    task: 'crescendo' | 'goat' | 'iterative' | 'iterative:image' | 'iterative:tree' | 'judge';
}
export declare class PromptfooChatCompletionProvider implements ApiProvider {
    private options;
    constructor(options: PromptfooChatCompletionOptions);
    id(): string;
    toString(): string;
    callApi(prompt: string, context?: CallApiContextParams, callApiOptions?: CallApiOptionsParams): Promise<ProviderResponse>;
}
interface PromptfooAgentOptions {
    env?: EnvOverrides;
    id?: string;
    instructions?: string;
}
export declare class PromptfooSimulatedUserProvider implements ApiProvider {
    private options;
    constructor(options?: PromptfooAgentOptions);
    id(): string;
    toString(): string;
    callApi(prompt: string, context?: CallApiContextParams, callApiOptions?: CallApiOptionsParams): Promise<ProviderResponse>;
}
export {};
//# sourceMappingURL=promptfoo.d.ts.map