"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const cliState_1 = __importDefault(require("../../../src/cliState"));
const esm_1 = require("../../../src/esm");
const logger_1 = __importDefault(require("../../../src/logger"));
const strategies_1 = require("../../../src/redteam/strategies");
jest.mock('../../../src/cliState');
jest.mock('../../../src/esm', () => ({
    importModule: jest.fn(),
}));
describe('validateStrategies', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should validate valid strategies', async () => {
        const validStrategies = [
            { id: 'basic' },
            { id: 'base64' },
            { id: 'video' },
            { id: 'morse' },
            { id: 'piglatin' },
        ];
        await expect((0, strategies_1.validateStrategies)(validStrategies)).resolves.toBeUndefined();
    });
    it('should validate basic strategy with enabled config', async () => {
        const strategies = [{ id: 'basic', config: { enabled: true } }];
        await expect((0, strategies_1.validateStrategies)(strategies)).resolves.toBeUndefined();
    });
    it('should throw error for invalid basic strategy config', async () => {
        const strategies = [
            { id: 'basic', config: { enabled: 'not-a-boolean' } },
        ];
        await expect((0, strategies_1.validateStrategies)(strategies)).rejects.toThrow('Basic strategy enabled config must be a boolean');
    });
    it('should skip validation for file:// strategies', async () => {
        const strategies = [{ id: 'file://custom.js' }];
        await expect((0, strategies_1.validateStrategies)(strategies)).resolves.toBeUndefined();
    });
    it('should exit for invalid strategies', async () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
        const invalidStrategies = [{ id: 'invalid-strategy' }];
        await (0, strategies_1.validateStrategies)(invalidStrategies);
        expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Invalid strategy(s)'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
describe('loadStrategy', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should load predefined strategy', async () => {
        const strategy = await (0, strategies_1.loadStrategy)('basic');
        expect(strategy).toBeDefined();
        expect(strategy.id).toBe('basic');
    });
    it('should load video strategy', async () => {
        const strategy = await (0, strategies_1.loadStrategy)('video');
        expect(strategy).toBeDefined();
        expect(strategy.id).toBe('video');
        expect(typeof strategy.action).toBe('function');
    });
    it('should call video strategy action with correct parameters', async () => {
        const strategy = await (0, strategies_1.loadStrategy)('video');
        const testCases = [
            { vars: { test: 'value' }, metadata: { pluginId: 'test' } },
        ];
        const injectVar = 'inject';
        const config = {};
        await strategy.action(testCases, injectVar, config);
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Adding video encoding'));
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Added'));
    });
    it('should load morse strategy', async () => {
        const strategy = await (0, strategies_1.loadStrategy)('morse');
        expect(strategy).toBeDefined();
        expect(strategy.id).toBe('morse');
    });
    it('should load piglatin strategy', async () => {
        const strategy = await (0, strategies_1.loadStrategy)('piglatin');
        expect(strategy).toBeDefined();
        expect(strategy.id).toBe('piglatin');
    });
    it('should throw error for non-existent strategy', async () => {
        await expect((0, strategies_1.loadStrategy)('non-existent')).rejects.toThrow('Strategy not found: non-existent');
    });
    it('should load custom file strategy', async () => {
        const customStrategy = {
            id: 'custom',
            action: jest.fn(),
        };
        jest.mocked(esm_1.importModule).mockResolvedValue(customStrategy);
        cliState_1.default.basePath = '/test/path';
        const strategy = await (0, strategies_1.loadStrategy)('file://custom.js');
        expect(strategy).toEqual(customStrategy);
    });
    it('should throw error for non-js custom file', async () => {
        await expect((0, strategies_1.loadStrategy)('file://custom.txt')).rejects.toThrow('Custom strategy file must be a JavaScript file');
    });
    it('should throw error for invalid custom strategy', async () => {
        jest.mocked(esm_1.importModule).mockResolvedValue({});
        await expect((0, strategies_1.loadStrategy)('file://invalid.js')).rejects.toThrow("Custom strategy in invalid.js must export an object with 'key' and 'action' properties");
    });
    it('should use absolute path for custom strategy', async () => {
        const customStrategy = {
            id: 'custom',
            action: jest.fn(),
        };
        jest.mocked(esm_1.importModule).mockResolvedValue(customStrategy);
        await (0, strategies_1.loadStrategy)('file:///absolute/path/custom.js');
        expect(esm_1.importModule).toHaveBeenCalledWith('/absolute/path/custom.js');
    });
    it('should use relative path from basePath for custom strategy', async () => {
        const customStrategy = {
            id: 'custom',
            action: jest.fn(),
        };
        jest.mocked(esm_1.importModule).mockResolvedValue(customStrategy);
        cliState_1.default.basePath = '/base/path';
        await (0, strategies_1.loadStrategy)('file://relative/custom.js');
        expect(esm_1.importModule).toHaveBeenCalledWith(path_1.default.join('/base/path', 'relative/custom.js'));
    });
});
//# sourceMappingURL=index.test.js.map