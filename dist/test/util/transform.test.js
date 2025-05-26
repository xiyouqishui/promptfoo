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
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../../src/logger"));
const pythonUtils_1 = require("../../src/python/pythonUtils");
const transform_1 = require("../../src/util/transform");
jest.mock('../../src/esm');
jest.mock('../../src/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));
jest.mock('../../src/python/pythonUtils', () => ({
    runPython: jest.fn().mockImplementation(async (filePath, functionName, args) => {
        const [output] = args;
        return output.toUpperCase() + ' FROM PYTHON';
    }),
}));
jest.mock('fs', () => ({
    unlink: jest.fn(),
}));
jest.mock('glob', () => ({
    globSync: jest.fn(),
}));
jest.mock('../../src/database', () => ({
    getDb: jest.fn(),
}));
describe('util', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('transform', () => {
        afterEach(() => {
            jest.clearAllMocks();
            jest.resetModules();
        });
        it('transforms output using a direct function', async () => {
            const output = 'original output';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            const transformFunction = 'output.toUpperCase()';
            const transformedOutput = await (0, transform_1.transform)(transformFunction, output, context);
            expect(transformedOutput).toBe('ORIGINAL OUTPUT');
        });
        it('transforms vars using a direct function', async () => {
            const vars = { key: 'value' };
            const context = { vars: {}, prompt: { id: '123' } };
            const transformFunction = 'JSON.stringify(vars)';
            const transformedOutput = await (0, transform_1.transform)(transformFunction, vars, context, true, transform_1.TransformInputType.VARS);
            expect(transformedOutput).toBe('{"key":"value"}');
        });
        it('transforms output using an imported function from a file', async () => {
            const output = 'hello';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            jest.doMock(path.resolve('transform.js'), () => (output) => output.toUpperCase(), {
                virtual: true,
            });
            const transformFunctionPath = 'file://transform.js';
            const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, output, context);
            expect(transformedOutput).toBe('HELLO');
        });
        it('transforms vars using a direct function from a file', async () => {
            const vars = { key: 'value' };
            const context = { vars: {}, prompt: {} };
            jest.doMock(path.resolve('transform.js'), () => (vars) => ({ ...vars, key: 'transformed' }), {
                virtual: true,
            });
            const transformFunctionPath = 'file://transform.js';
            const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, vars, context, true, transform_1.TransformInputType.VARS);
            expect(transformedOutput).toEqual({ key: 'transformed' });
        });
        it('throws error if transform function does not return a value', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const transformFunction = ''; // Empty function, returns undefined
            await expect((0, transform_1.transform)(transformFunction, output, context)).rejects.toThrow('Transform function did not return a value');
        });
        it('throws error if file does not export a function', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            jest.doMock(path.resolve('transform.js'), () => 'banana', { virtual: true });
            const transformFunctionPath = 'file://transform.js';
            await expect((0, transform_1.transform)(transformFunctionPath, output, context)).rejects.toThrow('Transform transform.js must export a function, have a default export as a function, or export the specified function "undefined"');
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error loading transform function from file:'));
        });
        it('transforms output using a Python file', async () => {
            const output = 'hello';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            const pythonFilePath = 'file://transform.py';
            const transformedOutput = await (0, transform_1.transform)(pythonFilePath, output, context);
            expect(transformedOutput).toBe('HELLO FROM PYTHON');
        });
        it('throws error for unsupported file format', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const unsupportedFilePath = 'file://transform.txt';
            await expect((0, transform_1.transform)(unsupportedFilePath, output, context)).rejects.toThrow('Unsupported transform file format: file://transform.txt');
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error loading transform function from file:'));
        });
        it('transforms output using a multi-line function', async () => {
            const output = 'hello';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            const multiLineFunction = `
        const uppercased = output.toUpperCase();
        return uppercased + ' WORLD';
      `;
            const transformedOutput = await (0, transform_1.transform)(multiLineFunction, output, context);
            expect(transformedOutput).toBe('HELLO WORLD');
        });
        it('transforms output using a default export function from a file', async () => {
            const output = 'hello';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            jest.doMock(path.resolve('transform.js'), () => ({
                default: (output) => output.toUpperCase() + ' DEFAULT',
            }), { virtual: true });
            const transformFunctionPath = 'file://transform.js';
            const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, output, context);
            expect(transformedOutput).toBe('HELLO DEFAULT');
        });
        it('transforms output using a named function from a JavaScript file', async () => {
            const output = 'hello';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            jest.doMock(path.resolve('transform.js'), () => ({
                namedFunction: (output) => output.toUpperCase() + ' NAMED',
            }), { virtual: true });
            const transformFunctionPath = 'file://transform.js:namedFunction';
            const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, output, context);
            expect(transformedOutput).toBe('HELLO NAMED');
        });
        it('transforms output using a named function from a Python file', async () => {
            const output = 'hello';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            const pythonFilePath = 'file://transform.py:custom_transform';
            const transformedOutput = await (0, transform_1.transform)(pythonFilePath, output, context);
            expect(transformedOutput).toBe('HELLO FROM PYTHON');
            expect(pythonUtils_1.runPython).toHaveBeenCalledWith(expect.stringContaining('transform.py'), 'custom_transform', [output, expect.any(Object)]);
        });
        it('falls back to get_transform for Python files when no function name is provided', async () => {
            const output = 'hello';
            const context = { vars: { key: 'value' }, prompt: { id: '123' } };
            const pythonFilePath = 'file://transform.py';
            const transformedOutput = await (0, transform_1.transform)(pythonFilePath, output, context);
            expect(transformedOutput).toBe('HELLO FROM PYTHON');
            expect(pythonUtils_1.runPython).toHaveBeenCalledWith(expect.stringContaining('transform.py'), 'get_transform', [output, expect.any(Object)]);
        });
        it('does not throw error when validateReturn is false and function returns undefined', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const transformFunction = ''; // Empty function, returns undefined
            const result = await (0, transform_1.transform)(transformFunction, output, context, false);
            expect(result).toBeUndefined();
        });
        it('throws error when validateReturn is true and function returns undefined', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const transformFunction = ''; // Empty function, returns undefined
            await expect((0, transform_1.transform)(transformFunction, output, context, true)).rejects.toThrow('Transform function did not return a value');
        });
        it('does not throw error when validateReturn is false and function returns null', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const transformFunction = 'null'; // Will be wrapped with "return" automatically
            const result = await (0, transform_1.transform)(transformFunction, output, context, false);
            expect(result).toBeNull();
        });
        it('throws error when validateReturn is true and function returns null', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const transformFunction = 'null'; // Will be wrapped with "return" automatically
            await expect((0, transform_1.transform)(transformFunction, output, context, true)).rejects.toThrow('Transform function did not return a value');
        });
        it('handles file transform function errors gracefully', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const errorMessage = 'File not found';
            jest.doMock(path.resolve('transform.js'), () => {
                throw new Error(errorMessage);
            }, { virtual: true });
            const transformFunctionPath = 'file://transform.js';
            await expect((0, transform_1.transform)(transformFunctionPath, output, context)).rejects.toThrow(errorMessage);
            expect(logger_1.default.error).toHaveBeenCalledWith(`Error loading transform function from file: ${errorMessage}`);
        });
        it('handles inline transform function errors gracefully', async () => {
            const output = 'test';
            const context = { vars: {}, prompt: {} };
            const invalidFunction = 'invalid javascript code {';
            await expect((0, transform_1.transform)(invalidFunction, output, context)).rejects.toThrow('Unexpected identifier');
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error creating inline transform function:'));
        });
        describe('file path handling', () => {
            it('handles absolute paths in transform files', async () => {
                const output = 'hello';
                const context = { vars: { key: 'value' }, prompt: { id: '123' } };
                const mockPath = path.resolve('transform.js');
                jest.doMock(mockPath, () => (output) => output.toUpperCase(), {
                    virtual: true,
                });
                const transformFunctionPath = 'file://transform.js';
                const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, output, context);
                expect(transformedOutput).toBe('HELLO');
            });
            it('handles file URLs in transform files', async () => {
                const output = 'hello';
                const context = { vars: { key: 'value' }, prompt: { id: '123' } };
                const mockPath = path.resolve('transform.js');
                jest.doMock(mockPath, () => (output) => output.toUpperCase(), {
                    virtual: true,
                });
                const transformFunctionPath = 'file://transform.js';
                const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, output, context);
                expect(transformedOutput).toBe('HELLO');
            });
            it('handles Python files with absolute paths', async () => {
                const output = 'hello';
                const context = { vars: { key: 'value' }, prompt: { id: '123' } };
                const pythonFilePath = 'file://transform.py';
                const transformedOutput = await (0, transform_1.transform)(pythonFilePath, output, context);
                expect(transformedOutput).toBe('HELLO FROM PYTHON');
                expect(pythonUtils_1.runPython).toHaveBeenCalledWith(expect.stringContaining('transform.py'), 'get_transform', [output, expect.any(Object)]);
            });
            it('handles complex nested paths', async () => {
                const output = 'hello';
                const context = { vars: { key: 'value' }, prompt: { id: '123' } };
                const mockPath = path.resolve('deeply/nested/path/with spaces/transform.js');
                jest.doMock(mockPath, () => (output) => output.toUpperCase(), {
                    virtual: true,
                });
                const transformFunctionPath = 'file://deeply/nested/path/with spaces/transform.js';
                const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, output, context);
                expect(transformedOutput).toBe('HELLO');
            });
            it('handles paths with special characters', async () => {
                const output = 'hello';
                const context = { vars: { key: 'value' }, prompt: { id: '123' } };
                const mockPath = path.resolve('path/with-hyphens/and_underscores/transform.js');
                jest.doMock(mockPath, () => (output) => output.toUpperCase(), {
                    virtual: true,
                });
                const transformFunctionPath = 'file://path/with-hyphens/and_underscores/transform.js';
                const transformedOutput = await (0, transform_1.transform)(transformFunctionPath, output, context);
                expect(transformedOutput).toBe('HELLO');
            });
        });
    });
});
//# sourceMappingURL=transform.test.js.map