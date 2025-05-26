"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClouderaAiChatCompletionProvider = void 0;
const envars_1 = require("../envars");
const chat_1 = require("./openai/chat");
class ClouderaAiChatCompletionProvider extends chat_1.OpenAiChatCompletionProvider {
    constructor(modelName, providerOptions) {
        // https://docs.cloudera.com/machine-learning/cloud/ai-inference/topics/ml-caii-openai-inference-protocol-using-curl.html
        const domain = providerOptions.config?.domain || (0, envars_1.getEnvString)('CDP_DOMAIN');
        const namespace = providerOptions.config?.namespace || 'serving-default';
        const endpoint = providerOptions.config?.endpoint || modelName;
        super(modelName, {
            ...providerOptions,
            config: {
                ...providerOptions.config,
                apiKeyEnvar: 'CDP_TOKEN',
                apiBaseUrl: `https://${domain}/namespaces/${namespace}/endpoints/${endpoint}/v1`,
            },
        });
    }
}
exports.ClouderaAiChatCompletionProvider = ClouderaAiChatCompletionProvider;
//# sourceMappingURL=cloudera.js.map