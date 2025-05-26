"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("../../src/providers");
const cerebras_1 = require("../../src/providers/cerebras");
describe('Cerebras provider', () => {
    let provider;
    beforeEach(() => {
        process.env.CEREBRAS_API_KEY = 'test-key';
    });
    afterEach(() => {
        delete process.env.CEREBRAS_API_KEY;
    });
    describe('createCerebrasProvider', () => {
        it('should create a chat provider', () => {
            provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b');
            expect(provider.id()).toBe('llama3.1-8b');
            expect(provider.toString()).toContain('OpenAI');
            expect(provider.config).toMatchObject({
                apiKeyEnvar: 'CEREBRAS_API_KEY',
                apiBaseUrl: 'https://api.cerebras.ai/v1',
                passthrough: {},
            });
        });
        it('should handle custom config options', () => {
            provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b', {
                config: {
                    config: {
                        basePath: '/custom/path',
                        temperature: 0.8,
                    },
                },
            });
            expect(provider.config).toMatchObject({
                apiKeyEnvar: 'CEREBRAS_API_KEY',
                apiBaseUrl: 'https://api.cerebras.ai/v1',
                passthrough: {
                    temperature: 0.8,
                },
            });
        });
        it('should handle max_tokens correctly', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b');
            const { body } = provider.getOpenAiBody('test prompt', undefined, {
                max_tokens: 1024,
            });
            expect(body).toMatchObject({
                messages: [
                    {
                        role: 'user',
                        content: 'test prompt',
                    },
                ],
                model: 'llama3.1-8b',
                max_tokens: 1024,
            });
        });
        it('should handle model name parsing', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:model:with:colons');
            expect(provider.id()).toBe('model:with:colons');
        });
        it('should merge env overrides', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:test-model', {
                env: {
                    OPENAI_API_KEY: 'override-key',
                },
            });
            expect(provider.config.apiKeyEnvar).toBe('CEREBRAS_API_KEY');
        });
        it('should handle empty config', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:test-model');
            expect(provider.config).toMatchObject({
                apiKeyEnvar: 'CEREBRAS_API_KEY',
                apiBaseUrl: 'https://api.cerebras.ai/v1',
                passthrough: {},
            });
        });
        it('should not remove max_tokens if max_completion_tokens is not present', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b');
            const { body } = provider.getOpenAiBody('prompt', undefined, {
                max_tokens: 123,
            });
            expect(body.max_tokens).toBe(1024);
            expect(body.max_completion_tokens).toBeUndefined();
        });
        it('should support both empty and undefined options', () => {
            const provider1 = (0, cerebras_1.createCerebrasProvider)('cerebras:foo');
            const provider2 = (0, cerebras_1.createCerebrasProvider)('cerebras:foo', undefined);
            expect(provider1.config).toMatchObject({
                apiKeyEnvar: 'CEREBRAS_API_KEY',
                apiBaseUrl: 'https://api.cerebras.ai/v1',
                passthrough: {},
            });
            expect(provider2.config).toMatchObject({
                apiKeyEnvar: 'CEREBRAS_API_KEY',
                apiBaseUrl: 'https://api.cerebras.ai/v1',
                passthrough: {},
            });
        });
        it('should not include basePath in passthrough config', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b', {
                config: {
                    config: {
                        basePath: '/should/not/be/included',
                        foo: 'bar',
                    },
                },
            });
            expect(provider.config.passthrough).toMatchObject({
                foo: 'bar',
            });
            expect(provider.config.passthrough.basePath).toBeUndefined();
        });
        it('should pass through arbitrary passthrough config', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b', {
                config: {
                    config: {
                        customParam: 'myValue',
                    },
                },
            });
            expect(provider.config.passthrough).toMatchObject({
                customParam: 'myValue',
            });
        });
        it('should allow id and env options', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b', {
                id: 'custom-id',
                env: {
                    CEREBRAS_API_KEY: 'another-key',
                },
            });
            expect(provider.id()).toBe('custom-id');
            expect(provider.config.apiKeyEnvar).toBe('CEREBRAS_API_KEY');
        });
        it('should not include max_tokens or max_completion_tokens if neither provided', () => {
            const provider = (0, cerebras_1.createCerebrasProvider)('cerebras:llama3.1-8b');
            const { body } = provider.getOpenAiBody('prompt', undefined, {});
            expect(body.max_tokens).toBe(1024);
            expect(body.max_completion_tokens).toBeUndefined();
        });
    });
    describe('loadApiProvider', () => {
        it('should load the provider from the registry', async () => {
            provider = await (0, providers_1.loadApiProvider)('cerebras:llama3.1-8b');
            expect(provider.id()).toBe('llama3.1-8b');
            expect(provider.toString()).toContain('OpenAI');
            expect(provider.config).toMatchObject({
                apiKeyEnvar: 'CEREBRAS_API_KEY',
                apiBaseUrl: 'https://api.cerebras.ai/v1',
                passthrough: {},
            });
        });
    });
});
//# sourceMappingURL=cerebras.test.js.map