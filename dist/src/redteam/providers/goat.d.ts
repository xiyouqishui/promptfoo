import type { ApiProvider, CallApiContextParams, CallApiOptionsParams, ProviderOptions, ProviderResponse } from '../../types/providers';
import type { BaseRedteamMetadata } from '../types';
/**
 * Represents metadata for the GOAT conversation process.
 */
export interface GoatMetadata extends BaseRedteamMetadata {
    redteamFinalPrompt?: string;
    stopReason: 'Grader failed' | 'Max turns reached';
}
/**
 * Represents the complete response from a GOAT conversation.
 */
export interface GoatResponse extends ProviderResponse {
    metadata: GoatMetadata;
}
export interface ExtractAttackFailureResponse {
    message: string;
    task: string;
}
export default class GoatProvider implements ApiProvider {
    private maxTurns;
    private readonly injectVar;
    private readonly stateful;
    private readonly excludeTargetOutputFromAgenticAttackGeneration;
    id(): string;
    constructor(options?: ProviderOptions & {
        maxTurns?: number;
        injectVar?: string;
        stateless?: boolean;
        stateful?: boolean;
        excludeTargetOutputFromAgenticAttackGeneration?: boolean;
    });
    callApi(prompt: string, context?: CallApiContextParams, options?: CallApiOptionsParams): Promise<GoatResponse>;
}
//# sourceMappingURL=goat.d.ts.map