import type { Environment } from 'nunjucks';
import type { ApiProvider, AtomicTestCase, CallApiContextParams, CallApiOptionsParams, GuardrailResponse, NunjucksFilterMap, Prompt, ProviderResponse, TokenUsage } from '../../types';
import type { BaseRedteamMetadata } from '../types';
/** Constants for TAP parameters */
export declare const MAX_WIDTH = 10;
/**
 * Renders system prompts for the red team, on-topic check, and judge.
 * @param nunjucks - The Nunjucks environment for rendering templates.
 * @param goal - The goal or objective for the red team.
 * @param purpose - Optional purpose information for the system prompt.
 * @param excludeTargetOutputFromAgenticAttackGeneration - Whether to exclude target output from the attack generation process.
 * @returns An object containing the rendered system prompts.
 */
export declare function renderSystemPrompts(nunjucks: Environment, goal: string, purpose?: string, excludeTargetOutputFromAgenticAttackGeneration?: boolean): {
    redteamSystemPrompt: string;
    onTopicSystemPrompt: string;
    judgeSystemPrompt: string;
};
/**
 * Evaluates the target response using the judge system.
 * @param provider - The provider used for evaluation.
 * @param judgeSystemPrompt - The system prompt for the judge.
 * @param targetResponse - The response to be evaluated.
 * @param previousBestResponse - The previous best response for comparison.
 * @param containsPenalizedPhrase - Whether the response contains a penalized phrase.
 * @returns A promise that resolves to the evaluation score.
 */
export declare function evaluateResponse(provider: ApiProvider, judgeSystemPrompt: string, targetResponse: string, previousBestResponse: string, containsPenalizedPhrase: boolean): Promise<{
    score: number;
    explanation: string;
}>;
/**
 * Generates a new prompt based on the red team's conversation history.
 * @param redteamProvider - The OpenAI provider for the red team.
 * @param redteamHistory - The conversation history of the red team.
 * @returns A promise that resolves to an object containing the improvement and new prompt.
 */
export declare function getNewPrompt(redteamProvider: ApiProvider, redteamHistory: {
    role: 'user' | 'assistant' | 'system';
    content: string;
}[]): Promise<{
    improvement: string;
    prompt: string;
    tokenUsage?: TokenUsage;
}>;
/**
 * Checks if the target prompt is on-topic.
 * @param provider - The provider used for evaluation.
 * @param onTopicSystemPrompt - The system prompt for the on-topic check.
 * @param targetPrompt - The prompt to be checked.
 * @returns A promise that resolves to a boolean indicating if the prompt is on-topic.
 */
export declare function checkIfOnTopic(provider: ApiProvider, onTopicSystemPrompt: string, targetPrompt: string): Promise<{
    isOnTopic: boolean;
    tokenUsage?: TokenUsage;
}>;
/**
 * Updates the red team's conversation history with the latest interaction results.
 * @param targetResponse - The response from the target provider.
 * @param goal - The current goal or objective.
 * @param score - The evaluation score for the response.
 * @param isOnTopic - Whether the prompt was on-topic.
 * @param containsPenalizedPhrase - Whether the response contains a penalized phrase.
 * @param excludeTargetOutputFromAgenticAttackGeneration - Whether to exclude target output from the attack generation process.
 * @param explanation - The explanation from the judge.
 */
export declare function updateRedteamHistory(targetResponse: string, goal: string, score: number, isOnTopic: boolean, containsPenalizedPhrase: boolean, excludeTargetOutputFromAgenticAttackGeneration: boolean, explanation?: string): {
    role: 'user' | 'assistant' | 'system';
    content: string;
};
/**
 * Represents a node in the search tree.
 */
export interface TreeNode {
    id: string;
    prompt: string;
    score: number;
    children: TreeNode[];
    depth: number;
}
/**
 * Creates a new tree node.
 * @param prompt - The prompt associated with the node.
 * @param score - The score of the node.
 * @param depth - The depth of the node in the tree.
 * @param id - Optional custom UUID for the node. If not provided, a new UUID will be generated.
 * @returns A new TreeNode object.
 */
export declare function createTreeNode(prompt: string, score: number, depth: number, id?: string): TreeNode;
/**
 * Replace selectDiverseBestNodes with TAP's simpler selection strategy
 * @param nodes - The list of nodes to select from.
 * @param redteamProvider - The OpenAI provider for the red team.
 * @param onTopicSystemPrompt - The system prompt for the on-topic check.
 * @param goal - The goal or objective for the red team.
 * @returns The selected diverse nodes.
 */
export declare function selectNodes(nodes: TreeNode[], redteamProvider: ApiProvider, onTopicSystemPrompt: string, goal: string): Promise<TreeNode[]>;
/**
 * Represents a node in the search tree output.
 */
export interface TreeSearchOutput {
    id: string;
    prompt: string;
    output: string;
    score: number;
    isOnTopic: boolean;
    depth: number;
    parentId?: string;
    improvement?: string;
    wasSelected: boolean;
    graderPassed?: boolean;
    guardrails?: GuardrailResponse;
}
/**
 * Represents metadata for the iterative tree search process.
 */
export interface TreeIterativeMetadata extends BaseRedteamMetadata {
    highestScore: number;
    redteamFinalPrompt?: string;
    stopReason: 'TARGET_SCORE' | 'MAX_ATTEMPTS' | 'MAX_DEPTH' | 'NO_IMPROVEMENT' | 'GRADER_FAILED';
    attempts: number;
    redteamTreeHistory: TreeSearchOutput[];
}
/**
 * Represents the complete response from a red team conversation.
 */
export interface RedteamTreeResponse extends ProviderResponse {
    metadata: TreeIterativeMetadata;
}
/**
 * Runs the red team conversation process.
 * @param params - The parameters for the red team conversation.
 * @returns A promise that resolves to an object with the output and metadata.
 */
export declare function runRedteamConversation({ context, filters, injectVar, options, prompt, redteamProvider, gradingProvider, targetProvider, test, vars, excludeTargetOutputFromAgenticAttackGeneration, }: {
    context: CallApiContextParams;
    filters: NunjucksFilterMap | undefined;
    injectVar: string;
    options: CallApiOptionsParams;
    prompt: Prompt;
    redteamProvider: ApiProvider;
    gradingProvider: ApiProvider;
    targetProvider: ApiProvider;
    test?: AtomicTestCase;
    vars: Record<string, string | object>;
    excludeTargetOutputFromAgenticAttackGeneration: boolean;
}): Promise<RedteamTreeResponse>;
/**
 * Represents a provider for iterative red team attacks.
 */
declare class RedteamIterativeTreeProvider implements ApiProvider {
    readonly config: Record<string, string | object>;
    private readonly injectVar;
    private readonly excludeTargetOutputFromAgenticAttackGeneration;
    /**
     * Creates a new instance of RedteamIterativeTreeProvider.
     * @param config - The configuration object for the provider.
     * @param initializeProviders - A export function to initialize the OpenAI providers.
     */
    constructor(config: Record<string, string | object>);
    /**
     * Returns the identifier for this provider.
     * @returns The provider's identifier string.
     */
    id(): string;
    /**
     * Calls the API to perform a red team attack.
     * @param prompt - The rendered prompt (unused in this implementation).
     * @param context - The context for the API call.
     * @param options - Additional options for the API call.
     * @returns A promise that resolves to an object with the output and metadata.
     */
    callApi(prompt: string, context?: CallApiContextParams, options?: CallApiOptionsParams): Promise<RedteamTreeResponse>;
}
export default RedteamIterativeTreeProvider;
//# sourceMappingURL=iterativeTree.d.ts.map