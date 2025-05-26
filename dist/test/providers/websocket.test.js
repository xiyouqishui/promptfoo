"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const websocket_1 = require("../../src/providers/websocket");
jest.mock('ws');
describe('createTransformResponse', () => {
    it('should use provided function parser', () => {
        const parser = (data) => ({ output: `parsed-${data}` });
        const transform = (0, websocket_1.createTransformResponse)(parser);
        expect(transform('test')).toEqual({ output: 'parsed-test' });
    });
    it('should create function from string parser', () => {
        const parser = '({ output: `parsed-${data}` })';
        const transform = (0, websocket_1.createTransformResponse)(parser);
        expect(transform('test')).toEqual({ output: 'parsed-test' });
    });
    it('should return default transform if no parser provided', () => {
        const transform = (0, websocket_1.createTransformResponse)(undefined);
        expect(transform('test')).toEqual({ output: 'test' });
    });
});
describe('WebSocketProvider', () => {
    let mockWs;
    let provider;
    beforeEach(() => {
        mockWs = {
            on: jest.fn(),
            send: jest.fn(),
            close: jest.fn(),
            onmessage: jest.fn(),
            onerror: jest.fn(),
            onopen: jest.fn(),
        };
        jest.mocked(ws_1.default).mockImplementation(() => mockWs);
        provider = new websocket_1.WebSocketProvider('ws://test.com', {
            config: {
                messageTemplate: '{{ prompt }}',
                timeoutMs: 1000,
            },
        });
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('should initialize with correct config', () => {
        expect(provider.url).toBe('ws://test.com');
        expect(provider.config.messageTemplate).toBe('{{ prompt }}');
    });
    it('should throw if messageTemplate is missing', () => {
        expect(() => {
            new websocket_1.WebSocketProvider('ws://test.com', {
                config: {},
            });
        }).toThrow('Expected WebSocket provider ws://test.com to have a config containing {messageTemplate}');
    });
    it('should send message and handle response', async () => {
        const responseData = { result: 'test response' };
        jest.mocked(ws_1.default).mockImplementation(() => {
            setTimeout(() => {
                mockWs.onopen?.({ type: 'open', target: mockWs });
                setTimeout(() => {
                    mockWs.onmessage?.({ data: JSON.stringify(responseData) });
                }, 10);
            }, 10);
            return mockWs;
        });
        const response = await provider.callApi('test prompt');
        expect(response).toEqual({ output: { output: responseData } });
    });
    it('should handle WebSocket errors', async () => {
        jest.mocked(ws_1.default).mockImplementation(() => {
            setTimeout(() => {
                mockWs.onerror?.({
                    type: 'error',
                    error: new Error('connection failed'),
                    message: 'connection failed',
                });
            }, 10);
            return mockWs;
        });
        const response = await provider.callApi('test prompt');
        expect(response.error).toContain('WebSocket error');
    });
    it('should handle timeout', async () => {
        provider = new websocket_1.WebSocketProvider('ws://test.com', {
            config: {
                messageTemplate: '{{ prompt }}',
                timeoutMs: 100,
            },
        });
        const response = await provider.callApi('test prompt');
        expect(response).toEqual({ error: 'WebSocket request timed out' });
    });
    it('should handle non-JSON response', async () => {
        jest.mocked(ws_1.default).mockImplementation(() => {
            setTimeout(() => {
                mockWs.onopen?.({ type: 'open', target: mockWs });
                setTimeout(() => {
                    mockWs.onmessage?.({ data: 'plain text response' });
                }, 10);
            }, 10);
            return mockWs;
        });
        const response = await provider.callApi('test prompt');
        expect(response).toEqual({ output: { output: 'plain text response' } });
    });
    it('should use custom response transformer', async () => {
        provider = new websocket_1.WebSocketProvider('ws://test.com', {
            config: {
                messageTemplate: '{{ prompt }}',
                transformResponse: (data) => ({ output: `transformed-${data}` }),
            },
        });
        jest.mocked(ws_1.default).mockImplementation(() => {
            setTimeout(() => {
                mockWs.onopen?.({ type: 'open', target: mockWs });
                setTimeout(() => {
                    mockWs.onmessage?.({ data: 'test' });
                }, 10);
            }, 10);
            return mockWs;
        });
        const response = await provider.callApi('test prompt');
        expect(response).toEqual({ output: { output: 'transformed-test' } });
    });
});
//# sourceMappingURL=websocket.test.js.map