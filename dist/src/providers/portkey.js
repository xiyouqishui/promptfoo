"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortkeyChatCompletionProvider = void 0;
exports.toKebabCase = toKebabCase;
exports.getPortkeyHeaders = getPortkeyHeaders;
const envars_1 = require("../envars");
const chat_1 = require("./openai/chat");
function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
function getPortkeyHeaders(config = {}) {
    return Object.entries(config).reduce((acc, [key, value]) => {
        if (value != null) {
            const headerKey = key.startsWith('portkey')
                ? `x-portkey-${toKebabCase(key.substring(7))}`
                : key;
            acc[headerKey] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
        return acc;
    }, {});
}
class PortkeyChatCompletionProvider extends chat_1.OpenAiChatCompletionProvider {
    constructor(modelName, providerOptions) {
        super(modelName, {
            ...providerOptions,
            config: {
                ...providerOptions.config,
                apiKeyEnvar: 'PORTKEY_API_KEY',
                apiBaseUrl: (0, envars_1.getEnvString)('PORTKEY_API_BASE_URL') ||
                    providerOptions.config?.portkeyApiBaseUrl ||
                    'https://api.portkey.ai/v1',
                headers: getPortkeyHeaders(providerOptions.config),
            },
        });
    }
}
exports.PortkeyChatCompletionProvider = PortkeyChatCompletionProvider;
//# sourceMappingURL=portkey.js.map