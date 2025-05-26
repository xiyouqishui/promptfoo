"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const image_1 = require("../../../src/providers/openai/image");
jest.mock('../../../src/cache', () => ({
    fetchWithCache: jest.fn(),
}));
describe('OpenAI Image Provider Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('validateSizeForModel', () => {
        it('should validate valid DALL-E 3 sizes', () => {
            expect((0, image_1.validateSizeForModel)('1024x1024', 'dall-e-3')).toEqual({ valid: true });
            expect((0, image_1.validateSizeForModel)('1792x1024', 'dall-e-3')).toEqual({ valid: true });
            expect((0, image_1.validateSizeForModel)('1024x1792', 'dall-e-3')).toEqual({ valid: true });
        });
        it('should invalidate incorrect DALL-E 3 sizes', () => {
            const result = (0, image_1.validateSizeForModel)('512x512', 'dall-e-3');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('Invalid size "512x512" for DALL-E 3');
        });
        it('should validate valid DALL-E 2 sizes', () => {
            expect((0, image_1.validateSizeForModel)('256x256', 'dall-e-2')).toEqual({ valid: true });
            expect((0, image_1.validateSizeForModel)('512x512', 'dall-e-2')).toEqual({ valid: true });
            expect((0, image_1.validateSizeForModel)('1024x1024', 'dall-e-2')).toEqual({ valid: true });
        });
        it('should invalidate incorrect DALL-E 2 sizes', () => {
            const result = (0, image_1.validateSizeForModel)('1792x1024', 'dall-e-2');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('Invalid size "1792x1024" for DALL-E 2');
        });
        it('should validate any size for unknown models', () => {
            expect((0, image_1.validateSizeForModel)('any-size', 'unknown-model')).toEqual({ valid: true });
        });
    });
    describe('formatOutput', () => {
        it('should format URL output correctly', () => {
            const data = {
                data: [{ url: 'https://example.com/image.png' }],
            };
            const prompt = 'A test prompt';
            const result = (0, image_1.formatOutput)(data, prompt, 'url');
            expect(typeof result).toBe('string');
            expect(result).toContain('![');
            expect(result).toContain('](https://example.com/image.png)');
        });
        it('should sanitize prompt text with special characters', () => {
            const data = {
                data: [{ url: 'https://example.com/image.png' }],
            };
            const prompt = 'A test [with] brackets\nand newlines';
            const result = (0, image_1.formatOutput)(data, prompt, 'url');
            expect(typeof result).toBe('string');
            expect(result).toContain('A test (with) brackets and newlines');
        });
        it('should format base64 output correctly', () => {
            const mockData = {
                data: [{ b64_json: 'base64encodeddata' }],
            };
            const result = (0, image_1.formatOutput)(mockData, 'prompt', 'b64_json');
            expect(typeof result).toBe('string');
            expect(result).toBe(JSON.stringify(mockData));
        });
        it('should return error when URL is missing', () => {
            const data = { data: [{}] };
            const result = (0, image_1.formatOutput)(data, 'prompt');
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('error');
        });
        it('should return error when base64 data is missing', () => {
            const data = { data: [{}] };
            const result = (0, image_1.formatOutput)(data, 'prompt', 'b64_json');
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('error');
        });
    });
    describe('prepareRequestBody', () => {
        it('should prepare basic request body correctly', () => {
            const model = 'dall-e-2';
            const prompt = 'A test prompt';
            const size = '512x512';
            const responseFormat = 'url';
            const config = {};
            const body = (0, image_1.prepareRequestBody)(model, prompt, size, responseFormat, config);
            expect(body).toEqual({
                model,
                prompt,
                size,
                n: 1,
                response_format: responseFormat,
            });
        });
        it('should include n parameter from config', () => {
            const config = { n: 2 };
            const body = (0, image_1.prepareRequestBody)('dall-e-2', 'prompt', '512x512', 'url', config);
            expect(body.n).toBe(2);
        });
        it('should include DALL-E 3 specific parameters', () => {
            const config = {
                quality: 'hd',
                style: 'vivid',
            };
            const body = (0, image_1.prepareRequestBody)('dall-e-3', 'prompt', '1024x1024', 'url', config);
            expect(body).toEqual({
                model: 'dall-e-3',
                prompt: 'prompt',
                size: '1024x1024',
                n: 1,
                response_format: 'url',
                quality: 'hd',
                style: 'vivid',
            });
        });
        it('should not include DALL-E 3 parameters for DALL-E 2', () => {
            const config = {
                quality: 'hd',
                style: 'vivid',
            };
            const body = (0, image_1.prepareRequestBody)('dall-e-2', 'prompt', '512x512', 'url', config);
            expect(body).not.toHaveProperty('quality');
            expect(body).not.toHaveProperty('style');
        });
    });
    describe('calculateImageCost', () => {
        it('should calculate correct cost for DALL-E 2', () => {
            expect((0, image_1.calculateImageCost)('dall-e-2', '256x256')).toBe(image_1.DALLE2_COSTS['256x256']);
            expect((0, image_1.calculateImageCost)('dall-e-2', '512x512')).toBe(image_1.DALLE2_COSTS['512x512']);
            expect((0, image_1.calculateImageCost)('dall-e-2', '1024x1024')).toBe(image_1.DALLE2_COSTS['1024x1024']);
        });
        it('should use default size cost if size is invalid for DALL-E 2', () => {
            expect((0, image_1.calculateImageCost)('dall-e-2', 'invalid-size')).toBe(image_1.DALLE2_COSTS['1024x1024']);
        });
        it('should calculate correct cost for standard DALL-E 3', () => {
            expect((0, image_1.calculateImageCost)('dall-e-3', '1024x1024', 'standard')).toBe(image_1.DALLE3_COSTS['standard_1024x1024']);
            expect((0, image_1.calculateImageCost)('dall-e-3', '1024x1792', 'standard')).toBe(image_1.DALLE3_COSTS['standard_1024x1792']);
        });
        it('should calculate correct cost for HD DALL-E 3', () => {
            expect((0, image_1.calculateImageCost)('dall-e-3', '1024x1024', 'hd')).toBe(image_1.DALLE3_COSTS['hd_1024x1024']);
            expect((0, image_1.calculateImageCost)('dall-e-3', '1024x1792', 'hd')).toBe(image_1.DALLE3_COSTS['hd_1024x1792']);
        });
        it('should use standard quality if quality is not specified for DALL-E 3', () => {
            expect((0, image_1.calculateImageCost)('dall-e-3', '1024x1024')).toBe(image_1.DALLE3_COSTS['standard_1024x1024']);
        });
        it('should use default cost if model is unknown', () => {
            expect((0, image_1.calculateImageCost)('unknown-model', '1024x1024')).toBe(0.04);
        });
        it('should multiply cost by number of images', () => {
            expect((0, image_1.calculateImageCost)('dall-e-2', '256x256', undefined, 3)).toBe(image_1.DALLE2_COSTS['256x256'] * 3);
            expect((0, image_1.calculateImageCost)('dall-e-3', '1024x1024', 'standard', 2)).toBe(image_1.DALLE3_COSTS['standard_1024x1024'] * 2);
        });
        it('should use default cost for models other than DALL-E 2 or 3', () => {
            expect((0, image_1.calculateImageCost)('gpt-4', '1024x1024')).toBe(0.04);
            expect((0, image_1.calculateImageCost)('', '1024x1024')).toBe(0.04);
        });
    });
    describe('callOpenAiImageApi', () => {
        it('should call fetchWithCache with correct parameters', async () => {
            const mockResponse = {
                data: { some: 'data' },
                cached: false,
                status: 200,
                statusText: 'OK',
            };
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
            const url = 'https://api.openai.com/v1/images/generations';
            const body = { model: 'dall-e-3', prompt: 'test' };
            const headers = { 'Content-Type': 'application/json' };
            const timeout = 30000;
            const result = await (0, image_1.callOpenAiImageApi)(url, body, headers, timeout);
            expect(cache_1.fetchWithCache).toHaveBeenCalledWith(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            }, timeout);
            expect(result).toEqual(mockResponse);
        });
    });
    describe('processApiResponse', () => {
        it('should handle error in data', async () => {
            const mockDeleteFromCache = jest.fn();
            const data = {
                error: { message: 'Some API error' },
                deleteFromCache: mockDeleteFromCache,
            };
            const result = await (0, image_1.processApiResponse)(data, 'prompt', 'url', false, 'dall-e-2', '512x512');
            expect(mockDeleteFromCache).toHaveBeenCalledWith();
            expect(result).toHaveProperty('error');
            expect(result.error).toContain('Some API error');
        });
        it('should return formatted output for successful response', async () => {
            const data = {
                data: [{ url: 'https://example.com/image.png' }],
            };
            const result = await (0, image_1.processApiResponse)(data, 'test prompt', 'url', false, 'dall-e-2', '512x512');
            expect(result).toHaveProperty('output');
            expect(result).toHaveProperty('cost');
            expect(result.cost).toBe(image_1.DALLE2_COSTS['512x512']);
        });
        it('should include base64 flags for b64_json response format', async () => {
            const data = {
                data: [{ b64_json: 'base64data' }],
            };
            const result = await (0, image_1.processApiResponse)(data, 'test prompt', 'b64_json', false, 'dall-e-3', '1024x1024', 'standard');
            expect(result).toHaveProperty('isBase64', true);
            expect(result).toHaveProperty('format', 'json');
        });
        it('should set cost to 0 for cached responses', async () => {
            const data = {
                data: [{ url: 'https://example.com/image.png' }],
            };
            const result = await (0, image_1.processApiResponse)(data, 'test prompt', 'url', true, 'dall-e-2', '512x512');
            expect(result.cost).toBe(0);
        });
        it('should handle errors during output formatting', async () => {
            const mockDeleteFromCache = jest.fn();
            const data = {
                data: undefined,
                deleteFromCache: mockDeleteFromCache,
            };
            const result = await (0, image_1.processApiResponse)(data, 'test prompt', 'url', false, 'dall-e-2', '512x512');
            expect(result).toHaveProperty('error');
            expect(result.error).toContain('API error: TypeError');
            expect(result.error).toContain('Cannot read properties of undefined');
            expect(mockDeleteFromCache).toHaveBeenCalledWith();
        });
        it('should handle a specific error case with malformed response', async () => {
            const mockDeleteFromCache = jest.fn();
            const data = {
                data: { data: 'not-an-array' },
                deleteFromCache: mockDeleteFromCache,
            };
            const result = await (0, image_1.processApiResponse)(data, 'test prompt', 'url', false, 'dall-e-2', '512x512');
            expect(result).toHaveProperty('error');
            expect(result.error).toContain('API error:');
            expect(mockDeleteFromCache).toHaveBeenCalledWith();
        });
    });
});
//# sourceMappingURL=image.functions.test.js.map