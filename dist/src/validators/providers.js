"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderSchema = exports.ProvidersSchema = exports.ProviderClassificationResponseSchema = exports.ProviderSimilarityResponseSchema = exports.ProviderEmbeddingResponseSchema = exports.ProviderResponseSchema = exports.ApiProviderSchema = exports.CallApiOptionsParamsSchema = exports.CallApiContextParamsSchema = exports.ProviderOptionsSchema = void 0;
const zod_1 = require("zod");
const env_1 = require("../types/env");
const shared_1 = require("../types/shared");
const prompts_1 = require("./prompts");
const shared_2 = require("./shared");
exports.ProviderOptionsSchema = zod_1.z
    .object({
    id: zod_1.z.custom().optional(),
    label: zod_1.z.custom().optional(),
    config: zod_1.z.any().optional(),
    prompts: zod_1.z.array(zod_1.z.string()).optional(),
    transform: zod_1.z.string().optional(),
    delay: zod_1.z.number().optional(),
    env: env_1.ProviderEnvOverridesSchema.optional(),
})
    .strict();
exports.CallApiContextParamsSchema = zod_1.z.object({
    fetchWithCache: zod_1.z.optional(zod_1.z.any()),
    filters: shared_2.NunjucksFilterMapSchema.optional(),
    getCache: zod_1.z.optional(zod_1.z.any()),
    logger: zod_1.z.optional(zod_1.z.any()),
    originalProvider: zod_1.z.optional(zod_1.z.any()),
    prompt: prompts_1.PromptSchema,
    vars: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.object({})])),
});
exports.CallApiOptionsParamsSchema = zod_1.z.object({
    includeLogProbs: zod_1.z.optional(zod_1.z.boolean()),
});
const CallApiFunctionSchema = zod_1.z
    .function()
    .args(zod_1.z.string().describe('prompt'), exports.CallApiContextParamsSchema.optional(), exports.CallApiOptionsParamsSchema.optional())
    .returns(zod_1.z.promise(zod_1.z.custom()))
    .and(zod_1.z.object({ label: zod_1.z.string().optional() }));
exports.ApiProviderSchema = zod_1.z.object({
    id: zod_1.z.function().returns(zod_1.z.string()),
    callApi: zod_1.z.custom(),
    callEmbeddingApi: zod_1.z
        .function()
        .args(zod_1.z.string())
        .returns(zod_1.z.promise(zod_1.z.custom()))
        .optional(),
    callClassificationApi: zod_1.z
        .function()
        .args(zod_1.z.string())
        .returns(zod_1.z.promise(zod_1.z.custom()))
        .optional(),
    label: zod_1.z.custom().optional(),
    transform: zod_1.z.string().optional(),
    delay: zod_1.z.number().optional(),
    config: zod_1.z.any().optional(),
});
exports.ProviderResponseSchema = zod_1.z.object({
    cached: zod_1.z.boolean().optional(),
    cost: zod_1.z.number().optional(),
    error: zod_1.z.string().optional(),
    logProbs: zod_1.z.array(zod_1.z.number()).optional(),
    metadata: zod_1.z
        .object({
        redteamFinalPrompt: zod_1.z.string().optional(),
    })
        .catchall(zod_1.z.any())
        .optional(),
    output: zod_1.z.union([zod_1.z.string(), zod_1.z.any()]).optional(),
    tokenUsage: shared_1.TokenUsageSchema.optional(),
});
exports.ProviderEmbeddingResponseSchema = zod_1.z.object({
    error: zod_1.z.string().optional(),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    tokenUsage: shared_1.TokenUsageSchema.partial().optional(),
});
exports.ProviderSimilarityResponseSchema = zod_1.z.object({
    error: zod_1.z.string().optional(),
    similarity: zod_1.z.number().optional(),
    tokenUsage: shared_1.TokenUsageSchema.partial().optional(),
});
exports.ProviderClassificationResponseSchema = zod_1.z.object({
    error: zod_1.z.string().optional(),
    classification: zod_1.z.record(zod_1.z.number()).optional(),
});
exports.ProvidersSchema = zod_1.z.union([
    zod_1.z.string(),
    CallApiFunctionSchema,
    zod_1.z.array(zod_1.z.union([
        zod_1.z.string(),
        zod_1.z.record(zod_1.z.string(), exports.ProviderOptionsSchema),
        exports.ProviderOptionsSchema,
        CallApiFunctionSchema,
    ])),
]);
exports.ProviderSchema = zod_1.z.union([zod_1.z.string(), exports.ProviderOptionsSchema, exports.ApiProviderSchema]);
// Ensure that schemas match their corresponding types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function assert() { }
assert();
assert();
assert();
assert();
assert();
assert();
assert();
//# sourceMappingURL=providers.js.map