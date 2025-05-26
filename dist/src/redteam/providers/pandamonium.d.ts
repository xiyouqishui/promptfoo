import type { AtomicTestCase, EvaluateResult, RunEvalOptions } from '../../types';
import type { ApiProvider, CallApiContextParams, ProviderOptions, ProviderResponse } from '../../types/providers';
/**
 * Type guard for RedteamPandamoniumProvider
 * Checks if a provider is a RedteamPandamoniumProvider by verifying it has the runPandamonium method
 */
export declare const isPandamoniumProvider: (provider: unknown) => provider is RedteamPandamoniumProvider;
export default class RedteamPandamoniumProvider implements ApiProvider {
    private maxTurns;
    private readonly injectVar;
    private readonly stateful;
    private currentTurn;
    private baseUrl;
    private currentTestIdx;
    log(message: string, level: 'error' | 'warn' | 'info' | 'debug'): void;
    id(): string;
    constructor(options?: ProviderOptions & {
        maxTurns?: number;
        injectVar?: string;
        stateful?: boolean;
    });
    callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse>;
    /**
     * Bootstraps the pandamonium run:
     * 1. Prepares the test cases payload.
     * 2. Starts the run by calling the /start API.
     * 3. Iteratively gets new test cases, evaluates them via the target provider,
     *    and (if a jailbreak is found) reports the success.
     */
    runPandamonium(targetProvider: ApiProvider, test: AtomicTestCase, allTests: RunEvalOptions[], concurrency?: number): Promise<EvaluateResult[]>;
    /**
     * Extracts tests which are not part of another strategy and groups them by plugin.
     */
    private prepareTestCases;
    /**
     * Calls the /start endpoint to kick off the pandamonium run.
     */
    private startRun;
    /**
     * Fetches iteration data by calling the /next endpoint.
     */
    private fetchNextIteration;
    /**
     * Evaluates multiple test cases using the target provider with limited concurrency.
     */
    private evaluateTestCases;
    /**
     * Evaluates a single test case by:
     *   - Finding the originating test in the full list.
     *   - Building a deep-copied test with updated vars and metadata.
     *   - Using runEval (imported on demand) to execute the test.
     */
    private evaluateSingleTest;
    /**
     * Reports a successful jailbreak by calling the /success endpoint.
     */
    private reportSuccess;
}
//# sourceMappingURL=pandamonium.d.ts.map