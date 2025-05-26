import type { ApiProvider, CallApiContextParams, ProviderOptions, ProviderResponse } from '../../types';
import type { CompletionOptions } from './types';
export declare class GoogleLiveProvider implements ApiProvider {
    config: CompletionOptions;
    modelName: string;
    constructor(modelName: string, options: ProviderOptions);
    id(): string;
    toString(): string;
    getApiKey(): string | undefined;
    callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse>;
}
//# sourceMappingURL=live.d.ts.map