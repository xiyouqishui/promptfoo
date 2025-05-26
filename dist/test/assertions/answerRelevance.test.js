"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const answerRelevance_1 = require("../../src/assertions/answerRelevance");
const matchers_1 = require("../../src/matchers");
const invariant_1 = __importDefault(require("../../src/util/invariant"));
jest.mock('../../src/matchers');
jest.mock('../../src/util/invariant');
describe('handleAnswerRelevance', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(invariant_1.default).mockImplementation((condition, message) => {
            if (!condition) {
                throw new Error(typeof message === 'function' ? message() : message);
            }
        });
    });
    it('should call matchesAnswerRelevance with correct parameters', async () => {
        const mockMatchesAnswerRelevance = jest.mocked(matchers_1.matchesAnswerRelevance);
        mockMatchesAnswerRelevance.mockResolvedValue({
            pass: true,
            score: 0.8,
            reason: 'test reason',
        });
        const result = await (0, answerRelevance_1.handleAnswerRelevance)({
            assertion: {
                type: 'answer-relevance',
                threshold: 0.7,
            },
            output: 'test output',
            prompt: 'test prompt',
            test: {
                vars: {},
                options: {},
            },
            baseType: 'answer-relevance',
            context: {},
            inverse: false,
            outputString: 'test output',
            providerResponse: {
                output: 'test output',
                tokenUsage: {},
            },
        });
        expect(mockMatchesAnswerRelevance).toHaveBeenCalledWith('test prompt', 'test output', 0.7, {});
        expect(result).toEqual({
            assertion: {
                type: 'answer-relevance',
                threshold: 0.7,
            },
            pass: true,
            score: 0.8,
            reason: 'test reason',
        });
    });
    it('should use query from vars if available', async () => {
        const mockMatchesAnswerRelevance = jest.mocked(matchers_1.matchesAnswerRelevance);
        mockMatchesAnswerRelevance.mockResolvedValue({
            pass: true,
            score: 0.8,
            reason: 'test reason',
        });
        const result = await (0, answerRelevance_1.handleAnswerRelevance)({
            assertion: {
                type: 'answer-relevance',
                threshold: 0.7,
            },
            output: 'test output',
            prompt: 'test prompt',
            test: {
                vars: {
                    query: 'test query',
                },
                options: {},
            },
            baseType: 'answer-relevance',
            context: {},
            inverse: false,
            outputString: 'test output',
            providerResponse: {
                output: 'test output',
                tokenUsage: {},
            },
        });
        expect(mockMatchesAnswerRelevance).toHaveBeenCalledWith('test query', 'test output', 0.7, {});
        expect(result).toEqual({
            assertion: {
                type: 'answer-relevance',
                threshold: 0.7,
            },
            pass: true,
            score: 0.8,
            reason: 'test reason',
        });
    });
    it('should throw error if output is not string', async () => {
        await expect((0, answerRelevance_1.handleAnswerRelevance)({
            assertion: {
                type: 'answer-relevance',
            },
            output: {},
            prompt: 'test prompt',
            test: {
                vars: {},
                options: {},
            },
            baseType: 'answer-relevance',
            context: {},
            inverse: false,
            outputString: 'test output',
            providerResponse: {
                output: 'test output',
                tokenUsage: {},
            },
        })).rejects.toThrow('answer-relevance assertion type must evaluate a string output');
    });
    it('should throw error if prompt is missing', async () => {
        await expect((0, answerRelevance_1.handleAnswerRelevance)({
            assertion: {
                type: 'answer-relevance',
            },
            output: 'test output',
            prompt: '',
            test: {
                vars: {},
                options: {},
            },
            baseType: 'answer-relevance',
            context: {},
            inverse: false,
            outputString: 'test output',
            providerResponse: {
                output: 'test output',
                tokenUsage: {},
            },
        })).rejects.toThrow('answer-relevance assertion type must have a prompt');
    });
    it('should use default threshold of 0 if not specified', async () => {
        const mockMatchesAnswerRelevance = jest.mocked(matchers_1.matchesAnswerRelevance);
        mockMatchesAnswerRelevance.mockResolvedValue({
            pass: true,
            score: 0.8,
            reason: 'test reason',
        });
        const result = await (0, answerRelevance_1.handleAnswerRelevance)({
            assertion: {
                type: 'answer-relevance',
            },
            output: 'test output',
            prompt: 'test prompt',
            test: {
                vars: {},
                options: {},
            },
            baseType: 'answer-relevance',
            context: {},
            inverse: false,
            outputString: 'test output',
            providerResponse: {
                output: 'test output',
                tokenUsage: {},
            },
        });
        expect(mockMatchesAnswerRelevance).toHaveBeenCalledWith('test prompt', 'test output', 0, {});
        expect(result).toEqual({
            assertion: {
                type: 'answer-relevance',
            },
            pass: true,
            score: 0.8,
            reason: 'test reason',
        });
    });
});
//# sourceMappingURL=answerRelevance.test.js.map