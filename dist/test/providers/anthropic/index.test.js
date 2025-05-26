"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const completion_1 = require("../../../src/providers/anthropic/completion");
const defaults_1 = require("../../../src/providers/anthropic/defaults");
const generic_1 = require("../../../src/providers/anthropic/generic");
const messages_1 = require("../../../src/providers/anthropic/messages");
const util_1 = require("../../../src/providers/anthropic/util");
describe('Anthropic modules', () => {
    it('should export core values', () => {
        expect(defaults_1.DEFAULT_ANTHROPIC_MODEL).toBeDefined();
        // Types are exported but we don't need to check them as values
        // AnthropicMessageOptions and AnthropicCompletionOptions are types, not values
    });
    it('should export utility functions', () => {
        expect(util_1.ANTHROPIC_MODELS).toBeDefined();
        expect(util_1.outputFromMessage).toBeDefined();
        expect(util_1.parseMessages).toBeDefined();
        expect(util_1.calculateAnthropicCost).toBeDefined();
        expect(util_1.getTokenUsage).toBeDefined();
    });
    it('should export provider classes', () => {
        expect(generic_1.AnthropicGenericProvider).toBeDefined();
        expect(messages_1.AnthropicMessagesProvider).toBeDefined();
        expect(completion_1.AnthropicCompletionProvider).toBeDefined();
        expect(defaults_1.AnthropicLlmRubricProvider).toBeDefined();
    });
    it('should export getAnthropicProviders function', () => {
        expect(defaults_1.getAnthropicProviders).toBeDefined();
        const providers = (0, defaults_1.getAnthropicProviders)();
        expect(providers.gradingProvider).toBeDefined();
        expect(providers.gradingJsonProvider).toBeDefined();
        expect(providers.llmRubricProvider).toBeDefined();
        expect(providers.suggestionsProvider).toBeDefined();
        expect(providers.synthesizeProvider).toBeDefined();
    });
});
//# sourceMappingURL=index.test.js.map