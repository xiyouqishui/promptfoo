"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_1 = require("../../src/providers/openai/chat");
const completion_1 = require("../../src/providers/openai/completion");
const embedding_1 = require("../../src/providers/openai/embedding");
const togetherai_1 = require("../../src/providers/togetherai");
jest.mock('../../src/providers/openai');
describe('createTogetherAiProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should create a chat completion provider when type is chat', () => {
        const provider = (0, togetherai_1.createTogetherAiProvider)('togetherai:chat:model-name');
        expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', expect.any(Object));
    });
    it('should create a completion provider when type is completion', () => {
        const provider = (0, togetherai_1.createTogetherAiProvider)('togetherai:completion:model-name');
        expect(provider).toBeInstanceOf(completion_1.OpenAiCompletionProvider);
        expect(completion_1.OpenAiCompletionProvider).toHaveBeenCalledWith('model-name', expect.any(Object));
    });
    it('should create an embedding provider when type is embedding', () => {
        const provider = (0, togetherai_1.createTogetherAiProvider)('togetherai:embedding:model-name');
        expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
        expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('model-name', expect.any(Object));
    });
    it('should create an embedding provider when type is embeddings', () => {
        const provider = (0, togetherai_1.createTogetherAiProvider)('togetherai:embeddings:model-name');
        expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
        expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('model-name', expect.any(Object));
    });
    it('should default to chat completion provider when no type is specified', () => {
        const provider = (0, togetherai_1.createTogetherAiProvider)('togetherai:model-name');
        expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', expect.any(Object));
    });
    it('should pass correct configuration to the provider', () => {
        const options = {
            id: 'custom-id',
        };
        (0, togetherai_1.createTogetherAiProvider)('togetherai:chat:model-name', options);
        // Verify that the OpenAI provider was called with the correct parameters
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', {
            config: {
                apiBaseUrl: 'https://api.together.xyz/v1',
                apiKeyEnvar: 'TOGETHER_API_KEY',
                passthrough: {},
            },
            id: 'custom-id',
        });
    });
    it('should handle model names with colons', () => {
        (0, togetherai_1.createTogetherAiProvider)('togetherai:chat:org:model:name');
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('org:model:name', expect.any(Object));
    });
    describe('parameter handling', () => {
        it('should add all parameters to passthrough', () => {
            const options = {
                config: {
                    config: {
                        max_tokens: 4096,
                        temperature: 0.7,
                        top_p: 0.9,
                        repetition_penalty: 1.1,
                        custom_param: 'value',
                    },
                },
            };
            (0, togetherai_1.createTogetherAiProvider)('togetherai:chat:model-name', options);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: 'https://api.together.xyz/v1',
                    apiKeyEnvar: 'TOGETHER_API_KEY',
                    passthrough: expect.objectContaining({
                        max_tokens: 4096,
                        temperature: 0.7,
                        top_p: 0.9,
                        repetition_penalty: 1.1,
                        custom_param: 'value',
                    }),
                }),
            }));
        });
        it('should handle TogetherAI-specific parameters correctly', () => {
            const options = {
                config: {
                    config: {
                        stop_sequences: ['END'],
                        top_k: 50,
                        safety_model: 'safety-model',
                    },
                },
            };
            (0, togetherai_1.createTogetherAiProvider)('togetherai:chat:model-name', options);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', expect.objectContaining({
                config: expect.objectContaining({
                    passthrough: expect.objectContaining({
                        stop_sequences: ['END'],
                        top_k: 50,
                        safety_model: 'safety-model',
                    }),
                }),
            }));
        });
        it('should handle passthrough correctly', () => {
            const options = {
                config: {
                    config: {
                        temperature: 0.7,
                        passthrough: {
                            custom_param: 'value',
                        },
                    },
                },
            };
            (0, togetherai_1.createTogetherAiProvider)('togetherai:chat:model-name', options);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', expect.objectContaining({
                config: expect.objectContaining({
                    passthrough: expect.objectContaining({
                        temperature: 0.7,
                        passthrough: {
                            custom_param: 'value',
                        },
                    }),
                }),
            }));
        });
    });
});
//# sourceMappingURL=togetherai.test.js.map