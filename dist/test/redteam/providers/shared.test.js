"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliState_1 = __importDefault(require("../../../src/cliState"));
const providers_1 = require("../../../src/providers");
const chat_1 = require("../../../src/providers/openai/chat");
const constants_1 = require("../../../src/redteam/providers/constants");
const shared_1 = require("../../../src/redteam/providers/shared");
const time_1 = require("../../../src/util/time");
jest.mock('../../../src/util/time');
jest.mock('../../../src/cliState', () => ({
    __esModule: true,
    default: {
        config: {
            redteam: {
                provider: null,
            },
        },
    },
}));
jest.mock('../../../src/providers/openai');
jest.mock('../../../src/providers', () => ({
    loadApiProviders: jest.fn(),
}));
const mockedSleep = jest.mocked(time_1.sleep);
const mockedLoadApiProviders = jest.mocked(providers_1.loadApiProviders);
const mockedOpenAiProvider = jest.mocked(chat_1.OpenAiChatCompletionProvider);
describe('shared redteam provider utilities', () => {
    beforeEach(() => {
        mockedSleep.mockClear();
        mockedLoadApiProviders.mockClear();
        mockedOpenAiProvider.mockClear();
        shared_1.redteamProviderManager.clearProvider();
    });
    describe('RedteamProviderManager', () => {
        const mockApiProvider = {
            id: () => 'test-provider',
            callApi: jest.fn(),
        };
        it('creates default OpenAI provider when no provider specified', async () => {
            const mockOpenAiInstance = new chat_1.OpenAiChatCompletionProvider(constants_1.ATTACKER_MODEL);
            mockedOpenAiProvider.mockReturnValue(mockOpenAiInstance);
            const result = await shared_1.redteamProviderManager.getProvider({});
            expect(result).toBe(mockOpenAiInstance);
            expect(mockedOpenAiProvider).toHaveBeenCalledWith(constants_1.ATTACKER_MODEL, {
                config: {
                    temperature: constants_1.TEMPERATURE,
                    response_format: undefined,
                },
            });
        });
        it('clears cached providers', async () => {
            const mockOpenAiInstance = new chat_1.OpenAiChatCompletionProvider(constants_1.ATTACKER_MODEL);
            mockedOpenAiProvider.mockReturnValue(mockOpenAiInstance);
            // First call to set up the cache
            await shared_1.redteamProviderManager.getProvider({});
            // Clear the cache
            shared_1.redteamProviderManager.clearProvider();
            mockedOpenAiProvider.mockClear();
            // Second call should create a new provider
            await shared_1.redteamProviderManager.getProvider({});
            expect(mockedOpenAiProvider).toHaveBeenCalledTimes(1);
        });
        it('loads provider from string identifier', async () => {
            mockedLoadApiProviders.mockResolvedValue([mockApiProvider]);
            const result = await shared_1.redteamProviderManager.getProvider({ provider: 'test-provider' });
            expect(result).toBe(mockApiProvider);
            expect(mockedLoadApiProviders).toHaveBeenCalledWith(['test-provider']);
        });
        it('loads provider from provider options', async () => {
            const providerOptions = { id: 'test-provider', apiKey: 'test-key' };
            mockedLoadApiProviders.mockResolvedValue([mockApiProvider]);
            const result = await shared_1.redteamProviderManager.getProvider({ provider: providerOptions });
            expect(result).toBe(mockApiProvider);
            expect(mockedLoadApiProviders).toHaveBeenCalledWith([providerOptions]);
        });
        it('uses small model when preferSmallModel is true', async () => {
            const mockOpenAiInstance = new chat_1.OpenAiChatCompletionProvider(constants_1.ATTACKER_MODEL_SMALL);
            mockedOpenAiProvider.mockReturnValue(mockOpenAiInstance);
            const result = await shared_1.redteamProviderManager.getProvider({ preferSmallModel: true });
            expect(result).toBe(mockOpenAiInstance);
            expect(mockedOpenAiProvider).toHaveBeenCalledWith(constants_1.ATTACKER_MODEL_SMALL, {
                config: {
                    temperature: constants_1.TEMPERATURE,
                    response_format: undefined,
                },
            });
        });
        it('sets response_format to json_object when jsonOnly is true', async () => {
            const mockOpenAiInstance = new chat_1.OpenAiChatCompletionProvider(constants_1.ATTACKER_MODEL);
            mockedOpenAiProvider.mockReturnValue(mockOpenAiInstance);
            const result = await shared_1.redteamProviderManager.getProvider({ jsonOnly: true });
            expect(result).toBe(mockOpenAiInstance);
            expect(mockedOpenAiProvider).toHaveBeenCalledWith(constants_1.ATTACKER_MODEL, {
                config: {
                    temperature: constants_1.TEMPERATURE,
                    response_format: { type: 'json_object' },
                },
            });
        });
        it('uses provider from cliState if available', async () => {
            const mockStateProvider = {
                id: () => 'state-provider',
                callApi: jest.fn(),
            };
            cliState_1.default.config.redteam.provider = mockStateProvider;
            const result = await shared_1.redteamProviderManager.getProvider({});
            expect(result).toBe(mockStateProvider);
        });
        it('sets and reuses providers', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                callApi: jest.fn(),
            };
            mockedLoadApiProviders.mockResolvedValue([mockProvider]);
            // Set the provider
            await shared_1.redteamProviderManager.setProvider('test-provider');
            // Get the provider - should use cached version
            const result = await shared_1.redteamProviderManager.getProvider({});
            const jsonResult = await shared_1.redteamProviderManager.getProvider({ jsonOnly: true });
            expect(result).toBe(mockProvider);
            expect(jsonResult).toBe(mockProvider);
            expect(mockedLoadApiProviders).toHaveBeenCalledTimes(2); // Once for regular, once for jsonOnly
        });
        it('handles thrown errors in getTargetResponse', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                callApi: jest
                    .fn()
                    .mockRejectedValue(new Error('Network error')),
            };
            const result = await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt');
            expect(result).toEqual({
                output: '',
                error: 'Network error',
                tokenUsage: { numRequests: 1 },
            });
        });
    });
    describe('getTargetResponse', () => {
        it('returns successful response with string output', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                callApi: jest
                    .fn()
                    .mockResolvedValue({
                    output: 'test response',
                    tokenUsage: { total: 10, prompt: 5, completion: 5, numRequests: 1 },
                    sessionId: 'test-session',
                }),
            };
            const result = await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt');
            expect(result).toEqual({
                output: 'test response',
                tokenUsage: { total: 10, prompt: 5, completion: 5, numRequests: 1 },
                sessionId: 'test-session',
            });
        });
        it('passes through context and options', async () => {
            const mockCallApi = jest
                .fn()
                .mockResolvedValue({
                output: 'test response',
                tokenUsage: { numRequests: 1 },
            });
            const mockProvider = {
                id: () => 'test-provider',
                callApi: mockCallApi,
            };
            const prompt = {
                raw: 'test prompt',
                label: 'test',
            };
            const context = {
                prompt,
                vars: { test: 'value' },
            };
            const options = {};
            await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt', context, options);
            expect(mockCallApi).toHaveBeenCalledWith('test prompt', context, options);
        });
        it('stringifies non-string output', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                callApi: jest
                    .fn()
                    .mockResolvedValue({
                    output: { key: 'value' },
                    tokenUsage: { numRequests: 1 },
                }),
            };
            const result = await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt');
            expect(result).toEqual({
                output: '{"key":"value"}',
                tokenUsage: { numRequests: 1 },
            });
        });
        it('handles provider error response', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                callApi: jest
                    .fn()
                    .mockResolvedValue({
                    error: 'API error',
                    sessionId: 'error-session',
                }),
            };
            const result = await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt');
            expect(result).toEqual({
                output: '',
                error: 'API error',
                sessionId: 'error-session',
                tokenUsage: { numRequests: 1 },
            });
        });
        it('respects provider delay for non-cached responses', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                delay: 100,
                callApi: jest
                    .fn()
                    .mockResolvedValue({
                    output: 'test response',
                    tokenUsage: { numRequests: 1 },
                }),
            };
            await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt');
            expect(mockedSleep).toHaveBeenCalledWith(100);
        });
        it('skips delay for cached responses', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                delay: 100,
                callApi: jest
                    .fn()
                    .mockResolvedValue({
                    output: 'test response',
                    cached: true,
                    tokenUsage: { numRequests: 1 },
                }),
            };
            await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt');
            expect(mockedSleep).not.toHaveBeenCalled();
        });
        it('throws error when neither output nor error is set', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                callApi: jest
                    .fn()
                    .mockResolvedValue({}),
            };
            await expect((0, shared_1.getTargetResponse)(mockProvider, 'test prompt')).rejects.toThrow(/Target returned malformed response: expected either `output` or `error` to be set./);
        });
        it('uses default tokenUsage when not provided', async () => {
            const mockProvider = {
                id: () => 'test-provider',
                callApi: jest
                    .fn()
                    .mockResolvedValue({
                    output: 'test response',
                }),
            };
            const result = await (0, shared_1.getTargetResponse)(mockProvider, 'test prompt');
            expect(result).toEqual({
                output: 'test response',
                tokenUsage: { numRequests: 1 },
            });
        });
    });
    describe('messagesToRedteamHistory', () => {
        it('converts valid messages to redteamHistory format', () => {
            const messages = [
                { role: 'system', content: 'system message' },
                { role: 'user', content: 'user message 1' },
                { role: 'assistant', content: 'assistant response 1' },
                { role: 'user', content: 'user message 2' },
                { role: 'assistant', content: 'assistant response 2' },
            ];
            const result = (0, shared_1.messagesToRedteamHistory)(messages);
            expect(result).toEqual([
                { prompt: 'user message 1', output: 'assistant response 1' },
                { prompt: 'user message 2', output: 'assistant response 2' },
            ]);
        });
        it('handles empty messages array', () => {
            const messages = [];
            const result = (0, shared_1.messagesToRedteamHistory)(messages);
            expect(result).toEqual([]);
        });
        it('handles messages with missing content', () => {
            const messages = [
                { role: 'user', content: '' },
                { role: 'assistant', content: undefined },
                { role: 'user', content: 'valid message' },
                { role: 'assistant', content: 'valid response' },
            ];
            const result = (0, shared_1.messagesToRedteamHistory)(messages);
            expect(result).toEqual([
                { prompt: '', output: '' },
                { prompt: 'valid message', output: 'valid response' },
            ]);
        });
        it('handles malformed messages gracefully', () => {
            const messages = [
                { wrong: 'format' },
                null,
                undefined,
                { role: 'user', content: 'valid message' },
                { role: 'assistant', content: 'valid response' },
            ];
            const result = (0, shared_1.messagesToRedteamHistory)(messages);
            expect(result).toEqual([{ prompt: 'valid message', output: 'valid response' }]);
        });
        it('handles non-array input gracefully', () => {
            const result = (0, shared_1.messagesToRedteamHistory)(null);
            expect(result).toEqual([]);
        });
        it('skips incomplete message pairs', () => {
            const messages = [
                { role: 'user', content: 'user message 1' },
                { role: 'user', content: 'user message 2' },
                { role: 'assistant', content: 'assistant response 2' },
            ];
            const result = (0, shared_1.messagesToRedteamHistory)(messages);
            expect(result).toEqual([{ prompt: 'user message 2', output: 'assistant response 2' }]);
        });
    });
});
//# sourceMappingURL=shared.test.js.map