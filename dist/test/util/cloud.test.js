"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../../src/fetch");
const cloud_1 = require("../../src/globalConfig/cloud");
const cloud_2 = require("../../src/util/cloud");
jest.mock('../../src/fetch');
jest.mock('../../src/globalConfig/cloud');
jest.mock('../../src/util/cloud', () => ({
    ...jest.requireActual('../../src/util/cloud'),
    cloudCanBuildFormattedConfig: jest.fn().mockResolvedValue(true),
}));
describe('cloud utils', () => {
    const mockFetchWithProxy = jest.mocked(fetch_1.fetchWithProxy);
    const mockCloudConfig = cloud_1.cloudConfig;
    beforeEach(() => {
        jest.resetAllMocks();
        mockCloudConfig.getApiHost.mockReturnValue('https://api.example.com');
        mockCloudConfig.getApiKey.mockReturnValue('test-api-key');
    });
    describe('makeRequest', () => {
        it('should make request with correct URL and headers', async () => {
            const path = 'test/path';
            const method = 'POST';
            const body = { data: 'test' };
            await (0, cloud_2.makeRequest)(path, method, body);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should make GET request without body', async () => {
            const path = 'test/path';
            const method = 'GET';
            await (0, cloud_2.makeRequest)(path, method);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', {
                method: 'GET',
                body: undefined,
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should handle undefined API key', async () => {
            mockCloudConfig.getApiKey.mockReturnValue(undefined);
            const path = 'test/path';
            const method = 'GET';
            await (0, cloud_2.makeRequest)(path, method);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', {
                method: 'GET',
                body: undefined,
                headers: { Authorization: 'Bearer undefined' },
            });
        });
        it('should handle empty path', async () => {
            const path = '';
            const method = 'GET';
            await (0, cloud_2.makeRequest)(path, method);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/', {
                method: 'GET',
                body: undefined,
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should handle API host without trailing slash', async () => {
            mockCloudConfig.getApiHost.mockReturnValue('https://api.example.com');
            const path = 'test/path';
            const method = 'GET';
            await (0, cloud_2.makeRequest)(path, method);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', expect.any(Object));
        });
        it('should handle API host with trailing slash', async () => {
            mockCloudConfig.getApiHost.mockReturnValue('https://api.example.com/');
            const path = 'test/path';
            const method = 'GET';
            await (0, cloud_2.makeRequest)(path, method);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com//test/path', expect.any(Object));
        });
        it('should handle path with leading slash', async () => {
            const path = '/test/path';
            const method = 'GET';
            await (0, cloud_2.makeRequest)(path, method);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com//test/path', {
                method: 'GET',
                body: undefined,
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should handle complex request body', async () => {
            const path = 'test/path';
            const method = 'POST';
            const body = {
                string: 'test',
                number: 123,
                boolean: true,
                array: [1, 2, 3],
                nested: {
                    field: 'value',
                },
            };
            await (0, cloud_2.makeRequest)(path, method, body);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should handle non-JSON body', async () => {
            const path = 'test/path';
            const method = 'POST';
            const body = 'plain text body';
            await (0, cloud_2.makeRequest)(path, method, body);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should handle null/undefined body', async () => {
            const path = 'test/path';
            const method = 'POST';
            await (0, cloud_2.makeRequest)(path, method, null);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', {
                method: 'POST',
                body: 'null',
                headers: { Authorization: 'Bearer test-api-key' },
            });
            await (0, cloud_2.makeRequest)(path, method, undefined);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/test/path', {
                method: 'POST',
                body: undefined,
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
    });
    describe('getProviderFromCloud', () => {
        beforeEach(() => {
            mockCloudConfig.isEnabled.mockReturnValue(true);
        });
        it('should fetch and parse provider successfully', async () => {
            const mockProvider = {
                config: {
                    id: 'test-provider',
                    label: 'Test Provider',
                },
            };
            mockFetchWithProxy.mockResolvedValueOnce({
                json: () => Promise.resolve(mockProvider),
                ok: true,
            });
            const result = await (0, cloud_2.getProviderFromCloud)('test-provider');
            expect(result).toEqual({ ...mockProvider.config });
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/api/providers/test-provider', {
                method: 'GET',
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should throw error when cloud config is not enabled', async () => {
            mockCloudConfig.isEnabled.mockReturnValue(false);
            await expect((0, cloud_2.getProviderFromCloud)('test-provider')).rejects.toThrow('Could not fetch Provider test-provider from cloud. Cloud config is not enabled.');
        });
        it('should throw error when provider fetch fails', async () => {
            mockFetchWithProxy.mockRejectedValueOnce(new Error('Network error'));
            await expect((0, cloud_2.getProviderFromCloud)('test-provider')).rejects.toThrow('Failed to fetch provider from cloud: test-provider.');
        });
        it('should throw error when provider has no id', async () => {
            const mockProvider = {
                config: {
                    label: 'Test Provider',
                    // Missing id field
                },
            };
            mockFetchWithProxy.mockResolvedValueOnce({
                json: () => Promise.resolve({ buildDate: '2025-03-011' }),
            });
            mockFetchWithProxy.mockResolvedValueOnce({
                json: () => Promise.resolve(mockProvider),
            });
            await expect((0, cloud_2.getProviderFromCloud)('test-provider')).rejects.toThrow('Failed to fetch provider from cloud: test-provider.');
        });
    });
    describe('getConfigFromCloud', () => {
        beforeEach(() => {
            mockCloudConfig.isEnabled.mockReturnValue(true);
        });
        it('should fetch unified config when formatted config is supported', async () => {
            const mockUnifiedConfig = {
                description: 'Test Config',
                providers: ['test-provider'],
                prompts: ['test prompt'],
                tests: [{ vars: { input: 'test' } }],
            };
            mockFetchWithProxy.mockResolvedValueOnce({
                json: () => Promise.resolve(mockUnifiedConfig),
                ok: true,
            });
            const result = await (0, cloud_2.getConfigFromCloud)('test-config');
            expect(result).toEqual(mockUnifiedConfig);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/api/redteam/configs/test-config/unified', {
                method: 'GET',
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should fetch unified config with target', async () => {
            const mockUnifiedConfig = {
                description: 'Test Config',
                providers: ['test-provider'],
                prompts: ['test prompt'],
                tests: [{ vars: { input: 'test' } }],
            };
            mockFetchWithProxy.mockResolvedValueOnce({
                json: () => Promise.resolve(mockUnifiedConfig),
                ok: true,
            });
            const result = await (0, cloud_2.getConfigFromCloud)('test-config', 'test-provider');
            expect(result).toEqual(mockUnifiedConfig);
            expect(mockFetchWithProxy).toHaveBeenCalledWith('https://api.example.com/api/redteam/configs/test-config/unified?providerId=test-provider', {
                method: 'GET',
                headers: { Authorization: 'Bearer test-api-key' },
            });
        });
        it('should throw error when cloud config is not enabled', async () => {
            mockCloudConfig.isEnabled.mockReturnValue(false);
            await expect((0, cloud_2.getConfigFromCloud)('test-config')).rejects.toThrow('Could not fetch Config test-config from cloud. Cloud config is not enabled.');
        });
        it('should throw error when config fetch fails', async () => {
            mockFetchWithProxy.mockRejectedValueOnce(new Error('Network error'));
            await expect((0, cloud_2.getConfigFromCloud)('test-config')).rejects.toThrow('Failed to fetch config from cloud: test-config.');
        });
        it('should throw error when response is not ok', async () => {
            mockFetchWithProxy.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
                json: () => Promise.resolve({}),
            });
            await expect((0, cloud_2.getConfigFromCloud)('test-config')).rejects.toThrow('Failed to fetch config from cloud: test-config.');
        });
    });
});
//# sourceMappingURL=cloud.test.js.map