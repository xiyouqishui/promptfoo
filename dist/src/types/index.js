"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputFileExtension = exports.UnifiedConfigSchema = exports.TestSuiteConfigSchema = exports.TestSuiteSchema = exports.DerivedMetricSchema = exports.AtomicTestCaseSchema = exports.ScenarioSchema = exports.TestCasesWithMetadataSchema = exports.TestCaseWithVarsFileSchema = exports.TestCaseSchema = exports.VarsSchema = exports.TestCasesWithMetadataPromptSchema = exports.AssertionSchema = exports.AssertionTypeSchema = exports.NotPrefixedAssertionTypesSchema = exports.SpecialAssertionTypesSchema = exports.BaseAssertionTypesSchema = exports.ResultFailureReason = exports.CompletedPromptSchema = exports.OutputConfigSchema = exports.CommandLineOptionsSchema = void 0;
exports.isGradingResult = isGradingResult;
// Note: This file is in the process of being deconstructed into `types/` and `validators/`
// Right now Zod and pure types are mixed together!
const zod_1 = require("zod");
const env_1 = require("../types/env");
const shared_1 = require("../types/shared");
const fileExtensions_1 = require("../util/fileExtensions");
const prompts_1 = require("../validators/prompts");
const providers_1 = require("../validators/providers");
const redteam_1 = require("../validators/redteam");
const shared_2 = require("../validators/shared");
__exportStar(require("./prompts"), exports);
__exportStar(require("./providers"), exports);
__exportStar(require("../redteam/types"), exports);
__exportStar(require("./shared"), exports);
exports.CommandLineOptionsSchema = zod_1.z.object({
    // Shared with TestSuite
    description: zod_1.z.string().optional(),
    prompts: zod_1.z.array(zod_1.z.string()).optional(),
    providers: zod_1.z.array(zod_1.z.string()),
    output: zod_1.z.array(zod_1.z.string()),
    // Shared with EvaluateOptions
    maxConcurrency: zod_1.z.coerce.number().int().positive().optional(),
    repeat: zod_1.z.coerce.number().int().positive().optional(),
    delay: zod_1.z.coerce.number().int().nonnegative().default(0),
    // Command line only
    vars: zod_1.z.string().optional(),
    tests: zod_1.z.string().optional(),
    config: zod_1.z.array(zod_1.z.string()).optional(),
    assertions: zod_1.z.string().optional(),
    modelOutputs: zod_1.z.string().optional(),
    verbose: zod_1.z.boolean().optional(),
    grader: zod_1.z.string().optional(),
    tableCellMaxLength: zod_1.z.coerce.number().int().positive().optional(),
    write: zod_1.z.boolean().optional(),
    cache: zod_1.z.boolean().optional(),
    table: zod_1.z.boolean().optional(),
    share: zod_1.z.boolean().optional(),
    progressBar: zod_1.z.boolean().optional(),
    watch: zod_1.z.boolean().optional(),
    filterErrorsOnly: zod_1.z.string().optional(),
    filterFailing: zod_1.z.string().optional(),
    filterFirstN: zod_1.z.coerce.number().int().positive().optional(),
    filterMetadata: zod_1.z.string().optional(),
    filterPattern: zod_1.z.string().optional(),
    filterProviders: zod_1.z.string().optional(),
    filterSample: zod_1.z.coerce.number().int().positive().optional(),
    filterTargets: zod_1.z.string().optional(),
    var: zod_1.z.record(zod_1.z.string()).optional(),
    generateSuggestions: zod_1.z.boolean().optional(),
    promptPrefix: zod_1.z.string().optional(),
    promptSuffix: zod_1.z.string().optional(),
    envPath: zod_1.z.string().optional(),
});
const GradingConfigSchema = zod_1.z.object({
    rubricPrompt: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.array(zod_1.z.string()),
        zod_1.z.array(zod_1.z.object({
            role: zod_1.z.string(),
            content: zod_1.z.string(),
        })),
    ])
        .optional(),
    provider: zod_1.z
        .union([zod_1.z.string(), zod_1.z.any(), zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.any()])).optional()])
        .optional(),
    factuality: zod_1.z
        .object({
        subset: zod_1.z.number().optional(),
        superset: zod_1.z.number().optional(),
        agree: zod_1.z.number().optional(),
        disagree: zod_1.z.number().optional(),
        differButFactual: zod_1.z.number().optional(),
    })
        .optional(),
});
exports.OutputConfigSchema = zod_1.z.object({
    /**
     * @deprecated in > 0.38.0. Use `transform` instead.
     */
    postprocess: zod_1.z.string().optional(),
    transform: zod_1.z.string().optional(),
    transformVars: zod_1.z.string().optional(),
    // The name of the variable to store the output of this test case
    storeOutputAs: zod_1.z.string().optional(),
});
const EvaluateOptionsSchema = zod_1.z.object({
    cache: zod_1.z.boolean().optional(),
    delay: zod_1.z.number().optional(),
    eventSource: zod_1.z.string().optional(),
    generateSuggestions: zod_1.z.boolean().optional(),
    /**
     * @deprecated This option has been removed as of 2024-08-21.
     * @description Use `maxConcurrency: 1` or the CLI option `-j 1` instead to run evaluations serially.
     * @author mldangelo
     */
    interactiveProviders: zod_1.z.boolean().optional(),
    maxConcurrency: zod_1.z.number().optional(),
    progressCallback: zod_1.z
        .function(zod_1.z.tuple([
        zod_1.z.number(),
        zod_1.z.number(),
        zod_1.z.number(),
        zod_1.z.custom(),
        zod_1.z.custom(),
    ]), zod_1.z.void())
        .optional(),
    repeat: zod_1.z.number().optional(),
    showProgressBar: zod_1.z.boolean().optional(),
    /**
     * Timeout in milliseconds for each evaluation step. Default is 0 (no timeout).
     */
    timeoutMs: zod_1.z.number().optional(),
});
const PromptMetricsSchema = zod_1.z.object({
    score: zod_1.z.number(),
    testPassCount: zod_1.z.number(),
    testFailCount: zod_1.z.number(),
    testErrorCount: zod_1.z.number(),
    assertPassCount: zod_1.z.number(),
    assertFailCount: zod_1.z.number(),
    totalLatencyMs: zod_1.z.number(),
    tokenUsage: shared_1.TokenUsageSchema,
    namedScores: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
    namedScoresCount: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
    redteam: zod_1.z
        .object({
        pluginPassCount: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        pluginFailCount: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        strategyPassCount: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        strategyFailCount: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
    })
        .optional(),
    cost: zod_1.z.number(),
});
// Used for final prompt display
exports.CompletedPromptSchema = prompts_1.PromptSchema.extend({
    provider: zod_1.z.string(),
    metrics: PromptMetricsSchema.optional(),
});
var ResultFailureReason;
(function (ResultFailureReason) {
    // The test passed, or we don't know exactly why the test case failed.
    ResultFailureReason[ResultFailureReason["NONE"] = 0] = "NONE";
    // The test case failed because an assertion rejected it.
    ResultFailureReason[ResultFailureReason["ASSERT"] = 1] = "ASSERT";
    // Test case failed due to some other error.
    ResultFailureReason[ResultFailureReason["ERROR"] = 2] = "ERROR";
})(ResultFailureReason || (exports.ResultFailureReason = ResultFailureReason = {}));
function isGradingResult(result) {
    return (typeof result === 'object' &&
        result !== null &&
        typeof result.pass === 'boolean' &&
        typeof result.score === 'number' &&
        typeof result.reason === 'string' &&
        (typeof result.namedScores === 'undefined' || typeof result.namedScores === 'object') &&
        (typeof result.tokensUsed === 'undefined' || typeof result.tokensUsed === 'object') &&
        (typeof result.componentResults === 'undefined' || Array.isArray(result.componentResults)) &&
        (typeof result.assertion === 'undefined' ||
            result.assertion === null ||
            typeof result.assertion === 'object') &&
        (typeof result.comment === 'undefined' || typeof result.comment === 'string'));
}
exports.BaseAssertionTypesSchema = zod_1.z.enum([
    'answer-relevance',
    'bleu',
    'classifier',
    'contains',
    'contains-all',
    'contains-any',
    'contains-json',
    'contains-sql',
    'contains-xml',
    'context-faithfulness',
    'context-recall',
    'context-relevance',
    'cost',
    'equals',
    'factuality',
    'g-eval',
    'gleu',
    'guardrails',
    'icontains',
    'icontains-all',
    'icontains-any',
    'is-json',
    'is-refusal',
    'is-sql',
    'is-valid-function-call',
    'is-valid-openai-function-call',
    'is-valid-openai-tools-call',
    'is-xml',
    'javascript',
    'latency',
    'levenshtein',
    'llm-rubric',
    'pi',
    'meteor',
    'model-graded-closedqa',
    'model-graded-factuality',
    'moderation',
    'perplexity',
    'perplexity-score',
    'python',
    'regex',
    'rouge-n',
    'similar',
    'starts-with',
    'webhook',
]);
exports.SpecialAssertionTypesSchema = zod_1.z.enum(['select-best', 'human']);
exports.NotPrefixedAssertionTypesSchema = exports.BaseAssertionTypesSchema.transform((baseType) => `not-${baseType}`);
exports.AssertionTypeSchema = zod_1.z.union([
    exports.BaseAssertionTypesSchema,
    exports.NotPrefixedAssertionTypesSchema,
    exports.SpecialAssertionTypesSchema,
    zod_1.z.custom(),
]);
const AssertionSetSchema = zod_1.z.object({
    type: zod_1.z.literal('assert-set'),
    // Sub assertions to be run for this assertion set
    assert: zod_1.z.array(zod_1.z.lazy(() => exports.AssertionSchema)), // eslint-disable-line @typescript-eslint/no-use-before-define
    // The weight of this assertion compared to other assertions in the test case. Defaults to 1.
    weight: zod_1.z.number().optional(),
    // Tag this assertion result as a named metric
    metric: zod_1.z.string().optional(),
    // The required score for this assert set. If not provided, the test case is graded pass/fail.
    threshold: zod_1.z.number().optional(),
    // An external mapping of arbitrary strings to values that is defined
    // for every assertion in the set and passed into each assert
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// TODO(ian): maybe Assertion should support {type: config} to make the yaml cleaner
exports.AssertionSchema = zod_1.z.object({
    // Type of assertion
    type: exports.AssertionTypeSchema,
    // The expected value, if applicable
    value: zod_1.z.custom().optional(),
    // An external mapping of arbitrary strings to values that is passed
    // to the assertion for custom asserts
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    // The threshold value, only applicable for similarity (cosine distance)
    threshold: zod_1.z.number().optional(),
    // The weight of this assertion compared to other assertions in the test case. Defaults to 1.
    weight: zod_1.z.number().optional(),
    // Some assertions (similarity, llm-rubric) require an LLM provider
    provider: zod_1.z.custom().optional(),
    // Override the grading rubric
    rubricPrompt: zod_1.z.custom().optional(),
    // Tag this assertion result as a named metric
    metric: zod_1.z.string().optional(),
    // Process the output before running the assertion
    transform: zod_1.z.string().optional(),
});
// Used when building prompts index from files.
exports.TestCasesWithMetadataPromptSchema = zod_1.z.object({
    prompt: exports.CompletedPromptSchema,
    id: zod_1.z.string(),
    evalId: zod_1.z.string(),
});
const ProviderPromptMapSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string().transform((value) => [value]), zod_1.z.array(zod_1.z.string())]));
// Metadata is a key-value store for arbitrary data
const MetadataSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.any());
exports.VarsSchema = zod_1.z.record(zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.number(),
    zod_1.z.boolean(),
    zod_1.z.array(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()])),
    zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    zod_1.z.array(zod_1.z.any()),
]));
// Each test case is graded pass/fail with a score.  A test case represents a unique input to the LLM after substituting `vars` in the prompt.
// HEADS UP: When you add a property here, you probably need to load it from `defaultTest` in evaluator.ts.
exports.TestCaseSchema = zod_1.z.object({
    // Optional description of what you're testing
    description: zod_1.z.string().optional(),
    // Key-value pairs to substitute in the prompt
    vars: exports.VarsSchema.optional(),
    // Override the provider.
    provider: zod_1.z.union([zod_1.z.string(), providers_1.ProviderOptionsSchema, providers_1.ApiProviderSchema]).optional(),
    // Output related from running values in Vars with provider. Having this value would skip running the prompt through the provider, and go straight to the assertions
    providerOutput: zod_1.z.union([zod_1.z.string(), zod_1.z.object({})]).optional(),
    // Optional list of automatic checks to run on the LLM output
    assert: zod_1.z.array(zod_1.z.union([AssertionSetSchema, exports.AssertionSchema])).optional(),
    // Optional scoring function to run on the LLM output
    assertScoringFunction: zod_1.z
        .union([
        zod_1.z
            .string()
            .regex(new RegExp(`^file://.*\\.(${fileExtensions_1.JAVASCRIPT_EXTENSIONS.join('|')}|py)(?::[\\w.]+)?$`)),
        zod_1.z.custom(),
    ])
        .optional(),
    // Additional configuration settings for the prompt
    options: zod_1.z
        .intersection(zod_1.z.intersection(prompts_1.PromptConfigSchema, exports.OutputConfigSchema), zod_1.z.intersection(GradingConfigSchema, zod_1.z.object({
        // If true, do not expand arrays of variables into multiple eval cases.
        disableVarExpansion: zod_1.z.boolean().optional(),
        // If true, do not include an implicit `_conversation` variable in the prompt.
        disableConversationVar: zod_1.z.boolean().optional(),
        // If true, run this without concurrency no matter what
        runSerially: zod_1.z.boolean().optional(),
    })))
        .optional(),
    // The required score for this test case.  If not provided, the test case is graded pass/fail.
    threshold: zod_1.z.number().optional(),
    metadata: zod_1.z
        .intersection(MetadataSchema, zod_1.z.object({
        pluginConfig: zod_1.z.custom().optional(),
        strategyConfig: zod_1.z.custom().optional(),
    }))
        .optional(),
});
exports.TestCaseWithVarsFileSchema = exports.TestCaseSchema.extend({
    vars: zod_1.z.union([exports.VarsSchema, zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
});
exports.TestCasesWithMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    testCases: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.union([zod_1.z.string(), exports.TestCaseSchema]))]),
    recentEvalDate: zod_1.z.date(),
    recentEvalId: zod_1.z.string(),
    count: zod_1.z.number(),
    prompts: zod_1.z.array(exports.TestCasesWithMetadataPromptSchema),
});
exports.ScenarioSchema = zod_1.z.object({
    // Optional description of what you're testing
    description: zod_1.z.string().optional(),
    // Default test case config
    config: zod_1.z.array(exports.TestCaseSchema.partial()),
    // Optional list of automatic checks to run on the LLM output
    tests: zod_1.z.array(exports.TestCaseSchema),
});
// Same as a TestCase, except the `vars` object has been flattened into its final form.
exports.AtomicTestCaseSchema = exports.TestCaseSchema.extend({
    vars: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.object({})])).optional(),
}).strict();
exports.DerivedMetricSchema = zod_1.z.object({
    // The name of this metric
    name: zod_1.z.string(),
    // The function to calculate the metric - either a mathematical expression or a function that takes the scores and returns a number
    value: zod_1.z.union([
        zod_1.z.string(),
        zod_1.z
            .function()
            .args(zod_1.z.record(zod_1.z.string(), zod_1.z.number()), zod_1.z.custom())
            .returns(zod_1.z.number()),
    ]),
});
// The test suite defines the "knobs" that we are tuning in prompt engineering: providers and prompts
exports.TestSuiteSchema = zod_1.z.object({
    // Optional tags to describe the test suite
    tags: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    // Optional description of what your LLM is trying to do
    description: zod_1.z.string().optional(),
    // One or more LLM APIs to use
    providers: zod_1.z.array(providers_1.ApiProviderSchema),
    // One or more prompt strings
    prompts: zod_1.z.array(prompts_1.PromptSchema),
    // Optional mapping of provider to prompt display strings.  If not provided,
    // all prompts are used for all providers.
    providerPromptMap: ProviderPromptMapSchema.optional(),
    // Test cases
    tests: zod_1.z.array(exports.TestCaseSchema).optional(),
    // scenarios
    scenarios: zod_1.z.array(exports.ScenarioSchema).optional(),
    // Default test case config
    defaultTest: exports.TestCaseSchema.partial().optional(),
    // Nunjucks filters
    nunjucksFilters: shared_2.NunjucksFilterMapSchema.optional(),
    // Envar overrides
    env: env_1.ProviderEnvOverridesSchema.optional(),
    // Metrics to calculate after the eval has been completed
    derivedMetrics: zod_1.z.array(exports.DerivedMetricSchema).optional(),
    // Extensions that are called at various plugin points
    extensions: zod_1.z
        .array(zod_1.z
        .string()
        .refine((value) => value.startsWith('file://'), {
        message: 'Extension must start with file://',
    })
        .refine((value) => {
        const parts = value.split(':');
        return parts.length === 3 && parts.every((part) => part.trim() !== '');
    }, {
        message: 'Extension must be of the form file://path/to/file.py:function_name',
    })
        .refine((value) => {
        const parts = value.split(':');
        return ((parts[1].endsWith('.py') || (0, fileExtensions_1.isJavascriptFile)(parts[1])) &&
            (parts.length === 3 || parts.length === 2));
    }, {
        message: 'Extension must be a python (.py) or javascript (.js, .ts, .mjs, .cjs, etc.) file followed by a colon and function name',
    }))
        .nullable()
        .optional(),
    // Redteam configuration - used only when generating redteam tests
    redteam: zod_1.z.custom().optional(),
});
// TestSuiteConfig = Test Suite, but before everything is parsed and resolved.  Providers are just strings, prompts are filepaths, tests can be filepath or inline.
exports.TestSuiteConfigSchema = zod_1.z.object({
    // Optional tags to describe the test suite
    tags: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    // Optional description of what you're trying to test
    description: zod_1.z.string().optional(),
    // One or more LLM APIs to use, for example: openai:gpt-4o-mini, openai:gpt-4o, localai:chat:vicuna
    providers: providers_1.ProvidersSchema,
    // One or more prompt files to load
    prompts: zod_1.z.union([
        zod_1.z.string(),
        zod_1.z.array(zod_1.z.union([
            zod_1.z.string(),
            zod_1.z.object({
                id: zod_1.z.string(),
                label: zod_1.z.string().optional(),
                raw: zod_1.z.string().optional(),
            }),
            prompts_1.PromptSchema,
        ])),
        zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    ]),
    // Path to a test file, OR list of LLM prompt variations (aka "test case")
    tests: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.union([zod_1.z.string(), exports.TestCaseSchema]))]).optional(),
    // Scenarios, groupings of data and tests to be evaluated
    scenarios: zod_1.z.array(zod_1.z.union([zod_1.z.string(), exports.ScenarioSchema])).optional(),
    // Sets the default properties for each test case. Useful for setting an assertion, on all test cases, for example.
    defaultTest: exports.TestCaseSchema.partial().omit({ description: true }).optional(),
    // Path to write output. Writes to console/web viewer if not set.
    outputPath: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    // Determines whether or not sharing is enabled.
    sharing: zod_1.z
        .union([
        zod_1.z.boolean(),
        zod_1.z.object({
            apiBaseUrl: zod_1.z.string().optional(),
            appBaseUrl: zod_1.z.string().optional(),
        }),
    ])
        .optional(),
    // Nunjucks filters
    nunjucksFilters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    // Envvar overrides
    env: zod_1.z
        .union([
        env_1.ProviderEnvOverridesSchema,
        zod_1.z.record(zod_1.z.string(), zod_1.z.union([
            zod_1.z.string(),
            zod_1.z.number().transform((n) => String(n)),
            zod_1.z.boolean().transform((b) => String(b)),
        ])),
    ])
        .optional(),
    // Metrics to calculate after the eval has been completed
    derivedMetrics: zod_1.z.array(exports.DerivedMetricSchema).optional(),
    // Extension that is called at various plugin points
    extensions: zod_1.z.array(zod_1.z.string()).nullable().optional(),
    // Any other information about this configuration.
    metadata: MetadataSchema.optional(),
    // Redteam configuration - used only when generating redteam tests
    redteam: redteam_1.RedteamConfigSchema.optional(),
    // Write results to disk so they can be viewed in web viewer
    writeLatestResults: zod_1.z.boolean().optional(),
});
exports.UnifiedConfigSchema = exports.TestSuiteConfigSchema.extend({
    evaluateOptions: EvaluateOptionsSchema.optional(),
    commandLineOptions: exports.CommandLineOptionsSchema.partial().optional(),
    providers: providers_1.ProvidersSchema.optional(),
    targets: providers_1.ProvidersSchema.optional(),
})
    .refine((data) => {
    const hasTargets = Boolean(data.targets);
    const hasProviders = Boolean(data.providers);
    return (hasTargets && !hasProviders) || (!hasTargets && hasProviders);
}, {
    message: "Exactly one of 'targets' or 'providers' must be provided, but not both",
})
    .transform((data) => {
    if (data.targets && !data.providers) {
        data.providers = data.targets;
        delete data.targets;
    }
    // Handle null extensions, undefined extensions, or empty arrays by deleting the field
    if (data.extensions === null ||
        data.extensions === undefined ||
        (Array.isArray(data.extensions) && data.extensions.length === 0)) {
        delete data.extensions;
    }
    return data;
});
// used for writing eval results
exports.OutputFileExtension = zod_1.z.enum(['csv', 'html', 'json', 'jsonl', 'txt', 'yaml', 'yml']);
//# sourceMappingURL=index.js.map