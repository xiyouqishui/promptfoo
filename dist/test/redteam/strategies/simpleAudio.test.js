"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const cli_progress_1 = require("cli-progress");
const cache_1 = require("../../../src/cache");
const logger_1 = __importDefault(require("../../../src/logger"));
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
const simpleAudio_1 = require("../../../src/redteam/strategies/simpleAudio");
// Mock the remoteGeneration module
jest.mock('../../../src/redteam/remoteGeneration', () => ({
    getRemoteGenerationUrl: jest.fn().mockReturnValue('http://test.url'),
    neverGenerateRemote: jest.fn().mockReturnValue(false),
}));
// Mock the cache module
jest.mock('../../../src/cache', () => ({
    fetchWithCache: jest.fn(),
}));
// Mock cli-progress
jest.mock('cli-progress', () => ({
    Presets: {
        shades_classic: {},
    },
    SingleBar: jest.fn().mockImplementation(() => ({
        increment: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
    })),
}));
const originalConsoleLog = console.log;
const mockFetchWithCache = jest.mocked(cache_1.fetchWithCache);
const mockNeverGenerateRemote = jest.mocked(remoteGeneration_1.neverGenerateRemote);
(0, globals_1.describe)('audio strategy', () => {
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetchWithCache.mockResolvedValue({
            data: { audioBase64: 'bW9ja2VkLWF1ZGlvLWJhc2U2NC1kYXRh' },
            cached: false,
            status: 200,
            statusText: 'OK',
        });
        mockNeverGenerateRemote.mockReturnValue(false);
    });
    afterAll(() => {
        console.log = originalConsoleLog;
    });
    (0, globals_1.describe)('textToAudio', () => {
        (0, globals_1.it)('should convert text to base64 string using remote API', async () => {
            const text = 'Hello, world!';
            const base64 = await (0, simpleAudio_1.textToAudio)(text, 'en');
            (0, globals_1.expect)(mockFetchWithCache).toHaveBeenCalledWith(globals_1.expect.any(String), globals_1.expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: globals_1.expect.any(String),
            }), globals_1.expect.any(Number));
            (0, globals_1.expect)(base64).toBe('bW9ja2VkLWF1ZGlvLWJhc2U2NC1kYXRh');
        });
        (0, globals_1.it)('should throw an error if remote generation is disabled', async () => {
            mockNeverGenerateRemote.mockReturnValue(true);
            const text = 'This should fail';
            await (0, globals_1.expect)((0, simpleAudio_1.textToAudio)(text, 'en')).rejects.toThrow('Remote generation is disabled');
        });
        (0, globals_1.it)('should throw an error if remote API fails', async () => {
            mockFetchWithCache.mockRejectedValueOnce(new Error('Remote API error'));
            const text = 'Hello, fallback world!';
            await (0, globals_1.expect)((0, simpleAudio_1.textToAudio)(text, 'en')).rejects.toThrow('Failed to generate audio');
        });
        (0, globals_1.it)('should pass language parameter to API', async () => {
            const text = 'Bonjour, monde!';
            await (0, simpleAudio_1.textToAudio)(text, 'fr');
            // Verify the correct call was made
            (0, globals_1.expect)(mockFetchWithCache).toHaveBeenCalledWith(globals_1.expect.any(String), globals_1.expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: globals_1.expect.stringContaining('"language":"fr"'),
            }), globals_1.expect.any(Number));
        });
    });
    (0, globals_1.describe)('addAudioToBase64', () => {
        (0, globals_1.it)('should convert test cases with the specified variable', async () => {
            // Setup mock to return a predictable response
            mockFetchWithCache.mockResolvedValue({
                data: { audioBase64: 'bW9ja2VkLWF1ZGlv' },
                cached: false,
                status: 200,
                statusText: 'OK',
            });
            const testCases = [
                {
                    vars: {
                        prompt: 'This is a test prompt',
                        other: 'This should not be changed',
                    },
                },
            ];
            const result = await (0, simpleAudio_1.addAudioToBase64)(testCases, 'prompt');
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(result[0].vars?.prompt).toBe('bW9ja2VkLWF1ZGlv');
            (0, globals_1.expect)(result[0].vars?.other).toBe('This should not be changed');
        });
        (0, globals_1.it)('should throw an error when API is unavailable', async () => {
            mockFetchWithCache.mockRejectedValueOnce(new Error('API unavailable'));
            const testCases = [
                {
                    vars: {
                        prompt: 'This should fail',
                    },
                },
            ];
            await (0, globals_1.expect)((0, simpleAudio_1.addAudioToBase64)(testCases, 'prompt')).rejects.toThrow('Failed to generate audio');
        });
        (0, globals_1.it)('should preserve harmCategory and modify assertion metrics', async () => {
            const testCase = {
                assert: [{ type: 'promptfoo:redteam:harmful' }],
                metadata: {
                    harmCategory: 'Illegal Activities',
                    otherField: 'value',
                },
                vars: {
                    prompt: 'Harmful content',
                },
            };
            const result = await (0, simpleAudio_1.addAudioToBase64)([testCase], 'prompt');
            (0, globals_1.expect)(result[0].metadata).toEqual({
                harmCategory: 'Illegal Activities',
                otherField: 'value',
                strategyId: 'audio',
            });
            (0, globals_1.expect)(result[0].assert).toEqual([
                {
                    metric: 'harmful/Audio-Encoded',
                    type: 'promptfoo:redteam:harmful',
                },
            ]);
        });
        (0, globals_1.it)('should handle test cases without metadata or assertions', async () => {
            const testCase = {
                vars: {
                    prompt: 'Simple content',
                },
            };
            const result = await (0, simpleAudio_1.addAudioToBase64)([testCase], 'prompt');
            (0, globals_1.expect)(result[0].metadata).toEqual({
                strategyId: 'audio',
            });
            (0, globals_1.expect)(result[0].assert).toBeUndefined();
        });
        (0, globals_1.it)('should use language from config if provided', async () => {
            const testCase = {
                vars: {
                    prompt: 'This should be in Spanish',
                },
            };
            await (0, simpleAudio_1.addAudioToBase64)([testCase], 'prompt', { language: 'es' });
            (0, globals_1.expect)(mockFetchWithCache).toHaveBeenCalledWith(globals_1.expect.any(String), globals_1.expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: globals_1.expect.stringContaining('"language":"es"'),
            }), globals_1.expect.any(Number));
        });
        (0, globals_1.it)('should use progress bar when logger level is not debug', async () => {
            const testCase = {
                vars: {
                    prompt: 'Test progress bar',
                },
            };
            // Save original level
            const originalLevel = logger_1.default.level;
            // Set level to info to enable progress bar
            logger_1.default.level = 'info';
            // Create mock for SingleBar
            const mockBarInstance = {
                increment: jest.fn(),
                start: jest.fn(),
                stop: jest.fn(),
            };
            // Cast SingleBar to any to avoid TypeScript errors with mocking
            const mockSingleBar = cli_progress_1.SingleBar;
            const originalImplementation = mockSingleBar.mockImplementation;
            mockSingleBar.mockImplementation(() => mockBarInstance);
            await (0, simpleAudio_1.addAudioToBase64)([testCase], 'prompt');
            (0, globals_1.expect)(mockBarInstance.increment).toHaveBeenCalledWith(1);
            (0, globals_1.expect)(mockBarInstance.stop).toHaveBeenCalledWith();
            // Restore original implementation and logger level
            mockSingleBar.mockImplementation = originalImplementation;
            logger_1.default.level = originalLevel;
        });
    });
});
//# sourceMappingURL=simpleAudio.test.js.map