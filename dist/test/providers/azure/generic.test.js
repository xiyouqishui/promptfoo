"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generic_1 = require("../../../src/providers/azure/generic");
describe('AzureGenericProvider', () => {
    describe('getApiBaseUrl', () => {
        beforeEach(() => {
            delete process.env.AZURE_OPENAI_API_HOST;
        });
        it('should return apiBaseUrl if set', () => {
            const provider = new generic_1.AzureGenericProvider('test-deployment', {
                config: { apiBaseUrl: 'https://custom.azure.com' },
            });
            expect(provider.getApiBaseUrl()).toBe('https://custom.azure.com');
        });
        it('should return apiBaseUrl without trailing slash if set', () => {
            const provider = new generic_1.AzureGenericProvider('test-deployment', {
                config: { apiBaseUrl: 'https://custom.azure.com/' },
            });
            expect(provider.getApiBaseUrl()).toBe('https://custom.azure.com');
        });
        it('should construct URL from apiHost without protocol', () => {
            const provider = new generic_1.AzureGenericProvider('test-deployment', {
                config: { apiHost: 'api.azure.com' },
            });
            expect(provider.getApiBaseUrl()).toBe('https://api.azure.com');
        });
        it('should remove protocol from apiHost if present', () => {
            const provider = new generic_1.AzureGenericProvider('test-deployment', {
                config: { apiHost: 'https://api.azure.com' },
            });
            expect(provider.getApiBaseUrl()).toBe('https://api.azure.com');
        });
        it('should remove trailing slash from apiHost if present', () => {
            const provider = new generic_1.AzureGenericProvider('test-deployment', {
                config: { apiHost: 'api.azure.com/' },
            });
            expect(provider.getApiBaseUrl()).toBe('https://api.azure.com');
        });
        it('should return undefined if neither apiBaseUrl nor apiHost is set', () => {
            const provider = new generic_1.AzureGenericProvider('test-deployment', {});
            expect(provider.getApiBaseUrl()).toBeUndefined();
        });
    });
});
//# sourceMappingURL=generic.test.js.map