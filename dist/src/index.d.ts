import assertions from './assertions';
import * as cache from './cache';
import guardrails from './guardrails';
import Eval from './models/eval';
import { loadApiProvider } from './providers';
import { extractEntities } from './redteam/extraction/entities';
import { extractSystemPurpose } from './redteam/extraction/purpose';
import { RedteamPluginBase, RedteamGraderBase } from './redteam/plugins/base';
import type { EvaluateOptions, EvaluateTestSuite } from './types';
export * from './types';
export { generateTable } from './table';
declare function evaluate(testSuite: EvaluateTestSuite, options?: EvaluateOptions): Promise<Eval>;
declare const redteam: {
    Extractors: {
        extractEntities: typeof extractEntities;
        extractSystemPurpose: typeof extractSystemPurpose;
    };
    Graders: Record<`promptfoo:redteam:${string}`, RedteamGraderBase>;
    Plugins: import("./redteam/plugins").PluginFactory[];
    Strategies: import("./redteam/strategies").Strategy[];
    Base: {
        Plugin: typeof RedteamPluginBase;
        Grader: typeof RedteamGraderBase;
    };
};
export { assertions, cache, evaluate, loadApiProvider, redteam, guardrails };
declare const _default: {
    assertions: {
        runAssertion: typeof import("./assertions").runAssertion;
        runAssertions: typeof import("./assertions").runAssertions;
        matchesSimilarity: typeof import("./matchers").matchesSimilarity;
        matchesClassification: typeof import("./matchers").matchesClassification;
        matchesLlmRubric: typeof import("./matchers").matchesLlmRubric;
        matchesFactuality: typeof import("./matchers").matchesFactuality;
        matchesClosedQa: typeof import("./matchers").matchesClosedQa;
        matchesAnswerRelevance: typeof import("./matchers").matchesAnswerRelevance;
        matchesContextRecall: typeof import("./matchers").matchesContextRecall;
        matchesContextRelevance: typeof import("./matchers").matchesContextRelevance;
        matchesContextFaithfulness: typeof import("./matchers").matchesContextFaithfulness;
        matchesComparisonBoolean: typeof import("./matchers").matchesSelectBest;
        matchesModeration: typeof import("./matchers").matchesModeration;
    };
    cache: typeof cache;
    evaluate: typeof evaluate;
    loadApiProvider: typeof loadApiProvider;
    redteam: {
        Extractors: {
            extractEntities: typeof extractEntities;
            extractSystemPurpose: typeof extractSystemPurpose;
        };
        Graders: Record<`promptfoo:redteam:${string}`, RedteamGraderBase>;
        Plugins: import("./redteam/plugins").PluginFactory[];
        Strategies: import("./redteam/strategies").Strategy[];
        Base: {
            Plugin: typeof RedteamPluginBase;
            Grader: typeof RedteamGraderBase;
        };
    };
    guardrails: {
        guard(input: string): Promise<import("./guardrails").GuardResult>;
        pii(input: string): Promise<import("./guardrails").GuardResult>;
        harm(input: string): Promise<import("./guardrails").GuardResult>;
        adaptive(request: import("./guardrails").AdaptiveRequest): Promise<import("./guardrails").AdaptiveResult>;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map