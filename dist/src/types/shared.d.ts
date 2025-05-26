import { z } from 'zod';
export declare const CompletionTokenDetailsSchema: z.ZodObject<{
    reasoning: z.ZodOptional<z.ZodNumber>;
    acceptedPrediction: z.ZodOptional<z.ZodNumber>;
    rejectedPrediction: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reasoning?: number | undefined;
    acceptedPrediction?: number | undefined;
    rejectedPrediction?: number | undefined;
}, {
    reasoning?: number | undefined;
    acceptedPrediction?: number | undefined;
    rejectedPrediction?: number | undefined;
}>;
export type CompletionTokenDetails = z.infer<typeof CompletionTokenDetailsSchema>;
/**
 * Base schema for token usage statistics with all fields optional
 */
export declare const BaseTokenUsageSchema: z.ZodObject<{
    prompt: z.ZodOptional<z.ZodNumber>;
    completion: z.ZodOptional<z.ZodNumber>;
    cached: z.ZodOptional<z.ZodNumber>;
    total: z.ZodOptional<z.ZodNumber>;
    numRequests: z.ZodOptional<z.ZodNumber>;
    completionDetails: z.ZodOptional<z.ZodObject<{
        reasoning: z.ZodOptional<z.ZodNumber>;
        acceptedPrediction: z.ZodOptional<z.ZodNumber>;
        rejectedPrediction: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reasoning?: number | undefined;
        acceptedPrediction?: number | undefined;
        rejectedPrediction?: number | undefined;
    }, {
        reasoning?: number | undefined;
        acceptedPrediction?: number | undefined;
        rejectedPrediction?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
/**
 * Complete token usage statistics, including assertion data
 */
export declare const TokenUsageSchema: z.ZodObject<{
    prompt: z.ZodOptional<z.ZodNumber>;
    completion: z.ZodOptional<z.ZodNumber>;
    cached: z.ZodOptional<z.ZodNumber>;
    total: z.ZodOptional<z.ZodNumber>;
    numRequests: z.ZodOptional<z.ZodNumber>;
    completionDetails: z.ZodOptional<z.ZodObject<{
        reasoning: z.ZodOptional<z.ZodNumber>;
        acceptedPrediction: z.ZodOptional<z.ZodNumber>;
        rejectedPrediction: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reasoning?: number | undefined;
        acceptedPrediction?: number | undefined;
        rejectedPrediction?: number | undefined;
    }, {
        reasoning?: number | undefined;
        acceptedPrediction?: number | undefined;
        rejectedPrediction?: number | undefined;
    }>>;
} & {
    assertions: z.ZodOptional<z.ZodObject<{
        prompt: z.ZodOptional<z.ZodNumber>;
        completion: z.ZodOptional<z.ZodNumber>;
        cached: z.ZodOptional<z.ZodNumber>;
        total: z.ZodOptional<z.ZodNumber>;
        numRequests: z.ZodOptional<z.ZodNumber>;
        completionDetails: z.ZodOptional<z.ZodObject<{
            reasoning: z.ZodOptional<z.ZodNumber>;
            acceptedPrediction: z.ZodOptional<z.ZodNumber>;
            rejectedPrediction: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            reasoning?: number | undefined;
            acceptedPrediction?: number | undefined;
            rejectedPrediction?: number | undefined;
        }, {
            reasoning?: number | undefined;
            acceptedPrediction?: number | undefined;
            rejectedPrediction?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export type BaseTokenUsage = z.infer<typeof BaseTokenUsageSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type NunjucksFilterMap = Record<string, (...args: any[]) => string>;
//# sourceMappingURL=shared.d.ts.map