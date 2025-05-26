"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../../../src/logger"));
const warnings_1 = require("../../../src/providers/azure/warnings");
describe('maybeEmitAzureOpenAiWarning', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should return false when no Azure providers are present', () => {
        const testSuite = {
            prompts: [],
            providers: [{ constructor: { name: 'OtherProvider' } }],
            defaultTest: {},
        };
        const tests = [];
        expect((0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests)).toBe(false);
    });
    it('should return false when both Azure and OpenAI providers are present', () => {
        const testSuite = {
            prompts: [],
            providers: [
                { constructor: { name: 'AzureChatCompletionProvider' } },
                { constructor: { name: 'OpenAiChatCompletionProvider' } },
            ],
            defaultTest: {},
        };
        const tests = [];
        expect((0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests)).toBe(false);
    });
    it('should return false when Azure provider is present but no model-graded assertions', () => {
        const testSuite = {
            prompts: [],
            providers: [{ constructor: { name: 'AzureChatCompletionProvider' } }],
            defaultTest: {},
        };
        const tests = [
            {
                assert: [{ type: 'contains' }],
            },
        ];
        expect((0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests)).toBe(false);
    });
    it('should return true and emit warning when Azure provider is used with model-graded assertions', () => {
        const warnSpy = jest.spyOn(logger_1.default, 'warn');
        const testSuite = {
            prompts: [],
            providers: [{ constructor: { name: 'AzureChatCompletionProvider' } }],
            defaultTest: {},
        };
        const tests = [
            {
                assert: [{ type: 'factuality' }],
            },
        ];
        expect((0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests)).toBe(true);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('You are using model-graded assertions of types'));
    });
    it('should return false when provider is explicitly set', () => {
        const testSuite = {
            prompts: [],
            providers: [{ constructor: { name: 'AzureChatCompletionProvider' } }],
            defaultTest: {
                options: {
                    provider: 'azure',
                },
            },
        };
        const tests = [
            {
                assert: [{ type: 'factuality' }],
            },
        ];
        expect((0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests)).toBe(false);
    });
    it('should return false when assertion has provider set', () => {
        const testSuite = {
            prompts: [],
            providers: [{ constructor: { name: 'AzureChatCompletionProvider' } }],
            defaultTest: {},
        };
        const tests = [
            {
                assert: [
                    {
                        type: 'factuality',
                        provider: 'azure',
                    },
                ],
            },
        ];
        expect((0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests)).toBe(false);
    });
    it('should return false when test has provider option set', () => {
        const testSuite = {
            prompts: [],
            providers: [{ constructor: { name: 'AzureChatCompletionProvider' } }],
            defaultTest: {},
        };
        const tests = [
            {
                assert: [{ type: 'factuality' }],
                options: {
                    provider: 'azure',
                },
            },
        ];
        expect((0, warnings_1.maybeEmitAzureOpenAiWarning)(testSuite, tests)).toBe(false);
    });
});
//# sourceMappingURL=warnings.test.js.map