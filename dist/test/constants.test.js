"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const constants_1 = require("../src/constants");
describe('constants', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        process.env = {};
    });
    it('should export VERSION from package.json', () => {
        expect(constants_1.VERSION).toBeDefined();
    });
    it('should have DEFAULT_QUERY_LIMIT set to 100', () => {
        expect(constants_1.DEFAULT_QUERY_LIMIT).toBe(100);
    });
    it('should have DEFAULT_API_BASE_URL set to api.promptfoo.app', () => {
        expect(constants_1.DEFAULT_API_BASE_URL).toBe('https://api.promptfoo.app');
    });
    describe('getShareApiBaseUrl', () => {
        it('should return DEFAULT_API_BASE_URL by default', () => {
            expect((0, constants_1.getShareApiBaseUrl)()).toBe(constants_1.DEFAULT_API_BASE_URL);
        });
        it('should return NEXT_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL if set', () => {
            process.env.NEXT_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL = 'https://custom.api.com';
            expect((0, constants_1.getShareApiBaseUrl)()).toBe('https://custom.api.com');
        });
        it('should return NEXT_PUBLIC_PROMPTFOO_BASE_URL if set', () => {
            process.env.NEXT_PUBLIC_PROMPTFOO_BASE_URL = 'https://custom.base.com';
            expect((0, constants_1.getShareApiBaseUrl)()).toBe('https://custom.base.com');
        });
        it('should return PROMPTFOO_REMOTE_API_BASE_URL if set', () => {
            process.env.PROMPTFOO_REMOTE_API_BASE_URL = 'https://remote.api.com';
            expect((0, constants_1.getShareApiBaseUrl)()).toBe('https://remote.api.com');
        });
        it('should prioritize NEXT_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL over others', () => {
            process.env.NEXT_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL = 'https://custom.api.com';
            process.env.NEXT_PUBLIC_PROMPTFOO_BASE_URL = 'https://custom.base.com';
            process.env.PROMPTFOO_REMOTE_API_BASE_URL = 'https://remote.api.com';
            expect((0, constants_1.getShareApiBaseUrl)()).toBe('https://custom.api.com');
        });
    });
    describe('getDefaultShareViewBaseUrl', () => {
        it('should return promptfoo.app by default', () => {
            expect((0, constants_1.getDefaultShareViewBaseUrl)()).toBe('https://promptfoo.app');
        });
        it('should return PROMPTFOO_SHARING_APP_BASE_URL if set', () => {
            process.env.PROMPTFOO_SHARING_APP_BASE_URL = 'https://custom.share.com';
            expect((0, constants_1.getDefaultShareViewBaseUrl)()).toBe('https://custom.share.com');
        });
    });
    describe('getShareViewBaseUrl', () => {
        it('should return promptfoo.app by default', () => {
            expect((0, constants_1.getShareViewBaseUrl)()).toBe('https://promptfoo.app');
        });
        it('should return NEXT_PUBLIC_PROMPTFOO_BASE_URL if set', () => {
            process.env.NEXT_PUBLIC_PROMPTFOO_BASE_URL = 'https://custom.base.com';
            expect((0, constants_1.getShareViewBaseUrl)()).toBe('https://custom.base.com');
        });
        it('should return PROMPTFOO_REMOTE_APP_BASE_URL if set', () => {
            process.env.PROMPTFOO_REMOTE_APP_BASE_URL = 'https://remote.app.com';
            expect((0, constants_1.getShareViewBaseUrl)()).toBe('https://remote.app.com');
        });
        it('should prioritize NEXT_PUBLIC_PROMPTFOO_BASE_URL over others', () => {
            process.env.NEXT_PUBLIC_PROMPTFOO_BASE_URL = 'https://custom.base.com';
            process.env.PROMPTFOO_REMOTE_APP_BASE_URL = 'https://remote.app.com';
            expect((0, constants_1.getShareViewBaseUrl)()).toBe('https://custom.base.com');
        });
    });
    describe('getDefaultPort', () => {
        it('should return 15500 by default', () => {
            expect((0, constants_1.getDefaultPort)()).toBe(15500);
        });
        it('should return API_PORT if set', () => {
            process.env.API_PORT = '3000';
            expect((0, constants_1.getDefaultPort)()).toBe(3000);
        });
        it('should handle invalid API_PORT value', () => {
            process.env.API_PORT = 'invalid';
            expect((0, constants_1.getDefaultPort)()).toBe(15500);
        });
    });
    describe('TERMINAL_MAX_WIDTH', () => {
        it('should match expected terminal width', () => {
            const expectedWidth = process?.stdout?.isTTY && process?.stdout?.columns && process?.stdout?.columns > 10
                ? process.stdout.columns - 10
                : 120;
            expect(constants_1.TERMINAL_MAX_WIDTH).toBe(expectedWidth);
        });
    });
    it('should have CLOUD_PROVIDER_PREFIX set correctly', () => {
        expect(constants_1.CLOUD_PROVIDER_PREFIX).toBe('promptfoo://provider/');
    });
});
//# sourceMappingURL=constants.test.js.map