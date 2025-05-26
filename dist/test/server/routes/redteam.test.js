"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliState_1 = __importDefault(require("../../../src/cliState"));
const shared_1 = require("../../../src/redteam/shared");
const eval_1 = require("../../../src/server/routes/eval");
const redteam_1 = require("../../../src/server/routes/redteam");
jest.mock('../../../src/redteam/shared');
describe('redteamRouter', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    let mockJson;
    beforeEach(() => {
        mockJson = jest.fn();
        mockRequest = {
            body: {},
            params: {},
            method: 'POST',
            url: '/run',
        };
        mockResponse = {
            json: mockJson,
            status: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
        eval_1.evalJobs.clear();
        cliState_1.default.webUI = false;
        jest.clearAllMocks();
        global.currentJobId = null;
        global.currentAbortController = null;
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    describe('POST /run', () => {
        it('should start a new redteam run and return job id', async () => {
            const mockEvalResult = {
                id: 'eval-123',
                toEvaluateSummary: jest.fn().mockResolvedValue({ summary: 'test' }),
            };
            jest.mocked(shared_1.doRedteamRun).mockResolvedValue(mockEvalResult);
            mockRequest.body = {
                config: { test: 'config' },
                force: true,
                verbose: true,
                delay: 1000,
            };
            const routeHandler = redteam_1.redteamRouter.stack.find((layer) => layer.route?.path === '/run' && layer.route?.methods?.post)?.route?.stack[0]?.handle;
            if (routeHandler) {
                await routeHandler(mockRequest, mockResponse, mockNext);
            }
            expect(mockJson).toHaveBeenCalledWith({ id: expect.any(String) });
            expect(shared_1.doRedteamRun).toHaveBeenCalledWith({
                liveRedteamConfig: { test: 'config' },
                force: true,
                verbose: true,
                delay: 1000,
                logCallback: expect.any(Function),
                abortSignal: expect.any(AbortSignal),
            });
        });
        it('should handle errors during redteam run', async () => {
            const error = new Error('Test error');
            jest.mocked(shared_1.doRedteamRun).mockRejectedValue(error);
            mockRequest.body = {
                config: { test: 'config' },
                force: true,
                verbose: true,
                delay: 1000,
            };
            const routeHandler = redteam_1.redteamRouter.stack.find((layer) => layer.route?.path === '/run' && layer.route?.methods?.post)?.route?.stack[0]?.handle;
            if (routeHandler) {
                await routeHandler(mockRequest, mockResponse, mockNext);
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
            const jobs = Array.from(eval_1.evalJobs.values());
            expect(mockJson).toHaveBeenCalledWith({ id: expect.any(String) });
            expect(jobs[0]?.status).toBe('error');
            expect(jobs[0]?.logs).toContain('Error: Test error');
        });
    });
    describe('POST /cancel', () => {
        it('should return error if no job is running', async () => {
            global.currentJobId = null;
            const routeHandler = redteam_1.redteamRouter.stack.find((layer) => layer.route?.path === '/cancel' && layer.route?.methods?.post)?.route?.stack[0]?.handle;
            if (routeHandler) {
                await routeHandler(mockRequest, mockResponse, mockNext);
            }
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'No job currently running',
            });
        });
    });
    describe('GET /status', () => {
        it('should return status with no running job', async () => {
            global.currentJobId = null;
            const routeHandler = redteam_1.redteamRouter.stack.find((layer) => layer.route?.path === '/status' && layer.route?.methods?.get)?.route?.stack[0]?.handle;
            if (routeHandler) {
                await routeHandler(mockRequest, mockResponse, mockNext);
            }
            expect(mockJson).toHaveBeenCalledWith({
                hasRunningJob: false,
                jobId: null,
            });
        });
    });
});
//# sourceMappingURL=redteam.test.js.map