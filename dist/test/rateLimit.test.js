"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../src/fetch");
const mockedFetch = jest.spyOn(global, 'fetch');
const mockedFetchResponse = (ok, response, headers = {}) => {
    const responseText = JSON.stringify(response);
    return {
        ok,
        status: ok ? 200 : 429,
        statusText: ok ? 'OK' : 'Too Many Requests',
        text: () => Promise.resolve(responseText),
        json: () => Promise.resolve(response),
        headers: new Headers({
            'content-type': 'application/json',
            ...headers,
        }),
    };
};
const mockedSetTimeout = (reqTimeout) => jest.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
    if (ms !== reqTimeout) {
        cb();
    }
    return 0;
});
describe('fetchWithRetries', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        mockedFetch.mockReset();
        jest.useRealTimers();
    });
    afterAll(() => {
        jest.clearAllMocks();
    });
    it('should fetch data', async () => {
        const url = 'https://api.example.com/data';
        const response = { data: 'test data' };
        mockedFetch.mockResolvedValueOnce(mockedFetchResponse(true, response));
        const result = await (0, fetch_1.fetchWithRetries)(url, {}, 1000);
        expect(mockedFetch).toHaveBeenCalledTimes(1);
        await expect(result.json()).resolves.toEqual(response);
    });
    it('should retry after given time if rate limited, using X-Limit headers', async () => {
        const url = 'https://api.example.com/data';
        const response = { data: 'test data' };
        const rateLimitReset = 47000;
        const timeout = 1234;
        const now = Date.now();
        const setTimeoutMock = mockedSetTimeout(timeout);
        mockedFetch
            .mockResolvedValueOnce(mockedFetchResponse(false, response, {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': `${(now + rateLimitReset) / 1000}`,
        }))
            .mockResolvedValueOnce(mockedFetchResponse(true, response));
        const result = await (0, fetch_1.fetchWithRetries)(url, {}, timeout);
        const waitTime = setTimeoutMock.mock.calls[1][1];
        expect(mockedFetch).toHaveBeenCalledTimes(2);
        expect(waitTime).toBeGreaterThan(rateLimitReset);
        expect(waitTime).toBeLessThanOrEqual(rateLimitReset + 1000);
        await expect(result.json()).resolves.toEqual(response);
    });
    it('should retry after given time if rate limited, using status and Retry-After', async () => {
        const url = 'https://api.example.com/data';
        const response = { data: 'test data' };
        const retryAfter = 15;
        const timeout = 1234;
        const setTimeoutMock = mockedSetTimeout(timeout);
        mockedFetch
            .mockResolvedValueOnce(mockedFetchResponse(false, response, { 'Retry-After': String(retryAfter) }))
            .mockResolvedValueOnce(mockedFetchResponse(true, response));
        const result = await (0, fetch_1.fetchWithRetries)(url, {}, timeout);
        const waitTime = setTimeoutMock.mock.calls[1][1];
        expect(mockedFetch).toHaveBeenCalledTimes(2);
        expect(waitTime).toBe(retryAfter * 1000);
        await expect(result.json()).resolves.toEqual(response);
    });
    it('should retry after default wait time if rate limited and wait time not found', async () => {
        const url = 'https://api.example.com/data';
        const response = { data: 'test data' };
        const timeout = 1234;
        const setTimeoutMock = mockedSetTimeout(timeout);
        mockedFetch
            .mockResolvedValueOnce(mockedFetchResponse(false, response))
            .mockResolvedValueOnce(mockedFetchResponse(true, response));
        const result = await (0, fetch_1.fetchWithRetries)(url, {}, timeout);
        const waitTime = setTimeoutMock.mock.calls[1][1];
        expect(mockedFetch).toHaveBeenCalledTimes(2);
        expect(waitTime).toBe(60000);
        await expect(result.json()).resolves.toEqual(response);
    });
});
//# sourceMappingURL=rateLimit.test.js.map