import { type TestCaseWithPlugin } from '../types';
import type { RedteamStrategyObject, SynthesizeOptions } from './types';
/**
 * Resolves top-level file paths in the plugin configuration.
 * @param config - The plugin configuration to resolve.
 * @returns The resolved plugin configuration.
 */
export declare function resolvePluginConfig(config: Record<string, any> | undefined): Record<string, any>;
/**
 * Helper function to calculate the number of expected test cases for the multilingual strategy.
 */
export declare function getMultilingualRequestedCount(testCases: TestCaseWithPlugin[], strategy: RedteamStrategyObject): number;
/**
 * Helper function to get the test count based on strategy configuration.
 * @param strategy - The strategy object to evaluate.
 * @param totalPluginTests - The total number of plugin tests.
 * @param strategies - The array of strategies.
 * @returns The calculated test count.
 */
export declare function getTestCount(strategy: RedteamStrategyObject, totalPluginTests: number, strategies: RedteamStrategyObject[]): number;
/**
 * Calculates the total number of tests to be generated based on plugins and strategies.
 * @param plugins - The array of plugins to generate tests for
 * @param strategies - The array of strategies to apply
 * @returns Object containing total tests and intermediate calculations
 */
export declare function calculateTotalTests(plugins: SynthesizeOptions['plugins'], strategies: RedteamStrategyObject[]): {
    effectiveStrategyCount: number;
    includeBasicTests: boolean;
    multilingualStrategy: RedteamStrategyObject | undefined;
    totalPluginTests: number;
    totalTests: number;
};
/**
 * Synthesizes test cases based on provided options.
 * @param options - The options for test case synthesis.
 * @returns A promise that resolves to an object containing the purpose, entities, and test cases.
 */
export declare function synthesize({ abortSignal, delay, entities: entitiesOverride, injectVar, language, maxConcurrency, plugins, prompts, provider, purpose: purposeOverride, strategies, targetLabels, showProgressBar: showProgressBarOverride, excludeTargetOutputFromAgenticAttackGeneration, }: SynthesizeOptions): Promise<{
    purpose: string;
    entities: string[];
    testCases: TestCaseWithPlugin[];
    injectVar: string;
}>;
//# sourceMappingURL=index.d.ts.map