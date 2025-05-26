"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerMap = void 0;
const dedent_1 = __importDefault(require("dedent"));
const path_1 = __importDefault(require("path"));
const esm_1 = require("../esm");
const logger_1 = __importDefault(require("../logger"));
const constants_1 = require("../redteam/plugins/agentic/constants");
const memoryPoisoning_1 = require("../redteam/providers/agentic/memoryPoisoning");
const bestOfN_1 = __importDefault(require("../redteam/providers/bestOfN"));
const crescendo_1 = __importDefault(require("../redteam/providers/crescendo"));
const goat_1 = __importDefault(require("../redteam/providers/goat"));
const iterative_1 = __importDefault(require("../redteam/providers/iterative"));
const iterativeImage_1 = __importDefault(require("../redteam/providers/iterativeImage"));
const iterativeTree_1 = __importDefault(require("../redteam/providers/iterativeTree"));
const pandamonium_1 = __importDefault(require("../redteam/providers/pandamonium"));
const toolDiscoveryMulti_1 = require("../redteam/providers/toolDiscoveryMulti");
const fileExtensions_1 = require("../util/fileExtensions");
const ai21_1 = require("./ai21");
const alibaba_1 = require("./alibaba");
const completion_1 = require("./anthropic/completion");
const messages_1 = require("./anthropic/messages");
const util_1 = require("./anthropic/util");
const assistant_1 = require("./azure/assistant");
const chat_1 = require("./azure/chat");
const completion_2 = require("./azure/completion");
const embedding_1 = require("./azure/embedding");
const moderation_1 = require("./azure/moderation");
const bam_1 = require("./bam");
const bedrock_1 = require("./bedrock");
const browser_1 = require("./browser");
const cerebras_1 = require("./cerebras");
const cloudera_1 = require("./cloudera");
const CloudflareAiProviders = __importStar(require("./cloudflare-ai"));
const cohere_1 = require("./cohere");
const databricks_1 = require("./databricks");
const echo_1 = require("./echo");
const fal_1 = require("./fal");
const golangCompletion_1 = require("./golangCompletion");
const ai_studio_1 = require("./google/ai.studio");
const live_1 = require("./google/live");
const vertex_1 = require("./google/vertex");
const groq_1 = require("./groq");
const http_1 = require("./http");
const huggingface_1 = require("./huggingface");
const jfrog_1 = require("./jfrog");
const lambdalabs_1 = require("./lambdalabs");
const litellm_1 = require("./litellm");
const llama_1 = require("./llama");
const localai_1 = require("./localai");
const manualInput_1 = require("./manualInput");
const mistral_1 = require("./mistral");
const ollama_1 = require("./ollama");
const assistant_2 = require("./openai/assistant");
const chat_2 = require("./openai/chat");
const completion_3 = require("./openai/completion");
const embedding_2 = require("./openai/embedding");
const image_1 = require("./openai/image");
const moderation_2 = require("./openai/moderation");
const realtime_1 = require("./openai/realtime");
const responses_1 = require("./openai/responses");
const packageParser_1 = require("./packageParser");
const perplexity_1 = require("./perplexity");
const portkey_1 = require("./portkey");
const promptfooModel_1 = require("./promptfooModel");
const pythonCompletion_1 = require("./pythonCompletion");
const replicate_1 = require("./replicate");
const scriptBasedProvider_1 = require("./scriptBasedProvider");
const scriptCompletion_1 = require("./scriptCompletion");
const sequence_1 = require("./sequence");
const simulatedUser_1 = require("./simulatedUser");
const togetherai_1 = require("./togetherai");
const voyage_1 = require("./voyage");
const watsonx_1 = require("./watsonx");
const webhook_1 = require("./webhook");
const websocket_1 = require("./websocket");
const xai_1 = require("./xai");
exports.providerMap = [
    (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('exec', null, scriptCompletion_1.ScriptCompletionProvider),
    (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('golang', 'go', golangCompletion_1.GolangProvider),
    (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('python', 'py', pythonCompletion_1.PythonProvider),
    {
        test: (providerPath) => providerPath === constants_1.MEMORY_POISONING_PLUGIN_ID,
        create: async (providerPath, providerOptions, context) => {
            return new memoryPoisoning_1.MemoryPoisoningProvider(providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('adaline:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            if (splits.length < 4) {
                throw new Error(`Invalid adaline provider path: ${providerPath}. path format should be 'adaline:<provider_name>:<model_type>:<model_name>' eg. 'adaline:openai:chat:gpt-4o'`);
            }
            const providerName = splits[1];
            const modelType = splits[2];
            const modelName = splits[3];
            const { AdalineGatewayChatProvider, AdalineGatewayEmbeddingProvider } = await Promise.resolve().then(() => __importStar(require('./adaline.gateway')));
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new AdalineGatewayEmbeddingProvider(providerName, modelName, providerOptions);
            }
            return new AdalineGatewayChatProvider(providerName, modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('ai21:'),
        create: async (providerPath, providerOptions, context) => {
            const modelName = providerPath.split(':')[1];
            return new ai21_1.AI21ChatCompletionProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('alibaba:') ||
            providerPath.startsWith('alicloud:') ||
            providerPath.startsWith('aliyun:') ||
            providerPath.startsWith('dashscope:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits.slice(2).join(':');
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new alibaba_1.AlibabaEmbeddingProvider(modelName || modelType, providerOptions);
            }
            return new alibaba_1.AlibabaChatCompletionProvider(modelName || modelType, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('anthropic:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits[2];
            if (modelType === 'messages') {
                return new messages_1.AnthropicMessagesProvider(modelName, providerOptions);
            }
            if (modelType === 'completion') {
                return new completion_1.AnthropicCompletionProvider(modelName, providerOptions);
            }
            if (completion_1.AnthropicCompletionProvider.ANTHROPIC_COMPLETION_MODELS.includes(modelType)) {
                return new completion_1.AnthropicCompletionProvider(modelType, providerOptions);
            }
            // Check if the second part is a valid Anthropic model name
            // If it is, assume it's a messages model
            const modelIds = util_1.ANTHROPIC_MODELS.map((model) => model.id);
            if (modelIds.includes(modelType)) {
                return new messages_1.AnthropicMessagesProvider(modelType, providerOptions);
            }
            throw new Error((0, dedent_1.default) `Unknown Anthropic model type or model name: ${modelType}. Use one of the following formats: 
        - anthropic:messages:<model name> - For Messages API
        - anthropic:completion:<model name> - For Completion API
        - anthropic:<model name> - Shorthand for Messages API with a known model name`);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('azure:') ||
            providerPath.startsWith('azureopenai:') ||
            providerPath === 'azure:moderation',
        create: async (providerPath, providerOptions, context) => {
            // Handle azure:moderation directly
            if (providerPath === 'azure:moderation') {
                const { deploymentName, modelName } = providerOptions.config || {};
                return new moderation_1.AzureModerationProvider(deploymentName || modelName || 'text-content-safety', providerOptions);
            }
            // Handle other Azure providers
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const deploymentName = splits[2];
            if (modelType === 'chat') {
                return new chat_1.AzureChatCompletionProvider(deploymentName, providerOptions);
            }
            if (modelType === 'assistant') {
                return new assistant_1.AzureAssistantProvider(deploymentName, providerOptions);
            }
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new embedding_1.AzureEmbeddingProvider(deploymentName || 'text-embedding-ada-002', providerOptions);
            }
            if (modelType === 'completion') {
                return new completion_2.AzureCompletionProvider(deploymentName, providerOptions);
            }
            throw new Error(`Unknown Azure model type: ${modelType}. Use one of the following providers: azure:chat:<model name>, azure:assistant:<assistant id>, azure:completion:<model name>, azure:moderation:<model name>`);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('bam:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits.slice(2).join(':');
            if (modelType === 'chat') {
                return new bam_1.BAMProvider(modelName || 'ibm/granite-13b-chat-v2', providerOptions);
            }
            throw new Error(`Invalid BAM provider: ${providerPath}. Use one of the following providers: bam:chat:<model name>`);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('bedrock:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits.slice(2).join(':');
            // Handle nova-sonic model
            if (modelType === 'nova-sonic' || modelType.includes('amazon.nova-sonic')) {
                const { NovaSonicProvider } = await Promise.resolve().then(() => __importStar(require('./bedrock/nova-sonic')));
                return new NovaSonicProvider('amazon.nova-sonic-v1:0', providerOptions);
            }
            if (modelType === 'completion') {
                // Backwards compatibility: `completion` used to be required
                return new bedrock_1.AwsBedrockCompletionProvider(modelName, providerOptions);
            }
            if (modelType === 'embeddings' || modelType === 'embedding') {
                return new bedrock_1.AwsBedrockEmbeddingProvider(modelName, providerOptions);
            }
            if (modelType === 'kb' || modelType === 'knowledge-base') {
                const { AwsBedrockKnowledgeBaseProvider } = await Promise.resolve().then(() => __importStar(require('./bedrockKnowledgeBase')));
                return new AwsBedrockKnowledgeBaseProvider(modelName, providerOptions);
            }
            return new bedrock_1.AwsBedrockCompletionProvider(`${modelType}${modelName ? `:${modelName}` : ''}`, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('sagemaker:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const endpointName = splits.slice(2).join(':');
            // Dynamically import SageMaker provider
            const { SageMakerCompletionProvider, SageMakerEmbeddingProvider } = await Promise.resolve().then(() => __importStar(require('./sagemaker')));
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new SageMakerEmbeddingProvider(endpointName || modelType, providerOptions);
            }
            // Handle the 'sagemaker:<endpoint>' format (no model type specified)
            if (splits.length === 2) {
                return new SageMakerCompletionProvider(modelType, providerOptions);
            }
            // Handle special case for JumpStart models
            if (endpointName.includes('jumpstart') || modelType === 'jumpstart') {
                return new SageMakerCompletionProvider(endpointName, {
                    ...providerOptions,
                    config: {
                        ...providerOptions.config,
                        modelType: 'jumpstart',
                    },
                });
            }
            // Handle 'sagemaker:<model-type>:<endpoint>' format for other model types
            return new SageMakerCompletionProvider(endpointName, {
                ...providerOptions,
                config: {
                    ...providerOptions.config,
                    modelType,
                },
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('cerebras:'),
        create: async (providerPath, providerOptions, context) => {
            return (0, cerebras_1.createCerebrasProvider)(providerPath, {
                config: providerOptions,
                env: context.env,
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('cloudera:'),
        create: async (providerPath, providerOptions, context) => {
            const modelName = providerPath.split(':')[1];
            return new cloudera_1.ClouderaAiChatCompletionProvider(modelName, {
                ...providerOptions,
                config: providerOptions.config || {},
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('cloudflare-ai:'),
        create: async (providerPath, providerOptions, context) => {
            // Load Cloudflare AI
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const deploymentName = splits[2];
            if (modelType === 'chat') {
                return new CloudflareAiProviders.CloudflareAiChatCompletionProvider(deploymentName, providerOptions);
            }
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new CloudflareAiProviders.CloudflareAiEmbeddingProvider(deploymentName, providerOptions);
            }
            if (modelType === 'completion') {
                return new CloudflareAiProviders.CloudflareAiCompletionProvider(deploymentName, providerOptions);
            }
            throw new Error(`Unknown Cloudflare AI model type: ${modelType}. Use one of the following providers: cloudflare-ai:chat:<model name>, cloudflare-ai:completion:<model name>, cloudflare-ai:embedding:`);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('cohere:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits.slice(2).join(':');
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new cohere_1.CohereEmbeddingProvider(modelName, providerOptions);
            }
            if (modelType === 'chat' || modelType === undefined) {
                return new cohere_1.CohereChatCompletionProvider(modelName || modelType, providerOptions);
            }
            // Default to chat provider for any other model type
            return new cohere_1.CohereChatCompletionProvider(providerPath.substring('cohere:'.length), providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('databricks:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new databricks_1.DatabricksMosaicAiChatCompletionProvider(modelName, {
                ...providerOptions,
                config: providerOptions.config || {},
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('deepseek:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':') || 'deepseek-chat';
            return new chat_2.OpenAiChatCompletionProvider(modelName, {
                ...providerOptions,
                config: {
                    ...providerOptions.config,
                    apiBaseUrl: 'https://api.deepseek.com/v1',
                    apiKeyEnvar: 'DEEPSEEK_API_KEY',
                },
            });
        },
    },
    {
        test: (providerPath) => providerPath === 'echo',
        create: async (providerPath, providerOptions, context) => {
            return new echo_1.EchoProvider(providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('f5:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            let endpoint = splits.slice(1).join(':');
            if (endpoint.startsWith('/')) {
                endpoint = endpoint.slice(1);
            }
            return new chat_2.OpenAiChatCompletionProvider(endpoint, {
                ...providerOptions,
                config: {
                    ...providerOptions.config,
                    apiBaseUrl: providerOptions.config?.apiBaseUrl + '/' + endpoint,
                    apiKeyEnvar: 'F5_API_KEY',
                },
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('fal:'),
        create: async (providerPath, providerOptions, context) => {
            const [_, modelType, modelName] = providerPath.split(':');
            if (modelType === 'image') {
                return new fal_1.FalImageGenerationProvider(modelName, providerOptions);
            }
            throw new Error(`Invalid fal provider path: ${providerPath}. Use one of the following providers: fal:image:<model name>`);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('fireworks:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new chat_2.OpenAiChatCompletionProvider(modelName, {
                ...providerOptions,
                config: {
                    ...providerOptions.config,
                    apiBaseUrl: 'https://api.fireworks.ai/inference/v1',
                    apiKeyEnvar: 'FIREWORKS_API_KEY',
                },
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('github:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new chat_2.OpenAiChatCompletionProvider(modelName, {
                ...providerOptions,
                config: {
                    ...providerOptions.config,
                    apiBaseUrl: 'https://models.inference.ai.azure.com',
                    apiKeyEnvar: 'GITHUB_TOKEN',
                },
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('groq:'),
        create: async (providerPath, providerOptions, context) => {
            const modelName = providerPath.split(':')[1];
            return new groq_1.GroqProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('hyperbolic:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new chat_2.OpenAiChatCompletionProvider(modelName, {
                ...providerOptions,
                config: {
                    ...providerOptions.config,
                    apiBaseUrl: 'https://api.hyperbolic.xyz/v1',
                    apiKeyEnvar: 'HYPERBOLIC_API_KEY',
                },
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('litellm:'),
        create: async (providerPath, providerOptions, context) => {
            const modelName = providerPath.split(':')[1];
            return new litellm_1.LiteLLMProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('localai:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits[2];
            if (modelType === 'chat') {
                return new localai_1.LocalAiChatProvider(modelName, providerOptions);
            }
            if (modelType === 'completion') {
                return new localai_1.LocalAiCompletionProvider(modelName, providerOptions);
            }
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new localai_1.LocalAiEmbeddingProvider(modelName, providerOptions);
            }
            return new localai_1.LocalAiChatProvider(modelType, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('mistral:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits.slice(2).join(':');
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new mistral_1.MistralEmbeddingProvider(providerOptions);
            }
            return new mistral_1.MistralChatCompletionProvider(modelName || modelType, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('ollama:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const firstPart = splits[1];
            if (firstPart === 'chat') {
                const modelName = splits.slice(2).join(':');
                return new ollama_1.OllamaChatProvider(modelName, providerOptions);
            }
            if (firstPart === 'completion') {
                const modelName = splits.slice(2).join(':');
                return new ollama_1.OllamaCompletionProvider(modelName, providerOptions);
            }
            if (firstPart === 'embedding' || firstPart === 'embeddings') {
                const modelName = splits.slice(2).join(':');
                return new ollama_1.OllamaEmbeddingProvider(modelName, providerOptions);
            }
            // Default to completion provider
            const modelName = splits.slice(1).join(':');
            return new ollama_1.OllamaCompletionProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('openai:'),
        create: async (providerPath, providerOptions, context) => {
            // Load OpenAI module
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits.slice(2).join(':');
            if (modelType === 'chat') {
                return new chat_2.OpenAiChatCompletionProvider(modelName || 'gpt-4.1-2025-04-14', providerOptions);
            }
            if (modelType === 'embedding' || modelType === 'embeddings') {
                return new embedding_2.OpenAiEmbeddingProvider(modelName || 'text-embedding-3-large', providerOptions);
            }
            if (modelType === 'completion') {
                return new completion_3.OpenAiCompletionProvider(modelName || 'gpt-3.5-turbo-instruct', providerOptions);
            }
            if (modelType === 'moderation') {
                return new moderation_2.OpenAiModerationProvider(modelName || 'omni-moderation-latest', providerOptions);
            }
            if (modelType === 'realtime') {
                return new realtime_1.OpenAiRealtimeProvider(modelName || 'gpt-4o-realtime-preview-2024-12-17', providerOptions);
            }
            if (modelType === 'responses') {
                return new responses_1.OpenAiResponsesProvider(modelName || 'gpt-4.1-2025-04-14', providerOptions);
            }
            if (chat_2.OpenAiChatCompletionProvider.OPENAI_CHAT_MODEL_NAMES.includes(modelType)) {
                return new chat_2.OpenAiChatCompletionProvider(modelType, providerOptions);
            }
            if (completion_3.OpenAiCompletionProvider.OPENAI_COMPLETION_MODEL_NAMES.includes(modelType)) {
                return new completion_3.OpenAiCompletionProvider(modelType, providerOptions);
            }
            if (realtime_1.OpenAiRealtimeProvider.OPENAI_REALTIME_MODEL_NAMES.includes(modelType)) {
                return new realtime_1.OpenAiRealtimeProvider(modelType, providerOptions);
            }
            if (responses_1.OpenAiResponsesProvider.OPENAI_RESPONSES_MODEL_NAMES.includes(modelType)) {
                return new responses_1.OpenAiResponsesProvider(modelType, providerOptions);
            }
            if (modelType === 'assistant') {
                return new assistant_2.OpenAiAssistantProvider(modelName, providerOptions);
            }
            if (modelType === 'image') {
                return new image_1.OpenAiImageProvider(modelName, providerOptions);
            }
            // Assume user did not provide model type, and it's a chat model
            logger_1.default.warn(`Unknown OpenAI model type: ${modelType}. Treating it as a chat model. Use one of the following providers: openai:chat:<model name>, openai:completion:<model name>, openai:embeddings:<model name>, openai:image:<model name>, openai:realtime:<model name>`);
            return new chat_2.OpenAiChatCompletionProvider(modelType, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('openrouter:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new chat_2.OpenAiChatCompletionProvider(modelName, {
                ...providerOptions,
                config: {
                    ...providerOptions.config,
                    apiBaseUrl: 'https://openrouter.ai/api/v1',
                    apiKeyEnvar: 'OPENROUTER_API_KEY',
                    passthrough: {
                        // Pass through OpenRouter-specific options
                        // https://openrouter.ai/docs/requests
                        ...(providerOptions.config.transforms && {
                            transforms: providerOptions.config.transforms,
                        }),
                        ...(providerOptions.config.models && { models: providerOptions.config.models }),
                        ...(providerOptions.config.route && { route: providerOptions.config.route }),
                        ...(providerOptions.config.provider && { provider: providerOptions.config.provider }),
                        ...(providerOptions.config.passthrough && {
                            passthrough: providerOptions.config.passthrough,
                        }),
                    },
                },
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('package:'),
        create: async (providerPath, providerOptions, context) => {
            return (0, packageParser_1.parsePackageProvider)(providerPath, context.basePath || process.cwd(), providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('perplexity:'),
        create: async (providerPath, providerOptions, context) => {
            return (0, perplexity_1.createPerplexityProvider)(providerPath, {
                config: providerOptions,
                env: context.env,
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('portkey:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new portkey_1.PortkeyChatCompletionProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('replicate:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelType = splits[1];
            const modelName = splits.slice(2).join(':');
            if (modelType === 'moderation') {
                return new replicate_1.ReplicateModerationProvider(modelName, providerOptions);
            }
            if (modelType === 'image') {
                return new replicate_1.ReplicateImageProvider(modelName, providerOptions);
            }
            // By default, there is no model type.
            return new replicate_1.ReplicateProvider(modelName ? modelType + ':' + modelName : modelType, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('togetherai:'),
        create: async (providerPath, providerOptions, context) => {
            return (0, togetherai_1.createTogetherAiProvider)(providerPath, {
                config: providerOptions,
                env: context.env,
            });
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('vertex:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const firstPart = splits[1];
            if (firstPart === 'chat') {
                return new vertex_1.VertexChatProvider(splits.slice(2).join(':'), providerOptions);
            }
            if (firstPart === 'embedding' || firstPart === 'embeddings') {
                return new vertex_1.VertexEmbeddingProvider(splits.slice(2).join(':'), providerOptions);
            }
            // Default to chat provider
            return new vertex_1.VertexChatProvider(splits.slice(1).join(':'), providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('voyage:'),
        create: async (providerPath, providerOptions, context) => {
            return new voyage_1.VoyageEmbeddingProvider(providerPath.split(':')[1], providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('watsonx:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new watsonx_1.WatsonXProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('webhook:'),
        create: async (providerPath, providerOptions, context) => {
            const webhookUrl = providerPath.substring('webhook:'.length);
            return new webhook_1.WebhookProvider(webhookUrl, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('xai:'),
        create: async (providerPath, providerOptions, context) => {
            return (0, xai_1.createXAIProvider)(providerPath, {
                config: providerOptions,
                env: context.env,
            });
        },
    },
    {
        test: (providerPath) => providerPath === 'browser',
        create: async (providerPath, providerOptions, context) => {
            return new browser_1.BrowserProvider(providerPath, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('google:') || providerPath.startsWith('palm:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            if (splits.length >= 3) {
                const serviceType = splits[1];
                const modelName = splits.slice(2).join(':');
                if (serviceType === 'live') {
                    // This is a Live API request
                    return new live_1.GoogleLiveProvider(modelName, providerOptions);
                }
            }
            // Default to regular Google API
            const modelName = splits[1];
            return new ai_studio_1.AIStudioChatProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('http:') ||
            providerPath.startsWith('https:') ||
            providerPath === 'http' ||
            providerPath === 'https',
        create: async (providerPath, providerOptions, context) => {
            return new http_1.HttpProvider(providerPath, providerOptions);
        },
    },
    {
        test: (providerPath) => (0, fileExtensions_1.isJavascriptFile)(providerPath),
        create: async (providerPath, providerOptions, context) => {
            if (providerPath.startsWith('file://')) {
                providerPath = providerPath.slice('file://'.length);
            }
            // Load custom module
            const modulePath = path_1.default.isAbsolute(providerPath)
                ? providerPath
                : path_1.default.join(context.basePath || process.cwd(), providerPath);
            const CustomApiProvider = await (0, esm_1.importModule)(modulePath);
            return new CustomApiProvider(providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('jfrog:') || providerPath.startsWith('qwak:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            const modelName = splits.slice(1).join(':');
            return new jfrog_1.JfrogMlChatCompletionProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath === 'llama' || providerPath.startsWith('llama:'),
        create: async (providerPath, providerOptions, context) => {
            const modelName = providerPath.split(':')[1];
            return new llama_1.LlamaProvider(modelName, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:manual-input',
        create: async (providerPath, providerOptions, context) => {
            return new manualInput_1.ManualInputProvider(providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:best-of-n',
        create: async (providerPath, providerOptions, context) => {
            return new bestOfN_1.default(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:crescendo',
        create: async (providerPath, providerOptions, context) => {
            return new crescendo_1.default(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:goat',
        create: async (providerPath, providerOptions, context) => {
            return new goat_1.default(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:iterative',
        create: async (providerPath, providerOptions, context) => {
            return new iterative_1.default(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:iterative:image',
        create: async (providerPath, providerOptions, context) => {
            return new iterativeImage_1.default(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:iterative:tree',
        create: async (providerPath, providerOptions, context) => {
            return new iterativeTree_1.default(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:pandamonium',
        create: async (providerPath, providerOptions, context) => {
            return new pandamonium_1.default(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:simulated-user',
        create: async (providerPath, providerOptions, context) => {
            return new simulatedUser_1.SimulatedUser(providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('promptfoo:model:'),
        create: async (providerPath, providerOptions, context) => {
            const modelName = providerPath.split(':')[2];
            return new promptfooModel_1.PromptfooModelProvider(modelName, {
                ...providerOptions,
                model: modelName,
            });
        },
    },
    {
        test: (providerPath) => providerPath === 'sequence',
        create: async (providerPath, providerOptions, context) => {
            return new sequence_1.SequenceProvider(providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('ws:') ||
            providerPath.startsWith('wss:') ||
            providerPath === 'websocket' ||
            providerPath === 'ws' ||
            providerPath === 'wss',
        create: async (providerPath, providerOptions, context) => {
            return new websocket_1.WebSocketProvider(providerPath, providerOptions);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('huggingface:') || providerPath.startsWith('hf:'),
        create: async (providerPath, providerOptions, context) => {
            const splits = providerPath.split(':');
            if (splits.length < 3) {
                throw new Error(`Invalid Huggingface provider path: ${providerPath}. Use one of the following providers: huggingface:feature-extraction:<model name>, huggingface:text-generation:<model name>, huggingface:text-classification:<model name>, huggingface:token-classification:<model name>`);
            }
            const modelName = splits.slice(2).join(':');
            if (splits[1] === 'feature-extraction') {
                return new huggingface_1.HuggingfaceFeatureExtractionProvider(modelName, providerOptions);
            }
            if (splits[1] === 'sentence-similarity') {
                return new huggingface_1.HuggingfaceSentenceSimilarityProvider(modelName, providerOptions);
            }
            if (splits[1] === 'text-generation') {
                return new huggingface_1.HuggingfaceTextGenerationProvider(modelName, providerOptions);
            }
            if (splits[1] === 'text-classification') {
                return new huggingface_1.HuggingfaceTextClassificationProvider(modelName, providerOptions);
            }
            if (splits[1] === 'token-classification') {
                return new huggingface_1.HuggingfaceTokenExtractionProvider(modelName, providerOptions);
            }
            throw new Error(`Invalid Huggingface provider path: ${providerPath}. Use one of the following providers: huggingface:feature-extraction:<model name>, huggingface:text-generation:<model name>, huggingface:text-classification:<model name>, huggingface:token-classification:<model name>`);
        },
    },
    {
        test: (providerPath) => providerPath === 'promptfoo:redteam:tool-discovery:multi-turn',
        create: async (providerPath, providerOptions, context) => {
            return new toolDiscoveryMulti_1.ServerToolDiscoveryMultiProvider(providerOptions.config);
        },
    },
    {
        test: (providerPath) => providerPath.startsWith('lambdalabs:'),
        create: async (providerPath, providerOptions, context) => {
            return (0, lambdalabs_1.createLambdaLabsProvider)(providerPath, {
                config: providerOptions,
                env: context.env,
            });
        },
    },
];
//# sourceMappingURL=registry.js.map