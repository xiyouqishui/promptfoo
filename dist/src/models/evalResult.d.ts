import type { AtomicTestCase, GradingResult, Prompt, ProviderOptions, ProviderResponse, ResultFailureReason, ApiProvider } from '../types';
import { type EvaluateResult } from '../types';
export declare function sanitizeProvider(provider: ApiProvider | ProviderOptions | string): ProviderOptions;
export default class EvalResult {
    static createFromEvaluateResult(evalId: string, result: EvaluateResult, opts?: {
        persist: boolean;
    }): Promise<EvalResult>;
    static createManyFromEvaluateResult(results: EvaluateResult[], evalId: string): Promise<EvalResult[]>;
    static findById(id: string): Promise<EvalResult | null>;
    static findManyByEvalId(evalId: string, opts?: {
        testIdx?: number;
    }): Promise<EvalResult[]>;
    static findManyByEvalIdAndTestIndices(evalId: string, testIndices: number[]): Promise<EvalResult[]>;
    static findManyByEvalIdBatched(evalId: string, opts?: {
        batchSize?: number;
    }): AsyncGenerator<EvalResult[]>;
    id: string;
    evalId: string;
    description?: string | null;
    promptIdx: number;
    testIdx: number;
    testCase: AtomicTestCase;
    prompt: Prompt;
    promptId: string;
    error?: string | null;
    success: boolean;
    score: number;
    response: ProviderResponse | undefined;
    gradingResult: GradingResult | null;
    namedScores: Record<string, number>;
    provider: ProviderOptions;
    latencyMs: number;
    cost: number;
    metadata: Record<string, any>;
    failureReason: ResultFailureReason;
    persisted: boolean;
    constructor(opts: {
        id: string;
        evalId: string;
        promptIdx: number;
        testIdx: number;
        testCase: AtomicTestCase;
        prompt: Prompt;
        promptId?: string | null;
        error?: string | null;
        success: boolean;
        score: number;
        response: ProviderResponse | null;
        gradingResult: GradingResult | null;
        namedScores?: Record<string, number> | null;
        provider: ProviderOptions;
        latencyMs?: number | null;
        cost?: number | null;
        metadata?: Record<string, any> | null;
        failureReason: ResultFailureReason;
        persisted?: boolean;
    });
    save(): Promise<void>;
    toEvaluateResult(): EvaluateResult;
}
//# sourceMappingURL=evalResult.d.ts.map