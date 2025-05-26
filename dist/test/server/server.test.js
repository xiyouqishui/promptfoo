"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../../src/server/server");
const mockedFetch = jest.mocked(jest.fn());
global.fetch = mockedFetch;
const mockCloudConfig = {
    isEnabled: jest.fn().mockReturnValue(false),
    getApiHost: jest.fn().mockReturnValue('https://custom.api.com'),
};
jest.mock('../../src/globalConfig/cloud', () => ({
    CloudConfig: jest.fn().mockImplementation(() => mockCloudConfig),
}));
jest.mock('../../src/util/database', () => ({
    getStandaloneEvals: jest.fn().mockImplementation(async (opts) => {
        if (opts?.tag?.key === 'test' && opts?.tag?.value === 'value') {
            return [{ id: '1', description: 'Test eval' }];
        }
        if (opts?.description === 'search') {
            return [{ id: '2', description: 'search' }];
        }
        return [];
    }),
}));
describe('/api/remote-health endpoint', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION;
        delete process.env.PROMPTFOO_REMOTE_GENERATION_URL;
        mockCloudConfig.isEnabled.mockReturnValue(false);
        mockCloudConfig.getApiHost.mockReturnValue('https://custom.api.com');
        app = (0, server_1.createApp)();
    });
    it('should return disabled status when remote generation is disabled', async () => {
        process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION = 'true';
        const response = await (0, supertest_1.default)(app).get('/api/remote-health').expect(200);
        expect(response.body).toEqual({
            status: 'DISABLED',
            message: 'remote generation and grading are disabled',
        });
    });
    it('should return health check result when enabled', async () => {
        mockedFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ status: 'OK' }),
        });
        const response = await (0, supertest_1.default)(app).get('/api/remote-health').expect(200);
        expect(response.body).toEqual({
            status: 'OK',
            message: 'Cloud API is healthy',
        });
    });
    it('should handle errors from health check', async () => {
        mockedFetch.mockRejectedValueOnce(new Error('Network error'));
        const response = await (0, supertest_1.default)(app).get('/api/remote-health').expect(200);
        expect(response.body).toEqual({
            status: 'ERROR',
            message: expect.stringContaining('Network error'),
        });
    });
    it('should use custom URL from environment', async () => {
        process.env.PROMPTFOO_REMOTE_GENERATION_URL = 'https://custom-api.example.com/task';
        mockedFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ status: 'OK' }),
        });
        await (0, supertest_1.default)(app).get('/api/remote-health').expect(200);
        expect(mockedFetch).toHaveBeenCalledWith('https://custom-api.example.com/health', expect.any(Object));
    });
    it('should use cloud config URL when enabled', async () => {
        mockCloudConfig.isEnabled.mockReturnValue(true);
        mockCloudConfig.getApiHost.mockReturnValue('https://cloud.example.com');
        mockedFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ status: 'OK' }),
        });
        await (0, supertest_1.default)(app).get('/api/remote-health').expect(200);
        expect(mockedFetch).toHaveBeenCalledWith('https://cloud.example.com/health', expect.any(Object));
    });
});
describe('/api/history endpoint', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        app = (0, server_1.createApp)();
    });
    it('should return results filtered by tag', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/history')
            .query({ tagName: 'test', tagValue: 'value' })
            .expect(200);
        expect(response.body.data).toEqual([{ id: '1', description: 'Test eval' }]);
    });
    it('should return results filtered by description', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/history')
            .query({ description: 'search' })
            .expect(200);
        expect(response.body.data).toEqual([{ id: '2', description: 'search' }]);
    });
    it('should return empty array when no matches found', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/history')
            .query({ tagName: 'nonexistent', tagValue: 'value' })
            .expect(200);
        expect(response.body.data).toEqual([]);
    });
    it('should handle missing query parameters', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/history').expect(200);
        expect(response.body.data).toEqual([]);
    });
});
//# sourceMappingURL=server.test.js.map