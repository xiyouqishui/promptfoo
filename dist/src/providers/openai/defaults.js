"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultModerationProvider = exports.DefaultSuggestionsProvider = exports.DefaultGradingJsonProvider = exports.DefaultGradingProvider = exports.DefaultEmbeddingProvider = void 0;
const chat_1 = require("./chat");
const embedding_1 = require("./embedding");
const moderation_1 = require("./moderation");
exports.DefaultEmbeddingProvider = new embedding_1.OpenAiEmbeddingProvider('text-embedding-3-large');
exports.DefaultGradingProvider = new chat_1.OpenAiChatCompletionProvider('gpt-4.1-2025-04-14');
exports.DefaultGradingJsonProvider = new chat_1.OpenAiChatCompletionProvider('gpt-4.1-2025-04-14', {
    config: {
        response_format: { type: 'json_object' },
    },
});
exports.DefaultSuggestionsProvider = new chat_1.OpenAiChatCompletionProvider('gpt-4.1-2025-04-14');
exports.DefaultModerationProvider = new moderation_1.OpenAiModerationProvider('omni-moderation-latest');
//# sourceMappingURL=defaults.js.map