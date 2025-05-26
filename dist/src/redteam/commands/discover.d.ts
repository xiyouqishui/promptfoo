import { type Command } from 'commander';
import { z } from 'zod';
import type { ApiProvider, Prompt, UnifiedConfig } from '../../types';
export declare const TargetPurposeDiscoveryStateSchema: z.ZodObject<{
    currentQuestionIndex: z.ZodNumber;
    answers: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    currentQuestionIndex: number;
    answers: string[];
}, {
    currentQuestionIndex: number;
    answers: string[];
}>;
export declare const TargetPurposeDiscoveryRequestSchema: z.ZodObject<{
    state: z.ZodObject<{
        currentQuestionIndex: z.ZodNumber;
        answers: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        currentQuestionIndex: number;
        answers: string[];
    }, {
        currentQuestionIndex: number;
        answers: string[];
    }>;
    task: z.ZodLiteral<"target-purpose-discovery">;
    version: z.ZodString;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    state: {
        currentQuestionIndex: number;
        answers: string[];
    };
    task: "target-purpose-discovery";
    email?: string | null | undefined;
}, {
    version: string;
    state: {
        currentQuestionIndex: number;
        answers: string[];
    };
    task: "target-purpose-discovery";
    email?: string | null | undefined;
}>;
export declare const TargetPurposeDiscoveryResultSchema: z.ZodObject<{
    purpose: z.ZodNullable<z.ZodString>;
    limitations: z.ZodNullable<z.ZodString>;
    user: z.ZodNullable<z.ZodString>;
    tools: z.ZodArray<z.ZodNullable<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        arguments: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            type: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            description: string;
            name: string;
        }, {
            type: string;
            description: string;
            name: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        description: string;
        name: string;
        arguments: {
            type: string;
            description: string;
            name: string;
        }[];
    }, {
        description: string;
        name: string;
        arguments: {
            type: string;
            description: string;
            name: string;
        }[];
    }>>, "many">;
}, "strip", z.ZodTypeAny, {
    purpose: string | null;
    user: string | null;
    tools: ({
        description: string;
        name: string;
        arguments: {
            type: string;
            description: string;
            name: string;
        }[];
    } | null)[];
    limitations: string | null;
}, {
    purpose: string | null;
    user: string | null;
    tools: ({
        description: string;
        name: string;
        arguments: {
            type: string;
            description: string;
            name: string;
        }[];
    } | null)[];
    limitations: string | null;
}>;
export declare const TargetPurposeDiscoveryTaskResponseSchema: z.ZodObject<{
    done: z.ZodBoolean;
    question: z.ZodOptional<z.ZodString>;
    purpose: z.ZodOptional<z.ZodObject<{
        purpose: z.ZodNullable<z.ZodString>;
        limitations: z.ZodNullable<z.ZodString>;
        user: z.ZodNullable<z.ZodString>;
        tools: z.ZodArray<z.ZodNullable<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            arguments: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                description: z.ZodString;
                type: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: string;
                description: string;
                name: string;
            }, {
                type: string;
                description: string;
                name: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            description: string;
            name: string;
            arguments: {
                type: string;
                description: string;
                name: string;
            }[];
        }, {
            description: string;
            name: string;
            arguments: {
                type: string;
                description: string;
                name: string;
            }[];
        }>>, "many">;
    }, "strip", z.ZodTypeAny, {
        purpose: string | null;
        user: string | null;
        tools: ({
            description: string;
            name: string;
            arguments: {
                type: string;
                description: string;
                name: string;
            }[];
        } | null)[];
        limitations: string | null;
    }, {
        purpose: string | null;
        user: string | null;
        tools: ({
            description: string;
            name: string;
            arguments: {
                type: string;
                description: string;
                name: string;
            }[];
        } | null)[];
        limitations: string | null;
    }>>;
    state: z.ZodObject<{
        currentQuestionIndex: z.ZodNumber;
        answers: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        currentQuestionIndex: number;
        answers: string[];
    }, {
        currentQuestionIndex: number;
        answers: string[];
    }>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    done: boolean;
    state: {
        currentQuestionIndex: number;
        answers: string[];
    };
    error?: string | undefined;
    purpose?: {
        purpose: string | null;
        user: string | null;
        tools: ({
            description: string;
            name: string;
            arguments: {
                type: string;
                description: string;
                name: string;
            }[];
        } | null)[];
        limitations: string | null;
    } | undefined;
    question?: string | undefined;
}, {
    done: boolean;
    state: {
        currentQuestionIndex: number;
        answers: string[];
    };
    error?: string | undefined;
    purpose?: {
        purpose: string | null;
        user: string | null;
        tools: ({
            description: string;
            name: string;
            arguments: {
                type: string;
                description: string;
                name: string;
            }[];
        } | null)[];
        limitations: string | null;
    } | undefined;
    question?: string | undefined;
}>;
export declare const ArgsSchema: z.ZodEffects<z.ZodObject<{
    config: z.ZodOptional<z.ZodString>;
    target: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    config?: string | undefined;
    target?: string | undefined;
}, {
    config?: string | undefined;
    target?: string | undefined;
}>, {
    config?: string | undefined;
    target?: string | undefined;
}, {
    config?: string | undefined;
    target?: string | undefined;
}>;
export type TargetPurposeDiscoveryResult = z.infer<typeof TargetPurposeDiscoveryResultSchema>;
export declare const DEFAULT_TURN_COUNT = 5;
export declare const MAX_TURN_COUNT = 10;
/**
 * Queries Cloud for the purpose-discovery logic, sends each logic to the target,
 * and summarizes the results.
 *
 * @param target - The target API provider.
 * @param prompt - The prompt to use for the discovery.
 * @returns The discovery result.
 */
export declare function doTargetPurposeDiscovery(target: ApiProvider, prompt?: Prompt): Promise<TargetPurposeDiscoveryResult | undefined>;
/**
 * Merges the human-defined purpose with the discovered information, structuring these as markdown to be used by test generation.
 * @param humanDefinedPurpose - The human-defined purpose.
 * @param discoveryResult - The discovery result.
 * @returns The merged purpose as markdown.
 */
export declare function mergeTargetPurposeDiscoveryResults(humanDefinedPurpose?: string, discoveryResult?: TargetPurposeDiscoveryResult): string;
/**
 * Registers the `discover` command with the CLI.
 */
export declare function discoverCommand(program: Command, defaultConfig: Partial<UnifiedConfig>, defaultConfigPath: string | undefined): void;
//# sourceMappingURL=discover.d.ts.map