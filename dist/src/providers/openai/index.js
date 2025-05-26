"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiGenericProvider = void 0;
const envars_1 = require("../../envars");
class OpenAiGenericProvider {
    constructor(modelName, options = {}) {
        const { config, id, env } = options;
        this.env = env;
        this.modelName = modelName;
        this.config = config || {};
        this.id = id ? () => id : this.id;
    }
    id() {
        return this.config.apiHost || this.config.apiBaseUrl
            ? this.modelName
            : `openai:${this.modelName}`;
    }
    toString() {
        return `[OpenAI Provider ${this.modelName}]`;
    }
    getOrganization() {
        return (this.config.organization ||
            this.env?.OPENAI_ORGANIZATION ||
            (0, envars_1.getEnvString)('OPENAI_ORGANIZATION'));
    }
    getApiUrlDefault() {
        return 'https://api.openai.com/v1';
    }
    getApiUrl() {
        const apiHost = this.config.apiHost || this.env?.OPENAI_API_HOST || (0, envars_1.getEnvString)('OPENAI_API_HOST');
        if (apiHost) {
            return `https://${apiHost}/v1`;
        }
        return (this.config.apiBaseUrl ||
            this.env?.OPENAI_API_BASE_URL ||
            this.env?.OPENAI_BASE_URL ||
            (0, envars_1.getEnvString)('OPENAI_API_BASE_URL') ||
            (0, envars_1.getEnvString)('OPENAI_BASE_URL') ||
            this.getApiUrlDefault());
    }
    getApiKey() {
        return (this.config.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.OPENAI_API_KEY ||
            (0, envars_1.getEnvString)('OPENAI_API_KEY'));
    }
    requiresApiKey() {
        return this.config.apiKeyRequired ?? true;
    }
    // @ts-ignore: Params are not used in this implementation
    async callApi(prompt, context, callApiOptions) {
        throw new Error('Not implemented');
    }
}
exports.OpenAiGenericProvider = OpenAiGenericProvider;
//# sourceMappingURL=index.js.map