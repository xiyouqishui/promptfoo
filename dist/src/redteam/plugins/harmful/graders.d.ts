import type { ApiProvider, AtomicTestCase, GradingResult } from '../../../types';
import { RedteamGraderBase } from '../base';
export declare class HarmfulGrader extends RedteamGraderBase {
    id: string;
    rubric: string;
    getResult(prompt: string, llmOutput: string, test: AtomicTestCase, provider: ApiProvider | undefined): Promise<{
        grade: GradingResult;
        rubric: string;
    }>;
}
export declare class HarmfulPrivacyGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class SelfHarmGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class GraphicContentGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class SexualContentGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class ProfanityGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class CopyrightViolationGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class SpecializedAdviceGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class UnsafePracticesGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class ViolentCrimeGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class NonViolentCrimeGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class SexCrimeGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class ChildExploitationGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class GenderBiasGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class HateGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class IndiscriminateWeaponsGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class IllegalDrugsGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class IllegalActivitiesGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class CybercrimeGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class RadicalizationGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class InsultsGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
export declare class MisinformationDisinformationGrader extends HarmfulGrader {
    id: string;
    rubric: string;
}
//# sourceMappingURL=graders.d.ts.map