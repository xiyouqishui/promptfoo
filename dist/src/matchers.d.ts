import type { ApiProvider, Assertion, GradingConfig, GradingResult, ProviderType } from './types';
export declare function getGradingProvider(type: ProviderType, provider: GradingConfig['provider'], defaultProvider: ApiProvider | null): Promise<ApiProvider | null>;
export declare function getAndCheckProvider(type: ProviderType, provider: GradingConfig['provider'], defaultProvider: ApiProvider | null, checkName: string): Promise<ApiProvider>;
export declare function matchesSimilarity(expected: string, output: string, threshold: number, inverse?: boolean, grading?: GradingConfig): Promise<Omit<GradingResult, 'assertion'>>;
/**
 *
 * @param expected Expected classification. If undefined, matches any classification.
 * @param output Text to classify.
 * @param threshold Value between 0 and 1. If the expected classification is undefined, the threshold is the minimum score for any classification. If the expected classification is defined, the threshold is the minimum score for that classification.
 * @param grading
 * @returns Pass if the output matches the classification with a score greater than or equal to the threshold.
 */
export declare function matchesClassification(expected: string | undefined, output: string, threshold: number, grading?: GradingConfig): Promise<Omit<GradingResult, 'assertion'>>;
export declare function renderLlmRubricPrompt(rubricPrompt: string, context: Record<string, string | object>): Promise<string>;
export declare function matchesLlmRubric(rubric: string | object, llmOutput: string, grading?: GradingConfig, vars?: Record<string, string | object>, assertion?: Assertion | null, options?: {
    throwOnError?: boolean;
}): Promise<GradingResult>;
export declare function matchesPiScore(renderedValue: string, llmInput: string, llmOutput: string, assertion?: Assertion | null): Promise<GradingResult>;
export declare function matchesFactuality(input: string, expected: string, output: string, grading?: GradingConfig, vars?: Record<string, string | object>): Promise<Omit<GradingResult, 'assertion'>>;
export declare function matchesClosedQa(input: string, expected: string, output: string, grading?: GradingConfig, vars?: Record<string, string | object>): Promise<Omit<GradingResult, 'assertion'>>;
export declare function matchesGEval(criteria: string, input: string, output: string, threshold: number, grading?: GradingConfig): Promise<Omit<GradingResult, 'assertion'>>;
export declare function matchesAnswerRelevance(input: string, output: string, threshold: number, grading?: GradingConfig): Promise<Omit<GradingResult, 'assertion'>>;
export declare function matchesContextRecall(context: string, groundTruth: string, threshold: number, grading?: GradingConfig, vars?: Record<string, string | object>): Promise<Omit<GradingResult, 'assertion'>>;
export declare function matchesContextRelevance(question: string, context: string, threshold: number, grading?: GradingConfig): Promise<Omit<GradingResult, 'assertion'>>;
export declare function matchesContextFaithfulness(query: string, output: string, context: string, threshold: number, grading?: GradingConfig, vars?: Record<string, string | object>): Promise<Omit<GradingResult, 'assertion'>>;
export declare function matchesSelectBest(criteria: string, outputs: string[], grading?: GradingConfig, vars?: Record<string, string | object>): Promise<Omit<GradingResult, 'assertion'>[]>;
interface ModerationMatchOptions {
    userPrompt: string;
    assistantResponse: string;
    categories?: string[];
}
export declare function matchesModeration({ userPrompt, assistantResponse, categories }: ModerationMatchOptions, grading?: GradingConfig): Promise<{
    pass: boolean;
    score: number;
    reason: string;
}>;
export {};
//# sourceMappingURL=matchers.d.ts.map