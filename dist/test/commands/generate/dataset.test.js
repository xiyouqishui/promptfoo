"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const cache_1 = require("../../../src/cache");
const dataset_1 = require("../../../src/commands/generate/dataset");
const telemetry_1 = __importDefault(require("../../../src/telemetry"));
const synthesis_1 = require("../../../src/testCase/synthesis");
const load_1 = require("../../../src/util/config/load");
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('../../../src/testCase/synthesis');
jest.mock('../../../src/util/config/load');
jest.mock('../../../src/cache');
jest.mock('../../../src/logger');
jest.mock('../../../src/telemetry', () => ({
    record: jest.fn(),
    send: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/util', () => ({
    isRunningUnderNpx: jest.fn().mockReturnValue(false),
    printBorder: jest.fn(),
    setupEnv: jest.fn(),
}));
describe('dataset generation', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });
    beforeEach(() => {
        jest.resetAllMocks();
    });
    afterAll(() => {
        jest.useRealTimers();
    });
    describe('doGenerateDataset', () => {
        const mockTestSuite = {
            prompts: [{ raw: 'test prompt', label: 'test' }],
            tests: [],
            providers: [
                {
                    id: () => 'test-provider',
                    callApi: jest.fn(),
                },
            ],
        };
        const mockResults = [{ var1: 'value1' }, { var1: 'value2' }];
        beforeEach(() => {
            jest.mocked(synthesis_1.synthesizeFromTestSuite).mockResolvedValue(mockResults);
            jest.mocked(js_yaml_1.default.dump).mockReturnValue('yaml content');
            jest.mocked(js_yaml_1.default.load).mockReturnValue(mockTestSuite);
            jest.mocked(fs_1.default.readFileSync).mockReturnValue('mock config content');
            jest.mocked(fs_1.default.existsSync).mockReturnValue(true);
            jest.mocked(fs_1.default.writeFileSync).mockImplementation(() => undefined);
            jest.mocked(cache_1.disableCache).mockImplementation(() => undefined);
            jest.mocked(telemetry_1.default.send).mockResolvedValue(undefined);
            jest.mocked(load_1.resolveConfigs).mockResolvedValue({
                testSuite: mockTestSuite,
                config: {},
                basePath: '',
            });
        });
        it('should write YAML output', async () => {
            const configPath = 'config.yaml';
            await (0, dataset_1.doGenerateDataset)({
                cache: true,
                config: configPath,
                numPersonas: '5',
                numTestCasesPerPersona: '3',
                output: 'output.yaml',
                write: false,
                defaultConfig: {},
                defaultConfigPath: configPath,
            });
            expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('output.yaml', 'yaml content');
        });
        it('should write CSV output', async () => {
            const configPath = 'config.yaml';
            await (0, dataset_1.doGenerateDataset)({
                cache: true,
                config: configPath,
                numPersonas: '5',
                numTestCasesPerPersona: '3',
                output: 'output.csv',
                write: false,
                defaultConfig: {},
                defaultConfigPath: configPath,
            });
            const expectedCsv = 'var1\n"value1"\n"value2"\n';
            expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('output.csv', expectedCsv);
        });
        it('should throw error for unsupported file type', async () => {
            const configPath = 'config.yaml';
            await expect((0, dataset_1.doGenerateDataset)({
                cache: true,
                config: configPath,
                numPersonas: '5',
                numTestCasesPerPersona: '3',
                output: 'output.txt',
                write: false,
                defaultConfig: {},
                defaultConfigPath: configPath,
            })).rejects.toThrow('Unsupported output file type: output.txt');
        });
        it('should write to config file when write option is true', async () => {
            const configPath = 'config.yaml';
            await (0, dataset_1.doGenerateDataset)({
                cache: true,
                config: configPath,
                numPersonas: '5',
                numTestCasesPerPersona: '3',
                write: true,
                defaultConfig: {},
                defaultConfigPath: configPath,
            });
            expect(fs_1.default.writeFileSync).toHaveBeenCalledWith(configPath, expect.any(String));
        });
        it('should throw error when no config file found', async () => {
            await expect((0, dataset_1.doGenerateDataset)({
                cache: true,
                numPersonas: '5',
                numTestCasesPerPersona: '3',
                write: false,
                defaultConfig: {},
                defaultConfigPath: undefined,
            })).rejects.toThrow('Could not find config file');
        });
        it('should handle output without file extension', async () => {
            const configPath = 'config.yaml';
            await expect((0, dataset_1.doGenerateDataset)({
                cache: true,
                config: configPath,
                numPersonas: '5',
                numTestCasesPerPersona: '3',
                output: 'output',
                write: false,
                defaultConfig: {},
                defaultConfigPath: configPath,
            })).rejects.toThrow('Unsupported output file type: output');
        });
        it('should handle synthesis errors', async () => {
            jest.mocked(synthesis_1.synthesizeFromTestSuite).mockRejectedValue(new Error('Synthesis failed'));
            const configPath = 'config.yaml';
            await expect((0, dataset_1.doGenerateDataset)({
                cache: true,
                config: configPath,
                numPersonas: '5',
                numTestCasesPerPersona: '3',
                output: 'output.yaml',
                write: false,
                defaultConfig: {},
                defaultConfigPath: configPath,
            })).rejects.toThrow('Synthesis failed');
        });
    });
});
//# sourceMappingURL=dataset.test.js.map