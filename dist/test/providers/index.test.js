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
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = __importDefault(require("child_process"));
const dedent_1 = __importDefault(require("dedent"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const stream_1 = __importDefault(require("stream"));
const cache_1 = require("../../src/cache");
const esm_1 = require("../../src/esm");
const logger_1 = __importDefault(require("../../src/logger"));
const providers_1 = require("../../src/providers");
const completion_1 = require("../../src/providers/anthropic/completion");
const chat_1 = require("../../src/providers/azure/chat");
const completion_2 = require("../../src/providers/azure/completion");
const bedrock_1 = require("../../src/providers/bedrock");
const cloudflare_ai_1 = require("../../src/providers/cloudflare-ai");
const vertex_1 = require("../../src/providers/google/vertex");
const huggingface_1 = require("../../src/providers/huggingface");
const llama_1 = require("../../src/providers/llama");
const ollama_1 = require("../../src/providers/ollama");
const assistant_1 = require("../../src/providers/openai/assistant");
const chat_2 = require("../../src/providers/openai/chat");
const completion_3 = require("../../src/providers/openai/completion");
const embedding_1 = require("../../src/providers/openai/embedding");
const pythonCompletion_1 = require("../../src/providers/pythonCompletion");
const replicate_1 = require("../../src/providers/replicate");
const scriptCompletion_1 = require("../../src/providers/scriptCompletion");
const voyage_1 = require("../../src/providers/voyage");
const webhook_1 = require("../../src/providers/webhook");
const goat_1 = __importDefault(require("../../src/redteam/providers/goat"));
const iterative_1 = __importDefault(require("../../src/redteam/providers/iterative"));
const iterativeImage_1 = __importDefault(require("../../src/redteam/providers/iterativeImage"));
const iterativeTree_1 = __importDefault(require("../../src/redteam/providers/iterativeTree"));
jest.mock('fs');
jest.mock('glob', () => ({
    globSync: jest.fn(),
}));
jest.mock('proxy-agent', () => ({
    ProxyAgent: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/esm', () => ({
    ...jest.requireActual('../../src/esm'),
    importModule: jest.fn(),
}));
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));
jest.mock('glob', () => ({
    globSync: jest.fn(),
}));
jest.mock('../../src/database', () => ({
    getDb: jest.fn(),
}));
jest.mock('../../src/redteam/remoteGeneration', () => ({
    shouldGenerateRemote: jest.fn().mockReturnValue(false),
    neverGenerateRemote: jest.fn().mockReturnValue(false),
    getRemoteGenerationUrl: jest.fn().mockReturnValue('http://test-url'),
}));
jest.mock('../../src/providers/websocket');
const mockFetch = jest.mocked(jest.fn());
global.fetch = mockFetch;
const defaultMockResponse = {
    status: 200,
    statusText: 'OK',
    headers: {
        get: jest.fn().mockReturnValue(null),
        entries: jest.fn().mockReturnValue([]),
    },
};
// Dynamic import
jest.mock('../../src/providers/adaline.gateway', () => ({
    AdalineGatewayChatProvider: jest.fn().mockImplementation((providerName, modelName) => ({
        id: () => `adaline:${providerName}:chat:${modelName}`,
        constructor: { name: 'AdalineGatewayChatProvider' },
    })),
    AdalineGatewayEmbeddingProvider: jest.fn().mockImplementation((providerName, modelName) => ({
        id: () => `adaline:${providerName}:embedding:${modelName}`,
        constructor: { name: 'AdalineGatewayEmbeddingProvider' },
    })),
}));
describe('call provider apis', () => {
    afterEach(async () => {
        jest.clearAllMocks();
        await (0, cache_1.clearCache)();
    });
    it('AzureOpenAiCompletionProvider callApi', async () => {
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify({
                choices: [{ text: 'Test output' }],
                usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
            })),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new completion_2.AzureCompletionProvider('text-davinci-003');
        const result = await provider.callApi('Test prompt');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe('Test output');
        expect(result.tokenUsage).toEqual({ total: 10, prompt: 5, completion: 5 });
    });
    it('AzureOpenAiChatCompletionProvider callApi', async () => {
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify({
                choices: [{ message: { content: 'Test output' } }],
                usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
            })),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new chat_1.AzureChatCompletionProvider('gpt-4o-mini');
        const result = await provider.callApi(JSON.stringify([{ role: 'user', content: 'Test prompt' }]));
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe('Test output');
        expect(result.tokenUsage).toEqual({ total: 10, prompt: 5, completion: 5 });
    });
    it('AzureOpenAiChatCompletionProvider callApi with dataSources', async () => {
        const dataSources = [
            {
                type: 'AzureCognitiveSearch',
                endpoint: 'https://search.windows.net',
                indexName: 'search-test',
                semanticConfiguration: 'default',
                queryType: 'vectorSimpleHybrid',
            },
        ];
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify({
                choices: [
                    { message: { role: 'system', content: 'System prompt' } },
                    { message: { role: 'user', content: 'Test prompt' } },
                    { message: { role: 'assistant', content: 'Test response' } },
                ],
                usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
            })),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new chat_1.AzureChatCompletionProvider('gpt-4o-mini', {
            config: { dataSources },
        });
        const result = await provider.callApi(JSON.stringify([
            { role: 'system', content: 'System prompt' },
            { role: 'user', content: 'Test prompt' },
        ]));
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe('Test response');
        expect(result.tokenUsage).toEqual({ total: 10, prompt: 5, completion: 5 });
    });
    it('AzureOpenAiChatCompletionProvider callApi with cache disabled', async () => {
        (0, cache_1.disableCache)();
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify({
                choices: [{ message: { content: 'Test output' } }],
                usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
            })),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new chat_1.AzureChatCompletionProvider('gpt-4o-mini');
        const result = await provider.callApi(JSON.stringify([{ role: 'user', content: 'Test prompt' }]));
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe('Test output');
        expect(result.tokenUsage).toEqual({ total: 10, prompt: 5, completion: 5 });
        (0, cache_1.enableCache)();
    });
    it('LlamaProvider callApi', async () => {
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify({
                content: 'Test output',
            })),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new llama_1.LlamaProvider('llama.cpp');
        const result = await provider.callApi('Test prompt');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe('Test output');
    });
    it('OllamaCompletionProvider callApi', async () => {
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn()
                .mockResolvedValue(`{"model":"llama2:13b","created_at":"2023-08-08T21:50:34.898068Z","response":"Gre","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:34.929199Z","response":"at","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:34.959989Z","response":" question","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:34.992117Z","response":"!","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:35.023658Z","response":" The","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:35.0551Z","response":" sky","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:35.086103Z","response":" appears","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:35.117166Z","response":" blue","done":false}
{"model":"llama2:13b","created_at":"2023-08-08T21:50:41.695299Z","done":true,"context":[1,29871,1,13,9314],"total_duration":10411943458,"load_duration":458333,"sample_count":217,"sample_duration":154566000,"prompt_eval_count":11,"prompt_eval_duration":3334582000,"eval_count":216,"eval_duration":6905134000}`),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new ollama_1.OllamaCompletionProvider('llama');
        const result = await provider.callApi('Test prompt');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe('Great question! The sky appears blue');
    });
    it('OllamaChatProvider callApi', async () => {
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn()
                .mockResolvedValue(`{"model":"orca-mini","created_at":"2023-12-16T01:46:19.263682972Z","message":{"role":"assistant","content":" Because","images":null},"done":false}
{"model":"orca-mini","created_at":"2023-12-16T01:46:19.275143974Z","message":{"role":"assistant","content":" of","images":null},"done":false}
{"model":"orca-mini","created_at":"2023-12-16T01:46:19.288137727Z","message":{"role":"assistant","content":" Ray","images":null},"done":false}
{"model":"orca-mini","created_at":"2023-12-16T01:46:19.301139709Z","message":{"role":"assistant","content":"leigh","images":null},"done":false}
{"model":"orca-mini","created_at":"2023-12-16T01:46:19.311364699Z","message":{"role":"assistant","content":" scattering","images":null},"done":false}
{"model":"orca-mini","created_at":"2023-12-16T01:46:19.324309782Z","message":{"role":"assistant","content":".","images":null},"done":false}
{"model":"orca-mini","created_at":"2023-12-16T01:46:19.337165395Z","done":true,"total_duration":1486443841,"load_duration":1280794143,"prompt_eval_count":35,"prompt_eval_duration":142384000,"eval_count":6,"eval_duration":61912000}`),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new ollama_1.OllamaChatProvider('llama');
        const result = await provider.callApi('Test prompt');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe(' Because of Rayleigh scattering.');
    });
    it('WebhookProvider callApi', async () => {
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify({
                output: 'Test output',
            })),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new webhook_1.WebhookProvider('http://example.com/webhook');
        const result = await provider.callApi('Test prompt');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.output).toBe('Test output');
    });
    describe.each([
        ['Array format', [{ generated_text: 'Test output' }]], // Array format
        ['Object format', { generated_text: 'Test output' }], // Object format
    ])('HuggingfaceTextGenerationProvider callApi with %s', (format, mockedData) => {
        it('returns expected output', async () => {
            const mockResponse = {
                ...defaultMockResponse,
                text: jest.fn().mockResolvedValue(JSON.stringify(mockedData)),
            };
            mockFetch.mockResolvedValue(mockResponse);
            const provider = new huggingface_1.HuggingfaceTextGenerationProvider('gpt2');
            const result = await provider.callApi('Test prompt');
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(result.output).toBe('Test output');
        });
    });
    it('HuggingfaceFeatureExtractionProvider callEmbeddingApi', async () => {
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify([0.1, 0.2, 0.3, 0.4, 0.5])),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new huggingface_1.HuggingfaceFeatureExtractionProvider('distilbert-base-uncased');
        const result = await provider.callEmbeddingApi('Test text');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });
    it('HuggingfaceTextClassificationProvider callClassificationApi', async () => {
        const mockClassification = [
            [
                {
                    label: 'nothate',
                    score: 0.9,
                },
                {
                    label: 'hate',
                    score: 0.1,
                },
            ],
        ];
        const mockResponse = {
            ...defaultMockResponse,
            text: jest.fn().mockResolvedValue(JSON.stringify(mockClassification)),
        };
        mockFetch.mockResolvedValue(mockResponse);
        const provider = new huggingface_1.HuggingfaceTextClassificationProvider('foo');
        const result = await provider.callClassificationApi('Test text');
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(result.classification).toEqual({
            nothate: 0.9,
            hate: 0.1,
        });
    });
    describe('CloudflareAi', () => {
        beforeAll(() => {
            (0, cache_1.enableCache)();
        });
        const cloudflareMinimumConfig = {
            accountId: 'testAccountId',
            apiKey: 'testApiKey',
        };
        const testModelName = '@cf/meta/llama-2-7b-chat-fp16';
        // Token usage is not implemented for cloudflare so this is the default that
        // is returned
        const tokenUsageDefaultResponse = {
            total: undefined,
            prompt: undefined,
            completion: undefined,
        };
        describe('CloudflareAiCompletionProvider', () => {
            it('callApi with caching enabled', async () => {
                const PROMPT = 'Test prompt for caching';
                const provider = new cloudflare_ai_1.CloudflareAiCompletionProvider(testModelName, {
                    config: cloudflareMinimumConfig,
                });
                const responsePayload = {
                    success: true,
                    errors: [],
                    messages: [],
                    result: {
                        response: 'Test text output',
                    },
                };
                const mockResponse = {
                    ...defaultMockResponse,
                    text: jest.fn().mockResolvedValue(JSON.stringify(responsePayload)),
                    ok: true,
                };
                mockFetch.mockResolvedValue(mockResponse);
                const result = await provider.callApi(PROMPT);
                expect(mockFetch).toHaveBeenCalledTimes(1);
                expect(result.output).toBe(responsePayload.result.response);
                expect(result.tokenUsage).toEqual(tokenUsageDefaultResponse);
                const resultFromCache = await provider.callApi(PROMPT);
                expect(mockFetch).toHaveBeenCalledTimes(1);
                expect(resultFromCache.output).toBe(responsePayload.result.response);
                expect(resultFromCache.tokenUsage).toEqual(tokenUsageDefaultResponse);
            });
            it('callApi with caching disabled', async () => {
                const PROMPT = 'test prompt without caching';
                try {
                    (0, cache_1.disableCache)();
                    const provider = new cloudflare_ai_1.CloudflareAiCompletionProvider(testModelName, {
                        config: cloudflareMinimumConfig,
                    });
                    const responsePayload = {
                        success: true,
                        errors: [],
                        messages: [],
                        result: {
                            response: 'Test text output',
                        },
                    };
                    const mockResponse = {
                        ...defaultMockResponse,
                        text: jest.fn().mockResolvedValue(JSON.stringify(responsePayload)),
                        ok: true,
                    };
                    mockFetch.mockResolvedValue(mockResponse);
                    const result = await provider.callApi(PROMPT);
                    expect(mockFetch).toHaveBeenCalledTimes(1);
                    expect(result.output).toBe(responsePayload.result.response);
                    expect(result.tokenUsage).toEqual(tokenUsageDefaultResponse);
                    const resultFromCache = await provider.callApi(PROMPT);
                    expect(mockFetch).toHaveBeenCalledTimes(2);
                    expect(resultFromCache.output).toBe(responsePayload.result.response);
                    expect(resultFromCache.tokenUsage).toEqual(tokenUsageDefaultResponse);
                }
                finally {
                    (0, cache_1.enableCache)();
                }
            });
            it('callApi handles cloudflare error properly', async () => {
                const PROMPT = 'Test prompt for caching';
                const provider = new cloudflare_ai_1.CloudflareAiCompletionProvider(testModelName, {
                    config: cloudflareMinimumConfig,
                });
                const responsePayload = {
                    success: false,
                    errors: ['Some error occurred'],
                    messages: [],
                };
                const mockResponse = {
                    ...defaultMockResponse,
                    text: jest.fn().mockResolvedValue(JSON.stringify(responsePayload)),
                    ok: true,
                };
                mockFetch.mockResolvedValue(mockResponse);
                const result = await provider.callApi(PROMPT);
                expect(result.error).toContain(JSON.stringify(responsePayload.errors));
            });
            it('Can be invoked with custom configuration', async () => {
                const cloudflareChatConfig = {
                    accountId: 'MADE_UP_ACCOUNT_ID',
                    apiKey: 'MADE_UP_API_KEY',
                    frequency_penalty: 10,
                };
                const rawProviderConfigs = [
                    {
                        [`cloudflare-ai:completion:${testModelName}`]: {
                            config: cloudflareChatConfig,
                        },
                    },
                ];
                const providers = await (0, providers_1.loadApiProviders)(rawProviderConfigs);
                expect(providers).toHaveLength(1);
                expect(providers[0]).toBeInstanceOf(cloudflare_ai_1.CloudflareAiCompletionProvider);
                const cfProvider = providers[0];
                expect(cfProvider.config).toEqual(cloudflareChatConfig);
                const PROMPT = 'Test prompt for custom configuration';
                const responsePayload = {
                    success: true,
                    errors: [],
                    messages: [],
                    result: {
                        response: 'Test text output',
                    },
                };
                const mockResponse = {
                    ...defaultMockResponse,
                    text: jest.fn().mockResolvedValue(JSON.stringify(responsePayload)),
                    ok: true,
                };
                mockFetch.mockResolvedValue(mockResponse);
                await cfProvider.callApi(PROMPT);
                expect(mockFetch).toHaveBeenCalledTimes(1);
                expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                    body: expect.stringMatching(`"prompt":"${PROMPT}"`),
                }));
                const { accountId: _accountId, apiKey: _apiKey, ...passThroughConfig } = cloudflareChatConfig;
                const { prompt: _prompt, ...bodyWithoutPrompt } = JSON.parse(jest.mocked(mockFetch).mock.calls[0][1].body);
                expect(bodyWithoutPrompt).toEqual(passThroughConfig);
            });
        });
        describe('CloudflareAiChatCompletionProvider', () => {
            it('Should handle chat provider', async () => {
                const provider = new cloudflare_ai_1.CloudflareAiChatCompletionProvider(testModelName, {
                    config: cloudflareMinimumConfig,
                });
                const responsePayload = {
                    success: true,
                    errors: [],
                    messages: [],
                    result: {
                        response: 'Test text output',
                    },
                };
                const mockResponse = {
                    ...defaultMockResponse,
                    text: jest.fn().mockResolvedValue(JSON.stringify(responsePayload)),
                    ok: true,
                };
                mockFetch.mockResolvedValue(mockResponse);
                const result = await provider.callApi('Test chat prompt');
                expect(mockFetch).toHaveBeenCalledTimes(1);
                expect(result.output).toBe(responsePayload.result.response);
                expect(result.tokenUsage).toEqual(tokenUsageDefaultResponse);
            });
        });
        describe('CloudflareAiEmbeddingProvider', () => {
            it('Should return embeddings in the proper format', async () => {
                const provider = new cloudflare_ai_1.CloudflareAiEmbeddingProvider(testModelName, {
                    config: cloudflareMinimumConfig,
                });
                const responsePayload = {
                    success: true,
                    errors: [],
                    messages: [],
                    result: {
                        shape: [1, 3],
                        data: [[0.02055364102125168, -0.013749595731496811, 0.0024201320484280586]],
                    },
                };
                const mockResponse = {
                    ...defaultMockResponse,
                    text: jest.fn().mockResolvedValue(JSON.stringify(responsePayload)),
                    ok: true,
                };
                mockFetch.mockResolvedValue(mockResponse);
                const result = await provider.callEmbeddingApi('Create embeddings from this');
                expect(mockFetch).toHaveBeenCalledTimes(1);
                expect(result.embedding).toEqual(responsePayload.result.data[0]);
                expect(result.tokenUsage).toEqual(tokenUsageDefaultResponse);
            });
        });
    });
    describe.each([
        ['python rag.py', 'python', ['rag.py']],
        ['echo "hello world"', 'echo', ['hello world']],
        ['./path/to/file.py run', './path/to/file.py', ['run']],
        ['"/Path/To/My File.py"', '/Path/To/My File.py', []],
    ])('ScriptCompletionProvider callApi with script %s', (script, inputFile, inputArgs) => {
        it('returns expected output', async () => {
            const mockResponse = 'Test script output';
            const mockChildProcess = {
                stdout: new stream_1.default.Readable(),
                stderr: new stream_1.default.Readable(),
            };
            const execFileSpy = jest
                .spyOn(child_process_1.default, 'execFile')
                .mockImplementation((file, args, options, callback) => {
                process.nextTick(() => callback && callback(null, Buffer.from(mockResponse), Buffer.from('')));
                return mockChildProcess;
            });
            const provider = new scriptCompletion_1.ScriptCompletionProvider(script, {
                config: {
                    some_config_val: 42,
                },
            });
            const result = await provider.callApi('Test prompt', {
                prompt: {
                    label: 'Test prompt',
                    raw: 'Test prompt',
                },
                vars: {
                    var1: 'value 1',
                    var2: 'value 2 "with some double "quotes""',
                },
            });
            expect(result.output).toBe(mockResponse);
            expect(execFileSpy).toHaveBeenCalledTimes(1);
            expect(execFileSpy).toHaveBeenCalledWith(expect.stringContaining(inputFile), expect.arrayContaining(inputArgs.concat([
                'Test prompt',
                '{"config":{"some_config_val":42}}',
                '{"prompt":{"label":"Test prompt","raw":"Test prompt"},"vars":{"var1":"value 1","var2":"value 2 \\"with some double \\"quotes\\"\\""}}',
            ])), expect.any(Object), expect.any(Function));
            jest.restoreAllMocks();
        });
    });
});
describe('loadApiProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('loadApiProvider with yaml filepath', async () => {
        const mockYamlContent = (0, dedent_1.default) `
    id: 'openai:gpt-4'
    config:
      key: 'value'`;
        const mockReadFileSync = jest.mocked(fs.readFileSync);
        mockReadFileSync.mockReturnValue(mockYamlContent);
        const provider = await (0, providers_1.loadApiProvider)('file://path/to/mock-provider-file.yaml');
        expect(provider.id()).toBe('openai:gpt-4');
        expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringMatching(/path[\\\/]to[\\\/]mock-provider-file\.yaml/), 'utf8');
    });
    it('loadApiProvider with json filepath', async () => {
        const mockJsonContent = `{
  "id": "openai:gpt-4",
  "config": {
    "key": "value"
  }
}`;
        jest.mocked(fs.readFileSync).mockReturnValueOnce(mockJsonContent);
        const provider = await (0, providers_1.loadApiProvider)('file://path/to/mock-provider-file.json');
        expect(provider.id()).toBe('openai:gpt-4');
        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringMatching(/path[\\\/]to[\\\/]mock-provider-file\.json/), 'utf8');
    });
    it('loadApiProvider with openai:chat', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:chat');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
    });
    it('loadApiProvider with openai:completion', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:completion');
        expect(provider).toBeInstanceOf(completion_3.OpenAiCompletionProvider);
    });
    it('loadApiProvider with openai:assistant', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:assistant:foobar');
        expect(provider).toBeInstanceOf(assistant_1.OpenAiAssistantProvider);
    });
    it('loadApiProvider with openai:chat:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:chat:gpt-3.5-turbo');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
    });
    it('loadApiProvider with openai:completion:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:completion:text-davinci-003');
        expect(provider).toBeInstanceOf(completion_3.OpenAiCompletionProvider);
    });
    it('loadApiProvider with OpenAI finetuned model', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:chat:ft:gpt-4o-mini:company-name::ID:');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        expect(provider.id()).toBe('openai:ft:gpt-4o-mini:company-name::ID:');
    });
    it('loadApiProvider with azureopenai:completion:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('azureopenai:completion:text-davinci-003');
        expect(provider).toBeInstanceOf(completion_2.AzureCompletionProvider);
    });
    it('loadApiProvider with azureopenai:chat:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('azureopenai:chat:gpt-3.5-turbo');
        expect(provider).toBeInstanceOf(chat_1.AzureChatCompletionProvider);
    });
    it('loadApiProvider with anthropic:completion', async () => {
        const provider = await (0, providers_1.loadApiProvider)('anthropic:completion');
        expect(provider).toBeInstanceOf(completion_1.AnthropicCompletionProvider);
    });
    it('loadApiProvider with anthropic:completion:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('anthropic:completion:claude-1');
        expect(provider).toBeInstanceOf(completion_1.AnthropicCompletionProvider);
    });
    it('loadApiProvider with ollama:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('ollama:llama2:13b');
        expect(provider).toBeInstanceOf(ollama_1.OllamaCompletionProvider);
        expect(provider.id()).toBe('ollama:completion:llama2:13b');
    });
    it('loadApiProvider with ollama:completion:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('ollama:completion:llama2:13b');
        expect(provider).toBeInstanceOf(ollama_1.OllamaCompletionProvider);
        expect(provider.id()).toBe('ollama:completion:llama2:13b');
    });
    it('loadApiProvider with ollama:embedding:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('ollama:embedding:llama2:13b');
        expect(provider).toBeInstanceOf(ollama_1.OllamaEmbeddingProvider);
    });
    it('loadApiProvider with ollama:embeddings:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('ollama:embeddings:llama2:13b');
        expect(provider).toBeInstanceOf(ollama_1.OllamaEmbeddingProvider);
    });
    it('loadApiProvider with ollama:chat:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('ollama:chat:llama2:13b');
        expect(provider).toBeInstanceOf(ollama_1.OllamaChatProvider);
        expect(provider.id()).toBe('ollama:chat:llama2:13b');
    });
    it('loadApiProvider with llama:modelName', async () => {
        const provider = await (0, providers_1.loadApiProvider)('llama');
        expect(provider).toBeInstanceOf(llama_1.LlamaProvider);
    });
    it('loadApiProvider with webhook', async () => {
        const provider = await (0, providers_1.loadApiProvider)('webhook:http://example.com/webhook');
        expect(provider).toBeInstanceOf(webhook_1.WebhookProvider);
    });
    it('loadApiProvider with huggingface:text-generation', async () => {
        const provider = await (0, providers_1.loadApiProvider)('huggingface:text-generation:foobar/baz');
        expect(provider).toBeInstanceOf(huggingface_1.HuggingfaceTextGenerationProvider);
    });
    it('loadApiProvider with huggingface:feature-extraction', async () => {
        const provider = await (0, providers_1.loadApiProvider)('huggingface:feature-extraction:foobar/baz');
        expect(provider).toBeInstanceOf(huggingface_1.HuggingfaceFeatureExtractionProvider);
    });
    it('loadApiProvider with huggingface:text-classification', async () => {
        const provider = await (0, providers_1.loadApiProvider)('huggingface:text-classification:foobar/baz');
        expect(provider).toBeInstanceOf(huggingface_1.HuggingfaceTextClassificationProvider);
    });
    it('loadApiProvider with hf:text-classification', async () => {
        const provider = await (0, providers_1.loadApiProvider)('hf:text-classification:foobar/baz');
        expect(provider).toBeInstanceOf(huggingface_1.HuggingfaceTextClassificationProvider);
    });
    it('loadApiProvider with bedrock:completion', async () => {
        const provider = await (0, providers_1.loadApiProvider)('bedrock:completion:anthropic.claude-v2:1');
        expect(provider).toBeInstanceOf(bedrock_1.AwsBedrockCompletionProvider);
    });
    it('loadApiProvider with openrouter', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openrouter:mistralai/mistral-medium');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        // Intentionally openai, because it's just a wrapper around openai
        expect(provider.id()).toBe('mistralai/mistral-medium');
    });
    it('loadApiProvider with github', async () => {
        const provider = await (0, providers_1.loadApiProvider)('github:gpt-4o-mini');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        // Intentionally openai, because it's just a wrapper around openai
        expect(provider.id()).toBe('gpt-4o-mini');
    });
    it('loadApiProvider with perplexity', async () => {
        const provider = await (0, providers_1.loadApiProvider)('perplexity:llama-3-sonar-large-32k-online');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        expect(provider.id()).toBe('llama-3-sonar-large-32k-online');
        expect(provider.config.apiBaseUrl).toBe('https://api.perplexity.ai');
        expect(provider.config.apiKeyEnvar).toBe('PERPLEXITY_API_KEY');
    });
    it('loadApiProvider with togetherai', async () => {
        const provider = await (0, providers_1.loadApiProvider)('togetherai:chat:meta/meta-llama/Meta-Llama-3-8B-Instruct');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        expect(provider.id()).toBe('meta/meta-llama/Meta-Llama-3-8B-Instruct');
    });
    it('loadApiProvider with voyage', async () => {
        const provider = await (0, providers_1.loadApiProvider)('voyage:voyage-2');
        expect(provider).toBeInstanceOf(voyage_1.VoyageEmbeddingProvider);
        expect(provider.id()).toBe('voyage:voyage-2');
    });
    it('loadApiProvider with vertex:chat', async () => {
        const provider = await (0, providers_1.loadApiProvider)('vertex:chat:vertex-chat-model');
        expect(provider).toBeInstanceOf(vertex_1.VertexChatProvider);
        expect(provider.id()).toBe('vertex:vertex-chat-model');
    });
    it('loadApiProvider with vertex:embedding', async () => {
        const provider = await (0, providers_1.loadApiProvider)('vertex:embedding:vertex-embedding-model');
        expect(provider).toBeInstanceOf(vertex_1.VertexEmbeddingProvider);
        expect(provider.id()).toBe('vertex:vertex-embedding-model');
    });
    it('loadApiProvider with vertex:embeddings', async () => {
        const provider = await (0, providers_1.loadApiProvider)('vertex:embeddings:vertex-embedding-model');
        expect(provider).toBeInstanceOf(vertex_1.VertexEmbeddingProvider);
        expect(provider.id()).toBe('vertex:vertex-embedding-model');
    });
    it('loadApiProvider with vertex:modelname', async () => {
        const provider = await (0, providers_1.loadApiProvider)('vertex:vertex-chat-model');
        expect(provider).toBeInstanceOf(vertex_1.VertexChatProvider);
        expect(provider.id()).toBe('vertex:vertex-chat-model');
    });
    it('loadApiProvider with replicate:modelname', async () => {
        const provider = await (0, providers_1.loadApiProvider)('replicate:meta/llama3');
        expect(provider).toBeInstanceOf(replicate_1.ReplicateProvider);
        expect(provider.id()).toBe('replicate:meta/llama3');
    });
    it('loadApiProvider with replicate:modelname:version', async () => {
        const provider = await (0, providers_1.loadApiProvider)('replicate:meta/llama3:abc123');
        expect(provider).toBeInstanceOf(replicate_1.ReplicateProvider);
        expect(provider.id()).toBe('replicate:meta/llama3:abc123');
    });
    it('loadApiProvider with replicate:image', async () => {
        const provider = await (0, providers_1.loadApiProvider)('replicate:image:stability-ai/sdxl');
        expect(provider).toBeInstanceOf(replicate_1.ReplicateImageProvider);
        expect(provider.id()).toBe('replicate:stability-ai/sdxl');
    });
    it('loadApiProvider with replicate:image:version', async () => {
        const provider = await (0, providers_1.loadApiProvider)('replicate:image:stability-ai/sdxl:abc123');
        expect(provider).toBeInstanceOf(replicate_1.ReplicateImageProvider);
        expect(provider.id()).toBe('replicate:stability-ai/sdxl:abc123');
    });
    it('loadApiProvider with replicate:moderation', async () => {
        const provider = await (0, providers_1.loadApiProvider)('replicate:moderation:foo/bar');
        expect(provider).toBeInstanceOf(replicate_1.ReplicateModerationProvider);
        expect(provider.id()).toBe('replicate:foo/bar');
    });
    it('loadApiProvider with replicate:moderation:version', async () => {
        const provider = await (0, providers_1.loadApiProvider)('replicate:moderation:foo/bar:abc123');
        expect(provider).toBeInstanceOf(replicate_1.ReplicateModerationProvider);
        expect(provider.id()).toBe('replicate:foo/bar:abc123');
    });
    it('loadApiProvider with file://*.py', async () => {
        const provider = await (0, providers_1.loadApiProvider)('file://script.py:function_name');
        expect(provider).toBeInstanceOf(pythonCompletion_1.PythonProvider);
        expect(provider.id()).toBe('python:script.py:function_name');
    });
    it('loadApiProvider with python:*.py', async () => {
        const provider = await (0, providers_1.loadApiProvider)('python:script.py');
        expect(provider).toBeInstanceOf(pythonCompletion_1.PythonProvider);
        expect(provider.id()).toBe('python:script.py:default');
    });
    it('loadApiProvider with cloudflare-ai', async () => {
        const supportedModelTypes = [
            { modelType: 'chat', providerKlass: cloudflare_ai_1.CloudflareAiChatCompletionProvider },
            { modelType: 'embedding', providerKlass: cloudflare_ai_1.CloudflareAiEmbeddingProvider },
            { modelType: 'embeddings', providerKlass: cloudflare_ai_1.CloudflareAiEmbeddingProvider },
            { modelType: 'completion', providerKlass: cloudflare_ai_1.CloudflareAiCompletionProvider },
        ];
        const unsupportedModelTypes = ['assistant'];
        const modelName = 'mistralai/mistral-medium';
        // Without any model type should throw an error
        await expect((0, providers_1.loadApiProvider)(`cloudflare-ai:${modelName}`)).rejects.toThrow(/Unknown Cloudflare AI model type/);
        for (const unsupportedModelType of unsupportedModelTypes) {
            await expect((0, providers_1.loadApiProvider)(`cloudflare-ai:${unsupportedModelType}:${modelName}`)).rejects.toThrow(/Unknown Cloudflare AI model type/);
        }
        for (const { modelType, providerKlass } of supportedModelTypes) {
            const cfProvider = await (0, providers_1.loadApiProvider)(`cloudflare-ai:${modelType}:${modelName}`);
            const modelTypeForId = modelType === 'embeddings' ? 'embedding' : modelType;
            expect(cfProvider.id()).toMatch(`cloudflare-ai:${modelTypeForId}:${modelName}`);
            expect(cfProvider).toBeInstanceOf(providerKlass);
        }
    });
    it('loadApiProvider with promptfoo:redteam:iterative', async () => {
        const provider = await (0, providers_1.loadApiProvider)('promptfoo:redteam:iterative', {
            options: { config: { injectVar: 'foo' } },
        });
        expect(provider).toBeInstanceOf(iterative_1.default);
        expect(provider.id()).toBe('promptfoo:redteam:iterative');
    });
    it('loadApiProvider with promptfoo:redteam:iterative:tree', async () => {
        const provider = await (0, providers_1.loadApiProvider)('promptfoo:redteam:iterative:tree', {
            options: { config: { injectVar: 'foo' } },
        });
        expect(provider).toBeInstanceOf(iterativeTree_1.default);
        expect(provider.id()).toBe('promptfoo:redteam:iterative:tree');
    });
    it('loadApiProvider with promptfoo:redteam:iterative:image', async () => {
        const provider = await (0, providers_1.loadApiProvider)('promptfoo:redteam:iterative:image', {
            options: {
                config: {
                    injectVar: 'imageUrl',
                },
            },
        });
        expect(provider).toBeInstanceOf(iterativeImage_1.default);
        expect(provider.id()).toBe('promptfoo:redteam:iterative:image');
    });
    it('loadApiProvider with promptfoo:redteam:goat', async () => {
        const provider = await (0, providers_1.loadApiProvider)('promptfoo:redteam:goat', {
            options: { config: { injectVar: 'goal' } },
        });
        expect(provider).toBeInstanceOf(goat_1.default);
        expect(provider.id()).toBe('promptfoo:redteam:goat');
    });
    it('loadApiProvider with RawProviderConfig', async () => {
        const rawProviderConfig = {
            'openai:chat': {
                id: 'test',
                config: { foo: 'bar' },
            },
        };
        const provider = await (0, providers_1.loadApiProvider)('openai:chat', {
            options: rawProviderConfig['openai:chat'],
        });
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
    });
    it('loadApiProviders with ProviderFunction', async () => {
        const providerFunction = async (prompt) => {
            return {
                output: `Output for ${prompt}`,
                tokenUsage: { total: 10, prompt: 5, completion: 5 },
            };
        };
        const providers = await (0, providers_1.loadApiProviders)(providerFunction);
        expect(providers).toHaveLength(1);
        expect(providers[0].id()).toBe('custom-function');
        const response = await providers[0].callApi('Test prompt');
        expect(response.output).toBe('Output for Test prompt');
        expect(response.tokenUsage).toEqual({ total: 10, prompt: 5, completion: 5 });
    });
    it('loadApiProviders with CustomApiProvider', async () => {
        const providerPath = 'file://path/to/file.js';
        class CustomApiProvider {
            id() {
                return 'custom-api-provider';
            }
            async callApi(input) {
                return { output: `Processed ${input}` };
            }
        }
        jest.mocked(esm_1.importModule).mockResolvedValue(CustomApiProvider);
        const providers = await (0, providers_1.loadApiProviders)(providerPath);
        expect(esm_1.importModule).toHaveBeenCalledWith(path.resolve('path/to/file.js'));
        expect(providers).toHaveLength(1);
        expect(providers[0].id()).toBe('custom-api-provider');
        const response = await providers[0].callApi('Test input');
        expect(response.output).toBe('Processed Test input');
    });
    it('loadApiProviders with CustomApiProvider, absolute path', async () => {
        const providerPath = 'file:///absolute/path/to/file.js';
        class CustomApiProvider {
            id() {
                return 'custom-api-provider';
            }
            async callApi(input) {
                return { output: `Processed ${input}` };
            }
        }
        jest.mocked(esm_1.importModule).mockResolvedValue(CustomApiProvider);
        const providers = await (0, providers_1.loadApiProviders)(providerPath);
        expect(esm_1.importModule).toHaveBeenCalledWith('/absolute/path/to/file.js');
        expect(providers).toHaveLength(1);
        expect(providers[0].id()).toBe('custom-api-provider');
        const response = await providers[0].callApi('Test input');
        expect(response.output).toBe('Processed Test input');
    });
    it('loadApiProviders with RawProviderConfig[]', async () => {
        const rawProviderConfigs = [
            {
                'openai:chat:abc123': {
                    config: { foo: 'bar' },
                },
            },
            {
                'openai:completion:def456': {
                    config: { foo: 'bar' },
                },
            },
            {
                'anthropic:completion:ghi789': {
                    config: { foo: 'bar' },
                },
            },
        ];
        const providers = await (0, providers_1.loadApiProviders)(rawProviderConfigs);
        expect(providers).toHaveLength(3);
        expect(providers[0]).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        expect(providers[1]).toBeInstanceOf(completion_3.OpenAiCompletionProvider);
        expect(providers[2]).toBeInstanceOf(completion_1.AnthropicCompletionProvider);
    });
    it('loadApiProvider sets provider.delay', async () => {
        const providerOptions = {
            id: 'test-delay',
            config: {},
            delay: 500,
        };
        const provider = await (0, providers_1.loadApiProvider)('echo', { options: providerOptions });
        expect(provider.delay).toBe(500);
    });
    it('supports templating in provider URL', async () => {
        process.env.MY_HOST = 'api.example.com';
        process.env.MY_PORT = '8080';
        const provider = await (0, providers_1.loadApiProvider)('https://{{ env.MY_HOST }}:{{ env.MY_PORT }}/query', {
            options: {
                config: {
                    body: {},
                },
            },
        });
        expect(provider.id()).toBe('https://api.example.com:8080/query');
        delete process.env.MY_HOST;
        delete process.env.MY_PORT;
    });
    it('loadApiProvider with yaml filepath containing multiple providers', async () => {
        const mockYamlContent = (0, dedent_1.default) `
    - id: 'openai:gpt-4o-mini'
      config:
        key: 'value1'
    - id: 'anthropic:messages:claude-3-5-sonnet-20241022'
      config:
        key: 'value2'`;
        const mockReadFileSync = jest.mocked(fs.readFileSync);
        mockReadFileSync.mockReturnValue(mockYamlContent);
        const providers = await (0, providers_1.loadApiProviders)('file://path/to/mock-providers-file.yaml');
        expect(providers).toHaveLength(2);
        expect(providers[0].id()).toBe('openai:gpt-4o-mini');
        expect(providers[1].id()).toBe('anthropic:messages:claude-3-5-sonnet-20241022');
        expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringMatching(/path[\\\/]to[\\\/]mock-providers-file\.yaml/), 'utf8');
    });
    it('loadApiProvider with json filepath containing multiple providers', async () => {
        const mockJsonContent = JSON.stringify([
            {
                id: 'openai:gpt-4o-mini',
                config: { key: 'value1' },
            },
            {
                id: 'anthropic:messages:claude-3-5-sonnet-20241022',
                config: { key: 'value2' },
            },
        ]);
        jest.mocked(fs.readFileSync).mockReturnValueOnce(mockJsonContent);
        const providers = await (0, providers_1.loadApiProviders)('file://path/to/mock-providers-file.json');
        expect(providers).toHaveLength(2);
        expect(providers[0].id()).toBe('openai:gpt-4o-mini');
        expect(providers[1].id()).toBe('anthropic:messages:claude-3-5-sonnet-20241022');
    });
    it('throws an error for unidentified providers', async () => {
        const mockError = jest.spyOn(logger_1.default, 'error');
        const unknownProviderPath = 'unknown:provider';
        await expect((0, providers_1.loadApiProvider)(unknownProviderPath)).rejects.toThrow(`Could not identify provider: ${chalk_1.default.bold(unknownProviderPath)}`);
        expect(mockError).toHaveBeenCalledWith((0, dedent_1.default) `
        Could not identify provider: ${chalk_1.default.bold(unknownProviderPath)}.

        ${chalk_1.default.white((0, dedent_1.default) `
          Please check your configuration and ensure the provider is correctly specified.

          For more information on supported providers, visit: `)} ${chalk_1.default.cyan('https://promptfoo.dev/docs/providers/')}
      `);
        mockError.mockRestore();
    });
    it('renders label using Nunjucks', async () => {
        process.env.someVariable = 'foo';
        const providerOptions = {
            id: 'openai:chat:gpt-4o',
            config: {},
            label: '{{ env.someVariable }}',
        };
        const provider = await (0, providers_1.loadApiProvider)('openai:chat:gpt-4o', { options: providerOptions });
        expect(provider.label).toBe('foo');
    });
    it('loadApiProvider with xai', async () => {
        const provider = await (0, providers_1.loadApiProvider)('xai:grok-2');
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        expect(provider.id()).toBe('xai:grok-2');
        expect(provider.config.apiBaseUrl).toBe('https://api.x.ai/v1');
        expect(provider.config.apiKeyEnvar).toBe('XAI_API_KEY');
    });
    it('loadApiProvider with adaline:openai:chat', async () => {
        const provider = await (0, providers_1.loadApiProvider)('adaline:openai:chat:gpt-4');
        expect(provider.id()).toBe('adaline:openai:chat:gpt-4');
    });
    it('loadApiProvider with adaline:openai:embedding', async () => {
        const provider = await (0, providers_1.loadApiProvider)('adaline:openai:embedding:text-embedding-3-large');
        expect(provider.id()).toBe('adaline:openai:embedding:text-embedding-3-large');
    });
    it('should throw error for invalid adaline provider path', async () => {
        await expect((0, providers_1.loadApiProvider)('adaline:invalid')).rejects.toThrow("Invalid adaline provider path: adaline:invalid. path format should be 'adaline:<provider_name>:<model_type>:<model_name>' eg. 'adaline:openai:chat:gpt-4o'");
    });
    it.each([
        ['dashscope:chat:qwen-max', 'qwen-max'],
        ['dashscope:vl:qwen-vl-max', 'qwen-vl-max'],
        ['alibaba:qwen-plus', 'qwen-plus'],
        ['alibaba:chat:qwen-max', 'qwen-max'],
        ['alibaba:vl:qwen-vl-max', 'qwen-vl-max'],
        ['alicloud:qwen-plus', 'qwen-plus'],
        ['aliyun:qwen-plus', 'qwen-plus'],
    ])('loadApiProvider with %s', async (providerId, expectedModelId) => {
        const provider = await (0, providers_1.loadApiProvider)(providerId);
        expect(provider).toBeInstanceOf(chat_2.OpenAiChatCompletionProvider);
        expect(provider.id()).toBe(expectedModelId);
        expect(provider.config.apiBaseUrl).toBe('https://dashscope-intl.aliyuncs.com/compatible-mode/v1');
        expect(provider.config.apiKeyEnvar).toBe('DASHSCOPE_API_KEY');
    });
    it('loadApiProvider with alibaba embedding', async () => {
        const provider = await (0, providers_1.loadApiProvider)('alibaba:embedding:text-embedding-v3');
        expect(provider).toBeInstanceOf(embedding_1.OpenAiEmbeddingProvider);
        expect(provider.id()).toBe('text-embedding-v3');
        expect(provider.config.apiBaseUrl).toBe('https://dashscope-intl.aliyuncs.com/compatible-mode/v1');
        expect(provider.config.apiKeyEnvar).toBe('DASHSCOPE_API_KEY');
    });
    it('loadApiProvider with alibaba unknown model', async () => {
        await expect((0, providers_1.loadApiProvider)('alibaba:unknown-model')).rejects.toThrow('Invalid Alibaba Cloud model: unknown-model');
    });
});
//# sourceMappingURL=index.test.js.map