"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../src/cache");
const guardrails_1 = __importDefault(require("../src/guardrails"));
jest.mock('../src/cache', () => ({
    fetchWithCache: jest.fn(),
}));
describe('guardrails', () => {
    const mockFetchResponse = {
        data: {
            model: 'test-model',
            results: [
                {
                    categories: {
                        test_category: true,
                    },
                    category_scores: {
                        test_category: 0.95,
                    },
                    flagged: true,
                },
            ],
        },
        cached: false,
        status: 200,
        statusText: 'OK',
    };
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockFetchResponse);
    });
    describe('guard', () => {
        it('should make a request to the guard endpoint', async () => {
            const input = 'test input';
            await guardrails_1.default.guard(input);
            expect(cache_1.fetchWithCache).toHaveBeenCalledWith(expect.stringContaining('/v1/guard'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
            }, undefined, 'json');
        });
        it('should return the parsed guard result', async () => {
            const result = await guardrails_1.default.guard('test input');
            expect(result).toEqual(mockFetchResponse.data);
        });
        it('should handle API errors', async () => {
            const errorMessage = 'API Error';
            jest.mocked(cache_1.fetchWithCache).mockRejectedValue(new Error(errorMessage));
            await expect(guardrails_1.default.guard('test input')).rejects.toThrow(errorMessage);
        });
        it('should handle empty API response', async () => {
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
                data: null,
                cached: false,
                status: 200,
                statusText: 'OK',
            });
            await expect(guardrails_1.default.guard('test input')).rejects.toThrow('No data returned from API');
        });
    });
    describe('pii', () => {
        const mockPiiResponse = {
            data: {
                model: 'test-model',
                results: [
                    {
                        categories: {
                            pii: true,
                        },
                        category_scores: {
                            pii: 1,
                        },
                        flagged: true,
                        payload: {
                            pii: [
                                {
                                    entity_type: 'EMAIL',
                                    start: 0,
                                    end: 17,
                                    pii: 'test@example.com',
                                },
                            ],
                        },
                    },
                ],
            },
            cached: false,
            status: 200,
            statusText: 'OK',
        };
        beforeEach(() => {
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockPiiResponse);
        });
        it('should make a request to the pii endpoint', async () => {
            const input = 'test@example.com';
            await guardrails_1.default.pii(input);
            expect(cache_1.fetchWithCache).toHaveBeenCalledWith(expect.stringContaining('/v1/pii'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
            }, undefined, 'json');
        });
        it('should return the parsed PII result', async () => {
            const result = await guardrails_1.default.pii('test@example.com');
            expect(result).toEqual(mockPiiResponse.data);
            expect(result.results[0].payload?.pii?.[0].entity_type).toBe('EMAIL');
        });
        it('should handle API errors', async () => {
            const errorMessage = 'API Error';
            jest.mocked(cache_1.fetchWithCache).mockRejectedValue(new Error(errorMessage));
            await expect(guardrails_1.default.pii('test input')).rejects.toThrow(errorMessage);
        });
    });
    describe('harm', () => {
        const mockHarmResponse = {
            data: {
                model: 'test-model',
                results: [
                    {
                        categories: {
                            hate: true,
                            violent_crimes: false,
                        },
                        category_scores: {
                            hate: 0.95,
                            violent_crimes: 0.1,
                        },
                        flagged: true,
                    },
                ],
            },
            cached: false,
            status: 200,
            statusText: 'OK',
        };
        beforeEach(() => {
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockHarmResponse);
        });
        it('should make a request to the harm endpoint', async () => {
            const input = 'test input';
            await guardrails_1.default.harm(input);
            expect(cache_1.fetchWithCache).toHaveBeenCalledWith(expect.stringContaining('/v1/harm'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
            }, undefined, 'json');
        });
        it('should return the parsed harm result', async () => {
            const result = await guardrails_1.default.harm('test input');
            expect(result).toEqual(mockHarmResponse.data);
            expect(result.results[0].categories.hate).toBe(true);
            expect(result.results[0].category_scores.hate).toBe(0.95);
        });
        it('should handle API errors', async () => {
            const errorMessage = 'API Error';
            jest.mocked(cache_1.fetchWithCache).mockRejectedValue(new Error(errorMessage));
            await expect(guardrails_1.default.harm('test input')).rejects.toThrow(errorMessage);
        });
    });
    describe('response structure', () => {
        it('should have correct guard result structure', async () => {
            const result = await guardrails_1.default.guard('test input');
            expect(result).toHaveProperty('model');
            expect(result).toHaveProperty('results');
            expect(Array.isArray(result.results)).toBe(true);
            expect(result.results[0]).toHaveProperty('categories');
            expect(result.results[0]).toHaveProperty('category_scores');
            expect(result.results[0]).toHaveProperty('flagged');
            expect(typeof result.results[0].flagged).toBe('boolean');
        });
        it('should have correct PII result structure with payload', async () => {
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
                data: {
                    model: 'test-model',
                    results: [
                        {
                            categories: {
                                pii: true,
                            },
                            category_scores: {
                                pii: 1,
                            },
                            flagged: true,
                            payload: {
                                pii: [
                                    {
                                        entity_type: 'EMAIL',
                                        start: 0,
                                        end: 17,
                                        pii: 'test@example.com',
                                    },
                                ],
                            },
                        },
                    ],
                },
                cached: false,
                status: 200,
                statusText: 'OK',
            });
            const result = await guardrails_1.default.pii('test input');
            expect(result).toHaveProperty('model');
            expect(result).toHaveProperty('results');
            expect(Array.isArray(result.results)).toBe(true);
            expect(result.results[0]).toHaveProperty('payload');
            expect(Array.isArray(result.results[0].payload?.pii)).toBe(true);
            const piiEntity = result.results[0].payload?.pii?.[0];
            expect(piiEntity).toBeDefined();
            expect(piiEntity).toEqual(expect.objectContaining({
                entity_type: expect.any(String),
                start: expect.any(Number),
                end: expect.any(Number),
                pii: expect.any(String),
            }));
        });
    });
    describe('adaptive function', () => {
        it('should call fetchWithCache with correct parameters', async () => {
            const mockResponse = {
                data: {
                    model: 'promptfoo-adaptive-prompt',
                    adaptedPrompt: 'Adapted test input',
                    modifications: [
                        {
                            type: 'substitution',
                            reason: 'Policy compliance',
                            original: 'test input',
                            modified: 'Adapted test input',
                        },
                    ],
                },
                cached: false,
                status: 200,
                statusText: 'OK',
            };
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
            const request = {
                prompt: 'test input',
                policies: ['No harmful content'],
            };
            const result = await guardrails_1.default.adaptive(request);
            expect(cache_1.fetchWithCache).toHaveBeenCalledWith('https://api.promptfoo.app/v1/adaptive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: 'test input',
                    policies: ['No harmful content'],
                }),
            }, undefined, 'json');
            expect(result).toEqual(mockResponse.data);
        });
        it('should handle missing policies parameter', async () => {
            const mockResponse = {
                data: {
                    model: 'promptfoo-adaptive-prompt',
                    adaptedPrompt: 'Adapted test input',
                    modifications: [],
                },
                cached: false,
                status: 200,
                statusText: 'OK',
            };
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
            const request = {
                prompt: 'test input',
            };
            const result = await guardrails_1.default.adaptive(request);
            expect(cache_1.fetchWithCache).toHaveBeenCalledWith('https://api.promptfoo.app/v1/adaptive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: 'test input',
                    policies: [],
                }),
            }, undefined, 'json');
            expect(result).toEqual(mockResponse.data);
        });
    });
});
//# sourceMappingURL=guardrails.test.js.map