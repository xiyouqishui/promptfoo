"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const embedding_1 = require("../../../src/providers/openai/embedding");
jest.mock('../../../src/cache');
describe('OpenAI Provider', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        (0, cache_1.disableCache)();
    });
    afterEach(() => {
        (0, cache_1.enableCache)();
    });
    describe('OpenAiEmbeddingProvider', () => {
        const provider = new embedding_1.OpenAiEmbeddingProvider('text-embedding-3-large', {
            config: {
                apiKey: 'test-key',
            },
        });
        it('should call embedding API successfully', async () => {
            const mockResponse = {
                data: [
                    {
                        embedding: [0.1, 0.2, 0.3],
                    },
                ],
                usage: {
                    total_tokens: 10,
                    prompt_tokens: 0,
                    completion_tokens: 0,
                },
            };
            jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
                data: mockResponse,
                cached: false,
                status: 200,
                statusText: 'OK',
            });
            const result = await provider.callEmbeddingApi('test text');
            expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
            expect(result.tokenUsage).toEqual({
                total: 10,
                prompt: 0,
                completion: 0,
            });
        });
        it('should handle API errors', async () => {
            jest.mocked(cache_1.fetchWithCache).mockRejectedValue(new Error('API error'));
            await expect(provider.callEmbeddingApi('test text')).rejects.toThrow('API error');
        });
    });
});
//# sourceMappingURL=embedding.test.js.map