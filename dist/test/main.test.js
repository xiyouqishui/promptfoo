"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const logger_1 = require("../src/logger");
const main_1 = require("../src/main");
const util_1 = require("../src/util");
// Mock the dependencies
jest.mock('../src/util', () => ({
    setupEnv: jest.fn(),
}));
jest.mock('../src/logger', () => ({
    __esModule: true,
    default: { debug: jest.fn() },
    setLogLevel: jest.fn(),
}));
describe('addCommonOptionsRecursively', () => {
    const originalExit = process.exit;
    let program;
    let subCommand;
    beforeAll(() => {
        process.exit = jest.fn();
    });
    beforeEach(() => {
        program = new commander_1.Command();
        program.action(() => { });
        subCommand = program.command('subcommand');
        subCommand.action(() => { });
        jest.clearAllMocks();
    });
    afterAll(() => {
        process.exit = originalExit;
    });
    it('should add both verbose and env-file options to a command', () => {
        (0, main_1.addCommonOptionsRecursively)(program);
        const hasVerboseOption = program.options.some((option) => option.short === '-v' || option.long === '--verbose');
        const hasEnvFileOption = program.options.some((option) => option.long === '--env-file' || option.long === '--env-path');
        expect(hasVerboseOption).toBe(true);
        expect(hasEnvFileOption).toBe(true);
    });
    it('should not add duplicate options if they already exist', () => {
        program.option('--env-file, --env-path <path>', 'Path to .env file');
        program.option('-v, --verbose', 'Show debug logs', false);
        // Count options before
        const envFileOptionsBefore = program.options.filter((option) => option.long === '--env-file' || option.long === '--env-path').length;
        const verboseOptionsBefore = program.options.filter((option) => option.short === '-v' || option.long === '--verbose').length;
        (0, main_1.addCommonOptionsRecursively)(program);
        // Count options after
        const envFileOptionsAfter = program.options.filter((option) => option.long === '--env-file' || option.long === '--env-path').length;
        const verboseOptionsAfter = program.options.filter((option) => option.short === '-v' || option.long === '--verbose').length;
        // Should still have the same number of options
        expect(envFileOptionsAfter).toBe(envFileOptionsBefore);
        expect(verboseOptionsAfter).toBe(verboseOptionsBefore);
    });
    it('should add options to subcommands', () => {
        (0, main_1.addCommonOptionsRecursively)(program);
        const hasSubcommandVerboseOption = subCommand.options.some((option) => option.short === '-v' || option.long === '--verbose');
        const hasSubcommandEnvFileOption = subCommand.options.some((option) => option.long === '--env-file' || option.long === '--env-path');
        expect(hasSubcommandVerboseOption).toBe(true);
        expect(hasSubcommandEnvFileOption).toBe(true);
    });
    it('should add options to nested subcommands', () => {
        // Create a deeper command structure
        const subSubCommand = subCommand.command('subsubcommand');
        subSubCommand.action(() => { });
        const subSubSubCommand = subSubCommand.command('subsubsubcommand');
        subSubSubCommand.action(() => { });
        (0, main_1.addCommonOptionsRecursively)(program);
        // Check all levels of commands have the options
        const hasMainVerboseOption = program.options.some((option) => option.short === '-v' || option.long === '--verbose');
        const hasMainEnvFileOption = program.options.some((option) => option.long === '--env-file' || option.long === '--env-path');
        const hasSubCommandVerboseOption = subCommand.options.some((option) => option.short === '-v' || option.long === '--verbose');
        const hasSubCommandEnvFileOption = subCommand.options.some((option) => option.long === '--env-file' || option.long === '--env-path');
        const hasSubSubCommandVerboseOption = subSubCommand.options.some((option) => option.short === '-v' || option.long === '--verbose');
        const hasSubSubCommandEnvFileOption = subSubCommand.options.some((option) => option.long === '--env-file' || option.long === '--env-path');
        const hasSubSubSubCommandVerboseOption = subSubSubCommand.options.some((option) => option.short === '-v' || option.long === '--verbose');
        const hasSubSubSubCommandEnvFileOption = subSubSubCommand.options.some((option) => option.long === '--env-file' || option.long === '--env-path');
        expect(hasMainVerboseOption).toBe(true);
        expect(hasMainEnvFileOption).toBe(true);
        expect(hasSubCommandVerboseOption).toBe(true);
        expect(hasSubCommandEnvFileOption).toBe(true);
        expect(hasSubSubCommandVerboseOption).toBe(true);
        expect(hasSubSubCommandEnvFileOption).toBe(true);
        expect(hasSubSubSubCommandVerboseOption).toBe(true);
        expect(hasSubSubSubCommandEnvFileOption).toBe(true);
    });
    it('should register a single hook that handles both options', () => {
        // Create a fake action that manually mocks the Commander hook system
        const mockHookRegister = jest.fn();
        program.hook = mockHookRegister;
        // Apply common options
        (0, main_1.addCommonOptionsRecursively)(program);
        // Verify the hook was registered only once
        expect(mockHookRegister).toHaveBeenCalledTimes(1);
        expect(mockHookRegister).toHaveBeenCalledWith('preAction', expect.any(Function));
        // Get the hook function
        const preActionFn = mockHookRegister.mock.calls[0][1];
        // Test verbose option
        preActionFn({ opts: () => ({ verbose: true }) });
        expect(logger_1.setLogLevel).toHaveBeenCalledWith('debug');
        // Test env-file option
        preActionFn({ opts: () => ({ envFile: '.env.test' }) });
        expect(util_1.setupEnv).toHaveBeenCalledWith('.env.test');
        // Test both options together
        preActionFn({ opts: () => ({ verbose: true, envFile: '.env.combined' }) });
        expect(logger_1.setLogLevel).toHaveBeenCalledWith('debug');
        expect(util_1.setupEnv).toHaveBeenCalledWith('.env.combined');
    });
});
//# sourceMappingURL=main.test.js.map