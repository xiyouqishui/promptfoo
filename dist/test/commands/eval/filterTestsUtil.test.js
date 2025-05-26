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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const filterTestsUtil_1 = require("../../../src/commands/eval/filterTestsUtil");
const eval_1 = __importDefault(require("../../../src/models/eval"));
const types_1 = require("../../../src/types");
const util = __importStar(require("../../../src/util"));
jest.mock('../../../src/models/eval', () => ({
    findById: jest.fn(),
}));
jest.mock('../../../src/util', () => ({
    ...jest.requireActual('../../../src/util'),
    readOutput: jest.fn(),
    resultIsForTestCase: jest.fn().mockImplementation((result, test) => {
        return result.testCase === test;
    }),
}));
describe('filterTestsUtil', () => {
    describe('filterTestsByResults', () => {
        const mockTestSuite = {
            prompts: [],
            providers: [],
            tests: [
                { vars: { var1: 'test1' }, assert: [] },
                { vars: { var1: 'test2' }, assert: [] },
                { vars: { var1: 'test3' }, assert: [] },
            ],
        };
        const mockPrompt = {
            raw: 'test prompt',
            display: 'test prompt',
            label: 'Test Prompt',
        };
        const mockResponse = {
            output: 'response',
            tokenUsage: { total: 0, prompt: 0, completion: 0 },
        };
        const mockResults = [
            {
                vars: { var1: 'test1' },
                success: true,
                provider: { id: 'test-provider', label: 'Test Provider' },
                prompt: mockPrompt,
                response: mockResponse,
                promptIdx: 0,
                testIdx: 0,
                testCase: mockTestSuite.tests[0],
                promptId: 'test-prompt',
                latencyMs: 0,
                failureReason: types_1.ResultFailureReason.NONE,
                score: 1,
                namedScores: {},
            },
            {
                vars: { var1: 'test2' },
                success: false,
                failureReason: types_1.ResultFailureReason.ASSERT,
                provider: { id: 'test-provider', label: 'Test Provider' },
                prompt: mockPrompt,
                response: mockResponse,
                promptIdx: 0,
                testIdx: 1,
                testCase: mockTestSuite.tests[1],
                promptId: 'test-prompt',
                latencyMs: 0,
                score: 0,
                namedScores: {},
            },
            {
                vars: { var1: 'test3' },
                success: false,
                failureReason: types_1.ResultFailureReason.ERROR,
                provider: { id: 'test-provider', label: 'Test Provider' },
                prompt: mockPrompt,
                response: mockResponse,
                promptIdx: 0,
                testIdx: 2,
                testCase: mockTestSuite.tests[2],
                promptId: 'test-prompt',
                latencyMs: 0,
                score: 0,
                namedScores: {},
            },
        ];
        beforeEach(() => {
            jest.resetAllMocks();
            jest.mocked(util.resultIsForTestCase).mockImplementation((result, test) => {
                return result.testCase === test;
            });
        });
        it('should return empty array if testSuite has no tests', async () => {
            const result = await (0, filterTestsUtil_1.filterTestsByResults)({ prompts: [], providers: [] }, 'path.json', () => true);
            expect(result).toEqual([]);
        });
        describe('with file path', () => {
            beforeEach(() => {
                jest.mocked(util.readOutput).mockResolvedValue({
                    evalId: null,
                    results: {
                        version: 2,
                        timestamp: new Date().toISOString(),
                        results: mockResults,
                        table: { head: { prompts: [], vars: [] }, body: [] },
                        stats: {
                            successes: 0,
                            failures: 0,
                            errors: 0,
                            tokenUsage: {
                                total: 0,
                                prompt: 0,
                                completion: 0,
                                cached: 0,
                                numRequests: 0,
                                completionDetails: {
                                    reasoning: 0,
                                    acceptedPrediction: 0,
                                    rejectedPrediction: 0,
                                },
                                assertions: {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                },
                            },
                        },
                    },
                    config: {},
                    shareableUrl: null,
                });
            });
            it('should filter tests based on success', async () => {
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.json', (result) => result.success);
                expect(result).toHaveLength(1);
                expect(result[0]?.vars?.var1).toBe('test1');
            });
            it('should filter tests based on failure reason', async () => {
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.json', (result) => result.failureReason === types_1.ResultFailureReason.ERROR);
                expect(result).toHaveLength(1);
                expect(result[0]?.vars?.var1).toBe('test3');
            });
            it('should return empty array if no results match filter', async () => {
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.json', () => false);
                expect(result).toHaveLength(0);
            });
            it('should handle non-json file path as eval ID', async () => {
                const mockEval = {
                    id: 'results.txt',
                    toEvaluateSummary: jest.fn().mockResolvedValue({
                        version: 2,
                        timestamp: new Date().toISOString(),
                        results: mockResults,
                        table: { head: { prompts: [], vars: [] }, body: [] },
                        stats: {
                            successes: 0,
                            failures: 0,
                            errors: 0,
                            tokenUsage: {
                                total: 0,
                                prompt: 0,
                                completion: 0,
                                cached: 0,
                                numRequests: 0,
                                completionDetails: {
                                    reasoning: 0,
                                    acceptedPrediction: 0,
                                    rejectedPrediction: 0,
                                },
                                assertions: {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                },
                            },
                        },
                    }),
                };
                jest.mocked(eval_1.default.findById).mockResolvedValue(mockEval);
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.txt', (result) => result.success);
                expect(result).toHaveLength(1);
                expect(result[0]?.vars?.var1).toBe('test1');
                expect(util.readOutput).not.toHaveBeenCalled();
            });
            it('should handle readOutput returning summary without results', async () => {
                jest.mocked(util.readOutput).mockResolvedValue({
                    evalId: null,
                    results: {
                        version: 2,
                        timestamp: new Date().toISOString(),
                        results: [],
                        table: { head: { prompts: [], vars: [] }, body: [] },
                        stats: {
                            successes: 0,
                            failures: 0,
                            errors: 0,
                            tokenUsage: {
                                total: 0,
                                prompt: 0,
                                completion: 0,
                                cached: 0,
                                numRequests: 0,
                                completionDetails: {
                                    reasoning: 0,
                                    acceptedPrediction: 0,
                                    rejectedPrediction: 0,
                                },
                                assertions: {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                },
                            },
                        },
                    },
                    config: {},
                    shareableUrl: null,
                });
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.json', () => true);
                expect(result).toHaveLength(0);
            });
            it('should handle readOutput throwing an error', async () => {
                jest.mocked(util.readOutput).mockRejectedValue(new Error('Failed to read file'));
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.json', () => true);
                expect(result).toHaveLength(0);
            });
            it('should handle toEvaluateSummary throwing an error', async () => {
                const mockEval = {
                    id: 'eval-123',
                    toEvaluateSummary: jest.fn().mockRejectedValue(new Error('Failed to get summary')),
                };
                jest.mocked(eval_1.default.findById).mockResolvedValue(mockEval);
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'eval-123', () => true);
                expect(result).toHaveLength(0);
            });
            it('should handle case where no test matches any result', async () => {
                jest.mocked(util.resultIsForTestCase).mockReturnValue(false);
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.json', () => true);
                expect(result).toHaveLength(0);
            });
            it('should handle case where some tests match results', async () => {
                const testResults = [
                    {
                        vars: { var1: 'test1' },
                        success: true,
                        provider: { id: 'test-provider', label: 'Test Provider' },
                        prompt: mockPrompt,
                        response: mockResponse,
                        promptIdx: 0,
                        testIdx: 0,
                        testCase: mockTestSuite.tests[0],
                        promptId: 'test-prompt',
                        latencyMs: 0,
                        failureReason: types_1.ResultFailureReason.NONE,
                        score: 1,
                        namedScores: {},
                    },
                    {
                        vars: { var1: 'test2' },
                        success: false,
                        provider: { id: 'test-provider', label: 'Test Provider' },
                        prompt: mockPrompt,
                        response: mockResponse,
                        promptIdx: 0,
                        testIdx: 1,
                        testCase: mockTestSuite.tests[1],
                        promptId: 'test-prompt',
                        latencyMs: 0,
                        failureReason: types_1.ResultFailureReason.ASSERT,
                        score: 0,
                        namedScores: {},
                    },
                    {
                        vars: { var1: 'test3' },
                        success: false,
                        provider: { id: 'test-provider', label: 'Test Provider' },
                        prompt: mockPrompt,
                        response: mockResponse,
                        promptIdx: 0,
                        testIdx: 2,
                        testCase: mockTestSuite.tests[2],
                        promptId: 'test-prompt',
                        latencyMs: 0,
                        failureReason: types_1.ResultFailureReason.ERROR,
                        score: 0,
                        namedScores: {},
                    },
                ];
                jest.mocked(util.readOutput).mockResolvedValue({
                    evalId: null,
                    results: {
                        version: 2,
                        timestamp: new Date().toISOString(),
                        results: testResults,
                        table: { head: { prompts: [], vars: [] }, body: [] },
                        stats: {
                            successes: 0,
                            failures: 0,
                            errors: 0,
                            tokenUsage: {
                                total: 0,
                                prompt: 0,
                                completion: 0,
                                cached: 0,
                                numRequests: 0,
                                completionDetails: {
                                    reasoning: 0,
                                    acceptedPrediction: 0,
                                    rejectedPrediction: 0,
                                },
                                assertions: {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                },
                            },
                        },
                    },
                    config: {},
                    shareableUrl: null,
                });
                // Mock resultIsForTestCase to return true only for the first test
                jest.mocked(util.resultIsForTestCase).mockImplementation((result, test) => {
                    return test === mockTestSuite.tests[0];
                });
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'results.json', () => true);
                expect(result).toHaveLength(1);
                expect(result[0]).toBe(mockTestSuite.tests[0]);
            });
        });
        describe('with eval ID', () => {
            beforeEach(() => {
                const mockEval = {
                    id: 'eval-123',
                    createdAt: new Date().getTime(),
                    config: {},
                    results: [],
                    resultsCount: 0,
                    prompts: [],
                    persisted: true,
                    toEvaluateSummary: jest.fn().mockResolvedValue({
                        version: 2,
                        timestamp: new Date().toISOString(),
                        results: mockResults,
                        table: { head: { prompts: [], vars: [] }, body: [] },
                        stats: {
                            successes: 0,
                            failures: 0,
                            errors: 0,
                            tokenUsage: {
                                total: 0,
                                prompt: 0,
                                completion: 0,
                                cached: 0,
                                numRequests: 0,
                                completionDetails: {
                                    reasoning: 0,
                                    acceptedPrediction: 0,
                                    rejectedPrediction: 0,
                                },
                                assertions: {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                },
                            },
                        },
                    }),
                };
                jest.mocked(eval_1.default.findById).mockResolvedValue(mockEval);
            });
            it('should filter tests based on success', async () => {
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'eval-123', (result) => result.success);
                expect(result).toHaveLength(1);
                expect(result[0]?.vars?.var1).toBe('test1');
            });
            it('should filter tests based on failure reason', async () => {
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'eval-123', (result) => result.failureReason === types_1.ResultFailureReason.ERROR);
                expect(result).toHaveLength(1);
                expect(result[0]?.vars?.var1).toBe('test3');
            });
            it('should return empty array if eval not found', async () => {
                jest.mocked(eval_1.default.findById).mockResolvedValue(undefined);
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'eval-123', () => true);
                expect(result).toHaveLength(0);
            });
            it('should return empty array if eval has no results', async () => {
                const mockEval = {
                    id: 'eval-123',
                    createdAt: new Date().getTime(),
                    config: {},
                    results: [],
                    resultsCount: 0,
                    prompts: [],
                    persisted: true,
                    toEvaluateSummary: jest.fn().mockResolvedValue({
                        version: 2,
                        timestamp: new Date().toISOString(),
                        results: [],
                        table: { head: { prompts: [], vars: [] }, body: [] },
                        stats: {
                            successes: 0,
                            failures: 0,
                            errors: 0,
                            tokenUsage: {
                                total: 0,
                                prompt: 0,
                                completion: 0,
                                cached: 0,
                                numRequests: 0,
                                completionDetails: {
                                    reasoning: 0,
                                    acceptedPrediction: 0,
                                    rejectedPrediction: 0,
                                },
                                assertions: {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                },
                            },
                        },
                    }),
                };
                jest.mocked(eval_1.default.findById).mockResolvedValue(mockEval);
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'eval-123', () => true);
                expect(result).toHaveLength(0);
            });
            it('should return empty array if eval has no results property', async () => {
                const mockEval = {
                    id: 'eval-123',
                    createdAt: new Date().getTime(),
                    config: {},
                    results: [],
                    resultsCount: 0,
                    prompts: [],
                    persisted: true,
                    toEvaluateSummary: jest.fn().mockResolvedValue({
                        version: 2,
                        timestamp: new Date().toISOString(),
                        table: { head: { prompts: [], vars: [] }, body: [] },
                        stats: {
                            successes: 0,
                            failures: 0,
                            errors: 0,
                            tokenUsage: {
                                total: 0,
                                prompt: 0,
                                completion: 0,
                                cached: 0,
                                numRequests: 0,
                                completionDetails: {
                                    reasoning: 0,
                                    acceptedPrediction: 0,
                                    rejectedPrediction: 0,
                                },
                                assertions: {
                                    total: 0,
                                    prompt: 0,
                                    completion: 0,
                                    cached: 0,
                                },
                            },
                        },
                    }),
                };
                jest.mocked(eval_1.default.findById).mockResolvedValue(mockEval);
                const result = await (0, filterTestsUtil_1.filterTestsByResults)(mockTestSuite, 'eval-123', () => true);
                expect(result).toHaveLength(0);
            });
        });
    });
});
//# sourceMappingURL=filterTestsUtil.test.js.map