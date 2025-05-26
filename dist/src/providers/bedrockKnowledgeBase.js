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
exports.AwsBedrockKnowledgeBaseProvider = void 0;
const cache_1 = require("../cache");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const telemetry_1 = __importDefault(require("../telemetry"));
const bedrock_1 = require("./bedrock");
/**
 * AWS Bedrock Knowledge Base provider for RAG (Retrieval Augmented Generation).
 * Allows querying an existing AWS Bedrock Knowledge Base with text queries.
 */
class AwsBedrockKnowledgeBaseProvider extends bedrock_1.AwsBedrockGenericProvider {
    constructor(modelName, options = {}) {
        super(modelName, options);
        // Ensure we have a knowledgeBaseId
        if (!options.config?.knowledgeBaseId) {
            throw new Error('Knowledge Base ID is required. Please provide a knowledgeBaseId in the provider config.');
        }
        this.kbConfig = options.config || { knowledgeBaseId: '' };
        telemetry_1.default.recordAndSendOnce('feature_used', {
            feature: 'knowledge_base',
            provider: 'bedrock',
        });
    }
    id() {
        return `bedrock:kb:${this.kbConfig.knowledgeBaseId}`;
    }
    toString() {
        return `[Amazon Bedrock Knowledge Base Provider ${this.kbConfig.knowledgeBaseId}]`;
    }
    async getKnowledgeBaseClient() {
        if (!this.knowledgeBaseClient) {
            let handler;
            // set from https://www.npmjs.com/package/proxy-agent
            if ((0, envars_1.getEnvString)('HTTP_PROXY') || (0, envars_1.getEnvString)('HTTPS_PROXY')) {
                try {
                    const { NodeHttpHandler } = await Promise.resolve().then(() => __importStar(require('@smithy/node-http-handler')));
                    const { ProxyAgent } = await Promise.resolve().then(() => __importStar(require('proxy-agent')));
                    handler = new NodeHttpHandler({
                        httpsAgent: new ProxyAgent(),
                    });
                }
                catch {
                    throw new Error(`The @smithy/node-http-handler package is required as a peer dependency. Please install it in your project or globally.`);
                }
            }
            try {
                const { BedrockAgentRuntimeClient } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-bedrock-agent-runtime')));
                const credentials = await this.getCredentials();
                const client = new BedrockAgentRuntimeClient({
                    region: this.getRegion(),
                    maxAttempts: (0, envars_1.getEnvInt)('AWS_BEDROCK_MAX_RETRIES', 10),
                    retryMode: 'adaptive',
                    ...(credentials ? { credentials } : {}),
                    ...(handler ? { requestHandler: handler } : {}),
                });
                this.knowledgeBaseClient = client;
            }
            catch (err) {
                throw new Error(`The @aws-sdk/client-bedrock-agent-runtime package is required as a peer dependency. Please install it in your project or globally. Error: ${err}`);
            }
        }
        return this.knowledgeBaseClient;
    }
    async callApi(prompt) {
        const client = await this.getKnowledgeBaseClient();
        // Prepare the request parameters
        const modelArn = this.kbConfig.modelArn ||
            (this.modelName.includes(':')
                ? this.modelName.includes('arn:aws:bedrock')
                    ? this.modelName // Already has full ARN format
                    : `arn:aws:bedrock:${this.getRegion()}:aws:foundation-model/${this.modelName}`
                : `arn:aws:bedrock:${this.getRegion()}:aws:foundation-model/${this.modelName}`);
        const params = {
            input: { text: prompt },
            retrieveAndGenerateConfiguration: {
                type: 'KNOWLEDGE_BASE',
                knowledgeBaseConfiguration: {
                    knowledgeBaseId: this.kbConfig.knowledgeBaseId,
                    modelArn,
                },
            },
        };
        logger_1.default.debug(`Calling Amazon Bedrock Knowledge Base API: ${JSON.stringify(params)}`);
        const cache = await (0, cache_1.getCache)();
        const sensitiveKeys = ['accessKeyId', 'secretAccessKey', 'sessionToken'];
        const cacheConfig = {
            region: this.getRegion(),
            modelName: this.modelName,
            ...Object.fromEntries(Object.entries(this.kbConfig).filter(([key]) => !sensitiveKeys.includes(key))),
        };
        const configStr = JSON.stringify(cacheConfig, Object.keys(cacheConfig).sort());
        const cacheKey = `bedrock-kb:${Buffer.from(configStr).toString('base64')}:${prompt}`;
        if ((0, cache_1.isCacheEnabled)()) {
            const cachedResponse = await cache.get(cacheKey);
            if (cachedResponse) {
                logger_1.default.debug(`Returning cached response for ${prompt}`);
                const parsedResponse = JSON.parse(cachedResponse);
                return {
                    output: parsedResponse.output,
                    metadata: { citations: parsedResponse.citations },
                    tokenUsage: {},
                    cached: true,
                };
            }
        }
        try {
            const { RetrieveAndGenerateCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-bedrock-agent-runtime')));
            const command = new RetrieveAndGenerateCommand(params);
            const response = await client.send(command);
            logger_1.default.debug(`Amazon Bedrock Knowledge Base API response: ${JSON.stringify(response)}`);
            let output = '';
            if (response && response.output && response.output.text) {
                output = response.output.text;
            }
            let citations = [];
            if (response && response.citations && Array.isArray(response.citations)) {
                citations = response.citations;
            }
            if ((0, cache_1.isCacheEnabled)()) {
                try {
                    await cache.set(cacheKey, JSON.stringify({
                        output,
                        citations,
                    }));
                }
                catch (err) {
                    logger_1.default.error(`Failed to cache knowledge base response: ${String(err)}`);
                }
            }
            return {
                output,
                metadata: { citations },
                tokenUsage: {},
            };
        }
        catch (err) {
            return {
                error: `Bedrock Knowledge Base API error: ${String(err)}`,
            };
        }
    }
}
exports.AwsBedrockKnowledgeBaseProvider = AwsBedrockKnowledgeBaseProvider;
//# sourceMappingURL=bedrockKnowledgeBase.js.map