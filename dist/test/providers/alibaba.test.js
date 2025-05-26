"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../src/cache");
const alibaba_1 = require("../../src/providers/alibaba");
const chat_1 = require("../../src/providers/openai/chat");
const embedding_1 = require("../../src/providers/openai/embedding");
jest.mock('../../src/logger');
jest.mock('../../src/providers/openai');
describe('Alibaba Cloud Provider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(async () => {
        await (0, cache_1.clearCache)();
    });
    describe('AlibabaChatCompletionProvider', () => {
        it('should create provider for flagship models', () => {
            const provider = new alibaba_1.AlibabaChatCompletionProvider('qwen-max', {});
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('qwen-max', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
                    apiKeyEnvar: 'DASHSCOPE_API_KEY',
                }),
            }));
        });
        it('should create provider for visual language models', () => {
            const provider = new alibaba_1.AlibabaChatCompletionProvider('qwen-vl-max', {});
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('qwen-vl-max', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
                    apiKeyEnvar: 'DASHSCOPE_API_KEY',
                }),
            }));
        });
        it('should throw error when no model specified', () => {
            expect(() => new alibaba_1.AlibabaChatCompletionProvider('')).toThrow('Invalid Alibaba Cloud model: . Available models:');
        });
        it('should throw error for unknown model', () => {
            expect(() => new alibaba_1.AlibabaChatCompletionProvider('unknown-model', {})).toThrow('Invalid Alibaba Cloud model: unknown-model. Available models:');
        });
        it('should pass through environment variables', () => {
            const provider = new alibaba_1.AlibabaChatCompletionProvider('qwen-max', {
                env: {
                    DASHSCOPE_API_KEY: 'test-key',
                },
            });
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('qwen-max', expect.objectContaining({
                env: expect.objectContaining({
                    DASHSCOPE_API_KEY: 'test-key',
                }),
            }));
        });
        it('should allow custom API base URL', () => {
            const customBaseUrl = 'https://dashscope.aliyuncs.com/api/v1';
            const provider = new alibaba_1.AlibabaChatCompletionProvider('qwen-max', {
                config: {
                    API_BASE_URL: customBaseUrl,
                },
            });
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('qwen-max', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: customBaseUrl,
                }),
            }));
        });
    });
    describe('AlibabaEmbeddingProvider', () => {
        it('should create provider for embedding models', () => {
            const provider = new alibaba_1.AlibabaEmbeddingProvider('text-embedding-v3', {});
            expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
            expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('text-embedding-v3', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
                    apiKeyEnvar: 'DASHSCOPE_API_KEY',
                }),
            }));
        });
        it('should throw error when no model specified', () => {
            expect(() => new alibaba_1.AlibabaEmbeddingProvider('')).toThrow('Invalid Alibaba Cloud model: . Available models:');
        });
        it('should throw error for unknown model', () => {
            expect(() => new alibaba_1.AlibabaEmbeddingProvider('unknown-model', {})).toThrow('Invalid Alibaba Cloud model: unknown-model. Available models:');
        });
        it('should pass through environment variables', () => {
            const provider = new alibaba_1.AlibabaEmbeddingProvider('text-embedding-v3', {
                env: {
                    DASHSCOPE_API_KEY: 'test-key',
                },
            });
            expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
            expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('text-embedding-v3', expect.objectContaining({
                env: expect.objectContaining({
                    DASHSCOPE_API_KEY: 'test-key',
                }),
            }));
        });
        it('should allow custom API base URL', () => {
            const customBaseUrl = 'https://dashscope.aliyuncs.com/api/v1';
            const provider = new alibaba_1.AlibabaEmbeddingProvider('text-embedding-v3', {
                config: {
                    API_BASE_URL: customBaseUrl,
                },
            });
            expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
            expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('text-embedding-v3', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: customBaseUrl,
                }),
            }));
        });
    });
});
//# sourceMappingURL=alibaba.test.js.map