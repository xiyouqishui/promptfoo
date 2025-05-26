import type { Assertion, TestCase } from '../../types';
import { RedteamPluginBase } from './base';
export declare const PLUGIN_ID = "promptfoo:redteam:cyberseceval";
export declare class CyberSecEvalPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:cyberseceval";
    static readonly canGenerateRemote = false;
    getTemplate(): Promise<string>;
    getAssertions(prompt: string): Assertion[];
    generateTests(n: number, _delayMs?: number): Promise<TestCase[]>;
}
//# sourceMappingURL=cyberseceval.d.ts.map