"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Test file for simpleVideo strategy
 *
 * Tests core functionality with proper mocks to avoid depending on fs, ffmpeg, etc.
 */
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("../../../src/logger"));
const simpleVideo_1 = require("../../../src/redteam/strategies/simpleVideo");
// Mock for dummy video data
const DUMMY_VIDEO_BASE64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0';
// Mock video generator function
const mockVideoGenerator = jest.fn().mockImplementation(() => {
    return Promise.resolve(DUMMY_VIDEO_BASE64);
});
// Mock required dependencies
jest.mock('../../../src/logger', () => ({
    level: 'info',
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));
jest.mock('../../../src/cliState', () => ({
    webUI: false,
}));
jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    unlinkSync: jest.fn(),
}));
// Mock for progress bar
jest.mock('cli-progress', () => ({
    SingleBar: jest.fn().mockImplementation(() => ({
        start: jest.fn(),
        increment: jest.fn(),
        stop: jest.fn(),
    })),
    Presets: { shades_classic: {} },
}));
describe('simpleVideo strategy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVideoGenerator.mockClear();
    });
    describe('getFallbackBase64', () => {
        it('converts text to base64', () => {
            const input = 'Test text';
            const result = (0, simpleVideo_1.getFallbackBase64)(input);
            // Decode the base64 and verify it matches the original text
            const decoded = Buffer.from(result, 'base64').toString();
            expect(decoded).toBe(input);
        });
    });
    describe('createProgressBar', () => {
        it('creates a progress bar with increment and stop methods', () => {
            const progressBar = (0, simpleVideo_1.createProgressBar)(10);
            expect(progressBar).toHaveProperty('increment');
            expect(progressBar).toHaveProperty('stop');
            expect(typeof progressBar.increment).toBe('function');
            expect(typeof progressBar.stop).toBe('function');
        });
        it('handles errors when incrementing progress', () => {
            const progressBar = (0, simpleVideo_1.createProgressBar)(10);
            // Call increment and make sure it doesn't throw an error
            expect(() => {
                progressBar.increment();
            }).not.toThrow();
            expect(logger_1.default.warn).not.toHaveBeenCalled();
        });
        it('handles errors when stopping progress', () => {
            const progressBar = (0, simpleVideo_1.createProgressBar)(10);
            // Call stop and make sure it doesn't throw an error
            expect(() => {
                progressBar.stop();
            }).not.toThrow();
            expect(logger_1.default.warn).not.toHaveBeenCalled();
        });
    });
    describe('writeVideoFile', () => {
        it('writes a base64 video to a file', async () => {
            await (0, simpleVideo_1.writeVideoFile)(DUMMY_VIDEO_BASE64, 'test.mp4');
            expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('test.mp4', expect.any(Buffer));
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Video file written to'));
        });
        it('throws an error if writing fails', async () => {
            const mockError = new Error('Write failed');
            jest.mocked(fs_1.default.writeFileSync).mockImplementationOnce(() => {
                throw mockError;
            });
            await expect((0, simpleVideo_1.writeVideoFile)(DUMMY_VIDEO_BASE64, 'test.mp4')).rejects.toThrow('Write failed');
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Failed to write video file'));
        });
    });
    describe('addVideoToBase64', () => {
        it('processes test cases correctly using mock generator', async () => {
            // Create a test case
            const testCase = {
                vars: {
                    prompt: 'test prompt',
                },
                assert: [
                    {
                        type: 'promptfoo:redteam:test',
                        metric: 'test-metric',
                    },
                ],
            };
            // Process the test case
            const result = await (0, simpleVideo_1.addVideoToBase64)([testCase], 'prompt', mockVideoGenerator);
            // Verify the structure and content of the result
            expect(result).toHaveLength(1);
            expect(result[0].vars?.prompt).toBe(DUMMY_VIDEO_BASE64);
            expect(result[0].vars?.video_text).toBe('test prompt');
            expect(result[0].metadata?.strategyId).toBe('video');
            expect(result[0].assert?.[0].metric).toBe('test/Video-Encoded');
            // Verify the mock generator was called
            expect(mockVideoGenerator).toHaveBeenCalledTimes(1);
        });
        it('throws an error if vars is missing', async () => {
            const emptyTestCase = {};
            await expect((0, simpleVideo_1.addVideoToBase64)([emptyTestCase], 'prompt', mockVideoGenerator)).rejects.toThrow('Video encoding: testCase.vars is required');
        });
        it('preserves non-redteam assertion metrics', async () => {
            const testCase = {
                vars: {
                    prompt: 'test prompt',
                },
                assert: [
                    {
                        // @ts-expect-error: Testing non-redteam type
                        type: 'other',
                        metric: 'test-metric',
                    },
                ],
            };
            const result = await (0, simpleVideo_1.addVideoToBase64)([testCase], 'prompt', mockVideoGenerator);
            expect(result[0].assert?.[0].metric).toBe('test-metric');
        });
        it('handles multiple test cases', async () => {
            const testCases = [
                { vars: { prompt: 'test prompt 1' } },
                { vars: { prompt: 'test prompt 2' } },
                { vars: { prompt: 'test prompt 3' } },
            ];
            const result = await (0, simpleVideo_1.addVideoToBase64)(testCases, 'prompt', mockVideoGenerator);
            expect(result).toHaveLength(3);
            expect(mockVideoGenerator).toHaveBeenCalledTimes(3);
        });
        it('logs debug messages when logger.level is debug', async () => {
            // Set logger level to debug
            Object.defineProperty(logger_1.default, 'level', { get: () => 'debug' });
            const testCase = {
                vars: { prompt: 'test prompt' },
            };
            await (0, simpleVideo_1.addVideoToBase64)([testCase], 'prompt', mockVideoGenerator);
            // Verify debug was called
            expect(logger_1.default.debug).toHaveBeenCalledWith('Processed 1 of 1');
        });
        it('handles errors during processing', async () => {
            const errorCase = {
                vars: { prompt: 'error prompt' },
            };
            // Mock generator that throws an error
            const errorGenerator = jest.fn().mockImplementation(() => {
                throw new Error('Test error');
            });
            // Expect the function to reject with the error
            await expect((0, simpleVideo_1.addVideoToBase64)([errorCase], 'prompt', errorGenerator)).rejects.toThrow('Test error');
        });
    });
});
//# sourceMappingURL=simpleVideo.test.js.map