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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const migrate_1 = require("../../src/migrate");
const evalResult_1 = __importStar(require("../../src/models/evalResult"));
const utils_1 = require("../../src/prompts/utils");
const types_1 = require("../../src/types");
describe('EvalResult', () => {
    beforeAll(async () => {
        await (0, migrate_1.runDbMigrations)();
    });
    const mockProvider = {
        id: 'test-provider',
        label: 'Test Provider',
    };
    const mockTestCase = {
        vars: {},
        provider: mockProvider,
    };
    const mockPrompt = {
        raw: 'Test prompt',
        display: 'Test prompt',
        label: 'Test label',
    };
    const mockEvaluateResult = {
        promptIdx: 0,
        testIdx: 0,
        prompt: mockPrompt,
        success: true,
        score: 1,
        provider: mockProvider,
        testCase: mockTestCase,
        vars: {},
        latencyMs: 100,
        cost: 0.01,
        metadata: {},
        failureReason: types_1.ResultFailureReason.NONE,
        id: 'test-id',
        promptId: (0, utils_1.hashPrompt)(mockPrompt),
        namedScores: {},
        response: undefined,
    };
    describe('sanitizeProvider', () => {
        it('should handle ApiProvider objects', () => {
            const apiProvider = {
                id: () => 'test-provider',
                label: 'Test Provider',
                callApi: async () => ({ output: 'test' }),
                config: {
                    apiKey: 'test-key',
                },
            };
            const result = (0, evalResult_1.sanitizeProvider)(apiProvider);
            expect(result).toEqual({
                id: 'test-provider',
                label: 'Test Provider',
                config: {
                    apiKey: 'test-key',
                },
            });
        });
        it('should handle ProviderOptions objects', () => {
            const providerOptions = {
                id: 'test-provider',
                label: 'Test Provider',
                config: {
                    apiKey: 'test-key',
                },
            };
            const result = (0, evalResult_1.sanitizeProvider)(providerOptions);
            expect(result).toEqual(providerOptions);
        });
        it('should handle generic objects with id function', () => {
            const provider = {
                id: () => 'test-provider',
                label: 'Test Provider',
                config: {
                    apiKey: 'test-key',
                },
            };
            const result = (0, evalResult_1.sanitizeProvider)(provider);
            expect(result).toEqual({
                id: 'test-provider',
                label: 'Test Provider',
                config: {
                    apiKey: 'test-key',
                },
            });
        });
    });
    describe('createFromEvaluateResult', () => {
        it('should create and persist an EvalResult', async () => {
            const evalId = 'test-eval-id';
            const result = await evalResult_1.default.createFromEvaluateResult(evalId, mockEvaluateResult);
            expect(result).toBeInstanceOf(evalResult_1.default);
            expect(result.evalId).toBe(evalId);
            expect(result.promptId).toBe((0, utils_1.hashPrompt)(mockPrompt));
            expect(result.persisted).toBe(true);
            // Verify it was persisted to database
            const retrieved = await evalResult_1.default.findById(result.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.score).toBe(mockEvaluateResult.score);
        });
        it('should create without persisting when persist option is false', async () => {
            const evalId = 'test-eval-id';
            const result = await evalResult_1.default.createFromEvaluateResult(evalId, mockEvaluateResult, {
                persist: false,
            });
            expect(result).toBeInstanceOf(evalResult_1.default);
            expect(result.persisted).toBe(false);
            // Verify it was not persisted to database
            const retrieved = await evalResult_1.default.findById(result.id);
            expect(retrieved).toBeNull();
        });
        it('should properly handle circular references in provider', async () => {
            const evalId = 'test-eval-id';
            // Create a provider with a circular reference
            const circularProvider = {
                id: 'test-provider',
                label: 'Test Provider',
                config: {
                    circular: undefined,
                },
            };
            circularProvider.config.circular = circularProvider;
            const testCaseWithCircular = {
                ...mockTestCase,
                provider: circularProvider,
            };
            const resultWithCircular = await evalResult_1.default.createFromEvaluateResult(evalId, {
                ...mockEvaluateResult,
                provider: circularProvider,
                testCase: testCaseWithCircular,
            }, { persist: true });
            // Verify the provider was properly serialized
            expect(resultWithCircular.provider).toEqual({
                id: 'test-provider',
                label: 'Test Provider',
                config: {
                    circular: {
                        id: 'test-provider',
                        label: 'Test Provider',
                    },
                },
            });
            // Verify it can be persisted without errors
            const retrieved = await evalResult_1.default.findById(resultWithCircular.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.provider).toEqual({
                id: 'test-provider',
                label: 'Test Provider',
                config: {
                    circular: {
                        id: 'test-provider',
                        label: 'Test Provider',
                    },
                },
            });
        });
        it('should preserve non-circular provider properties', async () => {
            const evalId = 'test-eval-id';
            const providerWithNestedData = {
                id: 'test-provider',
                label: 'Test Provider',
                config: {
                    apiKey: 'secret-key',
                    options: {
                        temperature: 0.7,
                        maxTokens: 100,
                    },
                },
            };
            const result = await evalResult_1.default.createFromEvaluateResult(evalId, {
                ...mockEvaluateResult,
                provider: providerWithNestedData,
                testCase: { ...mockTestCase, provider: providerWithNestedData },
            }, { persist: true });
            // Verify nested properties are preserved
            expect(result.provider).toEqual(providerWithNestedData);
            // Verify it can be persisted and retrieved with all properties intact
            const retrieved = await evalResult_1.default.findById(result.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved?.provider).toEqual(providerWithNestedData);
        });
    });
    describe('findManyByEvalId', () => {
        it('should retrieve multiple results for an eval ID', async () => {
            const evalId = 'test-eval-id-multiple';
            // Create multiple results
            await evalResult_1.default.createFromEvaluateResult(evalId, {
                ...mockEvaluateResult,
                testIdx: 0,
                testCase: mockTestCase,
            });
            await evalResult_1.default.createFromEvaluateResult(evalId, {
                ...mockEvaluateResult,
                testIdx: 1,
                testCase: mockTestCase,
            });
            const results = await evalResult_1.default.findManyByEvalId(evalId);
            expect(results).toHaveLength(2);
            expect(results[0]).toBeInstanceOf(evalResult_1.default);
            expect(results[1]).toBeInstanceOf(evalResult_1.default);
        });
        it('should filter by testIdx when provided', async () => {
            const evalId = 'test-eval-id-filter';
            await evalResult_1.default.createFromEvaluateResult(evalId, {
                ...mockEvaluateResult,
                testIdx: 0,
                testCase: mockTestCase,
            });
            await evalResult_1.default.createFromEvaluateResult(evalId, {
                ...mockEvaluateResult,
                testIdx: 1,
                testCase: mockTestCase,
            });
            const results = await evalResult_1.default.findManyByEvalId(evalId, { testIdx: 0 });
            expect(results).toHaveLength(1);
            expect(results[0].testIdx).toBe(0);
        });
    });
    describe('save', () => {
        it('should save new results', async () => {
            const result = new evalResult_1.default({
                id: 'test-save-id',
                evalId: 'test-eval-id',
                promptIdx: 0,
                testIdx: 0,
                testCase: mockTestCase,
                prompt: mockPrompt,
                success: true,
                score: 1,
                response: null,
                gradingResult: null,
                provider: mockProvider,
                failureReason: types_1.ResultFailureReason.NONE,
                namedScores: {},
            });
            await result.save();
            expect(result.persisted).toBe(true);
            const retrieved = await evalResult_1.default.findById(result.id);
            expect(retrieved).not.toBeNull();
        });
        it('should update existing results', async () => {
            const result = await evalResult_1.default.createFromEvaluateResult('test-eval-id', mockEvaluateResult);
            result.score = 0.5;
            await result.save();
            const retrieved = await evalResult_1.default.findById(result.id);
            expect(retrieved?.score).toBe(0.5);
        });
    });
    describe('toEvaluateResult', () => {
        it('should convert EvalResult to EvaluateResult format', async () => {
            const result = await evalResult_1.default.createFromEvaluateResult('test-eval-id', mockEvaluateResult);
            const evaluateResult = result.toEvaluateResult();
            // Only test the specific fields we care about
            expect(evaluateResult).toEqual(expect.objectContaining({
                promptIdx: mockEvaluateResult.promptIdx,
                testIdx: mockEvaluateResult.testIdx,
                prompt: mockEvaluateResult.prompt,
                success: mockEvaluateResult.success,
                score: mockEvaluateResult.score,
                provider: {
                    id: mockProvider.id,
                    label: mockProvider.label,
                },
            }));
        });
    });
});
//# sourceMappingURL=evalResult.test.js.map