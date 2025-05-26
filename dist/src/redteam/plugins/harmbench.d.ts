import type { Assertion, TestCase } from '../../types';
import { RedteamPluginBase, RedteamGraderBase } from './base';
export declare const PLUGIN_ID = "promptfoo:redteam:harmbench";
export declare class HarmbenchPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:harmbench";
    static readonly canGenerateRemote = false;
    getTemplate(): Promise<string>;
    generateTests(n: number, delayMs?: number): Promise<TestCase[]>;
    protected getAssertions(prompt: string): Assertion[];
}
export declare class HarmbenchGrader extends RedteamGraderBase {
    readonly id = "promptfoo:redteam:harmbench";
    rubric: string;
}
//# sourceMappingURL=harmbench.d.ts.map