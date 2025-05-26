import type { ApiProvider, CallApiContextParams, CallApiOptionsParams, ProviderResponse, RedteamFileConfig } from '../../../types';
import type { BaseRedteamMetadata } from '../../types';
import type { Message } from '../shared';
export declare const DEFAULT_MAX_ROUNDS = 10;
export declare const DEFAULT_MAX_BACKTRACKS = 10;
/**
 * Represents metadata for the Crescendo conversation process.
 */
export interface CrescendoMetadata extends BaseRedteamMetadata {
    crescendoRoundsCompleted: number;
    crescendoBacktrackCount: number;
    crescendoResult: boolean;
    crescendoConfidence: number | null;
    stopReason: 'Grader failed' | 'Max backtracks reached';
}
/**
 * Represents the complete response from a Crescendo conversation.
 */
export interface CrescendoResponse extends ProviderResponse {
    metadata: CrescendoMetadata;
}
interface CrescendoConfig {
    injectVar: string;
    maxRounds?: number;
    maxBacktracks?: number;
    redteamProvider: RedteamFileConfig['provider'];
    excludeTargetOutputFromAgenticAttackGeneration?: boolean;
    stateful?: boolean;
}
export declare class MemorySystem {
    private conversations;
    addMessage(conversationId: string, message: Message): void;
    getConversation(conversationId: string): Message[];
    duplicateConversationExcludingLastTurn(conversationId: string): string;
}
export declare class CrescendoProvider implements ApiProvider {
    readonly config: CrescendoConfig;
    private readonly nunjucks;
    private userGoal;
    private redTeamProvider;
    private scoringProvider;
    private memory;
    private targetConversationId;
    private redTeamingChatConversationId;
    private maxRounds;
    private maxBacktracks;
    private stateful;
    private excludeTargetOutputFromAgenticAttackGeneration;
    constructor(config: CrescendoConfig);
    private getRedTeamProvider;
    private getScoringProvider;
    id(): string;
    callApi(prompt: string, context?: CallApiContextParams, options?: CallApiOptionsParams): Promise<CrescendoResponse>;
    private runAttack;
    private getAttackPrompt;
    private sendPrompt;
    private getRefusalScore;
    private getEvalScore;
    private backtrackMemory;
    private logChatHistory;
}
export default CrescendoProvider;
//# sourceMappingURL=index.d.ts.map