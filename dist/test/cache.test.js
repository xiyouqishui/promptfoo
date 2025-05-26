"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const cache_1 = require("../src/cache");
jest.mock('../src/util/config/manage', () => ({
    getConfigDirectoryPath: jest.fn().mockReturnValue('/mock/config/path'),
}));
jest.mock('../src/fetch', () => ({
    fetchWithRetries: jest.fn(),
}));
// Mock fetch with retries
jest.mock('../src/fetch', () => ({
    fetchWithRetries: jest.fn().mockImplementation(async (url, options) => {
        const result = await global.fetch(url, options);
        return result;
    }),
}));
// Mock cache-manager
jest.mock('cache-manager', () => ({
    caching: jest.fn().mockImplementation(({ store }) => {
        const cache = new Map();
        return {
            store: {
                name: store === 'memory' ? 'memory' : 'fs-hash',
            },
            get: jest.fn().mockImplementation((key) => cache.get(key)),
            set: jest.fn().mockImplementation((key, value) => {
                cache.set(key, value);
                return Promise.resolve();
            }),
            del: jest.fn().mockImplementation((key) => {
                cache.delete(key);
                return Promise.resolve();
            }),
            reset: jest.fn().mockImplementation(() => {
                cache.clear();
                return Promise.resolve();
            }),
            wrap: jest.fn().mockImplementation(async (key, fn) => {
                const existing = cache.get(key);
                if (existing) {
                    return existing;
                }
                const value = await fn();
                cache.set(key, value);
                return value;
            }),
        };
    }),
}));
const mockedFetch = jest.mocked(jest.fn());
global.fetch = mockedFetch;
const mockedFetchResponse = (ok, response, contentType = 'application/json') => {
    const responseText = typeof response === 'string' ? response : JSON.stringify(response);
    return {
        ok,
        status: ok ? 200 : 400,
        statusText: ok ? 'OK' : 'Bad Request',
        text: () => Promise.resolve(responseText),
        json: () => (ok ? Promise.resolve(response) : Promise.reject(new Error('Invalid JSON'))),
        headers: new Headers({
            'content-type': contentType,
            'x-session-id': '45',
        }),
    };
};
describe('cache configuration', () => {
    const originalEnv = process.env;
    let mkdirSyncMock;
    let existsSyncMock;
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        mkdirSyncMock = jest.spyOn(fs_1.default, 'mkdirSync').mockImplementation();
        existsSyncMock = jest.spyOn(fs_1.default, 'existsSync').mockReturnValue(false);
    });
    afterEach(() => {
        process.env = originalEnv;
        mkdirSyncMock.mockRestore();
        existsSyncMock.mockRestore();
    });
    it('should use memory cache in test environment', async () => {
        process.env.NODE_ENV = 'test';
        const cacheModule = await Promise.resolve().then(() => __importStar(require('../src/cache')));
        const cache = cacheModule.getCache();
        expect(cache.store).toHaveProperty('name', 'memory');
    });
    it('should use disk cache in non-test environment', async () => {
        process.env.NODE_ENV = 'production';
        const cacheModule = await Promise.resolve().then(() => __importStar(require('../src/cache')));
        const cache = cacheModule.getCache();
        expect(cache.store).toHaveProperty('name', 'fs-hash');
    });
    it('should respect custom cache path', async () => {
        process.env.PROMPTFOO_CACHE_PATH = '/custom/cache/path';
        process.env.NODE_ENV = 'production';
        const cacheModule = await Promise.resolve().then(() => __importStar(require('../src/cache')));
        cacheModule.getCache();
        expect(fs_1.default.mkdirSync).toHaveBeenCalledWith('/custom/cache/path', { recursive: true });
    });
    it('should respect cache configuration from environment', async () => {
        process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT = '100';
        process.env.PROMPTFOO_CACHE_TTL = '3600';
        process.env.PROMPTFOO_CACHE_MAX_SIZE = '1000000';
        process.env.NODE_ENV = 'production';
        const cacheModule = await Promise.resolve().then(() => __importStar(require('../src/cache')));
        const cache = cacheModule.getCache();
        expect(cache.store).toHaveProperty('name', 'fs-hash');
    });
    it('should handle cache directory creation when it exists', async () => {
        existsSyncMock.mockReturnValue(true);
        process.env.NODE_ENV = 'production';
        const cacheModule = await Promise.resolve().then(() => __importStar(require('../src/cache')));
        cacheModule.getCache();
        expect(mkdirSyncMock).not.toHaveBeenCalled();
    });
});
describe('fetchWithCache', () => {
    const url = 'https://api.example.com/data';
    const response = { data: 'test data' };
    beforeEach(() => {
        jest.resetModules();
        mockedFetch.mockReset();
        (0, cache_1.clearCache)();
        (0, cache_1.enableCache)();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    afterAll(() => {
        (0, cache_1.enableCache)(); // Reset to default state
    });
    describe('with cache enabled', () => {
        it('should fetch and cache successful requests', async () => {
            const mockResponse = mockedFetchResponse(true, response);
            mockedFetch.mockResolvedValueOnce(mockResponse);
            const result = await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(1);
            expect(result).toMatchObject({
                cached: false,
                data: response,
                status: 200,
                statusText: 'OK',
                headers: { 'x-session-id': '45', 'content-type': 'application/json' },
            });
            expect(result.deleteFromCache).toBeInstanceOf(Function);
            // Second call should use cache
            const cachedResult = await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(1); // No additional fetch calls
            expect(cachedResult).toMatchObject({
                data: response,
                status: 200,
                statusText: 'OK',
                headers: { 'x-session-id': '45', 'content-type': 'application/json' },
                cached: true,
            });
            expect(cachedResult.deleteFromCache).toBeInstanceOf(Function);
        });
        it('should not cache failed requests', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: () => Promise.resolve(JSON.stringify({ error: 'Bad Request' })),
                json: () => Promise.resolve({ error: 'Bad Request' }),
                headers: new Headers({
                    'content-type': 'application/json',
                    'x-session-id': '45',
                }),
            };
            mockedFetch.mockResolvedValueOnce(mockResponse);
            const result = await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(result.status).toBe(400);
            expect(result.statusText).toBe('Bad Request');
            expect(result.data).toEqual({ error: 'Bad Request' });
            // Second call should try fetching again
            mockedFetch.mockResolvedValueOnce(mockResponse);
            const result2 = await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(result2.status).toBe(400);
            expect(result2.statusText).toBe('Bad Request');
            expect(result2.data).toEqual({ error: 'Bad Request' });
            expect(mockedFetch).toHaveBeenCalledTimes(2);
        });
        it('should handle empty responses', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: () => Promise.resolve(JSON.stringify({ error: 'Empty Response' })),
                json: () => Promise.resolve({ error: 'Empty Response' }),
                headers: new Headers({
                    'content-type': 'application/json',
                    'x-session-id': '45',
                }),
            };
            mockedFetch.mockResolvedValueOnce(mockResponse);
            const result = await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(result.status).toBe(400);
            expect(result.statusText).toBe('Bad Request');
            expect(result.data).toEqual({ error: 'Empty Response' });
        });
        it('should handle non-JSON responses when JSON is expected', async () => {
            const mockResponse = mockedFetchResponse(true, 'not json');
            mockedFetch.mockResolvedValueOnce(mockResponse);
            await expect((0, cache_1.fetchWithCache)(url, {}, 1000, 'json')).rejects.toThrow('Error parsing response');
        });
        it('should handle request timeout', async () => {
            jest.useFakeTimers();
            const mockTimeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve(mockedFetchResponse(true, response)), 2000);
            });
            mockedFetch.mockImplementationOnce(() => mockTimeoutPromise);
            const fetchPromise = (0, cache_1.fetchWithCache)(url, {}, 100);
            await expect(Promise.race([
                fetchPromise,
                new Promise((_, reject) => {
                    jest.advanceTimersByTime(150);
                    reject(new Error('timeout'));
                }),
            ])).rejects.toThrow('timeout');
        });
        it('should handle network errors', async () => {
            mockedFetch.mockRejectedValueOnce(new Error('Network error'));
            await expect((0, cache_1.fetchWithCache)(url, {}, 100)).rejects.toThrow('Network error');
        });
        it('should handle request options in cache key', async () => {
            const options = { method: 'POST', body: JSON.stringify({ test: true }) };
            const mockResponse = mockedFetchResponse(true, response);
            mockedFetch.mockResolvedValueOnce(mockResponse);
            await (0, cache_1.fetchWithCache)(url, options, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(1);
            // Different options should trigger new fetch
            const differentOptions = { method: 'POST', body: JSON.stringify({ test: false }) };
            mockedFetch.mockResolvedValueOnce(mockResponse);
            await (0, cache_1.fetchWithCache)(url, differentOptions, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(2);
        });
        it('should respect cache busting', async () => {
            const mockResponse = mockedFetchResponse(true, response);
            mockedFetch.mockResolvedValueOnce(mockResponse);
            await (0, cache_1.fetchWithCache)(url, {}, 1000);
            mockedFetch.mockResolvedValueOnce(mockedFetchResponse(true, { data: 'new data' }));
            const result = await (0, cache_1.fetchWithCache)(url, {}, 1000, 'json', true);
            expect(mockedFetch).toHaveBeenCalledTimes(2);
            expect(result.data).toEqual({ data: 'new data' });
            expect(result.cached).toBe(false);
        });
    });
    describe('with cache disabled', () => {
        beforeEach(() => {
            (0, cache_1.disableCache)();
        });
        it('should always fetch fresh data', async () => {
            const mockResponse = mockedFetchResponse(true, response);
            mockedFetch.mockResolvedValueOnce(mockResponse);
            const firstResult = await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(1);
            expect(firstResult).toMatchObject({
                cached: false,
                data: response,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json', 'x-session-id': '45' },
            });
            expect(firstResult.deleteFromCache).toBeInstanceOf(Function);
            // Second call should fetch again
            mockedFetch.mockResolvedValueOnce(mockResponse);
            const secondResult = await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(2);
            expect(secondResult).toMatchObject({
                cached: false,
                data: response,
                status: 200,
                statusText: 'OK',
                headers: { 'content-type': 'application/json', 'x-session-id': '45' },
            });
            expect(secondResult.deleteFromCache).toBeInstanceOf(Function);
        });
    });
    describe('cache utility functions', () => {
        it('should track cache enabled state', () => {
            expect((0, cache_1.isCacheEnabled)()).toBe(true);
            (0, cache_1.disableCache)();
            expect((0, cache_1.isCacheEnabled)()).toBe(false);
            (0, cache_1.enableCache)();
            expect((0, cache_1.isCacheEnabled)()).toBe(true);
        });
        it('should clear cache', async () => {
            const mockResponse = mockedFetchResponse(true, response);
            mockedFetch.mockResolvedValueOnce(mockResponse);
            await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(1);
            await (0, cache_1.clearCache)();
            mockedFetch.mockResolvedValueOnce(mockResponse);
            await (0, cache_1.fetchWithCache)(url, {}, 1000);
            expect(mockedFetch).toHaveBeenCalledTimes(2);
        });
    });
});
//# sourceMappingURL=cache.test.js.map