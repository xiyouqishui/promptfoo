import type { ApiProvider, Assertion, AtomicTestCase, GradingResult, TestCase } from '../../types';
import { RedteamGraderBase, RedteamPluginBase } from './base';
export declare const PLUGIN_ID = "promptfoo:redteam:intent";
type Intent = string | string[];
interface IntentPluginConfig {
    intent: Intent | Intent[];
}
export declare class IntentPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:intent";
    static readonly canGenerateRemote = false;
    private intents;
    constructor(provider: ApiProvider, purpose: string, injectVar: string, config: IntentPluginConfig);
    protected getTemplate(): Promise<string>;
    protected getAssertions(prompt: string): Assertion[];
    generateTests(n: number, delayMs: number): Promise<TestCase[]>;
}
export declare class IntentGrader extends RedteamGraderBase {
    id: string;
    rubric: string;
    getResult(prompt: string, llmOutput: string, test: AtomicTestCase, provider: ApiProvider | undefined): Promise<{
        grade: GradingResult;
        rubric: string;
    }>;
}
export {};
//# sourceMappingURL=intent.d.ts.map