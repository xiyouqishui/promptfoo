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
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
const esmModule = __importStar(require("../../src/esm"));
const logger_1 = __importDefault(require("../../src/logger"));
const pythonUtils = __importStar(require("../../src/python/pythonUtils"));
const fileExtensions_1 = require("../../src/util/fileExtensions");
const fileReference_1 = require("../../src/util/fileReference");
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
        readFile: jest.fn(),
    },
}));
jest.mock('path');
jest.mock('js-yaml');
jest.mock('../../src/esm', () => ({
    importModule: jest.fn(),
}));
jest.mock('../../src/python/pythonUtils', () => ({
    runPython: jest.fn(),
}));
jest.mock('../../src/util/fileExtensions');
jest.mock('../../src/logger');
const importModule = jest.mocked(esmModule.importModule);
const runPython = jest.mocked(pythonUtils.runPython);
const readFileMock = jest.mocked(fs_1.default.promises.readFile);
describe('fileReference utility functions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(logger_1.default.debug).mockImplementation((message) => {
            return {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
        });
        jest.mocked(logger_1.default.error).mockImplementation((message) => {
            return {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
        });
        jest
            .mocked(path_1.default.resolve)
            .mockImplementation((basePath, filePath) => filePath?.startsWith('/') ? filePath : path_1.default.join(basePath || '', filePath || ''));
        jest.mocked(path_1.default.join).mockImplementation((...parts) => parts.filter(Boolean).join('/'));
        jest.mocked(path_1.default.extname).mockImplementation((filePath) => {
            if (!filePath) {
                return '';
            }
            const parts = filePath.split('.');
            return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
        });
        jest.mocked(fileExtensions_1.isJavascriptFile).mockImplementation((filePath) => {
            if (!filePath) {
                return false;
            }
            return ['.js', '.mjs', '.ts', '.cjs'].some((ext) => filePath.endsWith(ext));
        });
        importModule.mockResolvedValue({});
        runPython.mockResolvedValue({});
    });
    describe('loadFileReference', () => {
        it('should load JSON files correctly', async () => {
            const fileRef = 'file:///path/to/config.json';
            const fileContent = '{"name": "test", "value": 42}';
            const parsedContent = { name: 'test', value: 42 };
            readFileMock.mockResolvedValue(fileContent);
            jest.spyOn(JSON, 'parse').mockReturnValue(parsedContent);
            const result = await (0, fileReference_1.loadFileReference)(fileRef);
            expect(fs_1.default.promises.readFile).toHaveBeenCalledWith('/path/to/config.json', 'utf8');
            expect(result).toEqual(parsedContent);
        });
        it('should load YAML files correctly', async () => {
            const fileRef = 'file:///path/to/config.yaml';
            const fileContent = 'name: test\nvalue: 42';
            const parsedContent = { name: 'test', value: 42 };
            readFileMock.mockResolvedValue(fileContent);
            jest.mocked(js_yaml_1.default.load).mockReturnValue(parsedContent);
            const result = await (0, fileReference_1.loadFileReference)(fileRef);
            expect(fs_1.default.promises.readFile).toHaveBeenCalledWith('/path/to/config.yaml', 'utf8');
            expect(js_yaml_1.default.load).toHaveBeenCalledWith(fileContent);
            expect(result).toEqual(parsedContent);
        });
        it('should load JavaScript files correctly', async () => {
            const fileRef = 'file:///path/to/config.js';
            const moduleOutput = { settings: { temperature: 0.7 } };
            jest.mocked(fileExtensions_1.isJavascriptFile).mockReturnValue(true);
            importModule.mockResolvedValue(moduleOutput);
            const result = await (0, fileReference_1.loadFileReference)(fileRef);
            expect(importModule).toHaveBeenCalledWith('/path/to/config.js', undefined);
            expect(result).toEqual(moduleOutput);
        });
        it('should load JavaScript files with function name correctly', async () => {
            const fileRef = 'file:///path/to/config.js:getConfig';
            const moduleOutput = { getConfig: 'success' };
            jest.mocked(fileExtensions_1.isJavascriptFile).mockReturnValue(true);
            importModule.mockResolvedValue(moduleOutput);
            const result = await (0, fileReference_1.loadFileReference)(fileRef);
            expect(importModule).toHaveBeenCalledWith('/path/to/config.js', 'getConfig');
            expect(result).toEqual(moduleOutput);
        });
        it('should load Python files correctly', async () => {
            const fileRef = 'file:///path/to/config.py';
            const pythonOutput = { message: 'Hello from Python' };
            runPython.mockResolvedValue(pythonOutput);
            const result = await (0, fileReference_1.loadFileReference)(fileRef);
            expect(runPython).toHaveBeenCalledWith('/path/to/config.py', 'get_config', []);
            expect(result).toEqual(pythonOutput);
        });
        it('should load Python files with function name correctly', async () => {
            const fileRef = 'file:///path/to/config.py:custom_func';
            const pythonOutput = { custom: true };
            runPython.mockResolvedValue(pythonOutput);
            const result = await (0, fileReference_1.loadFileReference)(fileRef);
            expect(runPython).toHaveBeenCalledWith('/path/to/config.py', 'custom_func', []);
            expect(result).toEqual(pythonOutput);
        });
        it('should load text files correctly', async () => {
            const fileRef = 'file:///path/to/config.txt';
            const fileContent = 'This is a text file';
            readFileMock.mockResolvedValue(fileContent);
            const result = await (0, fileReference_1.loadFileReference)(fileRef);
            expect(fs_1.default.promises.readFile).toHaveBeenCalledWith('/path/to/config.txt', 'utf8');
            expect(result).toEqual(fileContent);
        });
        it('should resolve file paths relative to the basePath', async () => {
            const fileRef = 'file://config.json';
            const basePath = '/base/path';
            const fileContent = '{"name": "test"}';
            const parsedContent = { name: 'test' };
            jest.mocked(path_1.default.resolve).mockReturnValue('/base/path/config.json');
            readFileMock.mockResolvedValue(fileContent);
            jest.spyOn(JSON, 'parse').mockReturnValue(parsedContent);
            const result = await (0, fileReference_1.loadFileReference)(fileRef, basePath);
            expect(path_1.default.resolve).toHaveBeenCalledWith('/base/path', 'config.json');
            expect(fs_1.default.promises.readFile).toHaveBeenCalledWith('/base/path/config.json', 'utf8');
            expect(result).toEqual(parsedContent);
        });
        it('should throw an error for unsupported file types', async () => {
            const fileRef = 'file:///path/to/file.xyz';
            jest.mocked(path_1.default.extname).mockReturnValue('.xyz');
            jest.mocked(fileExtensions_1.isJavascriptFile).mockReturnValue(false);
            await expect((0, fileReference_1.loadFileReference)(fileRef)).rejects.toThrow('Unsupported file extension: .xyz');
        });
    });
    describe('processConfigFileReferences', () => {
        it('should return primitive values as is', async () => {
            await expect((0, fileReference_1.processConfigFileReferences)(42)).resolves.toBe(42);
            await expect((0, fileReference_1.processConfigFileReferences)('test')).resolves.toBe('test');
            await expect((0, fileReference_1.processConfigFileReferences)(true)).resolves.toBe(true);
            await expect((0, fileReference_1.processConfigFileReferences)(null)).resolves.toBeNull();
            await expect((0, fileReference_1.processConfigFileReferences)(undefined)).resolves.toBeUndefined();
        });
        it('should process a simple file reference string', async () => {
            const config = 'file:///path/to/config.json';
            const parsedContent = { name: 'test', value: 42 };
            readFileMock.mockResolvedValue(JSON.stringify(parsedContent));
            jest.spyOn(JSON, 'parse').mockReturnValue(parsedContent);
            const result = await (0, fileReference_1.processConfigFileReferences)(config);
            expect(result).toEqual(parsedContent);
        });
        it('should process nested file references in objects', async () => {
            const config = {
                setting1: 'value1',
                setting2: 'file:///path/to/setting2.json',
                nested: {
                    setting3: 'file:///path/to/setting3.yaml',
                },
            };
            readFileMock.mockImplementation((path) => {
                if (path === '/path/to/setting2.json') {
                    return Promise.resolve('{"key": "value2"}');
                }
                if (path === '/path/to/setting3.yaml') {
                    return Promise.resolve('key: value3');
                }
                return Promise.resolve('');
            });
            jest.spyOn(JSON, 'parse').mockImplementation((content) => {
                if (content === '{"key": "value2"}') {
                    return { key: 'value2' };
                }
                return {};
            });
            jest.mocked(js_yaml_1.default.load).mockImplementation((content) => {
                if (content === 'key: value3') {
                    return { key: 'value3' };
                }
                return {};
            });
            const result = await (0, fileReference_1.processConfigFileReferences)(config);
            expect(result).toEqual({
                setting1: 'value1',
                setting2: { key: 'value2' },
                nested: {
                    setting3: { key: 'value3' },
                },
            });
        });
        it('should process file references in arrays', async () => {
            const config = [
                'regular string',
                'file:///path/to/item1.json',
                'file:///path/to/item2.yaml',
                42,
            ];
            readFileMock.mockImplementation((path) => {
                if (path === '/path/to/item1.json') {
                    return Promise.resolve('{"name": "item1"}');
                }
                if (path === '/path/to/item2.yaml') {
                    return Promise.resolve('name: item2');
                }
                return Promise.resolve('');
            });
            jest.spyOn(JSON, 'parse').mockImplementation((content) => {
                if (content === '{"name": "item1"}') {
                    return { name: 'item1' };
                }
                return {};
            });
            jest.mocked(js_yaml_1.default.load).mockImplementation((content) => {
                if (content === 'name: item2') {
                    return { name: 'item2' };
                }
                return {};
            });
            const result = await (0, fileReference_1.processConfigFileReferences)(config);
            expect(result).toEqual(['regular string', { name: 'item1' }, { name: 'item2' }, 42]);
        });
        it('should handle errors when processing file references', async () => {
            const config = {
                valid: 'regular value',
                invalid: 'file:///path/to/nonexistent.json',
            };
            readFileMock.mockImplementation((path) => {
                if (path === '/path/to/nonexistent.json') {
                    return Promise.reject(new Error('File not found'));
                }
                return Promise.resolve('');
            });
            await expect((0, fileReference_1.processConfigFileReferences)(config)).rejects.toThrow('File not found');
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('File not found'));
        });
    });
});
//# sourceMappingURL=fileReference.test.js.map