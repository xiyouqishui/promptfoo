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
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const esm_1 = require("../../../src/esm");
const pythonUtils_1 = require("../../../src/python/pythonUtils");
const loadFunction_1 = require("../../../src/util/functions/loadFunction");
jest.mock('../../../src/esm', () => ({
    importModule: jest.fn(),
    __esModule: true,
}));
jest.mock('../../../src/python/pythonUtils', () => ({
    runPython: jest.fn(),
}));
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn(),
}));
jest.mock('../../../src/cliState', () => ({
    basePath: '/base/path',
}));
describe('loadFunction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear the function cache
        Object.keys(loadFunction_1.functionCache).forEach((key) => delete loadFunction_1.functionCache[key]);
    });
    describe('JavaScript functions', () => {
        it('should load a JavaScript function with explicit function name', async () => {
            const mockFn = jest.fn();
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.js');
            jest.mocked(esm_1.importModule).mockResolvedValue(mockFn);
            const result = await (0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.js',
                functionName: 'customFunction',
            });
            expect(esm_1.importModule).toHaveBeenCalledWith('/path/to/function.js', 'customFunction');
            expect(result).toBe(mockFn);
        });
        it('should load a JavaScript function with default export', async () => {
            const mockFn = jest.fn();
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.js');
            jest.mocked(esm_1.importModule).mockResolvedValue(mockFn);
            const result = await (0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.js',
            });
            expect(esm_1.importModule).toHaveBeenCalledWith('/path/to/function.js', undefined);
            expect(result).toBe(mockFn);
        });
        it('should load a JavaScript function from default.default export', async () => {
            const mockFn = jest.fn();
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.js');
            jest.mocked(esm_1.importModule).mockResolvedValue({ default: { default: mockFn } });
            const result = await (0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.js',
            });
            expect(esm_1.importModule).toHaveBeenCalledWith('/path/to/function.js', undefined);
            expect(result).toBe(mockFn);
        });
        it('should throw error if JavaScript file does not export a function', async () => {
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.js');
            jest.mocked(esm_1.importModule).mockResolvedValue({ notAFunction: 'string' });
            await expect((0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.js',
                functionName: 'customFunction',
            })).rejects.toThrow('JavaScript file must export a "customFunction" function');
        });
        it('should use function cache when enabled', async () => {
            const mockFn = jest.fn();
            const cacheKey = '/path/to/function.js';
            jest.mocked(path.resolve).mockReturnValue(cacheKey);
            jest.mocked(esm_1.importModule).mockResolvedValue(mockFn);
            // First call
            const result1 = await (0, loadFunction_1.loadFunction)({
                filePath: cacheKey,
                useCache: true,
            });
            // Second call - should use cache
            const result2 = await (0, loadFunction_1.loadFunction)({
                filePath: cacheKey,
                useCache: true,
            });
            expect(esm_1.importModule).toHaveBeenCalledTimes(1);
            expect(result1).toBe(result2);
            expect(result1).toBe(mockFn);
        });
        it('should not use cache when disabled', async () => {
            const mockFn1 = jest.fn();
            const mockFn2 = jest.fn();
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.js');
            jest.mocked(esm_1.importModule).mockResolvedValueOnce(mockFn1).mockResolvedValueOnce(mockFn2);
            // First call
            const result1 = await (0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.js',
                useCache: false,
            });
            // Second call
            const result2 = await (0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.js',
                useCache: false,
            });
            expect(esm_1.importModule).toHaveBeenCalledTimes(2);
            expect(result1).not.toBe(result2);
        });
    });
    describe('Python functions', () => {
        it('should load a Python function with explicit function name', async () => {
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.py');
            const mockPythonResult = jest.fn();
            jest.mocked(pythonUtils_1.runPython).mockImplementation((...args) => mockPythonResult(...args));
            const result = await (0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.py',
                functionName: 'custom_function',
            });
            expect(typeof result).toBe('function');
            await result('test input');
            expect(pythonUtils_1.runPython).toHaveBeenCalledWith('/path/to/function.py', 'custom_function', [
                'test input',
            ]);
        });
        it('should use default function name for Python when none specified', async () => {
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.py');
            const mockPythonResult = jest.fn();
            jest.mocked(pythonUtils_1.runPython).mockImplementation((...args) => mockPythonResult(...args));
            const result = await (0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.py',
            });
            expect(typeof result).toBe('function');
            await result('test input');
            expect(pythonUtils_1.runPython).toHaveBeenCalledWith('/path/to/function.py', 'func', ['test input']);
        });
    });
    describe('Error handling', () => {
        it('should throw error for unsupported file types', async () => {
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.txt');
            await expect((0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.txt',
            })).rejects.toThrow('File must be a JavaScript (js, cjs, mjs, ts, cts, mts) or Python (.py) file');
        });
        it('should handle import errors', async () => {
            jest.mocked(path.resolve).mockReturnValue('/path/to/function.js');
            const error = new Error('Import failed');
            jest.mocked(esm_1.importModule).mockRejectedValue(error);
            await expect((0, loadFunction_1.loadFunction)({
                filePath: '/path/to/function.js',
            })).rejects.toThrow('Import failed');
        });
    });
});
describe('parseFileUrl', () => {
    it('should parse file URL with function name', () => {
        const result = (0, loadFunction_1.parseFileUrl)('file:///path/to/file.js:functionName');
        expect(result).toEqual({
            filePath: '/path/to/file.js',
            functionName: 'functionName',
        });
    });
    it('should parse file URL without function name', () => {
        const result = (0, loadFunction_1.parseFileUrl)('file:///path/to/file.js');
        expect(result).toEqual({
            filePath: '/path/to/file.js',
        });
    });
    it('should throw error for invalid file URL', () => {
        expect(() => (0, loadFunction_1.parseFileUrl)('/path/to/file.js')).toThrow('URL must start with file://');
    });
    it('should handle Windows-style paths', () => {
        const result = (0, loadFunction_1.parseFileUrl)('file://C:/path/to/file.js:functionName');
        expect(result).toEqual({
            filePath: 'C:/path/to/file.js',
            functionName: 'functionName',
        });
    });
    it('should handle relative paths', () => {
        const result = (0, loadFunction_1.parseFileUrl)('file://./path/to/file.js:functionName');
        expect(result).toEqual({
            filePath: './path/to/file.js',
            functionName: 'functionName',
        });
    });
});
//# sourceMappingURL=loadFunction.test.js.map