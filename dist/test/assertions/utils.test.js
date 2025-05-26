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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../src/assertions/utils");
const cliState_1 = __importDefault(require("../../src/cliState"));
const esm_1 = require("../../src/esm");
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/cliState');
jest.mock('../../src/esm', () => ({
    importModule: jest.fn(),
}));
describe('processFileReference', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        cliState_1.default.basePath = '/base/path';
    });
    it('should handle undefined basePath', () => {
        cliState_1.default.basePath = undefined;
        const jsonContent = JSON.stringify({ key: 'value' });
        jest.mocked(fs.readFileSync).mockReturnValue(jsonContent);
        jest.mocked(path.resolve).mockReturnValue('/test.json');
        jest.mocked(path.extname).mockReturnValue('.json');
        const result = (0, utils_1.processFileReference)('file://test.json');
        expect(result).toEqual({ key: 'value' });
        expect(fs.readFileSync).toHaveBeenCalledWith('/test.json', 'utf8');
    });
    it('should process JSON files correctly', () => {
        const jsonContent = JSON.stringify({ key: 'value' });
        jest.mocked(fs.readFileSync).mockReturnValue(jsonContent);
        jest.mocked(path.resolve).mockReturnValue('/base/path/test.json');
        jest.mocked(path.extname).mockReturnValue('.json');
        const result = (0, utils_1.processFileReference)('file://test.json');
        expect(result).toEqual({ key: 'value' });
        expect(fs.readFileSync).toHaveBeenCalledWith('/base/path/test.json', 'utf8');
    });
    it('should process YAML files correctly', () => {
        const yamlContent = 'key: value';
        jest.mocked(fs.readFileSync).mockReturnValue(yamlContent);
        jest.mocked(path.resolve).mockReturnValue('/base/path/test.yaml');
        jest.mocked(path.extname).mockReturnValue('.yaml');
        const result = (0, utils_1.processFileReference)('file://test.yaml');
        expect(result).toEqual({ key: 'value' });
        expect(fs.readFileSync).toHaveBeenCalledWith('/base/path/test.yaml', 'utf8');
    });
    it('should process YML files correctly', () => {
        const yamlContent = 'key: value';
        jest.mocked(fs.readFileSync).mockReturnValue(yamlContent);
        jest.mocked(path.resolve).mockReturnValue('/base/path/test.yml');
        jest.mocked(path.extname).mockReturnValue('.yml');
        const result = (0, utils_1.processFileReference)('file://test.yml');
        expect(result).toEqual({ key: 'value' });
        expect(fs.readFileSync).toHaveBeenCalledWith('/base/path/test.yml', 'utf8');
    });
    it('should process TXT files correctly', () => {
        const txtContent = 'plain text content\n';
        jest.mocked(fs.readFileSync).mockReturnValue(txtContent);
        jest.mocked(path.resolve).mockReturnValue('/base/path/test.txt');
        jest.mocked(path.extname).mockReturnValue('.txt');
        const result = (0, utils_1.processFileReference)('file://test.txt');
        expect(result).toBe('plain text content');
        expect(fs.readFileSync).toHaveBeenCalledWith('/base/path/test.txt', 'utf8');
    });
    it('should throw an error for unsupported file types', () => {
        jest.mocked(path.resolve).mockReturnValue('/base/path/test.unsupported');
        jest.mocked(path.extname).mockReturnValue('.unsupported');
        expect(() => (0, utils_1.processFileReference)('file://test.unsupported')).toThrow('Unsupported file type');
    });
});
describe('coerceString', () => {
    it('should return string as is when input is a string', () => {
        const input = 'hello world';
        expect((0, utils_1.coerceString)(input)).toBe(input);
    });
    it('should convert object to JSON string', () => {
        const input = { key: 'value', nested: { foo: 'bar' } };
        expect((0, utils_1.coerceString)(input)).toBe(JSON.stringify(input));
    });
    it('should convert array to JSON string', () => {
        const input = [1, 2, { key: 'value' }];
        expect((0, utils_1.coerceString)(input)).toBe(JSON.stringify(input));
    });
    it('should handle empty object', () => {
        const input = {};
        expect((0, utils_1.coerceString)(input)).toBe('{}');
    });
});
describe('getFinalTest', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const createMockProvider = (id) => ({
        id: () => id,
        callApi: jest.fn(),
    });
    it('should correctly merge test and assertion data', () => {
        const mockApiProvider = createMockProvider('mockProvider');
        const testCase = {
            vars: { var1: 'value1' },
            options: {
                provider: createMockProvider('testProvider'),
            },
        };
        const assertion = {
            type: 'equals',
            value: 'expected value',
            provider: mockApiProvider,
            rubricPrompt: 'custom rubric prompt',
        };
        const result = (0, utils_1.getFinalTest)(testCase, assertion);
        expect(Object.isFrozen(result)).toBe(true);
        expect(result.options?.provider).toBe(mockApiProvider);
        expect(result.options?.rubricPrompt).toBe('custom rubric prompt');
        expect(result.vars).toEqual({ var1: 'value1' });
    });
    it('should use test provider when assertion provider is not provided', () => {
        const testProvider = createMockProvider('testProvider');
        const testCase = {
            options: {
                provider: testProvider,
            },
        };
        const assertion = {
            type: 'equals',
            value: 'expected value',
        };
        const result = (0, utils_1.getFinalTest)(testCase, assertion);
        expect(result.options?.provider).toBe(testProvider);
    });
    it('should handle test with direct provider property', () => {
        const testProvider = createMockProvider('testProvider');
        const assertionProvider = createMockProvider('assertionProvider');
        const testCase = {
            provider: testProvider,
        };
        const assertion = {
            type: 'equals',
            value: 'expected value',
            provider: assertionProvider,
        };
        const result = (0, utils_1.getFinalTest)(testCase, assertion);
        expect(result.provider).toBe(testProvider);
        expect(result.options?.provider).toBe(assertionProvider);
    });
    it('should handle undefined providers correctly', () => {
        const testCase = {
            vars: { test: 'value' },
            options: {},
        };
        const assertion = {
            type: 'equals',
            value: 'expected value',
        };
        const result = (0, utils_1.getFinalTest)(testCase, assertion);
        expect(result.options?.provider).toBeUndefined();
        expect(result.provider).toBeUndefined();
    });
    it('should handle both provider in options and direct provider', () => {
        const optionsProvider = createMockProvider('optionsProvider');
        const directProvider = createMockProvider('directProvider');
        const assertionProvider = createMockProvider('assertionProvider');
        const testCase = {
            provider: directProvider,
            options: {
                provider: optionsProvider,
            },
        };
        const assertion = {
            type: 'equals',
            value: 'expected value',
            provider: assertionProvider,
        };
        const result = (0, utils_1.getFinalTest)(testCase, assertion);
        expect(result.provider).toBe(directProvider);
        expect(result.options?.provider).toBe(assertionProvider);
    });
});
describe('loadFromJavaScriptFile', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should call named function when functionName is provided', async () => {
        const mockFn = jest.fn().mockReturnValue('result');
        jest.mocked(esm_1.importModule).mockResolvedValue({ testFn: mockFn });
        const result = await (0, utils_1.loadFromJavaScriptFile)('/test.js', 'testFn', ['arg1', 'arg2']);
        expect(result).toBe('result');
        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
    it('should call default function when no functionName provided', async () => {
        const mockFn = jest.fn().mockReturnValue('result');
        jest.mocked(esm_1.importModule).mockResolvedValue(mockFn);
        const result = await (0, utils_1.loadFromJavaScriptFile)('/test.js', undefined, ['arg1']);
        expect(result).toBe('result');
        expect(mockFn).toHaveBeenCalledWith('arg1');
    });
    it('should call default export function when available', async () => {
        const mockFn = jest.fn().mockReturnValue('result');
        jest.mocked(esm_1.importModule).mockResolvedValue({ default: mockFn });
        const result = await (0, utils_1.loadFromJavaScriptFile)('/test.js', undefined, ['arg1']);
        expect(result).toBe('result');
        expect(mockFn).toHaveBeenCalledWith('arg1');
    });
    it('should throw error when module does not export a function', async () => {
        jest.mocked(esm_1.importModule).mockResolvedValue({ notAFunction: 'value' });
        await expect((0, utils_1.loadFromJavaScriptFile)('/test.js', undefined, [])).rejects.toThrow('Assertion malformed');
    });
    it('should throw error when named function does not exist', async () => {
        jest.mocked(esm_1.importModule).mockResolvedValue({ otherFn: () => { } });
        await expect((0, utils_1.loadFromJavaScriptFile)('/test.js', 'nonExistentFn', [])).rejects.toThrow('Assertion malformed');
    });
});
//# sourceMappingURL=utils.test.js.map