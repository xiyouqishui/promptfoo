"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const defaults_1 = require("../../../src/providers/openai/defaults");
(0, globals_1.describe)('OpenAI default providers', () => {
    (0, globals_1.describe)('DefaultEmbeddingProvider', () => {
        (0, globals_1.it)('should use correct model version', () => {
            (0, globals_1.expect)(defaults_1.DefaultEmbeddingProvider.modelName).toBe('text-embedding-3-large');
            (0, globals_1.expect)(defaults_1.DefaultEmbeddingProvider.id()).toBe('openai:text-embedding-3-large');
        });
    });
    (0, globals_1.describe)('DefaultGradingProvider', () => {
        (0, globals_1.it)('should use correct model version and configuration', () => {
            (0, globals_1.expect)(defaults_1.DefaultGradingProvider.modelName).toBe('gpt-4.1-2025-04-14');
            (0, globals_1.expect)(defaults_1.DefaultGradingProvider.id()).toBe('openai:gpt-4.1-2025-04-14');
            (0, globals_1.expect)(defaults_1.DefaultGradingProvider.config).toEqual({});
        });
    });
    (0, globals_1.describe)('DefaultGradingJsonProvider', () => {
        (0, globals_1.it)('should use correct model version and JSON configuration', () => {
            (0, globals_1.expect)(defaults_1.DefaultGradingJsonProvider.modelName).toBe('gpt-4.1-2025-04-14');
            (0, globals_1.expect)(defaults_1.DefaultGradingJsonProvider.id()).toBe('openai:gpt-4.1-2025-04-14');
            (0, globals_1.expect)(defaults_1.DefaultGradingJsonProvider.config).toEqual({
                response_format: { type: 'json_object' },
            });
        });
    });
    (0, globals_1.describe)('DefaultSuggestionsProvider', () => {
        (0, globals_1.it)('should use correct model version', () => {
            (0, globals_1.expect)(defaults_1.DefaultSuggestionsProvider.modelName).toBe('gpt-4.1-2025-04-14');
            (0, globals_1.expect)(defaults_1.DefaultSuggestionsProvider.id()).toBe('openai:gpt-4.1-2025-04-14');
            (0, globals_1.expect)(defaults_1.DefaultSuggestionsProvider.config).toEqual({});
        });
    });
    (0, globals_1.describe)('DefaultModerationProvider', () => {
        (0, globals_1.it)('should use correct model version', () => {
            (0, globals_1.expect)(defaults_1.DefaultModerationProvider.modelName).toBe('omni-moderation-latest');
            (0, globals_1.expect)(defaults_1.DefaultModerationProvider.id()).toBe('openai:omni-moderation-latest');
        });
    });
});
//# sourceMappingURL=defaults.test.js.map