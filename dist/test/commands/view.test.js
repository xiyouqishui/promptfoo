"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const view_1 = require("../../src/commands/view");
const constants_1 = require("../../src/constants");
const server_1 = require("../../src/server/server");
const telemetry_1 = __importDefault(require("../../src/telemetry"));
const util_1 = require("../../src/util");
const manage_1 = require("../../src/util/config/manage");
const server_2 = require("../../src/util/server");
jest.mock('../../src/server/server');
jest.mock('../../src/telemetry');
jest.mock('../../src/util');
jest.mock('../../src/util/config/manage');
describe('viewCommand', () => {
    let program;
    beforeEach(() => {
        program = new commander_1.Command();
        jest.clearAllMocks();
    });
    it('should register view command with correct options', () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        expect(viewCmd.name()).toBe('view');
        expect(viewCmd.description()).toBe('Start browser UI');
        const options = viewCmd.opts();
        expect(options).toEqual({
            port: (0, constants_1.getDefaultPort)().toString(),
        });
    });
    it('should call startServer with correct parameters when executed', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--port', '3001']);
        expect(server_1.startServer).toHaveBeenCalledWith('3001', server_2.BrowserBehavior.ASK, undefined);
    });
    it('should handle directory parameter and set config directory', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', 'testdir', '--port', '3001']);
        expect(manage_1.setConfigDirectoryPath).toHaveBeenCalledWith('testdir');
    });
    it('should handle browser behavior options correctly', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--yes']);
        expect(server_1.startServer).toHaveBeenCalledWith((0, constants_1.getDefaultPort)().toString(), server_2.BrowserBehavior.OPEN, undefined);
        jest.clearAllMocks();
        // Use a unique port to avoid confusion with default port
        await viewCmd.parseAsync(['node', 'test', '--no', '--port', '15500']);
        // --no sets BrowserBehavior.OPEN when both --yes and --no are supplied due to commander behavior
        expect(server_1.startServer).toHaveBeenCalledWith('15500', server_2.BrowserBehavior.OPEN, undefined);
    });
    it('should handle filter description option', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--filter-description', 'test-pattern']);
        expect(server_1.startServer).toHaveBeenCalledWith((0, constants_1.getDefaultPort)().toString(), server_2.BrowserBehavior.ASK, 'test-pattern');
    });
    it('should setup environment from env file path', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--env-path', '.env.test']);
        expect(util_1.setupEnv).toHaveBeenCalledWith('.env.test');
    });
    it('should record telemetry when command is used', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test']);
        expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
            name: 'view',
        });
    });
    it('should handle both --yes and --no options with --yes taking precedence', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--yes', '--no']);
        expect(server_1.startServer).toHaveBeenCalledWith((0, constants_1.getDefaultPort)().toString(), server_2.BrowserBehavior.OPEN, undefined);
    });
    it('should call startServer with default port if no port is specified', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test']);
        expect(server_1.startServer).toHaveBeenCalledWith((0, constants_1.getDefaultPort)().toString(), server_2.BrowserBehavior.ASK, undefined);
    });
    it('should support all options together', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync([
            'node',
            'test',
            'mydir',
            '--port',
            '9876',
            '--yes',
            '--filter-description',
            'desc',
            '--env-path',
            '.env.foo',
        ]);
        expect(manage_1.setConfigDirectoryPath).toHaveBeenCalledWith('mydir');
        expect(util_1.setupEnv).toHaveBeenCalledWith('.env.foo');
        expect(server_1.startServer).toHaveBeenCalledWith('9876', server_2.BrowserBehavior.OPEN, 'desc');
        expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
            name: 'view',
        });
    });
    it('should pass undefined directory if not provided', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--port', '3002']);
        expect(manage_1.setConfigDirectoryPath).not.toHaveBeenCalled();
    });
    it('should prefer --yes over --no if both are supplied', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--yes', '--no', '--port', '4444']);
        expect(server_1.startServer).toHaveBeenCalledWith('4444', server_2.BrowserBehavior.OPEN, undefined);
    });
    it('should parse port as string if passed as number', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        // Simulate user passing a numeric port
        await viewCmd.parseAsync(['node', 'test', '--port', '7777']);
        expect(server_1.startServer).toHaveBeenCalledWith('7777', server_2.BrowserBehavior.ASK, undefined);
    });
    it('should call startServer with undefined filterDescription if not provided', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--yes', '--port', '2222']);
        expect(server_1.startServer).toHaveBeenCalledWith('2222', server_2.BrowserBehavior.OPEN, undefined);
    });
    it('should handle --filter-description with empty string', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test', '--filter-description', '']);
        expect(server_1.startServer).toHaveBeenCalledWith((0, constants_1.getDefaultPort)().toString(), server_2.BrowserBehavior.ASK, '');
    });
    it('should call setupEnv with undefined if --env-path not provided', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        await viewCmd.parseAsync(['node', 'test']);
        expect(util_1.setupEnv).toHaveBeenCalledWith(undefined);
    });
    it('should call startServer with correct port and browserBehavior when only --no is supplied and --yes is not present', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        jest.clearAllMocks();
        // Only --no, no --yes
        await viewCmd.parseAsync(['node', 'test', '--no', '--port', '15501']);
        // Commander sets --no to true, --yes to undefined, so browserBehavior should be SKIP
        expect(server_1.startServer).toHaveBeenCalledWith('15501', server_2.BrowserBehavior.SKIP, undefined);
    });
    it('should call startServer with correct port and browserBehavior when only --yes is supplied', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        jest.clearAllMocks();
        await viewCmd.parseAsync(['node', 'test', '--yes', '--port', '16600']);
        expect(server_1.startServer).toHaveBeenCalledWith('16600', server_2.BrowserBehavior.OPEN, undefined);
    });
    it('should call startServer with ASK when neither --yes nor --no is supplied', async () => {
        (0, view_1.viewCommand)(program);
        const viewCmd = program.commands[0];
        jest.clearAllMocks();
        await viewCmd.parseAsync(['node', 'test', '--port', '17700']);
        expect(server_1.startServer).toHaveBeenCalledWith('17700', server_2.BrowserBehavior.ASK, undefined);
    });
});
//# sourceMappingURL=view.test.js.map