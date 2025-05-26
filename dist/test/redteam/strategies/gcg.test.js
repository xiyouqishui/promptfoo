"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const accounts_1 = require("../../../src/globalConfig/accounts");
const logger_1 = __importDefault(require("../../../src/logger"));
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
const gcg_1 = require("../../../src/redteam/strategies/gcg");
jest.mock('../../../src/cache');
jest.mock('../../../src/globalConfig/accounts');
jest.mock('../../../src/redteam/remoteGeneration');
jest.mock('cli-progress');
describe('gcg strategy', () => {
    const mockFetchWithCache = jest.mocked(cache_1.fetchWithCache);
    const mockGetUserEmail = jest.mocked(accounts_1.getUserEmail);
    const mockNeverGenerateRemote = jest.mocked(remoteGeneration_1.neverGenerateRemote);
    const mockGetRemoteGenerationUrl = jest.mocked(remoteGeneration_1.getRemoteGenerationUrl);
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUserEmail.mockReturnValue('test@example.com');
        mockNeverGenerateRemote.mockReturnValue(false);
        mockGetRemoteGenerationUrl.mockReturnValue('http://test-url');
    });
    const testCases = [
        {
            vars: {
                prompt: 'original prompt',
            },
            assert: [
                {
                    type: 'equals',
                    value: 'expected',
                    metric: 'test-metric',
                },
            ],
        },
    ];
    it('should generate GCG test cases successfully', async () => {
        mockFetchWithCache.mockResolvedValueOnce({
            data: {
                responses: ['generated response 1', 'generated response 2'],
            },
            cached: false,
            status: 200,
            statusText: 'OK',
        });
        const result = await (0, gcg_1.addGcgTestCases)(testCases, 'prompt', {});
        expect(result?.[0]?.vars?.prompt).toBe('generated response 1');
        expect(result?.[1]?.vars?.prompt).toBe('generated response 2');
        expect(result?.[0]?.metadata?.strategyId).toBe('gcg');
        expect(result?.[0]?.assert?.[0].metric).toBe('test-metric/GCG');
        expect(mockFetchWithCache).toHaveBeenCalledWith('http://test-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task: 'gcg',
                query: 'original prompt',
                email: 'test@example.com',
            }),
        }, expect.any(Number));
    });
    it('should throw error when remote generation is disabled', async () => {
        mockNeverGenerateRemote.mockReturnValue(true);
        await expect((0, gcg_1.addGcgTestCases)(testCases, 'prompt', {})).rejects.toThrow('GCG strategy requires remote generation to be enabled');
    });
    it('should handle API errors gracefully', async () => {
        mockFetchWithCache.mockResolvedValueOnce({
            data: { error: 'API Error' },
            cached: false,
            status: 500,
            statusText: 'Error',
        });
        const result = await (0, gcg_1.addGcgTestCases)(testCases, 'prompt', {});
        expect(result).toHaveLength(0);
        expect(logger_1.default.warn).toHaveBeenCalledWith('No GCG test cases were generated');
    });
    it('should handle network errors gracefully', async () => {
        mockFetchWithCache.mockRejectedValueOnce(new Error('Network error'));
        const result = await (0, gcg_1.addGcgTestCases)(testCases, 'prompt', {});
        expect(result).toHaveLength(0);
        expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error in GCG generation'));
    });
    it('should respect configuration options', async () => {
        mockFetchWithCache.mockResolvedValueOnce({
            data: {
                responses: ['generated response'],
            },
            cached: false,
            status: 200,
            statusText: 'OK',
        });
        const config = { n: 1 };
        await (0, gcg_1.addGcgTestCases)(testCases, 'prompt', config);
        expect(mockFetchWithCache).toHaveBeenCalledWith('http://test-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                task: 'gcg',
                query: 'original prompt',
                n: 1,
                email: 'test@example.com',
            }),
        }, expect.any(Number));
    });
    it('should handle test cases without assert property', async () => {
        const testCasesWithoutAssert = [
            {
                vars: {
                    prompt: 'test prompt',
                },
            },
        ];
        mockFetchWithCache.mockResolvedValueOnce({
            data: {
                responses: ['generated response'],
            },
            cached: false,
            status: 200,
            statusText: 'OK',
        });
        const result = await (0, gcg_1.addGcgTestCases)(testCasesWithoutAssert, 'prompt', {});
        expect(result?.[0]?.vars?.prompt).toBe('generated response');
        expect(result?.[0]?.assert).toBeUndefined();
    });
    it('should maintain concurrency limit', async () => {
        const manyTestCases = Array(gcg_1.CONCURRENCY * 2).fill(testCases[0]);
        const mockResponses = Array(gcg_1.CONCURRENCY * 2).fill(['response']);
        let concurrentCalls = 0;
        let maxConcurrentCalls = 0;
        mockFetchWithCache.mockImplementation(async () => {
            concurrentCalls++;
            maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
            await new Promise((resolve) => setTimeout(resolve, 10));
            concurrentCalls--;
            return {
                data: { responses: mockResponses[0] },
                cached: false,
                status: 200,
                statusText: 'OK',
            };
        });
        await (0, gcg_1.addGcgTestCases)(manyTestCases, 'prompt', {});
        expect(maxConcurrentCalls).toBeLessThanOrEqual(gcg_1.CONCURRENCY);
    });
});
//# sourceMappingURL=gcg.test.js.map