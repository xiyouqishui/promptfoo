"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../../src/logger"));
const pythonCompletion_1 = require("../../src/providers/pythonCompletion");
const pythonUtils_1 = require("../../src/python/pythonUtils");
const util_1 = require("../../src/util");
const fileReference_1 = require("../../src/util/fileReference");
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/python/pythonUtils');
jest.mock('../../src/util/file');
jest.mock('../../src/logger');
jest.mock('../../src/esm');
jest.mock('../../src/util');
jest.mock('../../src/util/fileReference', () => ({
    loadFileReference: jest.fn(),
    processConfigFileReferences: jest.fn(),
}));
describe('PythonProvider with file references', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(logger_1.default.debug).mockImplementation(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        }));
        jest.mocked(logger_1.default.error).mockImplementation(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        }));
        jest.mocked(path_1.default.resolve).mockImplementation((...parts) => parts.join('/'));
        jest.mocked(path_1.default.relative).mockReturnValue('relative/path');
        jest.mocked(path_1.default.join).mockImplementation((...parts) => parts.join('/'));
        jest.mocked(util_1.parsePathOrGlob).mockImplementation((basePath, runPath) => {
            if (runPath.includes(':')) {
                const [filePath, functionName] = runPath.split(':');
                return {
                    filePath,
                    functionName,
                    isPathPattern: false,
                    extension: '.py',
                };
            }
            return {
                filePath: runPath,
                functionName: undefined,
                isPathPattern: false,
                extension: '.py',
            };
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('mock file content');
        jest.mocked(pythonUtils_1.runPython).mockResolvedValue({ output: 'Test output' });
    });
    it('should call processConfigFileReferences when initializing config references', async () => {
        const mockConfig = {
            settings: 'file://settings.json',
            templates: ['file://template1.yaml', 'file://template2.txt'],
        };
        const mockProcessedConfig = {
            settings: { temperature: 0.7 },
            templates: [{ prompt: 'Template 1' }, 'Template 2 content'],
        };
        jest.mocked(fileReference_1.processConfigFileReferences).mockResolvedValue(mockProcessedConfig);
        const provider = new pythonCompletion_1.PythonProvider('test.py', {
            id: 'test',
            config: {
                basePath: '/base/path',
                ...mockConfig,
            },
        });
        await provider.initialize();
        expect(fileReference_1.processConfigFileReferences).toHaveBeenCalledWith(expect.objectContaining(mockConfig), '/base/path');
        expect(provider.config).toEqual(mockProcessedConfig);
    });
    it('should handle errors during config reference processing', async () => {
        const mockConfig = {
            settings: 'file://settings.json',
            basePath: '/base/path',
        };
        const mockError = new Error('Failed to load file');
        jest.mocked(fileReference_1.processConfigFileReferences).mockRejectedValue(mockError);
        const provider = new pythonCompletion_1.PythonProvider('test.py', {
            id: 'test',
            config: mockConfig,
        });
        provider['isInitialized'] = false;
        await expect(provider.initialize()).rejects.toThrow('Failed to load file');
        expect(fileReference_1.processConfigFileReferences).toHaveBeenCalledWith(expect.objectContaining(mockConfig), expect.any(String));
        expect(provider['isInitialized']).toBeFalsy();
    });
    it('should process config references before calling API', async () => {
        const mockConfig = {
            settings: 'file://settings.json',
        };
        const mockProcessedConfig = {
            settings: { model: 'gpt-4' },
        };
        jest.mocked(fileReference_1.processConfigFileReferences).mockResolvedValue(mockProcessedConfig);
        const provider = new pythonCompletion_1.PythonProvider('test.py', {
            id: 'test',
            config: {
                basePath: '/base/path',
                ...mockConfig,
            },
        });
        provider['isInitialized'] = false;
        const mockResult = { output: 'API result', cached: false };
        const _originalMethod = provider['executePythonScript'];
        const executePythonScriptMock = jest.fn((prompt, context, apiType) => Promise.resolve(mockResult));
        provider['executePythonScript'] = executePythonScriptMock;
        jest.mocked(pythonUtils_1.runPython).mockResolvedValue({ output: 'API result' });
        await provider.callApi('Test prompt');
        expect(fileReference_1.processConfigFileReferences).toHaveBeenCalledWith(expect.objectContaining(mockConfig), '/base/path');
        expect(provider.config).toEqual(mockProcessedConfig);
        expect(executePythonScriptMock).toHaveBeenCalledWith('Test prompt', undefined, 'call_api');
    });
    it('should only process config references once', async () => {
        const mockConfig = {
            settings: 'file://settings.json',
        };
        jest.mocked(fileReference_1.processConfigFileReferences).mockResolvedValue({
            settings: { processed: true },
        });
        const provider = new pythonCompletion_1.PythonProvider('test.py', {
            id: 'test',
            config: {
                basePath: '/base/path',
                ...mockConfig,
            },
        });
        provider['isInitialized'] = false;
        await provider.initialize();
        await provider.initialize();
        await provider.initialize();
        expect(fileReference_1.processConfigFileReferences).toHaveBeenCalledTimes(1);
    });
    it('should pass the loaded config to python script execution', async () => {
        const mockConfig = {
            pythonExecutable: '/custom/python',
            settings: 'file://settings.json',
        };
        const mockProcessedConfig = {
            pythonExecutable: '/custom/python',
            settings: { temperature: 0.8 },
        };
        jest.mocked(fileReference_1.processConfigFileReferences).mockResolvedValue(mockProcessedConfig);
        const provider = new pythonCompletion_1.PythonProvider('test.py', {
            id: 'test',
            config: {
                basePath: '/base/path',
                ...mockConfig,
            },
        });
        provider['isInitialized'] = false;
        const runPythonMock = jest.mocked(pythonUtils_1.runPython);
        runPythonMock.mockClear();
        runPythonMock.mockResolvedValue({ output: 'API result' });
        await provider.callApi('Test prompt');
        expect(runPythonMock).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(Array), {
            pythonExecutable: '/custom/python',
        });
    });
    it('should correctly handle integration with different API call types', async () => {
        const mockProcessedConfig = {
            pythonExecutable: '/custom/python',
        };
        jest.mocked(fileReference_1.processConfigFileReferences).mockResolvedValue(mockProcessedConfig);
        const provider = new pythonCompletion_1.PythonProvider('test.py', {
            id: 'test',
            config: {
                basePath: '/base/path',
            },
        });
        provider['isInitialized'] = false;
        const runPythonMock = jest.mocked(pythonUtils_1.runPython);
        runPythonMock.mockClear();
        runPythonMock.mockResolvedValueOnce({ output: 'API result' });
        jest.spyOn(provider, 'callApi').mockResolvedValue({
            output: 'API result',
            cached: false,
        });
        jest.spyOn(provider, 'callEmbeddingApi').mockResolvedValue({
            embedding: [0.1, 0.2, 0.3],
        });
        jest.spyOn(provider, 'callClassificationApi').mockResolvedValue({
            classification: { label: 0, score: 0.9 },
        });
        const apiResult = await provider.callApi('Test prompt');
        const embeddingResult = await provider.callEmbeddingApi('Get embedding');
        const classificationResult = await provider.callClassificationApi('Classify this');
        expect(apiResult).toEqual({ output: 'API result', cached: false });
        expect(embeddingResult).toEqual({ embedding: [0.1, 0.2, 0.3] });
        expect(classificationResult).toEqual({ classification: { label: 0, score: 0.9 } });
    });
    it('should pass processed config to Python script instead of raw file references', async () => {
        const mockOriginalConfig = {
            settings: 'file://settings.json',
            formats: 'file://formats.yaml',
        };
        const mockProcessedConfig = {
            settings: { model: 'gpt-4', temperature: 0.7 },
            formats: { outputFormat: 'json', includeTokens: true },
        };
        jest.mocked(fileReference_1.processConfigFileReferences).mockResolvedValue(mockProcessedConfig);
        const provider = new pythonCompletion_1.PythonProvider('test.py', {
            id: 'test',
            config: {
                basePath: '/base/path',
                ...mockOriginalConfig,
            },
        });
        const runPythonMock = jest.mocked(pythonUtils_1.runPython);
        runPythonMock.mockClear();
        runPythonMock.mockImplementation(async (scriptPath, method, args) => {
            return {
                output: 'Success',
                args,
            };
        });
        await provider.callApi('Test prompt');
        expect(runPythonMock).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(Array), expect.any(Object));
        const argsPassedToRunPython = runPythonMock.mock.calls[0][2];
        expect(argsPassedToRunPython).toBeDefined();
        expect(argsPassedToRunPython.length).toBeGreaterThanOrEqual(2);
        const optionsPassedToPython = argsPassedToRunPython[1];
        expect(optionsPassedToPython).toBeDefined();
        expect(optionsPassedToPython.config).toBeDefined();
        expect(optionsPassedToPython.config.settings).toEqual(mockProcessedConfig.settings);
        expect(optionsPassedToPython.config.formats).toEqual(mockProcessedConfig.formats);
        expect(optionsPassedToPython.config.settings).not.toBe('file://settings.json');
        expect(optionsPassedToPython.config.formats).not.toBe('file://formats.yaml');
    });
});
//# sourceMappingURL=pythonCompletion.fileRef.test.js.map