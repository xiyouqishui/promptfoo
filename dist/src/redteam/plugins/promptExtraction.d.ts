import type { ApiProvider, Assertion, TestCase } from '../../types';
import { RedteamPluginBase, RedteamGraderBase } from './base';
export declare const PLUGIN_ID = "promptfoo:redteam:prompt-extraction";
export declare class PromptExtractionPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:prompt-extraction";
    private systemPrompt;
    constructor(provider: ApiProvider, purpose: string, injectVar: string, config: {
        systemPrompt?: string;
    });
    protected getTemplate(): Promise<string>;
    protected getAssertions(prompt: string): Assertion[];
    generateTests(n: number, delayMs: number): Promise<TestCase[]>;
}
export declare class PromptExtractionGrader extends RedteamGraderBase {
    readonly id = "promptfoo:redteam:prompt-extraction";
    rubric: string;
}
//# sourceMappingURL=promptExtraction.d.ts.map