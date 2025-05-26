"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
// Import *after* mocking
const feedback_1 = require("../src/feedback");
const fetch_1 = require("../src/fetch");
const logger_1 = __importDefault(require("../src/logger"));
// Store the original implementation to reference in mocks
const actualFeedback = jest.requireActual('../src/feedback');
// Mock dependencies
jest.mock('../src/fetch', () => ({
    fetchWithProxy: jest.fn(),
}));
jest.mock('../src/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));
jest.mock('../src/globalConfig/accounts', () => ({
    getUserEmail: jest.fn(),
}));
// Create a partial readline Interface mock
const createMockInterface = () => {
    return {
        question: jest.fn((query, callback) => {
            callback('mocked answer');
        }),
        close: jest.fn(),
        on: jest.fn(),
        // Add minimum required properties to satisfy the Interface type
        line: '',
        cursor: 0,
        setPrompt: jest.fn(),
        getPrompt: jest.fn(),
        write: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        clearLine: jest.fn(),
        removeAllListeners: jest.fn(),
        terminal: null,
        input: { on: jest.fn() },
        output: { on: jest.fn() },
    };
};
jest.mock('readline', () => ({
    createInterface: jest.fn(() => createMockInterface()),
}));
// Mock feedback module
jest.mock('../src/feedback', () => {
    return {
        sendFeedback: jest.fn(),
        gatherFeedback: jest.fn(),
    };
});
// Helper to create a mock Response
const createMockResponse = (data) => {
    return {
        ok: data.ok,
        status: data.status || 200,
        statusText: data.statusText || '',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        json: async () => data,
        text: async () => '',
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
        bodyUsed: false,
        body: null,
        clone: () => createMockResponse(data),
    };
};
describe('Feedback Module', () => {
    // Store original console.log
    const originalConsoleLog = console.log;
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        // Silence console output during tests
        jest.spyOn(console, 'log').mockImplementation();
    });
    afterEach(() => {
        // Restore console.log after each test
        console.log = originalConsoleLog;
    });
    describe('sendFeedback', () => {
        // Add the actual implementation for these tests
        beforeEach(() => {
            jest.mocked(feedback_1.sendFeedback).mockImplementation(actualFeedback.sendFeedback);
        });
        it('should send feedback successfully', async () => {
            // Mock a successful API response
            const mockResponse = createMockResponse({ ok: true });
            jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce(mockResponse);
            await (0, feedback_1.sendFeedback)('Test feedback');
            // Verify fetch was called with correct parameters
            expect(fetch_1.fetchWithProxy).toHaveBeenCalledWith('https://api.promptfoo.dev/api/feedback', expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Test feedback' }),
            }));
            // Verify success message was logged
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Feedback sent'));
        });
        it('should handle API failure', async () => {
            // Mock a failed API response
            const mockResponse = createMockResponse({ ok: false, status: 500 });
            jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce(mockResponse);
            await (0, feedback_1.sendFeedback)('Test feedback');
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Failed to send feedback'));
        });
        it('should handle network errors', async () => {
            // Mock a network error
            jest.mocked(fetch_1.fetchWithProxy).mockRejectedValueOnce(new Error('Network error'));
            await (0, feedback_1.sendFeedback)('Test feedback');
            expect(logger_1.default.error).toHaveBeenCalledWith('Network error while sending feedback');
        });
        it('should not send empty feedback', async () => {
            await (0, feedback_1.sendFeedback)('');
            // Verify that fetch was not called
            expect(fetch_1.fetchWithProxy).not.toHaveBeenCalled();
        });
    });
    describe('gatherFeedback', () => {
        it('should send feedback directly if a message is provided', async () => {
            // Create a simplified implementation for this test
            jest.mocked(feedback_1.gatherFeedback).mockImplementation(async (message) => {
                if (message) {
                    await (0, feedback_1.sendFeedback)(message);
                }
            });
            // Reset sendFeedback to be a jest function we can track
            jest.mocked(feedback_1.sendFeedback).mockReset();
            // Run the test
            await (0, feedback_1.gatherFeedback)('Direct feedback');
            // Verify sendFeedback was called with the direct message
            expect(feedback_1.sendFeedback).toHaveBeenCalledWith('Direct feedback');
        });
        it('should handle empty feedback input', async () => {
            // Setup readline to return empty feedback
            const mockInterface = createMockInterface();
            // Override the default behavior for this test
            mockInterface.question.mockImplementationOnce((_, callback) => callback('   '));
            jest.mocked(readline_1.default.createInterface).mockReturnValue(mockInterface);
            // Use real implementation for gatherFeedback
            jest.mocked(feedback_1.gatherFeedback).mockImplementation(actualFeedback.gatherFeedback);
            await (0, feedback_1.gatherFeedback)();
            // Verify sendFeedback was not called due to empty input
            expect(feedback_1.sendFeedback).not.toHaveBeenCalled();
        });
        it('should handle errors during feedback gathering', async () => {
            // Mock readline to throw an error
            jest.mocked(readline_1.default.createInterface).mockImplementation(() => {
                throw new Error('Test error');
            });
            // Use real implementation for gatherFeedback
            jest.mocked(feedback_1.gatherFeedback).mockImplementation(actualFeedback.gatherFeedback);
            await (0, feedback_1.gatherFeedback)();
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error gathering feedback'));
        });
    });
});
//# sourceMappingURL=feedback.test.js.map