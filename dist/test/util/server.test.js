"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const opener_1 = __importDefault(require("opener"));
const constants_1 = require("../../src/constants");
const logger_1 = __importDefault(require("../../src/logger"));
// Import the module under test after mocks are set up
const server_1 = require("../../src/util/server");
// Mock opener
jest.mock('opener', () => jest.fn());
// Mock logger
jest.mock('../../src/logger', () => ({
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
}));
// Mock readline
const mockQuestion = jest.fn();
const mockClose = jest.fn();
jest.mock('readline', () => ({
    createInterface: jest.fn(() => ({
        question: mockQuestion,
        close: mockClose,
        on: jest.fn(),
    })),
}));
// Properly mock fetch
const originalFetch = global.fetch;
const mockFetch = jest.fn();
describe('Server Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup global.fetch as a Jest mock
        global.fetch = mockFetch;
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });
    describe('checkServerRunning', () => {
        it('should return true when server is running with matching version', async () => {
            mockFetch.mockResolvedValueOnce({
                json: async () => ({ status: 'OK', version: constants_1.VERSION }),
            });
            const result = await (0, server_1.checkServerRunning)();
            expect(mockFetch).toHaveBeenCalledWith(`http://localhost:${(0, constants_1.getDefaultPort)()}/health`);
            expect(result).toBe(true);
        });
        it('should return false when server status is not OK', async () => {
            mockFetch.mockResolvedValueOnce({
                json: async () => ({ status: 'ERROR', version: constants_1.VERSION }),
            });
            const result = await (0, server_1.checkServerRunning)();
            expect(result).toBe(false);
        });
        it('should return false when server version does not match', async () => {
            mockFetch.mockResolvedValueOnce({
                json: async () => ({ status: 'OK', version: 'wrong-version' }),
            });
            const result = await (0, server_1.checkServerRunning)();
            expect(result).toBe(false);
        });
        it('should return false when fetch throws an error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
            const result = await (0, server_1.checkServerRunning)();
            expect(result).toBe(false);
            expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to check server health'));
        });
        it('should use custom port when provided', async () => {
            const customPort = 4000;
            mockFetch.mockResolvedValueOnce({
                json: async () => ({ status: 'OK', version: constants_1.VERSION }),
            });
            await (0, server_1.checkServerRunning)(customPort);
            expect(mockFetch).toHaveBeenCalledWith(`http://localhost:${customPort}/health`);
        });
    });
    describe('openBrowser', () => {
        it('should open browser with default URL when BrowserBehavior.OPEN', async () => {
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.OPEN);
            expect(opener_1.default).toHaveBeenCalledWith(`http://localhost:${(0, constants_1.getDefaultPort)()}`);
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Press Ctrl+C'));
        });
        it('should open browser with report URL when BrowserBehavior.OPEN_TO_REPORT', async () => {
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.OPEN_TO_REPORT);
            expect(opener_1.default).toHaveBeenCalledWith(`http://localhost:${(0, constants_1.getDefaultPort)()}/report`);
        });
        it('should open browser with redteam setup URL when BrowserBehavior.OPEN_TO_REDTEAM_CREATE', async () => {
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.OPEN_TO_REDTEAM_CREATE);
            expect(opener_1.default).toHaveBeenCalledWith(`http://localhost:${(0, constants_1.getDefaultPort)()}/redteam/setup`);
        });
        it('should not open browser when BrowserBehavior.SKIP', async () => {
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.SKIP);
            expect(opener_1.default).not.toHaveBeenCalled();
            expect(logger_1.default.info).not.toHaveBeenCalled();
        });
        it('should handle opener errors gracefully', async () => {
            jest.mocked(opener_1.default).mockImplementationOnce(() => {
                throw new Error('Failed to open browser');
            });
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.OPEN);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Failed to open browser'));
        });
        it('should ask user before opening browser when BrowserBehavior.ASK', async () => {
            // Setup readline to return 'y'
            mockQuestion.mockImplementationOnce((_, callback) => callback('y'));
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.ASK);
            expect(mockQuestion).toHaveBeenCalledWith('Open URL in browser? (y/N): ', expect.any(Function));
            expect(mockClose).toHaveBeenCalledWith();
            expect(opener_1.default).toHaveBeenCalledWith(`http://localhost:${(0, constants_1.getDefaultPort)()}`);
        });
        it('should not open browser when user answers no to ASK prompt', async () => {
            // Setup readline to return 'n'
            mockQuestion.mockImplementationOnce((_, callback) => callback('n'));
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.ASK);
            expect(mockQuestion).toHaveBeenCalledWith('Open URL in browser? (y/N): ', expect.any(Function));
            expect(mockClose).toHaveBeenCalledWith();
            expect(opener_1.default).not.toHaveBeenCalled();
        });
        it('should use custom port when provided', async () => {
            const customPort = 5000;
            await (0, server_1.openBrowser)(server_1.BrowserBehavior.OPEN, customPort);
            expect(opener_1.default).toHaveBeenCalledWith(`http://localhost:${customPort}`);
        });
    });
});
//# sourceMappingURL=server.test.js.map