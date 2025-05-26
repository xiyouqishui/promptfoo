"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultCompletionProviders = setDefaultCompletionProviders;
exports.setDefaultEmbeddingProviders = setDefaultEmbeddingProviders;
exports.getDefaultProviders = getDefaultProviders;
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const defaults_1 = require("./anthropic/defaults");
const chat_1 = require("./azure/chat");
const embedding_1 = require("./azure/embedding");
const moderation_1 = require("./azure/moderation");
const util_1 = require("./google/util");
const vertex_1 = require("./google/vertex");
const defaults_2 = require("./openai/defaults");
const COMPLETION_PROVIDERS = [
    'gradingJsonProvider',
    'gradingProvider',
    'llmRubricProvider',
    'suggestionsProvider',
    'synthesizeProvider',
];
const EMBEDDING_PROVIDERS = ['embeddingProvider'];
let defaultCompletionProvider;
let defaultEmbeddingProvider;
/**
 * This will override all of the completion type providers defined in the constant COMPLETION_PROVIDERS
 * @param provider - The provider to set as the default completion provider.
 */
async function setDefaultCompletionProviders(provider) {
    defaultCompletionProvider = provider;
}
async function setDefaultEmbeddingProviders(provider) {
    defaultEmbeddingProvider = provider;
}
async function getDefaultProviders(env) {
    // Check for provider credentials
    const hasAnthropicCredentials = Boolean((0, envars_1.getEnvString)('ANTHROPIC_API_KEY') || env?.ANTHROPIC_API_KEY);
    const hasOpenAiCredentials = Boolean((0, envars_1.getEnvString)('OPENAI_API_KEY') || env?.OPENAI_API_KEY);
    const preferAnthropic = !hasOpenAiCredentials && hasAnthropicCredentials;
    const hasAzureApiKey = (0, envars_1.getEnvString)('AZURE_OPENAI_API_KEY') ||
        env?.AZURE_OPENAI_API_KEY ||
        (0, envars_1.getEnvString)('AZURE_API_KEY') ||
        env?.AZURE_API_KEY;
    const hasAzureClientCreds = ((0, envars_1.getEnvString)('AZURE_CLIENT_ID') || env?.AZURE_CLIENT_ID) &&
        ((0, envars_1.getEnvString)('AZURE_CLIENT_SECRET') || env?.AZURE_CLIENT_SECRET) &&
        ((0, envars_1.getEnvString)('AZURE_TENANT_ID') || env?.AZURE_TENANT_ID);
    const preferAzure = !(0, envars_1.getEnvString)('OPENAI_API_KEY') &&
        !env?.OPENAI_API_KEY &&
        (hasAzureApiKey || hasAzureClientCreds) &&
        ((0, envars_1.getEnvString)('AZURE_DEPLOYMENT_NAME') || env?.AZURE_DEPLOYMENT_NAME) &&
        ((0, envars_1.getEnvString)('AZURE_OPENAI_DEPLOYMENT_NAME') || env?.AZURE_OPENAI_DEPLOYMENT_NAME);
    let providers;
    if (preferAzure) {
        logger_1.default.debug('Using Azure OpenAI default providers');
        const deploymentName = (0, envars_1.getEnvString)('AZURE_OPENAI_DEPLOYMENT_NAME') || env?.AZURE_OPENAI_DEPLOYMENT_NAME;
        if (!deploymentName) {
            throw new Error('AZURE_OPENAI_DEPLOYMENT_NAME must be set when using Azure OpenAI');
        }
        const embeddingDeploymentName = (0, envars_1.getEnvString)('AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME') ||
            env?.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME ||
            deploymentName;
        const azureProvider = new chat_1.AzureChatCompletionProvider(deploymentName, { env });
        const azureEmbeddingProvider = new embedding_1.AzureEmbeddingProvider(embeddingDeploymentName, {
            env,
        });
        providers = {
            embeddingProvider: azureEmbeddingProvider,
            gradingJsonProvider: azureProvider,
            gradingProvider: azureProvider,
            moderationProvider: defaults_2.DefaultModerationProvider,
            suggestionsProvider: azureProvider,
            synthesizeProvider: azureProvider,
        };
    }
    else if (preferAnthropic) {
        logger_1.default.debug('Using Anthropic default providers');
        const anthropicProviders = (0, defaults_1.getAnthropicProviders)(env);
        providers = {
            embeddingProvider: defaults_2.DefaultEmbeddingProvider, // TODO(ian): Voyager instead?
            gradingJsonProvider: anthropicProviders.gradingJsonProvider,
            gradingProvider: anthropicProviders.gradingProvider,
            llmRubricProvider: anthropicProviders.llmRubricProvider,
            moderationProvider: defaults_2.DefaultModerationProvider,
            suggestionsProvider: anthropicProviders.suggestionsProvider,
            synthesizeProvider: anthropicProviders.synthesizeProvider,
        };
    }
    else if (!(0, envars_1.getEnvString)('OPENAI_API_KEY') &&
        !env?.OPENAI_API_KEY &&
        (await (0, util_1.hasGoogleDefaultCredentials)())) {
        logger_1.default.debug('Using Google default providers');
        providers = {
            embeddingProvider: vertex_1.DefaultEmbeddingProvider,
            gradingJsonProvider: vertex_1.DefaultGradingProvider,
            gradingProvider: vertex_1.DefaultGradingProvider,
            moderationProvider: defaults_2.DefaultModerationProvider,
            suggestionsProvider: vertex_1.DefaultGradingProvider,
            synthesizeProvider: vertex_1.DefaultGradingProvider,
        };
    }
    else {
        logger_1.default.debug('Using OpenAI default providers');
        providers = {
            embeddingProvider: defaults_2.DefaultEmbeddingProvider,
            gradingJsonProvider: defaults_2.DefaultGradingJsonProvider,
            gradingProvider: defaults_2.DefaultGradingProvider,
            moderationProvider: defaults_2.DefaultModerationProvider,
            suggestionsProvider: defaults_2.DefaultSuggestionsProvider,
            synthesizeProvider: defaults_2.DefaultGradingJsonProvider,
        };
    }
    // If Azure Content Safety endpoint is available, use it for moderation
    if ((0, envars_1.getEnvString)('AZURE_CONTENT_SAFETY_ENDPOINT') || env?.AZURE_CONTENT_SAFETY_ENDPOINT) {
        providers.moderationProvider = new moderation_1.AzureModerationProvider('text-content-safety', { env });
    }
    if (defaultCompletionProvider) {
        logger_1.default.debug(`Overriding default completion provider: ${defaultCompletionProvider.id()}`);
        COMPLETION_PROVIDERS.forEach((provider) => {
            providers[provider] = defaultCompletionProvider;
        });
    }
    if (defaultEmbeddingProvider) {
        EMBEDDING_PROVIDERS.forEach((provider) => {
            providers[provider] = defaultEmbeddingProvider;
        });
    }
    return providers;
}
//# sourceMappingURL=defaults.js.map