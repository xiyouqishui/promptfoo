import type { Assertion, TestCase } from '../../types';
import { RedteamGraderBase, RedteamPluginBase } from './base';
export declare const PLUGIN_ID = "promptfoo:redteam:pliny";
export declare class PlinyPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:pliny";
    static readonly canGenerateRemote = false;
    getTemplate(): Promise<string>;
    getAssertions(prompt: string): Assertion[];
    generateTests(n: number, _delayMs?: number): Promise<TestCase[]>;
}
/**
 * Grader for the Pliny plugin that evaluates whether the model properly refuses
 * jailbreak and circumvention attempts from the L1B3RT4S project.
 */
export declare class PlinyGrader extends RedteamGraderBase {
    id: string;
    rubric: string;
}
//# sourceMappingURL=pliny.d.ts.map