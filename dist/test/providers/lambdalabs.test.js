"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lambdalabs_1 = require("../../src/providers/lambdalabs");
const chat_1 = require("../../src/providers/openai/chat");
const completion_1 = require("../../src/providers/openai/completion");
const embedding_1 = require("../../src/providers/openai/embedding");
jest.mock('../../src/providers/openai/chat');
jest.mock('../../src/providers/openai/completion');
jest.mock('../../src/providers/openai/embedding');
describe('createLambdaLabsProvider', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should create chat provider when path includes chat', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:chat:model-name');
        expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', {
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {},
            },
        });
    });
    it('should create completion provider when path includes completion', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:completion:model-name');
        expect(provider).toBeInstanceOf(completion_1.OpenAiCompletionProvider);
        expect(completion_1.OpenAiCompletionProvider).toHaveBeenCalledWith('model-name', {
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {},
            },
        });
    });
    it('should create embedding provider when path includes embedding', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:embedding:model-name');
        expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
        expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('model-name', {
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {},
            },
        });
    });
    it('should create embedding provider when path includes embeddings', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:embeddings:model-name');
        expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
        expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('model-name', {
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {},
            },
        });
    });
    it('should default to chat provider when no type specified', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:model-name');
        expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', {
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {},
            },
        });
    });
    it('should pass through additional config options', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:chat:model-name', {
            config: {
                config: {
                    temperature: 0.7,
                    maxTokens: 100,
                },
            },
        });
        expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', {
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {
                    temperature: 0.7,
                    maxTokens: 100,
                },
            },
        });
    });
    it('should pass through provider ID', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:chat:model-name', {
            id: 'my-provider',
        });
        expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', {
            id: 'my-provider',
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {},
            },
        });
    });
    it('should pass through env overrides', () => {
        const provider = (0, lambdalabs_1.createLambdaLabsProvider)('lambda:chat:model-name', {
            env: {
                LAMBDA_API_KEY: 'test-key',
            },
        });
        expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('model-name', {
            env: {
                LAMBDA_API_KEY: 'test-key',
            },
            config: {
                apiBaseUrl: 'https://api.lambda.ai/v1',
                apiKeyEnvar: 'LAMBDA_API_KEY',
                passthrough: {},
            },
        });
    });
});
//# sourceMappingURL=lambdalabs.test.js.map