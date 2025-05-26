"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const report_1 = require("../../../src/redteam/commands/report");
const server_1 = require("../../../src/server/server");
const telemetry_1 = __importDefault(require("../../../src/telemetry"));
const util_1 = require("../../../src/util");
const manage_1 = require("../../../src/util/config/manage");
const server_2 = require("../../../src/util/server");
jest.mock('../../../src/server/server');
jest.mock('../../../src/telemetry');
jest.mock('../../../src/util');
jest.mock('../../../src/util/config/manage');
jest.mock('../../../src/util/server');
describe('redteamReportCommand', () => {
    let program;
    beforeEach(() => {
        program = new commander_1.Command();
        jest.clearAllMocks();
    });
    it('should set up command with correct options', () => {
        (0, report_1.redteamReportCommand)(program);
        const cmd = program.commands[0];
        expect(cmd.name()).toBe('report');
        expect(cmd.description()).toBe('Start browser UI and open to report');
        expect(cmd.opts()).toEqual({
            port: expect.any(String),
            filterDescription: undefined,
            envPath: undefined,
        });
    });
    it('should handle report command with directory', async () => {
        (0, report_1.redteamReportCommand)(program);
        const cmd = program.commands[0];
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(false);
        await cmd.parseAsync(['node', 'test', 'testdir', '--port', '3000']);
        expect(util_1.setupEnv).toHaveBeenCalledWith(undefined);
        expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
            name: 'redteam report',
        });
        expect(manage_1.setConfigDirectoryPath).toHaveBeenCalledWith('testdir');
        expect(server_1.startServer).toHaveBeenCalledWith('3000', server_2.BrowserBehavior.OPEN_TO_REPORT, undefined);
    });
    it('should open browser if server is already running', async () => {
        (0, report_1.redteamReportCommand)(program);
        const cmd = program.commands[0];
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(true);
        await cmd.parseAsync(['node', 'test', '--port', '3000']);
        expect(server_2.openBrowser).toHaveBeenCalledWith(server_2.BrowserBehavior.OPEN_TO_REPORT);
        expect(server_1.startServer).not.toHaveBeenCalled();
    });
    it('should handle report command with filter description', async () => {
        (0, report_1.redteamReportCommand)(program);
        const cmd = program.commands[0];
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(false);
        await cmd.parseAsync(['node', 'test', '--filter-description', 'test.*']);
        expect(server_1.startServer).toHaveBeenCalledWith(expect.any(String), server_2.BrowserBehavior.OPEN_TO_REPORT, 'test.*');
    });
    it('should handle report command with env file path', async () => {
        (0, report_1.redteamReportCommand)(program);
        const cmd = program.commands[0];
        await cmd.parseAsync(['node', 'test', '--env-file', '.env.test']);
        expect(util_1.setupEnv).toHaveBeenCalledWith('.env.test');
    });
});
//# sourceMappingURL=report.test.js.map