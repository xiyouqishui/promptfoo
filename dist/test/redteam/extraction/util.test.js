"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const constants_1 = require("../../../src/constants");
const logger_1 = __importDefault(require("../../../src/logger"));
const shared_1 = require("../../../src/providers/shared");
const util_1 = require("../../../src/redteam/extraction/util");
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
jest.mock('../../../src/cache', () => ({
    fetchWithCache: jest.fn(),
}));
jest.mock('../../../src/redteam/remoteGeneration', () => ({
    getRemoteGenerationUrl: jest.fn().mockReturnValue('https://api.promptfoo.app/api/v1/task'),
}));
describe('fetchRemoteGeneration', () => {
    beforeAll(() => {
        delete process.env.PROMPTFOO_REMOTE_GENERATION_URL;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(remoteGeneration_1.getRemoteGenerationUrl).mockReturnValue('https://api.promptfoo.app/api/v1/task');
    });
    it('should fetch remote generation for purpose task', async () => {
        const mockResponse = {
            data: {
                task: 'purpose',
                result: 'This is a purpose',
            },
            status: 200,
            statusText: 'OK',
            cached: false,
        };
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
        const result = await (0, util_1.fetchRemoteGeneration)('purpose', ['prompt1', 'prompt2']);
        expect(result).toBe('This is a purpose');
        expect(cache_1.fetchWithCache).toHaveBeenCalledWith('https://api.promptfoo.app/api/v1/task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'purpose',
                prompts: ['prompt1', 'prompt2'],
                version: constants_1.VERSION,
                email: null,
            }),
        }, shared_1.REQUEST_TIMEOUT_MS, 'json');
    });
    it('should fetch remote generation for entities task', async () => {
        const mockResponse = {
            data: {
                task: 'entities',
                result: ['Entity1', 'Entity2'],
            },
            status: 200,
            statusText: 'OK',
            cached: false,
        };
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
        const result = await (0, util_1.fetchRemoteGeneration)('entities', ['prompt1', 'prompt2']);
        expect(result).toEqual(['Entity1', 'Entity2']);
        expect(cache_1.fetchWithCache).toHaveBeenCalledWith('https://api.promptfoo.app/api/v1/task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'entities',
                prompts: ['prompt1', 'prompt2'],
                version: constants_1.VERSION,
                email: null,
            }),
        }, shared_1.REQUEST_TIMEOUT_MS, 'json');
    });
    it('should throw an error when fetchWithCache fails', async () => {
        const mockError = new Error('Network error');
        jest.mocked(cache_1.fetchWithCache).mockRejectedValue(mockError);
        await expect((0, util_1.fetchRemoteGeneration)('purpose', ['prompt'])).rejects.toThrow('Network error');
        expect(logger_1.default.warn).toHaveBeenCalledWith("Error using remote generation for task 'purpose': Error: Network error");
    });
    it('should throw an error when response parsing fails', async () => {
        const mockResponse = {
            data: {
                task: 'purpose',
                // Missing 'result' field
            },
            status: 200,
            statusText: 'OK',
            cached: false,
        };
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
        await expect((0, util_1.fetchRemoteGeneration)('purpose', ['prompt'])).rejects.toThrow('Invalid input');
        expect(logger_1.default.warn).toHaveBeenCalledWith(expect.stringContaining("Error using remote generation for task 'purpose':"));
    });
    it('should use custom remote generation URL when provided', async () => {
        const customUrl = 'https://custom-api.example.com/generate';
        jest.mocked(remoteGeneration_1.getRemoteGenerationUrl).mockReturnValue(customUrl);
        const mockResponse = {
            data: {
                task: 'purpose',
                result: 'This is a purpose',
            },
            status: 200,
            statusText: 'OK',
            cached: false,
        };
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
        await (0, util_1.fetchRemoteGeneration)('purpose', ['prompt1']);
        expect(cache_1.fetchWithCache).toHaveBeenCalledWith(customUrl, expect.any(Object), shared_1.REQUEST_TIMEOUT_MS, 'json');
    });
});
describe('RedTeamGenerationResponse', () => {
    it('should validate correct response structure', () => {
        const validResponse = {
            task: 'purpose',
            result: 'This is a purpose',
        };
        expect(() => util_1.RedTeamGenerationResponse.parse(validResponse)).not.toThrow();
    });
    it('should throw error for invalid response structure', () => {
        const invalidResponse = {
            task: 'purpose',
            // Missing 'result' field
        };
        expect(() => util_1.RedTeamGenerationResponse.parse(invalidResponse)).toThrow('Invalid input');
    });
    it('should validate response with string result', () => {
        const response = {
            task: 'purpose',
            result: 'This is a purpose',
        };
        expect(() => util_1.RedTeamGenerationResponse.parse(response)).not.toThrow();
    });
    it('should validate response with array result', () => {
        const response = {
            task: 'entities',
            result: ['Entity1', 'Entity2'],
        };
        expect(() => util_1.RedTeamGenerationResponse.parse(response)).not.toThrow();
    });
});
describe('Extraction Utils', () => {
    let provider;
    beforeEach(() => {
        provider = {
            callApi: jest.fn().mockResolvedValue({ output: 'test output' }),
            id: jest.fn().mockReturnValue('test-provider'),
        };
        jest.clearAllMocks();
    });
    describe('callExtraction', () => {
        it('should call API with formatted chat message and process output correctly', async () => {
            const result = await (0, util_1.callExtraction)(provider, 'test prompt', (output) => output.toUpperCase());
            expect(result).toBe('TEST OUTPUT');
            expect(provider.callApi).toHaveBeenCalledWith(JSON.stringify([{ role: 'user', content: 'test prompt' }]));
        });
        it('should throw an error if API call fails', async () => {
            const error = new Error('API error');
            jest.mocked(provider.callApi).mockResolvedValue({ error: error.message });
            await expect((0, util_1.callExtraction)(provider, 'test prompt', jest.fn())).rejects.toThrow('Failed to perform extraction: API error');
        });
        it('should throw an error if output is not a string', async () => {
            jest.mocked(provider.callApi).mockResolvedValue({ output: 123 });
            await expect((0, util_1.callExtraction)(provider, 'test prompt', jest.fn())).rejects.toThrow('Invalid extraction output: expected string, got: 123');
        });
        it('should handle empty string output', async () => {
            jest.mocked(provider.callApi).mockResolvedValue({ output: '' });
            const result = await (0, util_1.callExtraction)(provider, 'test prompt', (output) => output.length);
            expect(result).toBe(0);
        });
        it('should handle null output', async () => {
            jest.mocked(provider.callApi).mockResolvedValue({ output: null });
            await expect((0, util_1.callExtraction)(provider, 'test prompt', jest.fn())).rejects.toThrow('Invalid extraction output: expected string, got: null');
        });
        it('should handle undefined output', async () => {
            jest.mocked(provider.callApi).mockResolvedValue({ output: undefined });
            await expect((0, util_1.callExtraction)(provider, 'test prompt', jest.fn())).rejects.toThrow('Invalid extraction output: expected string, got: undefined');
        });
    });
    describe('formatPrompts', () => {
        it('should format prompts correctly', () => {
            const formattedPrompts = (0, util_1.formatPrompts)(['prompt1', 'prompt2']);
            expect(formattedPrompts).toBe('<Prompt>\nprompt1\n</Prompt>\n<Prompt>\nprompt2\n</Prompt>');
        });
    });
});
//# sourceMappingURL=util.test.js.map