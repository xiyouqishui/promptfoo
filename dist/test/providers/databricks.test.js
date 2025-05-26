"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../src/cache");
const databricks_1 = require("../../src/providers/databricks");
const chat_1 = require("../../src/providers/openai/chat");
jest.mock('../../src/logger');
jest.mock('../../src/providers/openai');
describe('Databricks Mosaic AI Provider', () => {
    const originalEnv = process.env;
    const workspaceUrl = 'https://test-workspace.cloud.databricks.com';
    const defaultOptions = {
        config: {
            workspaceUrl,
        },
    };
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.DATABRICKS_WORKSPACE_URL;
        delete process.env.DATABRICKS_TOKEN;
    });
    afterEach(async () => {
        await (0, cache_1.clearCache)();
        process.env = originalEnv;
    });
    describe('DatabricksMosaicAiChatCompletionProvider', () => {
        it('should create provider for a specific model', () => {
            const provider = new databricks_1.DatabricksMosaicAiChatCompletionProvider('meta-llama-3.3-70b-instruct', defaultOptions);
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('meta-llama-3.3-70b-instruct', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: `${workspaceUrl}/serving-endpoints`,
                    apiKeyEnvar: 'DATABRICKS_TOKEN',
                }),
            }));
        });
        it('should create provider with workspace URL from config', () => {
            const options = {
                config: {
                    workspaceUrl,
                },
            };
            const provider = new databricks_1.DatabricksMosaicAiChatCompletionProvider('meta-llama-3.3-70b-instruct', options);
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('meta-llama-3.3-70b-instruct', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: `${workspaceUrl}/serving-endpoints`,
                    apiKeyEnvar: 'DATABRICKS_TOKEN',
                }),
            }));
        });
        it('should create provider with workspace URL from environment variable', () => {
            process.env.DATABRICKS_WORKSPACE_URL = workspaceUrl;
            const options = {
                config: {},
            };
            const provider = new databricks_1.DatabricksMosaicAiChatCompletionProvider('meta-llama-3.3-70b-instruct', options);
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('meta-llama-3.3-70b-instruct', expect.objectContaining({
                config: expect.objectContaining({
                    apiBaseUrl: `${workspaceUrl}/serving-endpoints`,
                    apiKeyEnvar: 'DATABRICKS_TOKEN',
                }),
            }));
        });
        it('should throw error when no workspace URL is provided', () => {
            const options = {
                config: {},
            };
            expect(() => new databricks_1.DatabricksMosaicAiChatCompletionProvider('meta-llama-3.3-70b-instruct', options)).toThrow('Databricks workspace URL is required. Set it in the config or DATABRICKS_WORKSPACE_URL environment variable.');
        });
        it('should pass through environment variables', () => {
            const options = {
                config: {
                    workspaceUrl,
                },
                env: {
                    DATABRICKS_TOKEN: 'test-token',
                },
            };
            const provider = new databricks_1.DatabricksMosaicAiChatCompletionProvider('meta-llama-3.3-70b-instruct', options);
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('meta-llama-3.3-70b-instruct', expect.objectContaining({
                env: expect.objectContaining({
                    DATABRICKS_TOKEN: 'test-token',
                }),
            }));
        });
        it('should pass through OpenAI configuration options', () => {
            const options = {
                config: {
                    workspaceUrl,
                    temperature: 0.7,
                    max_tokens: 100,
                    top_p: 0.9,
                },
            };
            const provider = new databricks_1.DatabricksMosaicAiChatCompletionProvider('meta-llama-3.3-70b-instruct', options);
            expect(provider).toBeInstanceOf(chat_1.OpenAiChatCompletionProvider);
            expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('meta-llama-3.3-70b-instruct', expect.objectContaining({
                config: expect.objectContaining({
                    temperature: 0.7,
                    max_tokens: 100,
                    top_p: 0.9,
                }),
            }));
        });
    });
});
//# sourceMappingURL=databricks.test.js.map