"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../../src/fetch");
const cloud_1 = require("../../src/globalConfig/cloud");
const globalConfig_1 = require("../../src/globalConfig/globalConfig");
const logger_1 = __importDefault(require("../../src/logger"));
jest.mock('../../src/fetch');
jest.mock('../../src/logger');
jest.mock('../../src/globalConfig/globalConfig');
describe('CloudConfig', () => {
    let cloudConfigInstance;
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
            cloud: {
                appUrl: 'https://test.app',
                apiHost: 'https://test.api',
                apiKey: 'test-key',
            },
        });
        cloudConfigInstance = new cloud_1.CloudConfig();
    });
    describe('constructor', () => {
        it('should initialize with default values when no saved config exists', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({});
            const config = new cloud_1.CloudConfig();
            expect(config.getAppUrl()).toBe('https://www.promptfoo.app');
            expect(config.getApiHost()).toBe(cloud_1.API_HOST);
            expect(config.getApiKey()).toBeUndefined();
        });
        it('should initialize with saved config values', () => {
            expect(cloudConfigInstance.getAppUrl()).toBe('https://test.app');
            expect(cloudConfigInstance.getApiHost()).toBe('https://test.api');
            expect(cloudConfigInstance.getApiKey()).toBe('test-key');
        });
    });
    describe('isEnabled', () => {
        it('should return true when apiKey exists', () => {
            expect(cloudConfigInstance.isEnabled()).toBe(true);
        });
        it('should return false when apiKey does not exist', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({});
            const config = new cloud_1.CloudConfig();
            expect(config.isEnabled()).toBe(false);
        });
    });
    describe('setters and getters', () => {
        it('should set and get apiHost', () => {
            cloudConfigInstance.setApiHost('https://new.api');
            expect(globalConfig_1.writeGlobalConfigPartial).toHaveBeenCalledWith({
                cloud: expect.objectContaining({
                    apiHost: 'https://new.api',
                }),
            });
        });
        it('should set and get apiKey', () => {
            cloudConfigInstance.setApiKey('new-key');
            expect(globalConfig_1.writeGlobalConfigPartial).toHaveBeenCalledWith({
                cloud: expect.objectContaining({
                    apiKey: 'new-key',
                }),
            });
        });
        it('should set and get appUrl', () => {
            cloudConfigInstance.setAppUrl('https://new.app');
            expect(globalConfig_1.writeGlobalConfigPartial).toHaveBeenCalledWith({
                cloud: expect.objectContaining({
                    appUrl: 'https://new.app',
                }),
            });
        });
    });
    describe('delete', () => {
        it('should clear cloud config', () => {
            cloudConfigInstance.delete();
            expect(globalConfig_1.writeGlobalConfigPartial).toHaveBeenCalledWith({ cloud: {} });
        });
    });
    describe('validateAndSetApiToken', () => {
        const mockResponse = {
            user: {
                id: '1',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            organization: {
                id: '1',
                name: 'Test Org',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            app: {
                url: 'https://test.app',
            },
        };
        it('should validate token and update config on success', async () => {
            const mockFetchResponse = {
                ok: true,
                json: () => Promise.resolve(mockResponse),
                text: () => Promise.resolve(JSON.stringify(mockResponse)),
            };
            jest.mocked(fetch_1.fetchWithProxy).mockResolvedValue(mockFetchResponse);
            const result = await cloudConfigInstance.validateAndSetApiToken('test-token', 'https://test.api');
            expect(result).toEqual(mockResponse);
            expect(globalConfig_1.writeGlobalConfigPartial).toHaveBeenCalledWith({
                cloud: expect.objectContaining({
                    apiKey: 'test-token',
                    apiHost: 'https://test.api',
                    appUrl: 'https://test.app',
                }),
            });
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Successfully logged in'));
        });
        it('should throw error on failed validation', async () => {
            const mockErrorResponse = {
                ok: false,
                statusText: 'Unauthorized',
                json: () => Promise.reject(new Error('Unauthorized')),
                text: () => Promise.resolve('Unauthorized'),
            };
            jest.mocked(fetch_1.fetchWithProxy).mockResolvedValue(mockErrorResponse);
            await expect(cloudConfigInstance.validateAndSetApiToken('invalid-token', 'https://test.api')).rejects.toThrow('Failed to validate API token: Unauthorized');
        });
    });
    describe('cloudConfig singleton', () => {
        it('should be an instance of CloudConfig', () => {
            expect(cloud_1.cloudConfig).toBeInstanceOf(cloud_1.CloudConfig);
        });
    });
});
//# sourceMappingURL=cloud.test.js.map