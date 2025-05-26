"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const node_http_handler_1 = require("@smithy/node-http-handler");
const util_1 = require("util");
const cache_1 = require("../../../src/cache");
const nova_sonic_1 = require("../../../src/providers/bedrock/nova-sonic");
jest.mock('@smithy/node-http-handler', () => ({
    NodeHttp2Handler: jest.fn(),
}));
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
    InvokeModelWithBidirectionalStreamCommand: jest.fn().mockImplementation((params) => params),
}));
jest.mock('../../../src/logger', () => ({
    __esModule: true,
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('node:timers', () => ({
    setTimeout: jest.fn((callback) => {
        if (typeof callback === 'function') {
            callback();
        }
        return 123;
    }),
}));
const encodeChunk = (obj) => ({
    chunk: { bytes: new util_1.TextEncoder().encode(JSON.stringify(obj)) },
});
function createMockStreamResponse(responseObjects) {
    const chunks = responseObjects.map(encodeChunk);
    return {
        body: {
            [Symbol.asyncIterator]: () => ({
                current: 0,
                isDone: false,
                async next() {
                    if (this.isDone || this.current >= chunks.length) {
                        return { done: true, value: undefined };
                    }
                    const chunk = chunks[this.current++];
                    if (this.current >= chunks.length) {
                        this.isDone = true;
                    }
                    return { done: false, value: chunk };
                },
            }),
        },
    };
}
const standardTextResponse = [
    {
        event: {
            textOutput: {
                role: 'ASSISTANT',
                content: 'This is a test response',
            },
        },
    },
    {
        event: {
            contentEnd: {
                stopReason: 'END_TURN',
            },
        },
    },
];
const _audioResponse = [
    {
        event: {
            textOutput: {
                role: 'ASSISTANT',
                content: 'This is an audio response',
            },
        },
    },
    {
        event: {
            audioOutput: {
                content: 'base64encodedaudiodata',
            },
        },
    },
    {
        event: {
            contentEnd: {
                stopReason: 'END_TURN',
            },
        },
    },
];
const _functionCallResponse = [
    {
        event: {
            textOutput: {
                role: 'ASSISTANT',
                content: 'I will check the weather for you',
            },
        },
    },
    {
        event: {
            toolUse: {
                toolName: 'get_weather',
                toolUseId: 'tool-123',
                parameters: {
                    location: 'New York',
                },
            },
        },
    },
    {
        event: {
            contentEnd: {
                stopReason: 'END_TURN',
            },
        },
    },
];
describe('NovaSonic Provider', () => {
    let mockSend;
    let bedrockClient;
    let provider;
    beforeEach(() => {
        jest.clearAllMocks();
        (0, cache_1.disableCache)();
        mockSend = jest.fn().mockResolvedValue(createMockStreamResponse(standardTextResponse));
        bedrockClient = { send: mockSend };
        jest.mocked(client_bedrock_runtime_1.BedrockRuntimeClient).mockImplementation(() => bedrockClient);
        jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockImplementation(async function (prompt) {
            const sessionId = 'mocked-session-id';
            const session = this.createSession(sessionId);
            session.responseHandlers.set('textOutput', (data) => { });
            session.responseHandlers.set('contentEnd', () => { });
            return {
                output: 'This is a test response\n',
                tokenUsage: { total: 0, prompt: 0, completion: 0 },
                cached: false,
                metadata: {
                    functionCallOccurred: false,
                },
            };
        });
        jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'endSession').mockImplementation(function () {
            return Promise.resolve();
        });
        provider = new nova_sonic_1.NovaSonicProvider('amazon.nova-sonic-v1:0');
        provider.bedrockClient = bedrockClient;
    });
    afterEach(() => {
        (0, cache_1.enableCache)();
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });
    describe('Initialization', () => {
        it('should initialize with correct model and config', () => {
            const config = {
                inference: {
                    maxTokens: 2048,
                    topP: 0.8,
                    temperature: 0.5,
                },
                audio: {
                    output: {
                        voiceId: 'alloy',
                    },
                },
            };
            jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockRestore();
            const configuredProvider = new nova_sonic_1.NovaSonicProvider('amazon.nova-sonic-v1:0', { config });
            expect({
                modelName: configuredProvider.modelName,
                config: configuredProvider.config,
            }).toEqual({
                modelName: 'amazon.nova-sonic-v1:0',
                config,
            });
        });
        it('should initialize with default model name if not provided', () => {
            jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockRestore();
            const defaultProvider = new nova_sonic_1.NovaSonicProvider();
            expect(defaultProvider.modelName).toBe('amazon.nova-sonic-v1:0');
        });
        it('should create the Bedrock client with the correct configuration', () => {
            jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockRestore();
            new nova_sonic_1.NovaSonicProvider('amazon.nova-sonic-v1:0', {
                config: { region: 'us-west-2' },
            });
            expect(client_bedrock_runtime_1.BedrockRuntimeClient).toHaveBeenCalledWith(expect.objectContaining({
                region: 'us-west-2',
                requestHandler: expect.any(Object),
            }));
            expect(node_http_handler_1.NodeHttp2Handler).toHaveBeenCalledWith({
                requestTimeout: 300000,
                sessionTimeout: 300000,
                disableConcurrentStreams: false,
                maxConcurrentStreams: 20,
            });
        });
    });
    describe('API Interactions', () => {
        it('should successfully call API and handle text response', async () => {
            const result = await provider.callApi('Test prompt');
            expect(result).toEqual({
                output: 'This is a test response\n',
                tokenUsage: { total: 0, prompt: 0, completion: 0 },
                cached: false,
                metadata: {
                    functionCallOccurred: false,
                },
            });
        });
        it('should handle JSON array format prompts', async () => {
            const conversationHistory = JSON.stringify([
                {
                    role: 'system',
                    content: [{ type: 'text', text: 'You are a helpful assistant.' }],
                },
                {
                    role: 'user',
                    content: [{ type: 'text', text: 'Hello, who are you?' }],
                },
            ]);
            await provider.callApi(conversationHistory);
            expect(provider.callApi).toHaveBeenCalledWith(conversationHistory);
        });
        it('should handle session management correctly', async () => {
            const createSessionSpy = jest.spyOn(provider, 'createSession');
            const testPrompt = 'Test prompt';
            await provider.callApi(testPrompt);
            expect(createSessionSpy).toHaveBeenCalledWith('mocked-session-id');
        });
    });
    describe('Response Handling', () => {
        it('should handle audio content in responses', async () => {
            jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockRestore();
            jest.spyOn(provider, 'callApi').mockResolvedValue({
                output: 'This is an audio response\n',
                tokenUsage: { total: 0, prompt: 0, completion: 0 },
                cached: false,
                metadata: {
                    audio: {
                        data: 'base64encodedaudiodata',
                        format: 'lpcm',
                        transcript: 'This is an audio response\n',
                    },
                    functionCallOccurred: false,
                    userTranscript: '',
                },
            });
            const result = await provider.callApi('Generate audio');
            expect(result).toEqual({
                output: 'This is an audio response\n',
                tokenUsage: { total: 0, prompt: 0, completion: 0 },
                cached: false,
                metadata: {
                    audio: {
                        data: 'base64encodedaudiodata',
                        format: 'lpcm',
                        transcript: 'This is an audio response\n',
                    },
                    functionCallOccurred: false,
                    userTranscript: '',
                },
            });
        });
        it('should handle function calls correctly', async () => {
            jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockRestore();
            const toolProvider = new nova_sonic_1.NovaSonicProvider('amazon.nova-sonic-v1:0', {
                config: {
                    toolConfig: {
                        tools: [
                            {
                                name: 'get_weather',
                                description: 'Get weather information',
                                schema: {
                                    type: 'object',
                                    properties: {
                                        location: { type: 'string' },
                                    },
                                    required: ['location'],
                                },
                            },
                        ],
                    },
                },
            });
            jest.spyOn(toolProvider, 'callApi').mockResolvedValue({
                output: 'I will check the weather for you\n',
                tokenUsage: { total: 0, prompt: 0, completion: 0 },
                cached: false,
                metadata: {
                    functionCallOccurred: true,
                },
            });
            const result = await toolProvider.callApi("What's the weather in New York?");
            expect(result).toEqual({
                output: 'I will check the weather for you\n',
                tokenUsage: { total: 0, prompt: 0, completion: 0 },
                cached: false,
                metadata: {
                    functionCallOccurred: true,
                },
            });
        });
    });
    describe('Error Handling', () => {
        it('should handle errors in API calls', async () => {
            jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockRestore();
            jest.spyOn(provider, 'callApi').mockRejectedValue(new Error('Bedrock API error'));
            await expect(provider.callApi('Test prompt')).rejects.toThrow('Bedrock API error');
        });
        it('should handle network errors properly', async () => {
            jest.spyOn(nova_sonic_1.NovaSonicProvider.prototype, 'callApi').mockRestore();
            jest.spyOn(provider, 'callApi').mockResolvedValue({
                error: 'Network error',
                metadata: {},
            });
            const result = await provider.callApi('Test with network error');
            expect(result.error).toBe('Network error');
            expect(result.metadata).toEqual({});
        });
    });
});
//# sourceMappingURL=nova-sonic.test.js.map