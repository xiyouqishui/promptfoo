"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const input_1 = __importDefault(require("@inquirer/input"));
const chalk_1 = __importDefault(require("chalk"));
const envars_1 = require("../../src/envars");
const fetch_1 = require("../../src/fetch");
const accounts_1 = require("../../src/globalConfig/accounts");
const globalConfig_1 = require("../../src/globalConfig/globalConfig");
const logger_1 = __importDefault(require("../../src/logger"));
const telemetry_1 = __importDefault(require("../../src/telemetry"));
jest.mock('@inquirer/input');
jest.mock('../../src/envars');
jest.mock('../../src/fetch');
jest.mock('../../src/telemetry');
jest.mock('../../src/util');
describe('accounts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getUserEmail', () => {
        it('should return email from global config', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
                account: { email: 'test@example.com' },
            });
            expect((0, accounts_1.getUserEmail)()).toBe('test@example.com');
        });
        it('should return null if no email in config', () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({});
            expect((0, accounts_1.getUserEmail)()).toBeNull();
        });
    });
    describe('setUserEmail', () => {
        it('should write email to global config', () => {
            const email = 'test@example.com';
            (0, accounts_1.setUserEmail)(email);
            expect(globalConfig_1.writeGlobalConfigPartial).toHaveBeenCalledWith({
                account: { email },
            });
        });
    });
    describe('getAuthor', () => {
        it('should return env var if set', () => {
            jest.mocked(envars_1.getEnvString).mockReturnValue('author@env.com');
            expect((0, accounts_1.getAuthor)()).toBe('author@env.com');
        });
        it('should fall back to user email if no env var', () => {
            jest.mocked(envars_1.getEnvString).mockReturnValue('');
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
                account: { email: 'test@example.com' },
            });
            expect((0, accounts_1.getAuthor)()).toBe('test@example.com');
        });
        it('should return null if no author found', () => {
            jest.mocked(envars_1.getEnvString).mockReturnValue('');
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({});
            expect((0, accounts_1.getAuthor)()).toBeNull();
        });
    });
    describe('promptForEmailUnverified', () => {
        beforeEach(() => {
            jest.mocked(envars_1.isCI).mockReturnValue(false);
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({});
        });
        it('should use CI email if in CI environment', async () => {
            jest.mocked(envars_1.isCI).mockReturnValue(true);
            await (0, accounts_1.promptForEmailUnverified)();
            expect(telemetry_1.default.saveConsent).toHaveBeenCalledWith('ci-placeholder@promptfoo.dev', {
                source: 'promptForEmailUnverified',
            });
        });
        it('should not prompt for email if already set', async () => {
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
                account: { email: 'existing@example.com' },
            });
            await (0, accounts_1.promptForEmailUnverified)();
            expect(input_1.default).not.toHaveBeenCalled();
            expect(telemetry_1.default.saveConsent).toHaveBeenCalledWith('existing@example.com', {
                source: 'promptForEmailUnverified',
            });
        });
        it('should prompt for email and save valid input', async () => {
            jest.mocked(input_1.default).mockResolvedValue('new@example.com');
            await (0, accounts_1.promptForEmailUnverified)();
            expect(globalConfig_1.writeGlobalConfigPartial).toHaveBeenCalledWith({
                account: { email: 'new@example.com' },
            });
            expect(telemetry_1.default.saveConsent).toHaveBeenCalledWith('new@example.com', {
                source: 'promptForEmailUnverified',
            });
        });
        describe('email validation', () => {
            let validateFn;
            beforeEach(async () => {
                await (0, accounts_1.promptForEmailUnverified)();
                validateFn = jest.mocked(input_1.default).mock.calls[0][0].validate;
            });
            it('should reject invalid email formats with error message', async () => {
                const invalidEmails = [
                    '',
                    'invalid',
                    '@example.com',
                    'user@',
                    'user@.',
                    'user.com',
                    'user@.com',
                    '@.',
                    'user@example.',
                    'user.@example.com',
                    'us..er@example.com',
                ];
                for (const email of invalidEmails) {
                    const result = await validateFn(email);
                    expect(typeof result).toBe('string');
                    expect(result).toBe('Please enter a valid email address');
                }
            });
            it('should accept valid email formats with true', async () => {
                const validEmails = [
                    'valid@example.com',
                    'user.name@example.com',
                    'user+tag@example.com',
                    'user@subdomain.example.com',
                    'user@example.co.uk',
                    '123@example.com',
                    'user-name@example.com',
                    'user_name@example.com',
                ];
                for (const email of validEmails) {
                    await expect(validateFn(email)).toBe(true);
                }
            });
        });
        it('should save consent after successful email input', async () => {
            jest.mocked(input_1.default).mockResolvedValue('test@example.com');
            await (0, accounts_1.promptForEmailUnverified)();
            expect(telemetry_1.default.saveConsent).toHaveBeenCalledWith('test@example.com', {
                source: 'promptForEmailUnverified',
            });
        });
    });
    describe('checkEmailStatusOrExit', () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it('should use CI email when in CI environment', async () => {
            jest.mocked(envars_1.isCI).mockReturnValue(true);
            const mockResponse = new Response(JSON.stringify({ status: 'ok' }), {
                status: 200,
                statusText: 'OK',
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue(mockResponse);
            await (0, accounts_1.checkEmailStatusOrExit)();
            expect(fetch_1.fetchWithTimeout).toHaveBeenCalledWith('https://api.promptfoo.app/api/users/status?email=ci-placeholder@promptfoo.dev', undefined, 500);
        });
        it('should use user email when not in CI environment', async () => {
            jest.mocked(envars_1.isCI).mockReturnValue(false);
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
                account: { email: 'test@example.com' },
            });
            const mockResponse = new Response(JSON.stringify({ status: 'ok' }), {
                status: 200,
                statusText: 'OK',
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue(mockResponse);
            await (0, accounts_1.checkEmailStatusOrExit)();
            expect(fetch_1.fetchWithTimeout).toHaveBeenCalledWith('https://api.promptfoo.app/api/users/status?email=test@example.com', undefined, 500);
        });
        it('should exit if limit exceeded', async () => {
            jest.mocked(envars_1.isCI).mockReturnValue(false);
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
                account: { email: 'test@example.com' },
            });
            const mockResponse = new Response(JSON.stringify({ status: 'exceeded_limit' }), {
                status: 200,
                statusText: 'OK',
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue(mockResponse);
            await (0, accounts_1.checkEmailStatusOrExit)();
            expect(mockExit).toHaveBeenCalledWith(1);
            expect(logger_1.default.error).toHaveBeenCalledWith('You have exceeded the maximum cloud inference limit. Please contact inquiries@promptfoo.dev to upgrade your account.');
        });
        it('should display warning message when status is show_usage_warning', async () => {
            jest.mocked(envars_1.isCI).mockReturnValue(false);
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
                account: { email: 'test@example.com' },
            });
            const warningMessage = 'You are approaching your usage limit';
            const mockResponse = new Response(JSON.stringify({ status: 'show_usage_warning', message: warningMessage }), {
                status: 200,
                statusText: 'OK',
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue(mockResponse);
            await (0, accounts_1.checkEmailStatusOrExit)();
            expect(logger_1.default.info).toHaveBeenCalledTimes(2);
            expect(logger_1.default.warn).toHaveBeenCalledWith(chalk_1.default.yellow(warningMessage));
            expect(mockExit).not.toHaveBeenCalled();
        });
        it('should handle fetch errors', async () => {
            jest.mocked(envars_1.isCI).mockReturnValue(false);
            jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
                account: { email: 'test@example.com' },
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockRejectedValue(new Error('Network error'));
            await (0, accounts_1.checkEmailStatusOrExit)();
            expect(logger_1.default.debug).toHaveBeenCalledWith('Failed to check user status: Error: Network error');
            expect(mockExit).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=accounts.test.js.map