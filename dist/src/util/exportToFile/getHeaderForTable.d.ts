import type Eval from '../../models/eval';
export declare function getHeaderForTable(eval_: Eval): {
    vars: string[];
    prompts: {
        provider: string;
        raw: string;
        label: string;
        function?: ((args_0: {
            vars: Record<string, any>;
            provider?: import("../..").ApiProvider | undefined;
        }, ...args: unknown[]) => Promise<any>) | undefined;
        id?: string | undefined;
        config?: any;
        display?: string | undefined;
        metrics?: {
            cost: number;
            tokenUsage: {
                prompt?: number | undefined;
                completion?: number | undefined;
                cached?: number | undefined;
                total?: number | undefined;
                numRequests?: number | undefined;
                completionDetails?: {
                    reasoning?: number | undefined;
                    acceptedPrediction?: number | undefined;
                    rejectedPrediction?: number | undefined;
                } | undefined;
                assertions?: {
                    prompt?: number | undefined;
                    completion?: number | undefined;
                    cached?: number | undefined;
                    total?: number | undefined;
                    numRequests?: number | undefined;
                    completionDetails?: {
                        reasoning?: number | undefined;
                        acceptedPrediction?: number | undefined;
                        rejectedPrediction?: number | undefined;
                    } | undefined;
                } | undefined;
            };
            score: number;
            testPassCount: number;
            testFailCount: number;
            testErrorCount: number;
            assertPassCount: number;
            assertFailCount: number;
            totalLatencyMs: number;
            namedScores: Record<string, number>;
            namedScoresCount: Record<string, number>;
            redteam?: {
                pluginPassCount: Record<string, number>;
                pluginFailCount: Record<string, number>;
                strategyPassCount: Record<string, number>;
                strategyFailCount: Record<string, number>;
            } | undefined;
        } | undefined;
    }[];
};
//# sourceMappingURL=getHeaderForTable.d.ts.map