"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const accounts_1 = require("../src/globalConfig/accounts");
const cloud_1 = require("../src/globalConfig/cloud");
const share_1 = require("../src/share");
const cloud_2 = require("../src/util/cloud");
function buildMockEval() {
    return {
        config: {},
        author: 'test@example.com',
        useOldResults: jest.fn().mockReturnValue(false),
        loadResults: jest.fn().mockResolvedValue(undefined),
        results: [{ id: '1' }, { id: '2' }],
        save: jest.fn().mockResolvedValue(undefined),
        toEvaluateSummary: jest.fn().mockResolvedValue({}),
        getTable: jest.fn().mockResolvedValue([]),
        id: (0, node_crypto_1.randomUUID)(),
        getResultsCount: jest.fn().mockResolvedValue(2),
        fetchResultsBatched: jest.fn().mockImplementation(() => {
            const iterator = {
                called: false,
                next: async () => {
                    if (!iterator.called) {
                        iterator.called = true;
                        return { done: false, value: [{ id: '1' }, { id: '2' }] };
                    }
                    return { done: true, value: undefined };
                },
                [Symbol.asyncIterator]() {
                    return this;
                },
            };
            return iterator;
        }),
    };
}
const mockFetch = jest.fn();
jest.mock('../src/globalConfig/cloud');
jest.mock('../src/fetch', () => ({
    fetchWithProxy: jest.fn().mockImplementation((...args) => mockFetch(...args)),
}));
jest.mock('../src/globalConfig/accounts', () => ({
    getUserEmail: jest.fn(),
    setUserEmail: jest.fn(),
    getAuthor: jest.fn().mockReturnValue('test-author@example.com'),
}));
jest.mock('../src/util/cloud', () => ({
    cloudCanAcceptChunkedResults: jest.fn(),
    makeRequest: jest.fn(),
}));
jest.mock('../src/envars', () => ({
    getEnvBool: jest.fn(),
    getEnvInt: jest.fn(),
    getEnvString: jest.fn().mockReturnValue(''),
    isCI: jest.fn(),
}));
jest.mock('../src/constants', () => {
    const actual = jest.requireActual('../src/constants');
    return {
        ...actual,
        DEFAULT_API_BASE_URL: 'https://api.promptfoo.app',
        getShareApiBaseUrl: jest.fn().mockReturnValue('https://api.promptfoo.app'),
        getDefaultShareViewBaseUrl: jest.fn().mockReturnValue('https://promptfoo.app'),
        getShareViewBaseUrl: jest.fn().mockReturnValue('https://promptfoo.app'),
    };
});
describe('stripAuthFromUrl', () => {
    it('removes username and password from URL', () => {
        const input = 'https://user:pass@example.com/path?query=value#hash';
        const expected = 'https://example.com/path?query=value#hash';
        expect((0, share_1.stripAuthFromUrl)(input)).toBe(expected);
    });
    it('handles URLs without auth info', () => {
        const input = 'https://example.com/path?query=value#hash';
        expect((0, share_1.stripAuthFromUrl)(input)).toBe(input);
    });
    it('handles URLs with only username', () => {
        const input = 'https://user@example.com/path';
        const expected = 'https://example.com/path';
        expect((0, share_1.stripAuthFromUrl)(input)).toBe(expected);
    });
    it('handles URLs with special characters in auth', () => {
        const input = 'https://user%40:p@ss@example.com/path';
        const expected = 'https://example.com/path';
        expect((0, share_1.stripAuthFromUrl)(input)).toBe(expected);
    });
    it('returns original string for invalid URLs', () => {
        const input = 'not a valid url';
        expect((0, share_1.stripAuthFromUrl)(input)).toBe(input);
    });
    it('handles URLs with IP addresses', () => {
        const input = 'http://user:pass@192.168.1.1:8080/path';
        const expected = 'http://192.168.1.1:8080/path';
        expect((0, share_1.stripAuthFromUrl)(input)).toBe(expected);
    });
});
describe('isSharingEnabled', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        // Reset the mock to default value for each test
        jest
            .requireMock('../src/constants')
            .getShareApiBaseUrl.mockReturnValue('https://api.promptfoo.app');
    });
    it('returns true when sharing config is set in eval record', () => {
        const mockEval = {
            config: {
                sharing: {
                    apiBaseUrl: 'https://custom-api.example.com',
                },
            },
        };
        expect((0, share_1.isSharingEnabled)(mockEval)).toBe(true);
    });
    it('returns true when sharing env URL is set and not api.promptfoo.app', () => {
        jest
            .requireMock('../src/constants')
            .getShareApiBaseUrl.mockReturnValue('https://custom-api.example.com');
        const mockEval = {
            config: {},
        };
        expect((0, share_1.isSharingEnabled)(mockEval)).toBe(true);
    });
    it('returns true when cloud sharing is enabled', () => {
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(true);
        jest.mocked(cloud_1.cloudConfig.getApiHost).mockReturnValue('https://cloud-api.example.com');
        const mockEval = {
            config: {},
        };
        expect((0, share_1.isSharingEnabled)(mockEval)).toBe(true);
    });
    it('returns false when no sharing options are enabled', () => {
        // Explicitly ensure we're using the default mock return value
        jest
            .requireMock('../src/constants')
            .getShareApiBaseUrl.mockReturnValue('https://api.promptfoo.app');
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const mockEval = {
            config: {},
        };
        expect((0, share_1.isSharingEnabled)(mockEval)).toBe(false);
    });
    it('returns false when sharing config is not an object', () => {
        // Explicitly ensure we're using the default mock return value
        jest
            .requireMock('../src/constants')
            .getShareApiBaseUrl.mockReturnValue('https://api.promptfoo.app');
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const mockEval = {
            config: {
                sharing: true,
            },
        };
        expect((0, share_1.isSharingEnabled)(mockEval)).toBe(false);
    });
});
describe('determineShareDomain', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.requireMock('../src/envars').getEnvString.mockImplementation((_key) => '');
    });
    it('should use DEFAULT_SHARE_VIEW_BASE_URL when no custom domain is specified', () => {
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const mockEval = {
            config: {},
            id: 'test-eval-id',
        };
        const result = (0, share_1.determineShareDomain)(mockEval);
        expect(result.domain).toBe('https://promptfoo.app');
        expect(result.isPublicShare).toBe(true);
    });
    it('should use PROMPTFOO_REMOTE_APP_BASE_URL when specified', () => {
        const customDomain = 'https://my-custom-instance.com';
        jest.requireMock('../src/envars').getEnvString.mockImplementation((key) => {
            if (key === 'PROMPTFOO_REMOTE_APP_BASE_URL') {
                return customDomain;
            }
            return '';
        });
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const mockEval = {
            config: {},
            id: 'test-eval-id',
        };
        const result = (0, share_1.determineShareDomain)(mockEval);
        expect(result.domain).toBe(customDomain);
        expect(result.isPublicShare).toBe(true);
    });
    it('should use config sharing.appBaseUrl when provided', () => {
        const configAppBaseUrl = 'https://config-specified-domain.com';
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const mockEval = {
            config: {
                sharing: {
                    appBaseUrl: configAppBaseUrl,
                },
            },
            id: 'test-eval-id',
        };
        const result = (0, share_1.determineShareDomain)(mockEval);
        expect(result.domain).toBe(configAppBaseUrl);
        expect(result.isPublicShare).toBe(false);
    });
    it('should prioritize config sharing.appBaseUrl over environment variables', () => {
        const configAppBaseUrl = 'https://config-specified-domain.com';
        const envAppBaseUrl = 'https://env-specified-domain.com';
        jest.requireMock('../src/envars').getEnvString.mockImplementation((key) => {
            if (key === 'PROMPTFOO_REMOTE_APP_BASE_URL') {
                return envAppBaseUrl;
            }
            return '';
        });
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const mockEval = {
            config: {
                sharing: {
                    appBaseUrl: configAppBaseUrl,
                },
            },
            id: 'test-eval-id',
        };
        const result = (0, share_1.determineShareDomain)(mockEval);
        expect(result.domain).toBe(configAppBaseUrl);
        expect(result.isPublicShare).toBe(false);
    });
});
describe('createShareableUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.requireMock('../src/envars').getEnvString.mockImplementation((_key) => '');
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: 'mock-eval-id' }),
        });
    });
    it('creates correct URL for cloud config and updates author', async () => {
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(true);
        jest.mocked(cloud_1.cloudConfig.getAppUrl).mockReturnValue('https://app.example.com');
        jest.mocked(cloud_1.cloudConfig.getApiHost).mockReturnValue('https://api.example.com');
        jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue('mock-api-key');
        jest.mocked(accounts_1.getUserEmail).mockReturnValue('logged-in@example.com');
        const mockEval = buildMockEval();
        mockEval.author = 'original@example.com';
        const result = await (0, share_1.createShareableUrl)(mockEval);
        expect(result).toBe(`https://app.example.com/eval/${mockEval.id}`);
    });
    it('updates eval ID when server returns different ID for cloud instance', async () => {
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(true);
        jest.mocked(cloud_1.cloudConfig.getAppUrl).mockReturnValue('https://app.example.com');
        jest.mocked(cloud_1.cloudConfig.getApiHost).mockReturnValue('https://api.example.com');
        jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue('mock-api-key');
        jest.mocked(cloud_2.cloudCanAcceptChunkedResults).mockResolvedValue(false);
        const originalId = (0, node_crypto_1.randomUUID)();
        const newId = (0, node_crypto_1.randomUUID)();
        const mockEval = buildMockEval();
        mockEval.id = originalId;
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: newId }),
        });
        await (0, share_1.createShareableUrl)(mockEval);
        expect(mockEval.id).toBe(newId);
    });
    it('updates eval ID when server returns different ID for self-hosted instance', async () => {
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const originalId = (0, node_crypto_1.randomUUID)();
        const newId = (0, node_crypto_1.randomUUID)();
        const mockEval = buildMockEval();
        mockEval.id = originalId;
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ id: newId }),
        });
        await (0, share_1.createShareableUrl)(mockEval);
        expect(mockEval.id).toBe(newId);
    });
    describe('chunked sending', () => {
        let mockEval;
        beforeEach(() => {
            mockEval = buildMockEval();
            jest.mocked(accounts_1.getUserEmail).mockReturnValue('test@example.com');
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue('mock-api-key');
            jest.requireMock('../src/envars').getEnvString.mockImplementation((_key) => '');
            mockFetch.mockReset();
        });
        it('sends chunked eval to cloud', async () => {
            jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(true);
            jest.mocked(cloud_1.cloudConfig.getAppUrl).mockReturnValue('https://app.example.com');
            jest.mocked(cloud_1.cloudConfig.getApiHost).mockReturnValue('https://api.example.com');
            jest.mocked(cloud_2.cloudCanAcceptChunkedResults).mockResolvedValue(true);
            // Set up mock responses
            mockFetch
                .mockImplementationOnce((url, options) => {
                // Initial eval data
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 'mock-eval-id' }),
                });
            })
                .mockImplementationOnce((url, options) => {
                // Chunk of results
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                });
            });
            await (0, share_1.createShareableUrl)(mockEval);
            expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/results', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"results":[]'),
            }));
            expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/results/mock-eval-id/results', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('[{"id":"1"},{"id":"2"}]'),
            }));
        });
        it('sends chunked eval when open source self hosted', async () => {
            jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: mockEval.id }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });
            const result = await (0, share_1.createShareableUrl)(mockEval);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/eval'), expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"results":[]'),
            }));
            expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(`/api/eval/${mockEval.id}/results`), expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('[{"id":"1"},{"id":"2"}]'),
            }));
            expect(result).toBe(`https://promptfoo.app/eval/${mockEval.id}`);
        });
    });
    it('creates URL with custom domain from environment variables', async () => {
        jest.mocked(cloud_1.cloudConfig.isEnabled).mockReturnValue(false);
        const customDomain = 'https://my-custom-instance.com';
        jest.requireMock('../src/envars').getEnvString.mockImplementation((key) => {
            if (key === 'PROMPTFOO_REMOTE_APP_BASE_URL') {
                return customDomain;
            }
            return '';
        });
        const mockEval = buildMockEval();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ id: mockEval.id }),
        });
        const result = await (0, share_1.createShareableUrl)(mockEval);
        expect(result).toBe(`${customDomain}/eval/?evalId=${mockEval.id}`);
    });
});
describe('hasEvalBeenShared', () => {
    beforeAll(() => {
        mockFetch.mockReset();
    });
    it('returns true if the server does not return 404', async () => {
        const mockEval = {
            config: {},
            id: (0, node_crypto_1.randomUUID)(),
        };
        jest.mocked(cloud_2.makeRequest).mockResolvedValue({ status: 200 });
        const result = await (0, share_1.hasEvalBeenShared)(mockEval);
        expect(result).toBe(true);
    });
    it('returns false if the server returns 404', async () => {
        const mockEval = {
            config: {},
            id: (0, node_crypto_1.randomUUID)(),
        };
        jest.mocked(cloud_2.makeRequest).mockResolvedValue({ status: 404 });
        const result = await (0, share_1.hasEvalBeenShared)(mockEval);
        expect(result).toBe(false);
    });
});
//# sourceMappingURL=share.test.js.map