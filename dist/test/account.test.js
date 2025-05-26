"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const accounts_1 = require("../src/globalConfig/accounts");
const globalConfig_1 = require("../src/globalConfig/globalConfig");
jest.mock('../src/globalConfig/globalConfig', () => ({
    writeGlobalConfig: jest.fn(),
    readGlobalConfig: jest.fn(),
    writeGlobalConfigPartial: jest.fn(),
}));
describe('accounts module', () => {
    beforeEach(() => {
        delete process.env.PROMPTFOO_AUTHOR;
        jest.resetModules();
    });
    describe('getUserEmail', () => {
        it('should return the email from global config', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({ account: { email: 'test@example.com' } });
            expect((0, accounts_1.getUserEmail)()).toBe('test@example.com');
        });
        it('should return null if no email is set in global config', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({});
            expect((0, accounts_1.getUserEmail)()).toBeNull();
        });
    });
    describe('setUserEmail', () => {
        it('should write the email to global config', () => {
            const writeGlobalConfigSpy = jest.mocked(globalConfig_1.writeGlobalConfigPartial);
            (0, accounts_1.setUserEmail)('test@example.com');
            expect(writeGlobalConfigSpy).toHaveBeenCalledWith({ account: { email: 'test@example.com' } });
        });
    });
    describe('getAuthor', () => {
        it('should return the author from environment variable', () => {
            process.env.PROMPTFOO_AUTHOR = 'envAuthor';
            expect((0, accounts_1.getAuthor)()).toBe('envAuthor');
        });
        it('should return the email if environment variable is not set', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({ account: { email: 'test@example.com' } });
            expect((0, accounts_1.getAuthor)()).toBe('test@example.com');
        });
        it('should return null if neither environment variable nor email is set', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({});
            expect((0, accounts_1.getAuthor)()).toBeNull();
        });
    });
});
//# sourceMappingURL=account.test.js.map