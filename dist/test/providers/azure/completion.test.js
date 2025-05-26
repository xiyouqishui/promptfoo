"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const completion_1 = require("../../../src/providers/azure/completion");
jest.mock('../../../src/cache', () => ({
    fetchWithCache: jest.fn(),
}));
describe('AzureCompletionProvider', () => {
    it('should handle basic completion with caching', async () => {
        jest.mocked(cache_1.fetchWithCache).mockResolvedValueOnce({
            data: {
                choices: [{ text: 'hello' }],
                usage: { total_tokens: 10, prompt_tokens: 5, completion_tokens: 5 },
            },
            cached: false,
        });
        jest.mocked(cache_1.fetchWithCache).mockResolvedValueOnce({
            data: {
                choices: [{ text: 'hello' }],
                usage: { total_tokens: 10 },
            },
            cached: true,
        });
        const provider = new completion_1.AzureCompletionProvider('test', {
            config: { apiHost: 'test.azure.com' },
        });
        provider.authHeaders = {};
        const result1 = await provider.callApi('test prompt');
        const result2 = await provider.callApi('test prompt');
        expect(result1.output).toBe('hello');
        expect(result2.output).toBe('hello');
        expect(result1.tokenUsage).toEqual({ total: 10, prompt: 5, completion: 5 });
        expect(result2.tokenUsage).toEqual({ cached: 10, total: 10 });
    });
});
//# sourceMappingURL=completion.test.js.map