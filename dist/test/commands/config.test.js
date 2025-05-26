"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const confirm_1 = __importDefault(require("@inquirer/confirm"));
const commander_1 = require("commander");
const config_1 = require("../../src/commands/config");
const accounts_1 = require("../../src/globalConfig/accounts");
const cloud_1 = require("../../src/globalConfig/cloud");
const logger_1 = __importDefault(require("../../src/logger"));
const telemetry_1 = __importDefault(require("../../src/telemetry"));
jest.mock('../../src/globalConfig/accounts');
jest.mock('../../src/globalConfig/cloud');
jest.mock('../../src/telemetry', () => ({
    record: jest.fn(),
    send: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@inquirer/confirm');
describe('config command', () => {
    let program;
    beforeEach(() => {
        jest.clearAllMocks();
        program = new commander_1.Command();
        (0, config_1.configCommand)(program);
    });
    describe('set email', () => {
        it('should not allow setting email when user is logged in', async () => {
            // Mock logged in state
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue('test-api-key');
            // Execute set email command
            const setEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'set')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await setEmailCmd?.parseAsync(['node', 'test', 'new@example.com']);
            // Verify email was not set and error was shown
            expect(accounts_1.setUserEmail).not.toHaveBeenCalled();
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining("Cannot update email while logged in. Email is managed through 'promptfoo auth login'"));
            expect(process.exitCode).toBe(1);
        });
        it('should allow setting email when user is not logged in', async () => {
            // Mock logged out state
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue(undefined);
            // Execute set email command
            const setEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'set')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await setEmailCmd?.parseAsync(['node', 'test', 'test@example.com']);
            // Verify email was set
            expect(accounts_1.setUserEmail).toHaveBeenCalledWith('test@example.com');
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Email set to test@example.com'));
            expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
                name: 'config set',
                configKey: 'email',
            });
            expect(telemetry_1.default.send).toHaveBeenCalledWith();
        });
        it('should validate email format even when not logged in', async () => {
            // Mock logged out state
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue(undefined);
            // Execute set email command with invalid email
            const setEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'set')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await setEmailCmd?.parseAsync(['node', 'test', 'invalid-email']);
            // Verify email was not set and error was shown
            expect(accounts_1.setUserEmail).not.toHaveBeenCalled();
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Invalid email address'));
            expect(process.exitCode).toBe(1);
            expect(telemetry_1.default.record).not.toHaveBeenCalled();
            expect(telemetry_1.default.send).not.toHaveBeenCalled();
        });
    });
    describe('unset email', () => {
        it('should not allow unsetting email when user is logged in', async () => {
            // Mock logged in state
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue('test-api-key');
            jest.mocked(accounts_1.getUserEmail).mockReturnValue('test@example.com');
            // Execute unset email command
            const unsetEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'unset')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await unsetEmailCmd?.parseAsync(['node', 'test']);
            // Verify email was not unset and error was shown
            expect(accounts_1.setUserEmail).not.toHaveBeenCalled();
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining("Cannot update email while logged in. Email is managed through 'promptfoo auth login'"));
            expect(process.exitCode).toBe(1);
        });
        it('should allow unsetting email when user is not logged in with force flag', async () => {
            // Mock logged out state
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue(undefined);
            jest.mocked(accounts_1.getUserEmail).mockReturnValue('test@example.com');
            // Execute unset email command with force flag
            const unsetEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'unset')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await unsetEmailCmd?.parseAsync(['node', 'test', '--force']);
            // Verify email was unset
            expect(accounts_1.setUserEmail).toHaveBeenCalledWith('');
            expect(logger_1.default.info).toHaveBeenCalledWith('Email has been unset.');
            expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
                name: 'config unset',
                configKey: 'email',
            });
            expect(telemetry_1.default.send).toHaveBeenCalledWith();
        });
        it('should handle user confirmation for unsetting email', async () => {
            // Mock logged out state and user confirmation
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue(undefined);
            jest.mocked(accounts_1.getUserEmail).mockReturnValue('test@example.com');
            jest.mocked(confirm_1.default).mockResolvedValueOnce(true);
            // Execute unset email command without force flag
            const unsetEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'unset')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await unsetEmailCmd?.parseAsync(['node', 'test']);
            // Verify email was unset after confirmation
            expect(confirm_1.default).toHaveBeenCalledWith({
                message: 'Are you sure you want to unset the email "test@example.com"?',
                default: false,
            });
            expect(accounts_1.setUserEmail).toHaveBeenCalledWith('');
            expect(logger_1.default.info).toHaveBeenCalledWith('Email has been unset.');
        });
        it('should handle user cancellation for unsetting email', async () => {
            // Mock logged out state and user cancellation
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue(undefined);
            jest.mocked(accounts_1.getUserEmail).mockReturnValue('test@example.com');
            jest.mocked(confirm_1.default).mockResolvedValueOnce(false);
            // Execute unset email command without force flag
            const unsetEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'unset')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await unsetEmailCmd?.parseAsync(['node', 'test']);
            // Verify operation was cancelled
            expect(accounts_1.setUserEmail).not.toHaveBeenCalled();
            expect(logger_1.default.info).toHaveBeenCalledWith('Operation cancelled.');
            expect(telemetry_1.default.record).not.toHaveBeenCalled();
            expect(telemetry_1.default.send).not.toHaveBeenCalled();
        });
        it('should handle case when no email is set', async () => {
            // Mock logged out state and no existing email
            jest.mocked(cloud_1.cloudConfig.getApiKey).mockReturnValue(undefined);
            jest.mocked(accounts_1.getUserEmail).mockReturnValue(null);
            // Execute unset email command
            const unsetEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'unset')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await unsetEmailCmd?.parseAsync(['node', 'test']);
            // Verify appropriate message was shown
            expect(logger_1.default.info).toHaveBeenCalledWith('No email is currently set.');
            expect(accounts_1.setUserEmail).not.toHaveBeenCalled();
            expect(telemetry_1.default.record).not.toHaveBeenCalled();
            expect(telemetry_1.default.send).not.toHaveBeenCalled();
        });
    });
    describe('get email', () => {
        it('should show email when it exists', async () => {
            // Mock existing email
            jest.mocked(accounts_1.getUserEmail).mockReturnValue('test@example.com');
            // Execute get email command
            const getEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'get')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await getEmailCmd?.parseAsync(['node', 'test']);
            // Verify email was shown and telemetry was recorded
            expect(logger_1.default.info).toHaveBeenCalledWith('test@example.com');
            expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
                name: 'config get',
                configKey: 'email',
            });
            expect(telemetry_1.default.send).toHaveBeenCalledWith();
        });
        it('should show message when no email is set', async () => {
            // Mock no existing email
            jest.mocked(accounts_1.getUserEmail).mockReturnValue(null);
            // Execute get email command
            const getEmailCmd = program.commands
                .find((cmd) => cmd.name() === 'config')
                ?.commands.find((cmd) => cmd.name() === 'get')
                ?.commands.find((cmd) => cmd.name() === 'email');
            await getEmailCmd?.parseAsync(['node', 'test']);
            // Verify message was shown and telemetry was recorded
            expect(logger_1.default.info).toHaveBeenCalledWith('No email set.');
            expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
                name: 'config get',
                configKey: 'email',
            });
            expect(telemetry_1.default.send).toHaveBeenCalledWith();
        });
    });
});
//# sourceMappingURL=config.test.js.map