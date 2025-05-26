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
const path = __importStar(require("path"));
const cache_1 = require("../../src/cache");
const eval_1 = require("../../src/commands/eval");
const evaluator_1 = require("../../src/evaluator");
const accounts_1 = require("../../src/globalConfig/accounts");
const logger_1 = __importDefault(require("../../src/logger"));
const migrate_1 = require("../../src/migrate");
const eval_2 = __importDefault(require("../../src/models/eval"));
const providers_1 = require("../../src/providers");
const share_1 = require("../../src/share");
const load_1 = require("../../src/util/config/load");
jest.mock('../../src/cache');
jest.mock('../../src/evaluator');
jest.mock('../../src/globalConfig/accounts');
jest.mock('../../src/migrate');
jest.mock('../../src/providers');
jest.mock('../../src/share');
jest.mock('../../src/table');
jest.mock('fs');
jest.mock('path', () => {
    // Use actual path module for platform-agnostic tests
    const actualPath = jest.requireActual('path');
    return {
        ...actualPath,
        // Add any specific mocks for path methods if needed
    };
});
jest.mock('../../src/util/config/load');
jest.mock('../../src/database/index', () => ({
    getDb: jest.fn(() => ({
        transaction: jest.fn((fn) => fn()),
        insert: jest.fn(() => ({
            values: jest.fn(() => ({
                onConflictDoNothing: jest.fn(() => ({
                    run: jest.fn(),
                })),
                run: jest.fn(),
            })),
        })),
        update: jest.fn(() => ({
            set: jest.fn(() => ({
                where: jest.fn(() => ({
                    run: jest.fn(),
                })),
            })),
        })),
    })),
}));
describe('evalCommand', () => {
    let program;
    const defaultConfig = {};
    const defaultConfigPath = 'config.yaml';
    beforeEach(() => {
        program = new commander_1.Command();
        jest.clearAllMocks();
        jest.mocked(load_1.resolveConfigs).mockResolvedValue({
            config: defaultConfig,
            testSuite: {
                prompts: [],
                providers: [],
            },
            basePath: path.resolve('/'), // Platform-agnostic root path
        });
    });
    it('should create eval command with correct options', () => {
        const cmd = (0, eval_1.evalCommand)(program, defaultConfig, defaultConfigPath);
        expect(cmd.name()).toBe('eval');
        expect(cmd.description()).toBe('Evaluate prompts');
    });
    it('should handle --no-cache option', async () => {
        const cmdObj = { cache: false };
        await (0, eval_1.doEval)(cmdObj, defaultConfig, defaultConfigPath, {});
        expect(cache_1.disableCache).toHaveBeenCalledTimes(1);
    });
    it('should handle --write option', async () => {
        const cmdObj = { write: true };
        const mockEvalRecord = new eval_2.default(defaultConfig);
        jest.mocked(evaluator_1.evaluate).mockResolvedValue(mockEvalRecord);
        await (0, eval_1.doEval)(cmdObj, defaultConfig, defaultConfigPath, {});
        expect(migrate_1.runDbMigrations).toHaveBeenCalledTimes(1);
    });
    it('should handle redteam config', async () => {
        const cmdObj = {};
        const config = {
            redteam: { plugins: ['test-plugin'] },
            prompts: [],
        };
        jest.mocked(load_1.resolveConfigs).mockResolvedValue({
            config,
            testSuite: {
                prompts: [],
                providers: [],
                tests: [{ vars: { test: 'value' } }],
            },
            basePath: path.resolve('/'), // Platform-agnostic root path
        });
        const mockEvalRecord = new eval_2.default(config);
        jest.mocked(evaluator_1.evaluate).mockResolvedValue(mockEvalRecord);
        await (0, eval_1.doEval)(cmdObj, config, defaultConfigPath, {});
        expect(accounts_1.promptForEmailUnverified).toHaveBeenCalledTimes(1);
        expect(accounts_1.checkEmailStatusOrExit).toHaveBeenCalledTimes(1);
    });
    it('should handle share option when enabled', async () => {
        const cmdObj = { share: true };
        const config = { sharing: true };
        const evalRecord = new eval_2.default(config);
        jest.mocked(load_1.resolveConfigs).mockResolvedValue({
            config,
            testSuite: {
                prompts: [],
                providers: [],
            },
            basePath: path.resolve('/'), // Platform-agnostic root path
        });
        jest.mocked(evaluator_1.evaluate).mockResolvedValue(evalRecord);
        jest.mocked(share_1.isSharingEnabled).mockReturnValue(true);
        jest.mocked(share_1.createShareableUrl).mockResolvedValue('http://share.url');
        await (0, eval_1.doEval)(cmdObj, config, defaultConfigPath, {});
        expect(share_1.createShareableUrl).toHaveBeenCalledWith(expect.any(eval_2.default));
    });
    it('should handle grader option', async () => {
        const cmdObj = { grader: 'test-grader' };
        const mockProvider = {
            id: () => 'test-grader',
            callApi: async () => ({ output: 'test' }),
        };
        jest.mocked(providers_1.loadApiProvider).mockResolvedValue(mockProvider);
        await (0, eval_1.doEval)(cmdObj, defaultConfig, defaultConfigPath, {});
        expect(providers_1.loadApiProvider).toHaveBeenCalledWith('test-grader');
    });
    it('should handle repeat option', async () => {
        const cmdObj = { repeat: 3 };
        await (0, eval_1.doEval)(cmdObj, defaultConfig, defaultConfigPath, {});
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ repeat: 3 }));
    });
    it('should handle delay option', async () => {
        const cmdObj = { delay: 1000 };
        await (0, eval_1.doEval)(cmdObj, defaultConfig, defaultConfigPath, {});
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ delay: 1000 }));
    });
    it('should handle maxConcurrency option', async () => {
        const cmdObj = { maxConcurrency: 5 };
        await (0, eval_1.doEval)(cmdObj, defaultConfig, defaultConfigPath, {});
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ maxConcurrency: 5 }));
    });
});
describe('formatTokenUsage', () => {
    it('should format token usage correctly', () => {
        const usage = {
            total: 1000,
            prompt: 400,
            completion: 600,
            cached: 200,
            completionDetails: {
                reasoning: 300,
            },
        };
        const result = (0, eval_1.formatTokenUsage)('Test', usage);
        expect(result).toBe('Test tokens: 1,000 / Prompt tokens: 400 / Completion tokens: 600 / Cached tokens: 200 / Reasoning tokens: 300');
    });
    it('should handle partial token usage data', () => {
        const usage = {
            total: 1000,
        };
        const result = (0, eval_1.formatTokenUsage)('Test', usage);
        expect(result).toBe('Test tokens: 1,000');
    });
    it('should handle empty token usage', () => {
        const usage = {};
        const result = (0, eval_1.formatTokenUsage)('Test', usage);
        expect(result).toBe('');
    });
});
describe('showRedteamProviderLabelMissingWarning', () => {
    const mockWarn = jest.spyOn(logger_1.default, 'warn');
    beforeEach(() => {
        mockWarn.mockClear();
    });
    it('should show warning when provider has no label', () => {
        const testSuite = {
            prompts: [],
            providers: [
                {
                    label: '',
                    id: () => 'test-id',
                    callApi: async () => ({ output: 'test' }),
                },
            ],
        };
        (0, eval_1.showRedteamProviderLabelMissingWarning)(testSuite);
        expect(mockWarn).toHaveBeenCalledTimes(1);
    });
    it('should not show warning when all providers have labels', () => {
        const testSuite = {
            prompts: [],
            providers: [
                {
                    label: 'test-label',
                    id: () => 'test-id',
                    callApi: async () => ({ output: 'test' }),
                },
            ],
        };
        (0, eval_1.showRedteamProviderLabelMissingWarning)(testSuite);
        expect(mockWarn).not.toHaveBeenCalled();
    });
    it('should handle empty providers array', () => {
        const testSuite = {
            prompts: [],
            providers: [],
        };
        (0, eval_1.showRedteamProviderLabelMissingWarning)(testSuite);
        expect(mockWarn).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=eval.test.js.map