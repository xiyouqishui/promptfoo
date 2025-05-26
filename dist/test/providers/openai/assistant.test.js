"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = __importDefault(require("openai"));
const cache_1 = require("../../../src/cache");
const assistant_1 = require("../../../src/providers/openai/assistant");
jest.mock('openai');
describe('OpenAI Provider', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (0, cache_1.disableCache)();
    });
    afterEach(() => {
        (0, cache_1.enableCache)();
    });
    describe('OpenAiAssistantProvider', () => {
        let mockClient;
        beforeEach(() => {
            jest.clearAllMocks();
            mockClient = {
                beta: {
                    threads: {
                        createAndRun: jest.fn(),
                        runs: {
                            retrieve: jest.fn(),
                            submitToolOutputs: jest.fn(),
                            steps: {
                                list: jest.fn(),
                            },
                        },
                        messages: {
                            retrieve: jest.fn(),
                        },
                    },
                },
            };
            jest.mocked(openai_1.default).mockImplementation(function () {
                Object.assign(this, mockClient);
                return this;
            });
        });
        const provider = new assistant_1.OpenAiAssistantProvider('test-assistant-id', {
            config: {
                apiKey: 'test-key',
                organization: 'test-org',
                functionToolCallbacks: {
                    test_function: async (args) => 'Function result',
                },
            },
        });
        it('should handle successful assistant completion', async () => {
            const mockRun = {
                id: 'run_123',
                thread_id: 'thread_123',
                status: 'completed',
            };
            const mockSteps = {
                data: [
                    {
                        id: 'step_1',
                        step_details: {
                            type: 'message_creation',
                            message_creation: {
                                message_id: 'msg_1',
                            },
                        },
                    },
                ],
            };
            const mockMessage = {
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: {
                            value: 'Test response',
                        },
                    },
                ],
            };
            mockClient.beta.threads.createAndRun.mockResolvedValue(mockRun);
            mockClient.beta.threads.runs.retrieve.mockResolvedValue(mockRun);
            mockClient.beta.threads.runs.steps.list.mockResolvedValue(mockSteps);
            mockClient.beta.threads.messages.retrieve.mockResolvedValue(mockMessage);
            const result = await provider.callApi('Test prompt');
            expect(result.output).toBe('[Assistant] Test response');
            expect(mockClient.beta.threads.createAndRun).toHaveBeenCalledTimes(1);
            expect(mockClient.beta.threads.runs.retrieve).toHaveBeenCalledTimes(1);
            expect(mockClient.beta.threads.runs.steps.list).toHaveBeenCalledTimes(1);
            expect(mockClient.beta.threads.messages.retrieve).toHaveBeenCalledTimes(1);
        });
        it('should handle function calling', async () => {
            const mockRun = {
                id: 'run_123',
                thread_id: 'thread_123',
                status: 'requires_action',
                required_action: {
                    type: 'submit_tool_outputs',
                    submit_tool_outputs: {
                        tool_calls: [
                            {
                                id: 'call_123',
                                type: 'function',
                                function: {
                                    name: 'test_function',
                                    arguments: '{"arg": "value"}',
                                },
                            },
                        ],
                    },
                },
            };
            const mockCompletedRun = {
                ...mockRun,
                status: 'completed',
                required_action: null,
            };
            const mockSteps = {
                data: [
                    {
                        id: 'step_1',
                        step_details: {
                            type: 'tool_calls',
                            tool_calls: [
                                {
                                    type: 'function',
                                    function: {
                                        name: 'test_function',
                                        arguments: '{"arg": "value"}',
                                        output: 'Function result',
                                    },
                                },
                            ],
                        },
                    },
                ],
            };
            mockClient.beta.threads.createAndRun.mockResolvedValue(mockRun);
            mockClient.beta.threads.runs.retrieve
                .mockResolvedValueOnce(mockRun)
                .mockResolvedValueOnce(mockCompletedRun);
            mockClient.beta.threads.runs.submitToolOutputs.mockResolvedValue(mockCompletedRun);
            mockClient.beta.threads.runs.steps.list.mockResolvedValue(mockSteps);
            const result = await provider.callApi('Test prompt');
            expect(result.output).toBe('[Call function test_function with arguments {"arg": "value"}]\n\n[Function output: Function result]');
            expect(mockClient.beta.threads.createAndRun).toHaveBeenCalledTimes(1);
            expect(mockClient.beta.threads.runs.retrieve).toHaveBeenCalledTimes(2);
            expect(mockClient.beta.threads.runs.submitToolOutputs).toHaveBeenCalledTimes(1);
            expect(mockClient.beta.threads.runs.steps.list).toHaveBeenCalledTimes(1);
        });
        it('should handle run failures', async () => {
            const mockRun = {
                id: 'run_123',
                thread_id: 'thread_123',
                status: 'failed',
                last_error: {
                    message: 'Test error message',
                },
            };
            mockClient.beta.threads.createAndRun.mockResolvedValue(mockRun);
            mockClient.beta.threads.runs.retrieve.mockResolvedValue(mockRun);
            const result = await provider.callApi('Test prompt');
            expect(result.error).toBe('Thread run failed: Test error message');
            expect(mockClient.beta.threads.createAndRun).toHaveBeenCalledTimes(1);
            expect(mockClient.beta.threads.runs.retrieve).toHaveBeenCalledTimes(1);
        });
        it('should handle API errors', async () => {
            const error = new openai_1.default.APIError(500, {}, 'API Error', {});
            Object.defineProperty(error, 'type', {
                value: 'API Error',
                writable: true,
                configurable: true,
            });
            Object.defineProperty(error, 'message', {
                value: 'API Error',
                writable: true,
                configurable: true,
            });
            mockClient.beta.threads.createAndRun.mockRejectedValueOnce(error);
            const provider = new assistant_1.OpenAiAssistantProvider('test-assistant-id', {
                config: {
                    apiKey: 'test-key',
                },
            });
            const result = await provider.callApi('Test prompt');
            expect(result.error).toBe('API error: API Error API Error');
            expect(mockClient.beta.threads.createAndRun).toHaveBeenCalledTimes(1);
        });
        it('should handle missing API key', async () => {
            const providerNoKey = new assistant_1.OpenAiAssistantProvider('test-assistant-id');
            process.env.OPENAI_API_KEY = '';
            await expect(providerNoKey.callApi('Test prompt')).rejects.toThrow('OpenAI API key is not set');
            process.env.OPENAI_API_KEY = 'test-key'; // Restore for other tests
        });
    });
});
//# sourceMappingURL=assistant.test.js.map