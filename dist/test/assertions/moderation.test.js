"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moderation_1 = require("../../src/assertions/moderation");
const matchers_1 = require("../../src/matchers");
jest.mock('../../src/matchers', () => ({
    matchesModeration: jest.fn(),
}));
const mockedMatchesModeration = jest.mocked(matchers_1.matchesModeration);
describe('handleModeration', () => {
    const mockTest = {
        description: 'Test case',
        vars: {},
        assert: [],
        options: {},
    };
    const mockAssertion = {
        type: 'moderation',
        value: ['harassment'],
    };
    const mockProvider = {
        id: () => 'test-provider',
        config: {},
        callApi: jest.fn(),
    };
    const mockContext = {
        prompt: 'test prompt',
        vars: {},
        test: mockTest,
        logProbs: undefined,
        provider: mockProvider,
        providerResponse: { output: 'output' },
    };
    const baseParams = {
        assertion: mockAssertion,
        test: mockTest,
        outputString: 'output',
        prompt: 'prompt',
        baseType: 'moderation',
        context: mockContext,
        inverse: false,
        output: 'output',
        providerResponse: { output: 'output' },
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should pass moderation check', async () => {
        mockedMatchesModeration.mockResolvedValue({
            pass: true,
            score: 1,
            reason: 'Safe content',
        });
        const result = await (0, moderation_1.handleModeration)({
            ...baseParams,
            providerResponse: { output: 'output' },
        });
        expect(result).toEqual({
            pass: true,
            score: 1,
            reason: 'Safe content',
            assertion: mockAssertion,
        });
    });
    it('should use redteam final prompt when available', async () => {
        mockedMatchesModeration.mockResolvedValue({
            pass: true,
            score: 1,
            reason: 'Safe content',
        });
        await (0, moderation_1.handleModeration)({
            ...baseParams,
            providerResponse: {
                output: 'output',
                metadata: { redteamFinalPrompt: 'modified prompt' },
            },
        });
        expect(mockedMatchesModeration).toHaveBeenCalledWith({
            userPrompt: 'modified prompt',
            assistantResponse: 'output',
            categories: ['harassment'],
        }, {});
    });
});
//# sourceMappingURL=moderation.test.js.map