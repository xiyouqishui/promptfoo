"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const logger_1 = __importDefault(require("../../../src/logger"));
const run_1 = require("../../../src/redteam/commands/run");
const shared_1 = require("../../../src/redteam/shared");
const cloud_1 = require("../../../src/util/cloud");
jest.mock('../../../src/cliState', () => ({
    remote: false,
}));
jest.mock('../../../src/telemetry', () => ({
    record: jest.fn(),
    send: jest.fn(),
}));
jest.mock('../../../src/util', () => ({
    setupEnv: jest.fn(),
}));
jest.mock('../../../src/redteam/shared', () => ({
    doRedteamRun: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../src/util/cloud', () => ({
    getConfigFromCloud: jest.fn(),
}));
// Add logger mock
jest.mock('../../../src/logger', () => ({
    error: jest.fn(),
}));
describe('redteamRunCommand', () => {
    let program;
    let originalExitCode;
    beforeEach(() => {
        jest.resetAllMocks();
        program = new commander_1.Command();
        (0, run_1.redteamRunCommand)(program);
        // Store original exitCode to restore later
        originalExitCode = process.exitCode;
        process.exitCode = 0;
    });
    afterEach(() => {
        // Restore original exitCode
        process.exitCode = originalExitCode;
    });
    it('should use target option to set cloud target when UUID is provided', async () => {
        // Mock the getConfigFromCloud function
        const mockConfig = {
            prompts: ['Test prompt'],
            vars: {},
            providers: [{ id: 'test-provider' }],
            targets: [
                {
                    id: 'test-provider',
                },
            ],
        };
        jest.mocked(cloud_1.getConfigFromCloud).mockResolvedValue(mockConfig);
        // UUID format for config and target
        const configUUID = '12345678-1234-1234-1234-123456789012';
        const targetUUID = '87654321-4321-4321-4321-210987654321';
        // Find the run command
        const runCommand = program.commands.find((cmd) => cmd.name() === 'run');
        expect(runCommand).toBeDefined();
        // Execute the command with the target option
        await runCommand.parseAsync(['node', 'test', '--config', configUUID, '--target', targetUUID]);
        // Verify doRedteamRun was called with the right parameters
        expect(shared_1.doRedteamRun).toHaveBeenCalledWith(expect.objectContaining({
            liveRedteamConfig: mockConfig,
            config: undefined,
            loadedFromCloud: true,
            target: targetUUID,
        }));
    });
    it('should not support target argument with a local config file', async () => {
        // Find the run command
        const runCommand = program.commands.find((cmd) => cmd.name() === 'run');
        expect(runCommand).toBeDefined();
        const configPath = 'path/to/config.yaml';
        const targetUUID = '87654321-4321-4321-4321-210987654321';
        // Execute the command with the target option but a path config
        await runCommand.parseAsync(['node', 'test', '--config', configPath, '--target', targetUUID]);
        // Should log error message
        expect(logger_1.default.error).toHaveBeenCalledWith(`Target ID (-t) can only be used when -c is used. To use a cloud target inside of a config set the id of the target to promptfoo://provider/${targetUUID}. `);
        // Should set exit code to 1
        expect(process.exitCode).toBe(1);
        // getConfigFromCloud should not be called
        expect(cloud_1.getConfigFromCloud).not.toHaveBeenCalled();
        // doRedteamRun should not be called
        expect(shared_1.doRedteamRun).not.toHaveBeenCalled();
    });
    it('should not support target argument when no cloud config file is provided', async () => {
        // Find the run command
        const runCommand = program.commands.find((cmd) => cmd.name() === 'run');
        expect(runCommand).toBeDefined();
        const targetUUID = '87654321-4321-4321-4321-210987654321';
        // Execute the command with the target option but a path config
        await runCommand.parseAsync(['node', 'test', '--target', targetUUID]);
        // Should log error message
        expect(logger_1.default.error).toHaveBeenCalledWith(`Target ID (-t) can only be used when -c is used. To use a cloud target inside of a config set the id of the target to promptfoo://provider/${targetUUID}. `);
        // Should set exit code to 1
        expect(process.exitCode).toBe(1);
        // getConfigFromCloud should not be called
        expect(cloud_1.getConfigFromCloud).not.toHaveBeenCalled();
        // doRedteamRun should not be called
        expect(shared_1.doRedteamRun).not.toHaveBeenCalled();
    });
    it('should throw error when target is not a UUID', async () => {
        // UUID format for config but not for target
        const configUUID = '12345678-1234-1234-1234-123456789012';
        const invalidTarget = 'not-a-uuid';
        // Find the run command
        const runCommand = program.commands.find((cmd) => cmd.name() === 'run');
        expect(runCommand).toBeDefined();
        // Execute the command with the target option and expect it to throw
        await expect(runCommand.parseAsync(['node', 'test', '--config', configUUID, '--target', invalidTarget])).rejects.toThrow('Invalid target ID, it must be a valid UUID');
        // Verify getConfigFromCloud was not called
        expect(cloud_1.getConfigFromCloud).not.toHaveBeenCalled();
    });
    it('should handle backwards compatibility with empty targets and a valid target UUID', async () => {
        // Mock the getConfigFromCloud function to return config without targets
        const mockConfig = {
            prompts: ['Test prompt'],
            vars: {},
            providers: [{ id: 'test-provider' }],
            targets: [], // Empty targets
        };
        jest.mocked(cloud_1.getConfigFromCloud).mockResolvedValue(mockConfig);
        // UUID format for config and target
        const configUUID = '12345678-1234-1234-1234-123456789012';
        const targetUUID = '87654321-4321-4321-4321-210987654321';
        // Find the run command
        const runCommand = program.commands.find((cmd) => cmd.name() === 'run');
        expect(runCommand).toBeDefined();
        // Execute the command with the target option
        await runCommand.parseAsync(['node', 'test', '--config', configUUID, '--target', targetUUID]);
        // Verify that a target was added to the config with the CLOUD_PROVIDER_PREFIX
        expect(mockConfig.targets).toEqual([
            {
                id: `promptfoo://provider/${targetUUID}`,
                config: {},
            },
        ]);
        // Verify doRedteamRun was called with the updated config
        expect(shared_1.doRedteamRun).toHaveBeenCalledWith(expect.objectContaining({
            liveRedteamConfig: mockConfig,
            config: undefined,
            loadedFromCloud: true,
            target: targetUUID,
        }));
    });
});
//# sourceMappingURL=run.test.js.map