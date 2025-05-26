"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const moderation_1 = require("../../src/providers/azure/moderation");
const defaults_1 = require("../../src/providers/defaults");
const defaults_2 = require("../../src/providers/openai/defaults");
class MockProvider {
    constructor(id) {
        this.providerId = id;
    }
    id() {
        return this.providerId;
    }
    async callApi() {
        return {};
    }
}
(0, globals_1.describe)('Provider override tests', () => {
    const originalEnv = process.env;
    (0, globals_1.beforeEach)(() => {
        process.env = { ...originalEnv };
        (0, defaults_1.setDefaultCompletionProviders)(undefined);
        (0, defaults_1.setDefaultEmbeddingProviders)(undefined);
    });
    (0, globals_1.afterEach)(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });
    (0, globals_1.it)('should override all completion providers when setDefaultCompletionProviders is called', async () => {
        const mockProvider = new MockProvider('test-completion-provider');
        await (0, defaults_1.setDefaultCompletionProviders)(mockProvider);
        const providers = await (0, defaults_1.getDefaultProviders)();
        (0, globals_1.expect)(providers.gradingJsonProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.gradingProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.suggestionsProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.synthesizeProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.embeddingProvider.id()).not.toBe('test-completion-provider');
    });
    (0, globals_1.it)('should override embedding provider when setDefaultEmbeddingProviders is called', async () => {
        const mockProvider = new MockProvider('test-embedding-provider');
        await (0, defaults_1.setDefaultEmbeddingProviders)(mockProvider);
        const providers = await (0, defaults_1.getDefaultProviders)();
        (0, globals_1.expect)(providers.embeddingProvider.id()).toBe('test-embedding-provider');
        (0, globals_1.expect)(providers.gradingJsonProvider.id()).not.toBe('test-embedding-provider');
        (0, globals_1.expect)(providers.gradingProvider.id()).not.toBe('test-embedding-provider');
        (0, globals_1.expect)(providers.suggestionsProvider.id()).not.toBe('test-embedding-provider');
        (0, globals_1.expect)(providers.synthesizeProvider.id()).not.toBe('test-embedding-provider');
    });
    (0, globals_1.it)('should allow both completion and embedding provider overrides simultaneously', async () => {
        const mockCompletionProvider = new MockProvider('test-completion-provider');
        const mockEmbeddingProvider = new MockProvider('test-embedding-provider');
        await (0, defaults_1.setDefaultCompletionProviders)(mockCompletionProvider);
        await (0, defaults_1.setDefaultEmbeddingProviders)(mockEmbeddingProvider);
        const providers = await (0, defaults_1.getDefaultProviders)();
        (0, globals_1.expect)(providers.gradingJsonProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.gradingProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.suggestionsProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.synthesizeProvider.id()).toBe('test-completion-provider');
        (0, globals_1.expect)(providers.embeddingProvider.id()).toBe('test-embedding-provider');
    });
    (0, globals_1.it)('should use AzureModerationProvider when AZURE_CONTENT_SAFETY_ENDPOINT is set', async () => {
        process.env.AZURE_CONTENT_SAFETY_ENDPOINT = 'https://test-endpoint.com';
        const providers = await (0, defaults_1.getDefaultProviders)();
        (0, globals_1.expect)(providers.moderationProvider).toBeInstanceOf(moderation_1.AzureModerationProvider);
        (0, globals_1.expect)(providers.moderationProvider.modelName).toBe('text-content-safety');
    });
    (0, globals_1.it)('should use DefaultModerationProvider when AZURE_CONTENT_SAFETY_ENDPOINT is not set', async () => {
        delete process.env.AZURE_CONTENT_SAFETY_ENDPOINT;
        const providers = await (0, defaults_1.getDefaultProviders)();
        (0, globals_1.expect)(providers.moderationProvider).toBe(defaults_2.DefaultModerationProvider);
    });
    (0, globals_1.it)('should use AzureModerationProvider when AZURE_CONTENT_SAFETY_ENDPOINT is provided via env overrides', async () => {
        const envOverrides = {
            AZURE_CONTENT_SAFETY_ENDPOINT: 'https://test-endpoint.com',
        };
        const providers = await (0, defaults_1.getDefaultProviders)(envOverrides);
        (0, globals_1.expect)(providers.moderationProvider).toBeInstanceOf(moderation_1.AzureModerationProvider);
        (0, globals_1.expect)(providers.moderationProvider.modelName).toBe('text-content-safety');
    });
    (0, globals_1.it)('should use Azure moderation provider with custom configuration', async () => {
        const envOverrides = {
            AZURE_CONTENT_SAFETY_ENDPOINT: 'https://test-endpoint.com',
            AZURE_CONTENT_SAFETY_API_KEY: 'test-api-key',
            AZURE_CONTENT_SAFETY_API_VERSION: '2024-01-01',
        };
        const providers = await (0, defaults_1.getDefaultProviders)(envOverrides);
        (0, globals_1.expect)(providers.moderationProvider).toBeInstanceOf(moderation_1.AzureModerationProvider);
        const moderationProvider = providers.moderationProvider;
        (0, globals_1.expect)(moderationProvider.modelName).toBe('text-content-safety');
        (0, globals_1.expect)(moderationProvider.endpoint).toBe('https://test-endpoint.com');
        (0, globals_1.expect)(moderationProvider.apiVersion).toBe('2024-01-01');
    });
});
//# sourceMappingURL=defaults.test.js.map