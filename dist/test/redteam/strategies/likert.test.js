"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_progress_1 = require("cli-progress");
const cache_1 = require("../../../src/cache");
const accounts_1 = require("../../../src/globalConfig/accounts");
const logger_1 = __importDefault(require("../../../src/logger"));
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
const likert_1 = require("../../../src/redteam/strategies/likert");
jest.mock('cli-progress');
jest.mock('../../../src/cache');
jest.mock('../../../src/globalConfig/accounts');
jest.mock('../../../src/redteam/remoteGeneration');
describe('likert strategy', () => {
    let mockProgressBar;
    beforeEach(() => {
        jest.resetAllMocks();
        mockProgressBar = {
            start: jest.fn(),
            increment: jest.fn(),
            stop: jest.fn(),
        };
        jest.mocked(cli_progress_1.SingleBar).mockReturnValue(mockProgressBar);
        jest.mocked(accounts_1.getUserEmail).mockReturnValue('test@example.com');
        jest.mocked(remoteGeneration_1.getRemoteGenerationUrl).mockReturnValue('http://test.com');
        jest.mocked(remoteGeneration_1.neverGenerateRemote).mockReturnValue(false);
    });
    const testCases = [
        {
            vars: {
                prompt: 'test prompt 1',
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
    it('should generate likert test cases successfully', async () => {
        const mockResponse = {
            data: {
                modifiedPrompts: ['modified prompt 1', 'modified prompt 2'],
            },
            cached: false,
            status: 200,
            statusText: 'OK',
        };
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
        const result = await (0, likert_1.addLikertTestCases)(testCases, 'prompt', {});
        expect(result).toHaveLength(2);
        expect(result[0]?.vars?.prompt).toBe('modified prompt 1');
        expect(result[0]?.metadata?.strategyId).toBe('jailbreak:likert');
        expect(result[0]?.assert?.[0].metric).toBe('test-metric/Likert');
    });
    it('should handle API errors gracefully', async () => {
        const mockResponse = {
            data: {
                error: 'API error',
            },
            cached: false,
            status: 500,
            statusText: 'Error',
        };
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
        const result = await (0, likert_1.addLikertTestCases)(testCases, 'prompt', {});
        expect(result).toHaveLength(0);
        expect(logger_1.default.error).toHaveBeenCalledWith('[jailbreak:likert] Error in Likert generation: API error}');
    });
    it('should throw error when remote generation is disabled', async () => {
        jest.mocked(remoteGeneration_1.neverGenerateRemote).mockReturnValue(true);
        await expect((0, likert_1.addLikertTestCases)(testCases, 'prompt', {})).rejects.toThrow('Likert jailbreak strategy requires remote generation to be enabled');
    });
    it('should handle network errors', async () => {
        const networkError = new Error('Network error');
        jest.mocked(cache_1.fetchWithCache).mockRejectedValue(networkError);
        const result = await (0, likert_1.addLikertTestCases)(testCases, 'prompt', {});
        expect(result).toHaveLength(0);
        expect(logger_1.default.error).toHaveBeenCalledWith(`Error in Likert generation: ${networkError}`);
    });
    it('should handle empty test cases', async () => {
        const result = await (0, likert_1.addLikertTestCases)([], 'prompt', {});
        expect(result).toHaveLength(0);
        expect(logger_1.default.warn).toHaveBeenCalledWith('No Likert jailbreak test cases were generated');
    });
    it('should include user email in payload', async () => {
        const mockResponse = {
            data: {
                modifiedPrompts: ['modified'],
            },
            cached: false,
            status: 200,
            statusText: 'OK',
        };
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue(mockResponse);
        await (0, likert_1.addLikertTestCases)(testCases, 'prompt', {});
        expect(cache_1.fetchWithCache).toHaveBeenCalledWith('http://test.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: expect.stringContaining('test@example.com'),
        }, expect.any(Number));
    });
});
//# sourceMappingURL=likert.test.js.map