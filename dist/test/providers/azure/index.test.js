"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const completion_1 = require("../../../src/providers/azure/completion");
const warnings_1 = require("../../../src/providers/azure/warnings");
const huggingface_1 = require("../../../src/providers/huggingface");
const completion_2 = require("../../../src/providers/openai/completion");
jest.mock('../../../src/cache', () => ({
    fetchWithCache: jest.fn(),
}));
describe('maybeEmitAzureOpenAiWarning', () => {
    it('should not emit warning when no Azure providers are used', () => {
        const testSuite = {
            providers: [new completion_2.OpenAiCompletionProvider('foo')],
            defaultTest: {},
            prompts: [],
        };
        const tests = [
            {
                assert: [{ type: 'llm-rubric', value: 'foo bar' }],
            },
        ];
        const result = (0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests);
        expect(result).toBe(false);
    });
    it('should not emit warning when Azure provider is used alone, but no model graded eval', () => {
        const testSuite = {
            providers: [new completion_1.AzureCompletionProvider('foo', { config: { apiHost: 'test.azure.com' } })],
            defaultTest: {},
            prompts: [],
        };
        const tests = [
            {
                assert: [{ type: 'equals' }],
            },
        ];
        const result = (0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests);
        expect(result).toBe(false);
    });
    it('should emit warning when Azure provider is used alone, but with model graded eval', () => {
        const testSuite = {
            providers: [new completion_1.AzureCompletionProvider('foo', { config: { apiHost: 'test.azure.com' } })],
            defaultTest: {},
            prompts: [],
        };
        const tests = [
            {
                assert: [{ type: 'llm-rubric', value: 'foo bar' }],
            },
        ];
        const result = (0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests);
        expect(result).toBe(true);
    });
    it('should emit warning when Azure provider used with non-OpenAI provider', () => {
        const testSuite = {
            providers: [
                new completion_1.AzureCompletionProvider('foo', { config: { apiHost: 'test.azure.com' } }),
                new huggingface_1.HuggingfaceTextGenerationProvider('bar'),
            ],
            defaultTest: {},
            prompts: [],
        };
        const tests = [
            {
                assert: [{ type: 'llm-rubric', value: 'foo bar' }],
            },
        ];
        const result = (0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests);
        expect(result).toBe(true);
    });
    it('should not emit warning when Azure providers are used with a default provider set', () => {
        const testSuite = {
            providers: [new completion_1.AzureCompletionProvider('foo', { config: { apiHost: 'test.azure.com' } })],
            defaultTest: { options: { provider: 'azureopenai:....' } },
            prompts: [],
        };
        const tests = [
            {
                assert: [{ type: 'llm-rubric', value: 'foo bar' }],
            },
        ];
        const result = (0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests);
        expect(result).toBe(false);
    });
    it('should not emit warning when both Azure and OpenAI providers are used', () => {
        const testSuite = {
            providers: [
                new completion_1.AzureCompletionProvider('foo', { config: { apiHost: 'test.azure.com' } }),
                new completion_2.OpenAiCompletionProvider('bar'),
            ],
            defaultTest: {},
            prompts: [],
        };
        const tests = [
            {
                assert: [{ type: 'llm-rubric', value: 'foo bar' }],
            },
        ];
        const result = (0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests);
        expect(result).toBe(false);
    });
});
//# sourceMappingURL=index.test.js.map