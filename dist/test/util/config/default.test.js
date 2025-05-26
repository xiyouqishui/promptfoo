"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const default_1 = require("../../../src/util/config/default");
const load_1 = require("../../../src/util/config/load");
jest.mock('../../../src/util/config/load', () => ({
    maybeReadConfig: jest.fn(),
}));
describe('loadDefaultConfig', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(process, 'cwd').mockImplementation(() => '/test/path');
        default_1.configCache.clear();
    });
    it('should return empty config when no config file is found', async () => {
        jest.mocked(load_1.maybeReadConfig).mockResolvedValue(undefined);
        const result = await (0, default_1.loadDefaultConfig)();
        expect(result).toEqual({
            defaultConfig: {},
            defaultConfigPath: undefined,
        });
        expect(load_1.maybeReadConfig).toHaveBeenCalledTimes(9);
        expect(load_1.maybeReadConfig).toHaveBeenNthCalledWith(1, path_1.default.normalize('/test/path/promptfooconfig.yaml'));
    });
    it('should return the first valid config file found', async () => {
        const mockConfig = { prompts: ['Some prompt'], providers: [], tests: [] };
        jest
            .mocked(load_1.maybeReadConfig)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(mockConfig);
        const result = await (0, default_1.loadDefaultConfig)();
        expect(result).toEqual({
            defaultConfig: mockConfig,
            defaultConfigPath: path_1.default.normalize('/test/path/promptfooconfig.json'),
        });
        expect(load_1.maybeReadConfig).toHaveBeenCalledTimes(3);
    });
    it('should stop checking extensions after finding a valid config', async () => {
        const mockConfig = { prompts: ['Some prompt'], providers: [], tests: [] };
        jest.mocked(load_1.maybeReadConfig).mockResolvedValueOnce(undefined).mockResolvedValueOnce(mockConfig);
        await (0, default_1.loadDefaultConfig)();
        expect(load_1.maybeReadConfig).toHaveBeenCalledTimes(2);
        expect(load_1.maybeReadConfig).toHaveBeenNthCalledWith(1, path_1.default.normalize('/test/path/promptfooconfig.yaml'));
        expect(load_1.maybeReadConfig).toHaveBeenNthCalledWith(2, path_1.default.normalize('/test/path/promptfooconfig.yml'));
    });
    it('should use provided directory when specified', async () => {
        const mockConfig = { prompts: ['Some prompt'], providers: [], tests: [] };
        jest.mocked(load_1.maybeReadConfig).mockResolvedValueOnce(mockConfig);
        const customDir = '/custom/directory';
        const result = await (0, default_1.loadDefaultConfig)(customDir);
        expect(result).toEqual({
            defaultConfig: mockConfig,
            defaultConfigPath: path_1.default.join(customDir, 'promptfooconfig.yaml'),
        });
        expect(load_1.maybeReadConfig).toHaveBeenCalledWith(path_1.default.join(customDir, 'promptfooconfig.yaml'));
    });
    it('should use custom config name when provided', async () => {
        const mockConfig = { prompts: ['Custom config'], providers: [], tests: [] };
        jest.mocked(load_1.maybeReadConfig).mockResolvedValueOnce(mockConfig);
        const result = await (0, default_1.loadDefaultConfig)(undefined, 'redteam');
        expect(result).toEqual({
            defaultConfig: mockConfig,
            defaultConfigPath: path_1.default.normalize('/test/path/redteam.yaml'),
        });
        expect(load_1.maybeReadConfig).toHaveBeenCalledWith(path_1.default.normalize('/test/path/redteam.yaml'));
    });
    it('should use different caches for different config names', async () => {
        const mockConfig1 = { prompts: ['Config 1'], providers: [], tests: [] };
        const mockConfig2 = { prompts: ['Config 2'], providers: [], tests: [] };
        jest
            .mocked(load_1.maybeReadConfig)
            .mockResolvedValueOnce(mockConfig1)
            .mockResolvedValueOnce(mockConfig2);
        const result1 = await (0, default_1.loadDefaultConfig)(undefined, 'promptfooconfig');
        const result2 = await (0, default_1.loadDefaultConfig)(undefined, 'redteam');
        expect(result1).not.toEqual(result2);
        expect(result1.defaultConfig).toEqual(mockConfig1);
        expect(result2.defaultConfig).toEqual(mockConfig2);
        const cachedResult1 = await (0, default_1.loadDefaultConfig)(undefined, 'promptfooconfig');
        const cachedResult2 = await (0, default_1.loadDefaultConfig)(undefined, 'redteam');
        expect(cachedResult1).toEqual(result1);
        expect(cachedResult2).toEqual(result2);
        expect(load_1.maybeReadConfig).toHaveBeenCalledTimes(2);
    });
    it('should use different caches for different directories', async () => {
        const mockConfig1 = { prompts: ['Config 1'], providers: [], tests: [] };
        const mockConfig2 = { prompts: ['Config 2'], providers: [], tests: [] };
        jest
            .mocked(load_1.maybeReadConfig)
            .mockResolvedValueOnce(mockConfig1)
            .mockResolvedValueOnce(mockConfig2);
        const dir1 = '/dir1';
        const dir2 = '/dir2';
        const result1 = await (0, default_1.loadDefaultConfig)(dir1);
        const result2 = await (0, default_1.loadDefaultConfig)(dir2);
        expect(result1).not.toEqual(result2);
        expect(result1.defaultConfig).toEqual(mockConfig1);
        expect(result2.defaultConfig).toEqual(mockConfig2);
        const cachedResult1 = await (0, default_1.loadDefaultConfig)(dir1);
        const cachedResult2 = await (0, default_1.loadDefaultConfig)(dir2);
        expect(cachedResult1).toEqual(result1);
        expect(cachedResult2).toEqual(result2);
        expect(load_1.maybeReadConfig).toHaveBeenCalledTimes(2);
    });
    it('should use cache for subsequent calls with same parameters', async () => {
        const mockConfig = { prompts: ['Cached config'], providers: [], tests: [] };
        jest.mocked(load_1.maybeReadConfig).mockResolvedValueOnce(mockConfig);
        const result1 = await (0, default_1.loadDefaultConfig)();
        const result2 = await (0, default_1.loadDefaultConfig)();
        expect(result1).toEqual(result2);
        expect(load_1.maybeReadConfig).toHaveBeenCalledTimes(1);
    });
    it('should handle errors when reading config files', async () => {
        jest.mocked(load_1.maybeReadConfig).mockRejectedValue(new Error('Permission denied'));
        await expect((0, default_1.loadDefaultConfig)()).rejects.toThrow('Permission denied');
    });
    it('should handle various config names', async () => {
        const mockConfig = { prompts: ['Test config'], providers: [], tests: [] };
        jest.mocked(load_1.maybeReadConfig).mockResolvedValue(mockConfig);
        const configNames = ['test1', 'test2', 'test3'];
        for (const name of configNames) {
            const result = await (0, default_1.loadDefaultConfig)(undefined, name);
            expect(result.defaultConfigPath).toContain(name);
        }
    });
    it('should handle interaction between configName and directory', async () => {
        const mockConfig = { prompts: ['Combined config'], providers: [], tests: [] };
        jest.mocked(load_1.maybeReadConfig).mockResolvedValue(mockConfig);
        const customDir = '/custom/dir';
        const customName = 'customconfig';
        const result = await (0, default_1.loadDefaultConfig)(customDir, customName);
        expect(result.defaultConfigPath).toEqual(path_1.default.join(customDir, `${customName}.yaml`));
    });
});
//# sourceMappingURL=default.test.js.map