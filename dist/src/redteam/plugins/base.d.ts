import type { ApiProvider, Assertion, AssertionValue, PluginConfig, ResultSuggestion, TestCase } from '../../types';
import type { AtomicTestCase, GradingResult } from '../../types';
/**
 * Parses the LLM response of generated prompts into an array of objects.
 *
 * @param generatedPrompts - The LLM response of generated prompts.
 * @returns An array of { prompt: string } objects. Each of these objects represents a test case.
 */
export declare function parseGeneratedPrompts(generatedPrompts: string): {
    prompt: string;
}[];
/**
 * Abstract base class for creating plugins that generate test cases.
 */
export declare abstract class RedteamPluginBase {
    protected provider: ApiProvider;
    protected purpose: string;
    protected injectVar: string;
    protected config: PluginConfig;
    /**
     * Unique identifier for the plugin.
     */
    abstract readonly id: string;
    /**
     * Whether this plugin can be generated remotely if OpenAI is not available.
     * Defaults to true. Set to false for plugins that use static data sources
     * like datasets, CSVs, or JSON files that don't need remote generation.
     */
    readonly canGenerateRemote: boolean;
    /**
     * Creates an instance of RedteamPluginBase.
     * @param provider - The API provider used for generating prompts.
     * @param purpose - The purpose of the plugin.
     * @param injectVar - The variable name to inject the generated prompt into.
     * @param config - An optional object of plugin configuration.
     */
    constructor(provider: ApiProvider, purpose: string, injectVar: string, config?: PluginConfig);
    /**
     * Template string used to generate prompts.
     */
    protected abstract getTemplate(): Promise<string>;
    /**
     * Abstract method to get assertions for a given prompt.
     * @param prompt - The prompt to generate assertions for.
     * @returns An array of Assertion objects.
     */
    protected abstract getAssertions(prompt: string): Assertion[];
    /**
     * Generates test cases based on the plugin's configuration.
     * @param n - The number of test cases to generate.
     * @param delayMs - The delay in milliseconds between plugin API calls.
     * @param templateGetter - A function that returns a promise of a template string.
     * @returns A promise that resolves to an array of TestCase objects.
     */
    generateTests(n: number, delayMs?: number, templateGetter?: () => Promise<string>): Promise<TestCase[]>;
    /**
     * Converts an array of { prompt: string } objects into an array of test cases.
     * @param prompts - An array of { prompt: string } objects.
     * @returns An array of test cases.
     */
    protected promptsToTestCases(prompts: {
        prompt: string;
    }[]): TestCase[];
    /**
     * Appends modifiers to the template.
     * @param template - The template to append modifiers to.
     * @returns The modified template.
     */
    private appendModifiers;
}
/**
 * Base class for all redteam graders.
 *
 * Each grader should implement an id (e.g. `promptfoo:redteam:foo`) and a rubric (grading prompt).
 * By default, the rubric is passed to `llm-rubric` grader.
 *
 * But if you'd like, you can override the `getResult` method to use a different grading method.
 */
export declare abstract class RedteamGraderBase {
    abstract id: string;
    abstract rubric: string;
    renderRubric(vars: Record<string, any>): string;
    getSuggestions({ test, rawPrompt, renderedValue, }: {
        test: AtomicTestCase;
        rawPrompt: string;
        renderedValue?: AssertionValue;
    }): ResultSuggestion[];
    getResult(prompt: string, llmOutput: string, test: AtomicTestCase, provider: ApiProvider | undefined, renderedValue: AssertionValue | undefined): Promise<{
        grade: GradingResult;
        rubric: string;
        suggestions?: ResultSuggestion[];
    }>;
}
//# sourceMappingURL=base.d.ts.map