"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const defaults_1 = require("../../../src/providers/anthropic/defaults");
const messages_1 = require("../../../src/providers/anthropic/messages");
jest.mock('proxy-agent', () => ({
    ProxyAgent: jest.fn().mockImplementation(() => ({})),
}));
describe('Anthropic Default Providers', () => {
    afterEach(async () => {
        jest.clearAllMocks();
        await (0, cache_1.clearCache)();
    });
    describe('getAnthropicProviders', () => {
        it('should return all provider implementations', () => {
            const providers = (0, defaults_1.getAnthropicProviders)();
            expect(providers.gradingJsonProvider).toBeInstanceOf(messages_1.AnthropicMessagesProvider);
            expect(providers.gradingProvider).toBeInstanceOf(messages_1.AnthropicMessagesProvider);
            expect(providers.llmRubricProvider).toBeInstanceOf(defaults_1.AnthropicLlmRubricProvider);
            expect(providers.suggestionsProvider).toBeInstanceOf(messages_1.AnthropicMessagesProvider);
            expect(providers.synthesizeProvider).toBeInstanceOf(messages_1.AnthropicMessagesProvider);
        });
        it('should return the same instances on repeated calls', () => {
            const providers1 = (0, defaults_1.getAnthropicProviders)();
            const providers2 = (0, defaults_1.getAnthropicProviders)();
            expect(providers1.gradingProvider).toBe(providers2.gradingProvider);
            expect(providers1.gradingJsonProvider).toBe(providers2.gradingJsonProvider);
            expect(providers1.llmRubricProvider).toBe(providers2.llmRubricProvider);
        });
        it('should initialize providers lazily', () => {
            const providers = (0, defaults_1.getAnthropicProviders)();
            // Accessing one provider should not initialize others
            const gradingProvider = providers.gradingProvider;
            expect(gradingProvider).toBeInstanceOf(messages_1.AnthropicMessagesProvider);
            // Access multiple times should return the same instance
            const sameGradingProvider = providers.gradingProvider;
            expect(sameGradingProvider).toBe(gradingProvider);
        });
    });
    describe('AnthropicLlmRubricProvider', () => {
        let provider;
        beforeEach(() => {
            provider = new defaults_1.AnthropicLlmRubricProvider('claude-3-5-sonnet-20241022');
        });
        it('should initialize with forced tool configuration', () => {
            expect(provider.modelName).toBe('claude-3-5-sonnet-20241022');
            expect(provider.config.tool_choice).toEqual({ type: 'tool', name: 'grade_output' });
        });
        it('should call API and parse the result correctly', async () => {
            const mockApiResponse = {
                output: JSON.stringify({
                    type: 'tool_use',
                    id: 'test-id',
                    name: 'grade_output',
                    input: {
                        pass: true,
                        score: 0.85,
                        reason: 'The output meets the criteria.',
                    },
                }),
            };
            jest.spyOn(messages_1.AnthropicMessagesProvider.prototype, 'callApi').mockResolvedValue(mockApiResponse);
            const result = await provider.callApi('Test prompt');
            expect(result).toEqual({
                output: {
                    pass: true,
                    score: 0.85,
                    reason: 'The output meets the criteria.',
                },
            });
        });
        it('should handle non-string API response', async () => {
            const mockApiResponse = {
                output: { confession: 'I am not a string' },
            };
            jest.spyOn(messages_1.AnthropicMessagesProvider.prototype, 'callApi').mockResolvedValue(mockApiResponse);
            const result = await provider.callApi('Test prompt');
            expect(result.error).toContain('Anthropic LLM rubric grader - malformed non-string output');
        });
        it('should handle malformed API response', async () => {
            const mockApiResponse = {
                output: 'Invalid JSON',
            };
            jest.spyOn(messages_1.AnthropicMessagesProvider.prototype, 'callApi').mockResolvedValue(mockApiResponse);
            const result = await provider.callApi('Test prompt');
            expect(result.error).toContain('Anthropic LLM rubric grader - invalid JSON');
        });
        it('should handle API errors', async () => {
            const mockError = new Error('API Error');
            jest.spyOn(messages_1.AnthropicMessagesProvider.prototype, 'callApi').mockRejectedValue(mockError);
            await expect(provider.callApi('Test prompt')).rejects.toThrow('API Error');
        });
    });
});
//# sourceMappingURL=defaults.test.js.map