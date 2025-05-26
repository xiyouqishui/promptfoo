"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const undici_1 = require("undici");
const cliState_1 = __importDefault(require("../src/cliState"));
const constants_1 = require("../src/constants");
const envars_1 = require("../src/envars");
const fetch_1 = require("../src/fetch");
const logger_1 = __importDefault(require("../src/logger"));
const time_1 = require("../src/util/time");
const utils_1 = require("./util/utils");
jest.mock('../src/util/time', () => ({
    sleep: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('undici', () => {
    const mockProxyAgentConstructor = jest.fn();
    const mockProxyAgentInstance = {
        options: null,
        addRequest: jest.fn(),
        destroy: jest.fn(),
    };
    mockProxyAgentConstructor.mockImplementation((options) => {
        mockProxyAgentInstance.options = options;
        return mockProxyAgentInstance;
    });
    const mockAgentConstructor = jest.fn();
    const mockAgentInstance = {
        addRequest: jest.fn(),
        destroy: jest.fn(),
    };
    mockAgentConstructor.mockImplementation(() => {
        return mockAgentInstance;
    });
    return {
        ProxyAgent: mockProxyAgentConstructor,
        Agent: mockAgentConstructor,
        setGlobalDispatcher: jest.fn(),
    };
});
jest.mock('../src/envars', () => {
    return {
        getEnvString: jest.fn().mockImplementation((key, defaultValue = '') => {
            if (key === 'HTTPS_PROXY' && process.env.HTTPS_PROXY) {
                return process.env.HTTPS_PROXY;
            }
            if (key === 'https_proxy' && process.env.https_proxy) {
                return process.env.https_proxy;
            }
            if (key === 'HTTP_PROXY' && process.env.HTTP_PROXY) {
                return process.env.HTTP_PROXY;
            }
            if (key === 'http_proxy' && process.env.http_proxy) {
                return process.env.http_proxy;
            }
            if (key === 'NO_PROXY' && process.env.NO_PROXY) {
                return process.env.NO_PROXY;
            }
            if (key === 'no_proxy' && process.env.no_proxy) {
                return process.env.no_proxy;
            }
            if (key === 'PROMPTFOO_CA_CERT_PATH' && process.env.PROMPTFOO_CA_CERT_PATH) {
                return process.env.PROMPTFOO_CA_CERT_PATH;
            }
            if (key === 'PROMPTFOO_INSECURE_SSL') {
                return process.env.PROMPTFOO_INSECURE_SSL || defaultValue;
            }
            return defaultValue;
        }),
        getEnvBool: jest.fn().mockImplementation((key, defaultValue = false) => {
            if (key === 'PROMPTFOO_INSECURE_SSL') {
                return process.env.PROMPTFOO_INSECURE_SSL === 'true' || false;
            }
            if (key === 'PROMPTFOO_RETRY_5XX') {
                return process.env.PROMPTFOO_RETRY_5XX === 'true' || false;
            }
            return defaultValue;
        }),
        getEnvInt: jest
            .fn()
            .mockImplementation((key, defaultValue = 0) => defaultValue),
    };
});
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
}));
jest.mock('../src/cliState', () => ({
    default: {
        basePath: undefined,
    },
}));
describe('fetchWithProxy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(global, 'fetch').mockImplementation();
        jest.mocked(undici_1.ProxyAgent).mockClear();
        jest.mocked(undici_1.setGlobalDispatcher).mockClear();
        delete process.env.HTTPS_PROXY;
        delete process.env.https_proxy;
        delete process.env.HTTP_PROXY;
        delete process.env.http_proxy;
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    it('should add version header to all requests', async () => {
        const url = 'https://example.com/api';
        await (0, fetch_1.fetchWithProxy)(url);
        expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
            headers: expect.objectContaining({
                'x-promptfoo-version': constants_1.VERSION,
            }),
        }));
    });
    it('should handle URLs with basic auth credentials', async () => {
        const url = 'https://username:password@example.com/api';
        const options = { headers: { 'Content-Type': 'application/json' } };
        await (0, fetch_1.fetchWithProxy)(url, options);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', expect.objectContaining({
            headers: {
                'Content-Type': 'application/json',
                Authorization: expect.any(String),
                'x-promptfoo-version': constants_1.VERSION,
            },
        }));
    });
    it('should handle URLs without auth credentials', async () => {
        const url = 'https://example.com/api';
        const options = { headers: { 'Content-Type': 'application/json' } };
        await (0, fetch_1.fetchWithProxy)(url, options);
        expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
            headers: {
                'Content-Type': 'application/json',
                'x-promptfoo-version': constants_1.VERSION,
            },
        }));
    });
    it('should handle invalid URLs gracefully', async () => {
        const invalidUrl = 'not-a-url';
        await (0, fetch_1.fetchWithProxy)(invalidUrl);
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringMatching(/URL parsing failed in fetchWithProxy: TypeError/));
        expect(global.fetch).toHaveBeenCalledWith(invalidUrl, expect.any(Object));
    });
    it('should preserve existing Authorization headers when no URL credentials', async () => {
        const url = 'https://example.com/api';
        const options = {
            headers: {
                Authorization: 'Bearer token123',
                'Content-Type': 'application/json',
            },
        };
        await (0, fetch_1.fetchWithProxy)(url, options);
        expect(global.fetch).toHaveBeenCalledWith(url, expect.objectContaining({
            headers: {
                Authorization: 'Bearer token123',
                'Content-Type': 'application/json',
                'x-promptfoo-version': constants_1.VERSION,
            },
        }));
    });
    it('should warn and prefer existing Authorization header over URL credentials', async () => {
        const url = 'https://username:password@example.com/api';
        const options = {
            headers: {
                Authorization: 'Bearer token123',
            },
        };
        await (0, fetch_1.fetchWithProxy)(url, options);
        expect(logger_1.default.warn).toHaveBeenCalledWith(expect.stringContaining('Both URL credentials and Authorization header present'));
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', expect.objectContaining({
            headers: {
                Authorization: 'Bearer token123',
                'x-promptfoo-version': constants_1.VERSION,
            },
        }));
    });
    it('should handle empty username or password in URL', async () => {
        const url = 'https://:password@example.com/api';
        await (0, fetch_1.fetchWithProxy)(url);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', expect.objectContaining({
            headers: {
                Authorization: 'Basic OnBhc3N3b3Jk',
                'x-promptfoo-version': constants_1.VERSION,
            },
        }));
    });
    it('should handle URLs with only username', async () => {
        const url = 'https://username@example.com/api';
        await (0, fetch_1.fetchWithProxy)(url);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', expect.objectContaining({
            headers: {
                Authorization: 'Basic dXNlcm5hbWU6',
                'x-promptfoo-version': constants_1.VERSION,
            },
        }));
    });
    it('should preserve existing headers when adding Authorization from URL credentials', async () => {
        const url = 'https://username:password@example.com/api';
        const options = {
            headers: {
                'Content-Type': 'application/json',
                'X-Custom-Header': 'value',
            },
        };
        await (0, fetch_1.fetchWithProxy)(url, options);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', expect.objectContaining({
            headers: {
                'Content-Type': 'application/json',
                'X-Custom-Header': 'value',
                Authorization: expect.any(String),
                'x-promptfoo-version': constants_1.VERSION,
            },
        }));
    });
    it('should use custom CA certificate when PROMPTFOO_CA_CERT_PATH is set', async () => {
        const mockCertPath = path_1.default.normalize('/path/to/cert.pem');
        const mockCertContent = 'mock-cert-content';
        const mockProxyUrl = 'http://proxy.example.com';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.PROMPTFOO_CA_CERT_PATH = mockCertPath;
        jest.mocked(envars_1.getEnvString).mockImplementation((key, defaultValue = '') => {
            if (key === 'PROMPTFOO_CA_CERT_PATH') {
                return mockCertPath;
            }
            if (key === 'HTTPS_PROXY') {
                return mockProxyUrl;
            }
            return defaultValue;
        });
        jest.mocked(envars_1.getEnvBool).mockImplementation((key, defaultValue = false) => {
            if (key === 'PROMPTFOO_INSECURE_SSL') {
                return false;
            }
            return defaultValue;
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockCertContent);
        const mockFetch = jest.fn().mockResolvedValue(new Response());
        global.fetch = mockFetch;
        await (0, fetch_1.fetchWithProxy)('https://example.com');
        const actualPath = jest.mocked(fs_1.default.readFileSync).mock.calls[0][0];
        const actualEncoding = jest.mocked(fs_1.default.readFileSync).mock.calls[0][1];
        const normalizedActual = path_1.default.normalize(actualPath).replace(/^\w:/, '');
        const normalizedExpected = path_1.default.normalize(mockCertPath).replace(/^\w:/, '');
        expect(normalizedActual).toBe(normalizedExpected);
        expect(actualEncoding).toBe('utf8');
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
            uri: mockProxyUrl,
            proxyTls: {
                ca: mockCertContent,
                rejectUnauthorized: true,
            },
            requestTls: {
                ca: mockCertContent,
                rejectUnauthorized: true,
            },
        });
        expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
    });
    it('should handle missing CA certificate file gracefully', async () => {
        const mockCertPath = path_1.default.normalize('/path/to/nonexistent.pem');
        const mockProxyUrl = 'http://proxy.example.com';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.PROMPTFOO_CA_CERT_PATH = mockCertPath;
        jest.mocked(envars_1.getEnvString).mockImplementation((key, defaultValue = '') => {
            if (key === 'PROMPTFOO_CA_CERT_PATH') {
                return mockCertPath;
            }
            if (key === 'HTTPS_PROXY') {
                return mockProxyUrl;
            }
            return defaultValue;
        });
        jest.mocked(fs_1.default.readFileSync).mockImplementation(() => {
            throw new Error('File not found');
        });
        const mockFetch = jest.fn().mockResolvedValue(new Response());
        global.fetch = mockFetch;
        await (0, fetch_1.fetchWithProxy)('https://example.com');
        const actualPath = jest.mocked(fs_1.default.readFileSync).mock.calls[0][0];
        const normalizedActual = path_1.default.normalize(actualPath).replace(/^\w:/, '');
        const normalizedExpected = path_1.default.normalize(mockCertPath).replace(/^\w:/, '');
        expect(normalizedActual).toBe(normalizedExpected);
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
            uri: mockProxyUrl,
            proxyTls: {
                rejectUnauthorized: true,
            },
            requestTls: {
                rejectUnauthorized: true,
            },
        });
        expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
    });
    it('should disable SSL verification when PROMPTFOO_INSECURE_SSL is true', async () => {
        const mockProxyUrl = 'http://proxy.example.com';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.PROMPTFOO_INSECURE_SSL = 'true';
        jest.mocked(envars_1.getEnvString).mockImplementation((key, defaultValue = '') => {
            if (key === 'HTTPS_PROXY') {
                return mockProxyUrl;
            }
            return defaultValue;
        });
        jest.mocked(envars_1.getEnvBool).mockImplementation((key, defaultValue = false) => {
            if (key === 'PROMPTFOO_INSECURE_SSL') {
                return true;
            }
            return defaultValue;
        });
        const mockFetch = jest.fn().mockResolvedValue(new Response());
        global.fetch = mockFetch;
        await (0, fetch_1.fetchWithProxy)('https://example.com');
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
            uri: mockProxyUrl,
            proxyTls: {
                rejectUnauthorized: false,
            },
            requestTls: {
                rejectUnauthorized: false,
            },
        });
        expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
    });
    it('should resolve CA certificate path relative to basePath when available', async () => {
        const mockBasePath = path_1.default.normalize('/base/path');
        const mockCertPath = 'certs/cert.pem';
        const mockCertContent = 'mock-cert-content';
        const mockProxyUrl = 'http://proxy.example.com';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.PROMPTFOO_CA_CERT_PATH = mockCertPath;
        cliState_1.default.basePath = mockBasePath;
        jest.mocked(envars_1.getEnvString).mockImplementation((key, defaultValue = '') => {
            if (key === 'PROMPTFOO_CA_CERT_PATH') {
                return mockCertPath;
            }
            if (key === 'HTTPS_PROXY') {
                return mockProxyUrl;
            }
            return defaultValue;
        });
        jest.mocked(envars_1.getEnvBool).mockImplementation((key, defaultValue = false) => {
            if (key === 'PROMPTFOO_INSECURE_SSL') {
                return false;
            }
            return defaultValue;
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockCertContent);
        const mockFetch = jest.fn().mockResolvedValue(new Response());
        global.fetch = mockFetch;
        await (0, fetch_1.fetchWithProxy)('https://example.com');
        const expectedPath = path_1.default.normalize(path_1.default.join(mockBasePath, mockCertPath));
        const actualPath = jest.mocked(fs_1.default.readFileSync).mock.calls[0][0];
        const actualEncoding = jest.mocked(fs_1.default.readFileSync).mock.calls[0][1];
        const normalizedActual = path_1.default.normalize(actualPath).replace(/^\w:/, '');
        const normalizedExpected = path_1.default.normalize(expectedPath).replace(/^\w:/, '');
        const normalizedBasePath = path_1.default.normalize(mockBasePath).replace(/^\w:/, '');
        const normalizedCertPath = path_1.default.normalize(mockCertPath);
        expect(normalizedActual).toBe(normalizedExpected);
        expect(actualEncoding).toBe('utf8');
        expect(normalizedActual).toContain(normalizedBasePath);
        expect(normalizedActual).toContain(normalizedCertPath);
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
            uri: mockProxyUrl,
            proxyTls: {
                ca: mockCertContent,
                rejectUnauthorized: true,
            },
            requestTls: {
                ca: mockCertContent,
                rejectUnauthorized: true,
            },
        });
        expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
        cliState_1.default.basePath = undefined;
    });
    it('should not create ProxyAgent when no proxy URL is found', async () => {
        await (0, fetch_1.fetchWithProxy)('https://example.com');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
    });
    it('should use proxy URL from environment variables in order of precedence', async () => {
        const mockProxyUrls = {
            HTTPS_PROXY: 'http://https-proxy.example.com',
            https_proxy: 'http://https-proxy-lower.example.com',
            HTTP_PROXY: 'http://http-proxy.example.com',
            http_proxy: 'http://http-proxy-lower.example.com',
        };
        const allProxyVars = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy'];
        const httpTestCases = [
            {
                env: { HTTP_PROXY: mockProxyUrls.HTTP_PROXY },
                expected: { url: mockProxyUrls.HTTP_PROXY },
            },
            {
                env: { http_proxy: mockProxyUrls.http_proxy },
                expected: { url: mockProxyUrls.http_proxy },
            },
        ];
        const httpsTestCases = [
            {
                env: { HTTPS_PROXY: mockProxyUrls.HTTPS_PROXY },
                expected: { url: mockProxyUrls.HTTPS_PROXY },
            },
            {
                env: { https_proxy: mockProxyUrls.https_proxy },
                expected: { url: mockProxyUrls.https_proxy },
            },
        ];
        for (const testCase of httpTestCases) {
            jest.clearAllMocks();
            allProxyVars.forEach((key) => {
                delete process.env[key];
            });
            Object.entries(testCase.env).forEach(([key, value]) => {
                process.env[key] = value;
            });
            await (0, fetch_1.fetchWithProxy)('http://example.com');
            expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
                uri: testCase.expected.url,
                proxyTls: {
                    rejectUnauthorized: !(0, envars_1.getEnvBool)('PROMPTFOO_INSECURE_SSL', true),
                },
                requestTls: {
                    rejectUnauthorized: !(0, envars_1.getEnvBool)('PROMPTFOO_INSECURE_SSL', true),
                },
            });
            expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
            const debugCalls = jest.mocked(logger_1.default.debug).mock.calls;
            const normalizedCalls = debugCalls.map((call) => call[0].replace(/\/$/, ''));
            const proxyConfigCalls = normalizedCalls.filter((msg) => msg.includes(`Using proxy:`));
            expect(proxyConfigCalls).toEqual([`Using proxy: ${testCase.expected.url}`]);
            allProxyVars.forEach((key) => {
                delete process.env[key];
            });
        }
        for (const testCase of httpsTestCases) {
            jest.clearAllMocks();
            allProxyVars.forEach((key) => {
                delete process.env[key];
            });
            Object.entries(testCase.env).forEach(([key, value]) => {
                process.env[key] = value;
            });
            await (0, fetch_1.fetchWithProxy)('https://example.com');
            expect(undici_1.ProxyAgent).toHaveBeenCalledWith({
                uri: testCase.expected.url,
                proxyTls: {
                    rejectUnauthorized: !(0, envars_1.getEnvBool)('PROMPTFOO_INSECURE_SSL', true),
                },
                requestTls: {
                    rejectUnauthorized: !(0, envars_1.getEnvBool)('PROMPTFOO_INSECURE_SSL', true),
                },
            });
            expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
            const debugCalls = jest.mocked(logger_1.default.debug).mock.calls;
            const normalizedCalls = debugCalls.map((call) => call[0].replace(/\/$/, ''));
            const proxyConfigCalls = normalizedCalls.filter((msg) => msg.includes(`Using proxy:`));
            expect(proxyConfigCalls).toEqual([`Using proxy: ${testCase.expected.url}`]);
            allProxyVars.forEach((key) => {
                delete process.env[key];
            });
        }
    });
    it('should use proxy for domains not in NO_PROXY', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost,internal.example.com';
        await (0, fetch_1.fetchWithProxy)('https://api.example.com/v1');
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({
            uri: mockProxyUrl,
        }));
        expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
    });
});
describe('fetchWithTimeout', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(global, 'fetch').mockImplementation();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    it('should resolve when fetch completes before timeout', async () => {
        const mockResponse = (0, utils_1.createMockResponse)({ ok: true });
        jest.mocked(global.fetch).mockImplementationOnce(() => Promise.resolve(mockResponse));
        const fetchPromise = (0, fetch_1.fetchWithTimeout)('https://example.com', {}, 5000);
        await expect(fetchPromise).resolves.toBe(mockResponse);
    });
    it('should reject when request times out', async () => {
        jest
            .mocked(global.fetch)
            .mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 6000)));
        const fetchPromise = (0, fetch_1.fetchWithTimeout)('https://example.com', {}, 5000);
        jest.advanceTimersByTime(5000);
        await expect(fetchPromise).rejects.toThrow('Request timed out after 5000 ms');
    });
});
describe('isRateLimited', () => {
    it('should detect standard rate limit headers', () => {
        const response = (0, utils_1.createMockResponse)({
            headers: new Headers({
                'X-RateLimit-Remaining': '0',
            }),
            status: 200,
        });
        expect((0, fetch_1.isRateLimited)(response)).toBe(true);
    });
    it('should detect 429 status code', () => {
        const response = (0, utils_1.createMockResponse)({
            status: 429,
        });
        expect((0, fetch_1.isRateLimited)(response)).toBe(true);
    });
    it('should detect OpenAI specific rate limits', () => {
        const response = (0, utils_1.createMockResponse)({
            headers: new Headers({
                'x-ratelimit-remaining-requests': '0',
            }),
        });
        expect((0, fetch_1.isRateLimited)(response)).toBe(true);
        const tokenResponse = (0, utils_1.createMockResponse)({
            headers: new Headers({
                'x-ratelimit-remaining-tokens': '0',
            }),
        });
        expect((0, fetch_1.isRateLimited)(tokenResponse)).toBe(true);
    });
    it('should return false when not rate limited', () => {
        const response = (0, utils_1.createMockResponse)({
            headers: new Headers({
                'X-RateLimit-Remaining': '10',
            }),
            status: 200,
        });
        expect((0, fetch_1.isRateLimited)(response)).toBe(false);
    });
});
describe('handleRateLimit', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.mocked(time_1.sleep).mockClear();
    });
    afterEach(() => {
        jest.useRealTimers();
    });
    it('should handle OpenAI reset headers', async () => {
        const response = (0, utils_1.createMockResponse)({
            headers: new Headers({
                'x-ratelimit-reset-requests': '5',
            }),
        });
        const promise = (0, fetch_1.handleRateLimit)(response);
        jest.advanceTimersByTime(5000);
        await promise;
        expect(logger_1.default.debug).toHaveBeenCalledWith('Rate limited, waiting 5000ms before retry');
    });
    it('should handle standard rate limit reset headers', async () => {
        const futureTime = Math.floor((Date.now() + 5000) / 1000);
        const response = (0, utils_1.createMockResponse)({
            headers: new Headers({
                'X-RateLimit-Reset': futureTime.toString(),
            }),
        });
        const promise = (0, fetch_1.handleRateLimit)(response);
        await promise;
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringMatching(/Rate limited, waiting \d+ms before retry/));
    });
    it('should handle Retry-After headers', async () => {
        const response = (0, utils_1.createMockResponse)({
            headers: new Headers({
                'Retry-After': '5',
            }),
        });
        const promise = (0, fetch_1.handleRateLimit)(response);
        jest.advanceTimersByTime(5000);
        await promise;
        expect(logger_1.default.debug).toHaveBeenCalledWith('Rate limited, waiting 5000ms before retry');
    });
    it('should use default wait time when no headers present', async () => {
        const response = (0, utils_1.createMockResponse)();
        const promise = (0, fetch_1.handleRateLimit)(response);
        jest.advanceTimersByTime(60000);
        await promise;
        expect(logger_1.default.debug).toHaveBeenCalledWith('Rate limited, waiting 60000ms before retry');
    });
});
describe('fetchWithRetries', () => {
    beforeEach(() => {
        jest.mocked(time_1.sleep).mockClear();
        jest.spyOn(global, 'fetch').mockImplementation();
        jest.clearAllMocks();
    });
    it('should make exactly one attempt when retries is 0', async () => {
        const successResponse = (0, utils_1.createMockResponse)();
        jest.mocked(global.fetch).mockResolvedValueOnce(successResponse);
        await (0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 0);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(time_1.sleep).not.toHaveBeenCalled();
    });
    it('should handle negative retry values by treating them as 0', async () => {
        const successResponse = (0, utils_1.createMockResponse)();
        jest.mocked(global.fetch).mockResolvedValueOnce(successResponse);
        await (0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, -1);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(time_1.sleep).not.toHaveBeenCalled();
    });
    it('should make retries+1 total attempts', async () => {
        jest.mocked(global.fetch).mockRejectedValue(new Error('Network error'));
        await expect((0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 2)).rejects.toThrow('Request failed after 2 retries: Error: Network error');
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(time_1.sleep).toHaveBeenCalledTimes(2);
    });
    it('should not sleep after the final attempt', async () => {
        jest.mocked(global.fetch).mockRejectedValue(new Error('Network error'));
        await expect((0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 1)).rejects.toThrow('Request failed after 1 retries: Error: Network error');
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(time_1.sleep).toHaveBeenCalledTimes(1);
    });
    it('should handle 5XX errors when PROMPTFOO_RETRY_5XX is true', async () => {
        jest.mocked(envars_1.getEnvBool).mockImplementation((key) => {
            if (key === 'PROMPTFOO_RETRY_5XX') {
                return true;
            }
            return false;
        });
        const errorResponse = (0, utils_1.createMockResponse)({
            status: 502,
            statusText: 'Bad Gateway',
        });
        const successResponse = (0, utils_1.createMockResponse)();
        const mockFetch = jest
            .fn()
            .mockResolvedValueOnce(errorResponse)
            .mockResolvedValueOnce(successResponse);
        global.fetch = mockFetch;
        await (0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(time_1.sleep).toHaveBeenCalledTimes(1);
    });
    it('should handle rate limits with proper backoff', async () => {
        const rateLimitedResponse = (0, utils_1.createMockResponse)({
            status: 429,
            headers: new Headers({
                'Retry-After': '1',
            }),
        });
        const successResponse = (0, utils_1.createMockResponse)();
        const mockFetch = jest
            .fn()
            .mockResolvedValueOnce(rateLimitedResponse)
            .mockResolvedValueOnce(successResponse);
        global.fetch = mockFetch;
        await (0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Rate limited on URL'));
        expect(time_1.sleep).toHaveBeenCalledTimes(1);
    });
    it('should respect maximum retry count', async () => {
        const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
        global.fetch = mockFetch;
        await expect((0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 2)).rejects.toThrow('Request failed after 2 retries: Error: Network error');
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(time_1.sleep).toHaveBeenCalledTimes(2);
    });
    it('should handle detailed error information', async () => {
        const error = new Error('Network error');
        error.code = 'ECONNREFUSED';
        error.cause = 'Connection refused';
        jest.mocked(global.fetch).mockRejectedValue(error);
        await expect((0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 1)).rejects.toThrow('Request failed after 1 retries: Error: Network error (Cause: Connection refused) (Code: ECONNREFUSED)');
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(time_1.sleep).toHaveBeenCalledTimes(1);
    });
    it('should handle non-Error objects in rejection', async () => {
        jest.mocked(global.fetch).mockRejectedValue('String error');
        await expect((0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 1)).rejects.toThrow('Request failed after 1 retries: String error');
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(time_1.sleep).toHaveBeenCalledTimes(1);
    });
    it('should handle rate limits with OpenAI specific headers', async () => {
        const rateLimitedResponse = (0, utils_1.createMockResponse)({
            status: 429,
            headers: new Headers({
                'x-ratelimit-reset-tokens': '5',
            }),
        });
        const successResponse = (0, utils_1.createMockResponse)();
        const mockFetch = jest
            .fn()
            .mockResolvedValueOnce(rateLimitedResponse)
            .mockResolvedValueOnce(successResponse);
        global.fetch = mockFetch;
        await (0, fetch_1.fetchWithRetries)('https://example.com', {}, 1000, 2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Rate limited on URL'));
        expect(time_1.sleep).toHaveBeenCalledTimes(1);
    });
});
describe('sanitizeUrl', () => {
    it('should mask credentials in URLs', () => {
        const url = 'https://username:password@example.com/api';
        expect((0, fetch_1.sanitizeUrl)(url)).toBe('https://***:***@example.com/api');
    });
    it('should handle URLs without credentials', () => {
        const url = 'https://example.com/api';
        expect((0, fetch_1.sanitizeUrl)(url)).toBe(url);
    });
    it('should return original string for invalid URLs', () => {
        const invalidUrl = 'not-a-url';
        expect((0, fetch_1.sanitizeUrl)(invalidUrl)).toBe(invalidUrl);
    });
});
describe('fetchWithProxy with NO_PROXY', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(global, 'fetch').mockImplementation();
        jest.mocked(undici_1.ProxyAgent).mockClear();
        jest.mocked(undici_1.setGlobalDispatcher).mockClear();
        delete process.env.HTTPS_PROXY;
        delete process.env.https_proxy;
        delete process.env.HTTP_PROXY;
        delete process.env.http_proxy;
        delete process.env.NO_PROXY;
        delete process.env.no_proxy;
    });
    afterEach(() => {
        delete process.env.HTTPS_PROXY;
        delete process.env.https_proxy;
        delete process.env.HTTP_PROXY;
        delete process.env.http_proxy;
        delete process.env.NO_PROXY;
        delete process.env.no_proxy;
        jest.resetAllMocks();
    });
    it('should respect NO_PROXY for localhost URLs', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost';
        await (0, fetch_1.fetchWithProxy)('http://localhost:3000/api');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
    });
    it('should respect NO_PROXY for 127.0.0.1', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.NO_PROXY = '127.0.0.1';
        await (0, fetch_1.fetchWithProxy)('http://127.0.0.1:3000/api');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
    });
    it('should respect NO_PROXY with multiple entries', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        const noProxyList = 'example.org,localhost,internal.example.com';
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.NO_PROXY = noProxyList;
        await (0, fetch_1.fetchWithProxy)('http://localhost:3000/api');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = noProxyList;
        await (0, fetch_1.fetchWithProxy)('https://example.org/api');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = noProxyList;
        await (0, fetch_1.fetchWithProxy)('https://internal.example.com/api');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = noProxyList;
        await (0, fetch_1.fetchWithProxy)('https://example.com/api');
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({
            uri: mockProxyUrl,
        }));
        expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
    });
    it('should use proxy for domains not in NO_PROXY', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost,internal.example.com';
        await (0, fetch_1.fetchWithProxy)('https://api.example.com/v1');
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({
            uri: mockProxyUrl,
        }));
        expect(undici_1.setGlobalDispatcher).toHaveBeenCalledWith(expect.any(Object));
    });
    it('should handle wildcard patterns in NO_PROXY', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = '*.example.org,localhost';
        await (0, fetch_1.fetchWithProxy)('https://api.example.org/v1');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        await (0, fetch_1.fetchWithProxy)('https://subdomain.api.example.org/v1');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        await (0, fetch_1.fetchWithProxy)('https://example.com/v1');
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({
            uri: mockProxyUrl,
        }));
    });
    it('should handle domain suffix patterns in NO_PROXY', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = '.example.org,localhost';
        await (0, fetch_1.fetchWithProxy)('https://api.example.org/v1');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        await (0, fetch_1.fetchWithProxy)('https://subdomain.api.example.org/v1');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        await (0, fetch_1.fetchWithProxy)('https://abc.example.org/v1');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        await (0, fetch_1.fetchWithProxy)('https://abc.example.com/v1');
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({
            uri: mockProxyUrl,
        }));
    });
    it('should handle URLs without schemes', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost,example.org';
        await (0, fetch_1.fetchWithProxy)('localhost:3000');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        await (0, fetch_1.fetchWithProxy)('example.org');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
    });
    it('should properly parse URLs with credentials when checking against NO_PROXY', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'api.example.org';
        await (0, fetch_1.fetchWithProxy)('https://username:password@api.example.org/v1');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('https://api.example.org/v1', expect.objectContaining({
            headers: expect.objectContaining({
                Authorization: expect.any(String),
            }),
        }));
    });
    it('should handle bad URL inputs gracefully when checking NO_PROXY', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost';
        await (0, fetch_1.fetchWithProxy)(':::not-a-valid-url:::');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
    });
    it('should use lowercase for NO_PROXY checks', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'LOCALHOST,API.EXAMPLE.ORG';
        await (0, fetch_1.fetchWithProxy)('http://localhost:3000');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        await (0, fetch_1.fetchWithProxy)('https://api.example.org/v1');
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
    });
    it('should handle URL objects and Request objects', async () => {
        const mockProxyUrl = 'http://proxy.example.com:8080';
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost,example.org';
        const urlObj = new URL('http://localhost:3000');
        await (0, fetch_1.fetchWithProxy)(urlObj.toString());
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTPS_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost,example.org';
        const request = new Request('https://example.org/api');
        await (0, fetch_1.fetchWithProxy)(request);
        expect(undici_1.ProxyAgent).not.toHaveBeenCalled();
        jest.clearAllMocks();
        process.env.HTTP_PROXY = mockProxyUrl;
        process.env.NO_PROXY = 'localhost,example.org';
        const otherRequest = new Request('http://example.com/api');
        await (0, fetch_1.fetchWithProxy)(otherRequest);
        expect(undici_1.ProxyAgent).toHaveBeenCalledWith(expect.objectContaining({
            uri: mockProxyUrl,
        }));
    });
});
//# sourceMappingURL=fetch.test.js.map