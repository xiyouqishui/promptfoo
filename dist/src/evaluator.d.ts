import type Eval from './models/eval';
import type { TokenUsage } from './types';
import { type EvaluateOptions, type EvaluateResult, type Prompt, type RunEvalOptions, type TestSuite } from './types';
export declare const DEFAULT_MAX_CONCURRENCY = 4;
/**
 * Validates if a given prompt is allowed based on the provided list of allowed
 * prompt labels. Providers can be configured with a `prompts` attribute, which
 * corresponds to an array of prompt labels. Labels can either refer to a group
 * (for example from a file) or to individual prompts. If the attribute is
 * present, this function validates that the prompt labels fit the matching
 * criteria of the provider. Examples:
 *
 * - `prompts: ['examplePrompt']` matches `examplePrompt` exactly
 * - `prompts: ['exampleGroup:*']` matches any prompt that starts with `exampleGroup:`
 *
 * If no `prompts` attribute is present, all prompts are allowed by default.
 *
 * @param prompt - The prompt object to check.
 * @param allowedPrompts - The list of allowed prompt labels.
 * @returns Returns true if the prompt is allowed, false otherwise.
 */
export declare function isAllowedPrompt(prompt: Prompt, allowedPrompts: string[] | undefined): boolean;
export declare function newTokenUsage(): Required<TokenUsage>;
/**
 * Runs a single test case.
 * @param options - The options for running the test case.
 * {
 *   provider - The provider to use for the test case.
 *   prompt - The raw prompt to use for the test case.
 *   test - The test case to run with assertions, etc.
 *   delay - A delay in ms to wait before any provider calls
 *   nunjucksFilters - The nunjucks filters to use for the test case.
 *   evaluateOptions - Currently unused
 *   testIdx - The index of the test case among all tests (row in the results table).
 *   promptIdx - The index of the prompt among all prompts (column in the results table).
 *   conversations - Evals can be run serially across multiple turns of a conversation. This gives access to the conversation history.
 *   registers - The registers to use for the test case to store values for later tests.
 *   isRedteam - Whether the test case is a redteam test case.
 * }
 * @returns The result of the test case.
 */
export declare function runEval({ provider, prompt, // raw prompt
test, delay, nunjucksFilters: filters, evaluateOptions, testIdx, promptIdx, conversations, registers, isRedteam, allTests, concurrency, abortSignal, }: RunEvalOptions): Promise<EvaluateResult[]>;
/**
 * Calculates the number of threads allocated to a specific progress bar.
 * @param concurrency Total number of concurrent threads
 * @param numProgressBars Total number of progress bars
 * @param barIndex Index of the progress bar (0-based)
 * @returns Number of threads allocated to this progress bar
 */
export declare function calculateThreadsPerBar(concurrency: number, numProgressBars: number, barIndex: number): number;
export declare function generateVarCombinations(vars: Record<string, string | string[] | any>): Record<string, string | any[]>[];
export declare function evaluate(testSuite: TestSuite, evalRecord: Eval, options: EvaluateOptions): Promise<Eval>;
//# sourceMappingURL=evaluator.d.ts.map