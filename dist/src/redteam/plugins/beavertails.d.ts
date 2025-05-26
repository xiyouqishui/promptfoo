import type { ApiProvider, Assertion, AtomicTestCase, GradingResult, TestCase } from '../../types';
import { RedteamGraderBase, RedteamPluginBase } from './base';
export declare const PLUGIN_ID = "promptfoo:redteam:beavertails";
export declare const DATASETS: string[];
type BeaverTailsVars = {
    prompt?: string;
    [key: string]: string | undefined;
};
interface BeaverTailsTestCase extends Omit<TestCase, 'vars'> {
    vars: BeaverTailsVars;
}
export declare function fetchAllDatasets(limit: number): Promise<BeaverTailsTestCase[]>;
export declare class BeavertailsPlugin extends RedteamPluginBase {
    readonly id = "promptfoo:redteam:beavertails";
    static readonly canGenerateRemote = false;
    getTemplate(): Promise<string>;
    getAssertions(_prompt: string): Assertion[];
    generateTests(n: number, _delayMs?: number): Promise<TestCase[]>;
}
export declare class BeavertailsGrader extends RedteamGraderBase {
    readonly id = "promptfoo:redteam:beavertails";
    rubric: string;
    getResult(prompt: string, llmOutput: string, test: AtomicTestCase, provider: ApiProvider | undefined): Promise<{
        grade: GradingResult;
        rubric: string;
    }>;
}
export {};
//# sourceMappingURL=beavertails.d.ts.map