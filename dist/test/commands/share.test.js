"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const share_1 = require("../../src/commands/share");
const envars = __importStar(require("../../src/envars"));
const logger_1 = __importDefault(require("../../src/logger"));
const eval_1 = __importDefault(require("../../src/models/eval"));
const share_2 = require("../../src/share");
const default_1 = require("../../src/util/config/default");
jest.mock('../../src/share');
jest.mock('../../src/logger');
jest.mock('../../src/telemetry', () => ({
    record: jest.fn(),
    send: jest.fn(),
}));
jest.mock('../../src/envars');
jest.mock('readline');
jest.mock('../../src/models/eval');
jest.mock('../../src/util', () => ({
    setupEnv: jest.fn(),
}));
jest.mock('../../src/util/config/default');
describe('Share Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.exitCode = 0; // Reset exitCode before each test
    });
    describe('notCloudEnabledShareInstructions', () => {
        it('should log instructions for cloud setup', () => {
            (0, share_1.notCloudEnabledShareInstructions)();
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('You need to have a cloud account'));
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Please go to'));
        });
    });
    describe('createAndDisplayShareableUrl', () => {
        it('should return a URL and log it when successful', async () => {
            jest.mocked(share_2.isSharingEnabled).mockReturnValue(true);
            const mockEval = { id: 'test-eval-id' };
            const mockUrl = 'https://app.promptfoo.dev/eval/test-eval-id';
            jest.mocked(share_2.createShareableUrl).mockResolvedValue(mockUrl);
            const result = await (0, share_1.createAndDisplayShareableUrl)(mockEval, false);
            expect(share_2.createShareableUrl).toHaveBeenCalledWith(mockEval, false);
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining(mockUrl));
            expect(result).toBe(mockUrl);
        });
        it('should pass showAuth parameter correctly', async () => {
            const mockEval = { id: 'test-eval-id' };
            const mockUrl = 'https://app.promptfoo.dev/eval/test-eval-id';
            jest.mocked(share_2.createShareableUrl).mockResolvedValue(mockUrl);
            await (0, share_1.createAndDisplayShareableUrl)(mockEval, true);
            expect(share_2.createShareableUrl).toHaveBeenCalledWith(mockEval, true);
        });
        it('should return null when createShareableUrl returns null', async () => {
            const mockEval = { id: 'test-eval-id' };
            jest.mocked(share_2.isSharingEnabled).mockReturnValue(true);
            jest.mocked(share_2.createShareableUrl).mockResolvedValue(null);
            const result = await (0, share_1.createAndDisplayShareableUrl)(mockEval, false);
            expect(share_2.createShareableUrl).toHaveBeenCalledWith(mockEval, false);
            expect(result).toBeNull();
            expect(logger_1.default.error).toHaveBeenCalledWith('Failed to create shareable URL');
            expect(logger_1.default.info).not.toHaveBeenCalled();
        });
    });
    describe('shareCommand', () => {
        let program;
        beforeEach(() => {
            jest.clearAllMocks();
            program = new commander_1.Command();
            (0, share_1.shareCommand)(program);
        });
        it('should register share command with correct options', () => {
            const cmd = program.commands.find((c) => c.name() === 'share');
            expect(cmd).toBeDefined();
            expect(cmd?.description()).toContain('Create a shareable URL');
            const options = cmd?.options;
            expect(options?.find((o) => o.long === '--show-auth')).toBeDefined();
            expect(options?.find((o) => o.long === '--yes')).toBeDefined();
        });
        it('should handle specific evalId not found', async () => {
            jest.spyOn(eval_1.default, 'findById').mockImplementation().mockResolvedValue(undefined);
            const shareCmd = program.commands.find((c) => c.name() === 'share');
            await shareCmd?.parseAsync(['node', 'test', 'non-existent-id']);
            expect(eval_1.default.findById).toHaveBeenCalledWith('non-existent-id');
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Could not find eval with ID'));
            expect(process.exitCode).toBe(1);
        });
        it('should handle no evals available', async () => {
            jest.spyOn(eval_1.default, 'latest').mockImplementation().mockResolvedValue(undefined);
            const shareCmd = program.commands.find((c) => c.name() === 'share');
            await shareCmd?.parseAsync(['node', 'test']);
            expect(eval_1.default.latest).toHaveBeenCalledWith();
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Could not load results'));
            expect(process.exitCode).toBe(1);
        });
        it('should handle eval with empty prompts', async () => {
            const mockEval = { prompts: [] };
            jest.spyOn(eval_1.default, 'latest').mockImplementation().mockResolvedValue(mockEval);
            const shareCmd = program.commands.find((c) => c.name() === 'share');
            await shareCmd?.parseAsync(['node', 'test']);
            expect(eval_1.default.latest).toHaveBeenCalledWith();
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('cannot be shared'));
            expect(process.exitCode).toBe(1);
        });
        it('should accept -y flag for backwards compatibility', async () => {
            const mockEval = { prompts: ['test'] };
            jest.spyOn(eval_1.default, 'latest').mockImplementation().mockResolvedValue(mockEval);
            jest.mocked(share_2.isSharingEnabled).mockReturnValue(true);
            jest.mocked(share_2.createShareableUrl).mockResolvedValue('https://example.com/share');
            const shareCmd = program.commands.find((c) => c.name() === 'share');
            await shareCmd?.parseAsync(['node', 'test', '-y']);
            expect(eval_1.default.latest).toHaveBeenCalledWith();
            expect(share_2.createShareableUrl).toHaveBeenCalledWith(mockEval, false);
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('View results:'));
        });
        it('should use promptfoo.app by default if no environment variables are set', () => {
            jest.mocked(envars.getEnvString).mockImplementation(() => '');
            const baseUrl = envars.getEnvString('PROMPTFOO_SHARING_APP_BASE_URL') ||
                envars.getEnvString('PROMPTFOO_REMOTE_APP_BASE_URL');
            const hostname = baseUrl ? new URL(baseUrl).hostname : 'promptfoo.app';
            expect(hostname).toBe('promptfoo.app');
        });
        it('should use PROMPTFOO_SHARING_APP_BASE_URL for hostname when set', () => {
            jest.mocked(envars.getEnvString).mockImplementation((key) => {
                if (key === 'PROMPTFOO_SHARING_APP_BASE_URL') {
                    return 'https://custom-domain.com';
                }
                return '';
            });
            const baseUrl = envars.getEnvString('PROMPTFOO_SHARING_APP_BASE_URL') ||
                envars.getEnvString('PROMPTFOO_REMOTE_APP_BASE_URL');
            const hostname = baseUrl ? new URL(baseUrl).hostname : 'app.promptfoo.dev';
            expect(hostname).toBe('custom-domain.com');
        });
        it('should use PROMPTFOO_REMOTE_APP_BASE_URL for hostname when PROMPTFOO_SHARING_APP_BASE_URL is not set', () => {
            jest.mocked(envars.getEnvString).mockImplementation((key) => {
                if (key === 'PROMPTFOO_REMOTE_APP_BASE_URL') {
                    return 'https://self-hosted-domain.com';
                }
                return '';
            });
            const baseUrl = envars.getEnvString('PROMPTFOO_SHARING_APP_BASE_URL') ||
                envars.getEnvString('PROMPTFOO_REMOTE_APP_BASE_URL');
            const hostname = baseUrl ? new URL(baseUrl).hostname : 'app.promptfoo.dev';
            expect(hostname).toBe('self-hosted-domain.com');
        });
        it('should prioritize PROMPTFOO_SHARING_APP_BASE_URL over PROMPTFOO_REMOTE_APP_BASE_URL', () => {
            jest.mocked(envars.getEnvString).mockImplementation((key) => {
                if (key === 'PROMPTFOO_SHARING_APP_BASE_URL') {
                    return 'https://sharing-domain.com';
                }
                if (key === 'PROMPTFOO_REMOTE_APP_BASE_URL') {
                    return 'https://remote-domain.com';
                }
                return '';
            });
            const baseUrl = envars.getEnvString('PROMPTFOO_SHARING_APP_BASE_URL') ||
                envars.getEnvString('PROMPTFOO_REMOTE_APP_BASE_URL');
            const hostname = baseUrl ? new URL(baseUrl).hostname : 'app.promptfoo.dev';
            expect(hostname).toBe('sharing-domain.com');
        });
        it('should use sharing config from promptfooconfig.yaml', async () => {
            const mockEval = {
                id: 'test-eval-id',
                prompts: ['test prompt'],
                config: {},
                save: jest.fn().mockResolvedValue(undefined),
            };
            jest.spyOn(eval_1.default, 'latest').mockResolvedValue(mockEval);
            const mockSharing = {
                apiBaseUrl: 'https://custom-api.example.com',
                appBaseUrl: 'https://custom-app.example.com',
            };
            jest.mocked(default_1.loadDefaultConfig).mockResolvedValue({
                defaultConfig: {
                    sharing: mockSharing,
                },
                defaultConfigPath: 'promptfooconfig.yaml',
            });
            jest.mocked(share_2.isSharingEnabled).mockImplementation((evalObj) => {
                return !!evalObj.config.sharing;
            });
            jest
                .mocked(share_2.createShareableUrl)
                .mockResolvedValue('https://custom-app.example.com/eval/test-eval-id');
            const shareCmd = program.commands.find((c) => c.name() === 'share');
            await shareCmd?.parseAsync(['node', 'test']);
            expect(default_1.loadDefaultConfig).toHaveBeenCalledTimes(1);
            expect(mockEval.config.sharing).toEqual(mockSharing);
            expect(share_2.isSharingEnabled).toHaveBeenCalledWith(mockEval);
            expect(share_2.createShareableUrl).toHaveBeenCalledWith(mockEval, false);
        });
        it('should show cloud instructions and return null when sharing is not enabled', async () => {
            jest.mocked(share_2.isSharingEnabled).mockReturnValue(false);
            const shareCmd = program.commands.find((c) => c.name() === 'share');
            await shareCmd?.parseAsync(['node', 'test']);
            expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('You need to have a cloud account'));
            expect(process.exitCode).toBe(1);
        });
    });
});
//# sourceMappingURL=share.test.js.map