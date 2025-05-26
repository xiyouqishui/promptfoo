"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const src_1 = require("../../src");
const database_1 = require("../../src/database");
const tables_1 = require("../../src/database/tables");
const eval_1 = __importDefault(require("../../src/models/eval"));
const database_records_1 = require("./data/eval/database_records");
class EvalFactory {
    static async create(options) {
        const eval_ = await eval_1.default.create({
            providers: [{ id: 'test-provider' }],
            prompts: ['What is the capital of {{state}}?'],
            tests: [
                { vars: { state: 'colorado' }, assert: [{ type: 'contains', value: 'Denver' }] },
                { vars: { state: 'california' }, assert: [{ type: 'contains', value: 'Sacramento' }] },
            ],
        }, [
            { raw: 'What is the capital of california?', label: 'What is the capital of {{state}}?' },
            { raw: 'What is the capital of colorado?', label: 'What is the capital of {{state}}?' },
        ], { id: (0, crypto_1.randomUUID)() });
        await eval_.addPrompts([
            {
                raw: 'What is the capital of california?',
                label: 'What is the capital of {{state}}?',
                provider: 'test-provider',
                metrics: {
                    score: 1,
                    testPassCount: 1,
                    testFailCount: 1,
                    testErrorCount: 0,
                    assertPassCount: 1,
                    assertFailCount: 1,
                    totalLatencyMs: 200,
                    tokenUsage: { total: 20, prompt: 10, completion: 10, cached: 0 },
                    namedScores: {},
                    namedScoresCount: {},
                    redteam: {
                        pluginPassCount: {},
                        pluginFailCount: {},
                        strategyPassCount: {},
                        strategyFailCount: {},
                    },
                    cost: 0.007,
                },
            },
        ]);
        // If no options are provided, create the default test results
        if (!options || options.numResults === undefined) {
            await this.addDefaultResults(eval_);
            return eval_;
        }
        // Generate the specified number of test results with the requested characteristics
        const numResults = options.numResults === 0 ? 0 : options.numResults || 2;
        const resultTypes = options.resultTypes || ['success'];
        const withHighlights = options.withHighlights || false;
        const withNamedScores = options.withNamedScores || false;
        const searchableContent = options.searchableContent || '';
        for (let i = 0; i < numResults; i++) {
            // Cycle through the result types
            const resultTypeIndex = i % resultTypes.length;
            const resultType = resultTypes[resultTypeIndex];
            // Create a test result based on the type
            await this.addCustomResult(eval_, {
                testIdx: i,
                resultType,
                withHighlight: withHighlights && i % 3 === 0, // Add highlights to every 3rd result if enabled
                withNamedScores,
                searchableContent,
            });
        }
        return eval_;
    }
    static async addDefaultResults(eval_) {
        await eval_.addResult({
            description: 'test-description',
            promptIdx: 0,
            testIdx: 0,
            testCase: { vars: { state: 'colorado' }, assert: [{ type: 'contains', value: 'Denver' }] },
            promptId: 'test-prompt',
            provider: { id: 'test-provider', label: 'test-label' },
            prompt: {
                raw: 'What is the capital of {{state}}?',
                label: 'What is the capital of {{state}}?',
            },
            vars: { state: 'colorado' },
            response: {
                output: 'denver',
                tokenUsage: { total: 10, prompt: 5, completion: 5, cached: 0 },
            },
            error: null,
            failureReason: src_1.ResultFailureReason.NONE,
            success: true,
            score: 1,
            latencyMs: 100,
            gradingResult: {
                pass: true,
                score: 1,
                reason: 'Expected output "denver" to equal "Denver"',
                namedScores: {},
                tokensUsed: { total: 10, prompt: 5, completion: 5, cached: 0 },
                componentResults: [
                    {
                        pass: true,
                        score: 1,
                        reason: 'Expected output "denver" to equal "Denver"',
                        assertion: {
                            type: 'equals',
                            value: 'denver',
                        },
                    },
                ],
                assertion: null,
            },
            namedScores: {},
            cost: 0.007,
            metadata: {},
        });
        await eval_.addResult({
            description: 'test-description',
            promptIdx: 0,
            testIdx: 1,
            testCase: {
                vars: { state: 'california' },
                assert: [{ type: 'contains', value: 'Sacramento' }],
            },
            promptId: 'test-prompt',
            provider: { id: 'test-provider', label: 'test-label' },
            prompt: {
                raw: 'What is the capital of {{state}}?',
                label: 'What is the capital of {{state}}?',
            },
            vars: { state: 'california' },
            response: {
                output: 'san francisco',
                tokenUsage: { total: 10, prompt: 5, completion: 5, cached: 0 },
            },
            error: null,
            failureReason: src_1.ResultFailureReason.NONE,
            success: false,
            score: 0,
            latencyMs: 100,
            gradingResult: {
                pass: false,
                score: 0,
                reason: 'Expected output "san francisco" to equal "Sacramento"',
                namedScores: {},
                tokensUsed: { total: 10, prompt: 5, completion: 5, cached: 0 },
                componentResults: [
                    {
                        pass: false,
                        score: 0,
                        reason: 'Expected output "san francisco" to equal "Sacramento"',
                        assertion: {
                            type: 'equals',
                            value: 'denver',
                        },
                    },
                ],
                assertion: null,
            },
            namedScores: {},
            cost: 0.007,
            metadata: {},
        });
    }
    static async addCustomResult(eval_, options) {
        const { testIdx, resultType, withHighlight, withNamedScores, searchableContent } = options;
        const stateName = `state${testIdx}`;
        const output = resultType === 'success'
            ? `Capital of ${stateName} is TestCity${testIdx}`
            : `Incorrect answer for ${stateName}${searchableContent ? ` ${searchableContent}` : ''}`;
        const result = {
            description: `test-${resultType}-${testIdx}`,
            promptIdx: 0,
            testIdx,
            testCase: {
                vars: { state: stateName },
                assert: [{ type: 'contains', value: `TestCity${testIdx}` }],
            },
            promptId: 'test-prompt',
            provider: { id: 'test-provider', label: 'test-label' },
            prompt: {
                raw: `What is the capital of ${stateName}?`,
                label: 'What is the capital of {{state}}?',
            },
            vars: { state: stateName },
            response: {
                output,
                tokenUsage: { total: 10, prompt: 5, completion: 5, cached: 0 },
            },
            success: resultType === 'success',
            score: resultType === 'success' ? 1 : 0,
            latencyMs: 100,
            namedScores: withNamedScores
                ? { accuracy: resultType === 'success' ? 1 : 0.2, relevance: 0.8 }
                : {},
            cost: 0.007,
            metadata: {},
        };
        // Handle error type
        if (resultType === 'error') {
            result.error = `Error processing ${stateName}: Test error message`;
            result.failureReason = src_1.ResultFailureReason.ERROR;
        }
        else {
            result.error = null;
            result.failureReason =
                resultType === 'success' ? src_1.ResultFailureReason.NONE : src_1.ResultFailureReason.ASSERT;
        }
        // Configure the grading result
        if (resultType !== 'error') {
            let comment = '';
            if (withHighlight) {
                comment = `!highlight Important observation for ${stateName}`;
            }
            result.gradingResult = {
                pass: resultType === 'success',
                score: resultType === 'success' ? 1 : 0,
                reason: resultType === 'success'
                    ? `Output matches expected value for ${stateName}`
                    : `Output doesn't match expected value for ${stateName}`,
                comment,
                namedScores: withNamedScores
                    ? { accuracy: resultType === 'success' ? 1 : 0.2, relevance: 0.8 }
                    : {},
                tokensUsed: { total: 10, prompt: 5, completion: 5, cached: 0 },
                componentResults: [
                    {
                        pass: resultType === 'success',
                        score: resultType === 'success' ? 1 : 0,
                        reason: resultType === 'success'
                            ? `Expected output matches for ${stateName}`
                            : `Expected output doesn't match for ${stateName}`,
                        assertion: {
                            type: 'equals',
                            value: `TestCity${testIdx}`,
                        },
                    },
                ],
                assertion: null,
            };
        }
        await eval_.addResult(result);
    }
    static async createOldResult() {
        const db = (0, database_1.getDb)();
        return (await db.insert(tables_1.evalsTable).values((0, database_records_1.oldStyleEval)()).returning())[0];
    }
}
exports.default = EvalFactory;
//# sourceMappingURL=evalFactory.js.map