"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenUsageSchema = exports.BaseTokenUsageSchema = exports.CompletionTokenDetailsSchema = void 0;
const zod_1 = require("zod");
// for reasoning models
exports.CompletionTokenDetailsSchema = zod_1.z.object({
    reasoning: zod_1.z.number().optional(),
    acceptedPrediction: zod_1.z.number().optional(),
    rejectedPrediction: zod_1.z.number().optional(),
});
/**
 * Base schema for token usage statistics with all fields optional
 */
exports.BaseTokenUsageSchema = zod_1.z.object({
    // Core token counts
    prompt: zod_1.z.number().optional(),
    completion: zod_1.z.number().optional(),
    cached: zod_1.z.number().optional(),
    total: zod_1.z.number().optional(),
    // Request metadata
    numRequests: zod_1.z.number().optional(),
    // Detailed completion information
    completionDetails: exports.CompletionTokenDetailsSchema.optional(),
});
/**
 * Complete token usage statistics, including assertion data
 */
exports.TokenUsageSchema = exports.BaseTokenUsageSchema.extend({
    assertions: exports.BaseTokenUsageSchema.optional(),
});
//# sourceMappingURL=shared.js.map