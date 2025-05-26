"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const constants_1 = require("../../../src/constants");
const setup_1 = require("../../../src/redteam/commands/setup");
const server_1 = require("../../../src/server/server");
const telemetry_1 = __importDefault(require("../../../src/telemetry"));
const util_1 = require("../../../src/util");
const manage_1 = require("../../../src/util/config/manage");
const server_2 = require("../../../src/util/server");
jest.mock('../../../src/server/server');
jest.mock('../../../src/util/server');
jest.mock('../../../src/util', () => ({
    setupEnv: jest.fn(),
}));
jest.mock('../../../src/util/config/manage', () => ({
    setConfigDirectoryPath: jest.fn(),
}));
jest.mock('../../../src/telemetry', () => ({
    record: jest.fn(),
    send: jest.fn(),
}));
describe('redteamSetupCommand', () => {
    let program;
    beforeEach(() => {
        program = new commander_1.Command();
        jest.clearAllMocks();
    });
    it('should register the setup command with correct options', () => {
        (0, setup_1.redteamSetupCommand)(program);
        const setupCmd = program.commands.find((cmd) => cmd.name() === 'setup');
        expect(setupCmd).toBeDefined();
        expect(setupCmd?.description()).toBe('Start browser UI and open to redteam setup');
        expect(setupCmd?.opts().port).toBe((0, constants_1.getDefaultPort)().toString());
    });
    it('should handle setup command without directory', async () => {
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(false);
        (0, setup_1.redteamSetupCommand)(program);
        await program.parseAsync(['node', 'test', 'setup', '--port', '3000']);
        expect(util_1.setupEnv).toHaveBeenCalledWith(undefined);
        expect(telemetry_1.default.record).toHaveBeenCalledWith('command_used', {
            name: 'redteam setup',
        });
        expect(server_1.startServer).toHaveBeenCalledWith('3000', server_2.BrowserBehavior.OPEN_TO_REDTEAM_CREATE, undefined);
    });
    it('should handle setup command with directory', async () => {
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(false);
        (0, setup_1.redteamSetupCommand)(program);
        await program.parseAsync(['node', 'test', 'setup', 'test-dir', '--port', '3000']);
        expect(manage_1.setConfigDirectoryPath).toHaveBeenCalledWith('test-dir');
        expect(server_1.startServer).toHaveBeenCalledWith('3000', server_2.BrowserBehavior.OPEN_TO_REDTEAM_CREATE, undefined);
    });
    it('should open browser if server is already running', async () => {
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(true);
        (0, setup_1.redteamSetupCommand)(program);
        await program.parseAsync(['node', 'test', 'setup']);
        expect(server_2.openBrowser).toHaveBeenCalledWith(server_2.BrowserBehavior.OPEN_TO_REDTEAM_CREATE);
        expect(server_1.startServer).not.toHaveBeenCalled();
    });
    it('should handle setup command with filter description', async () => {
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(false);
        (0, setup_1.redteamSetupCommand)(program);
        await program.parseAsync(['node', 'test', 'setup', '--filter-description', 'test.*']);
        expect(server_1.startServer).toHaveBeenCalledWith((0, constants_1.getDefaultPort)().toString(), server_2.BrowserBehavior.OPEN_TO_REDTEAM_CREATE, 'test.*');
    });
    it('should handle setup command with env file path', async () => {
        jest.mocked(server_2.checkServerRunning).mockResolvedValue(false);
        (0, setup_1.redteamSetupCommand)(program);
        await program.parseAsync(['node', 'test', 'setup', '--env-file', '.env.test']);
        expect(util_1.setupEnv).toHaveBeenCalledWith('.env.test');
    });
});
//# sourceMappingURL=setup.test.js.map