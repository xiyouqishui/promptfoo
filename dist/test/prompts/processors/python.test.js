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
const dedent_1 = __importDefault(require("dedent"));
const fs = __importStar(require("fs"));
const python_1 = require("../../../src/prompts/processors/python");
jest.mock('fs');
jest.mock('../../../src/prompts/processors/python', () => {
    const actual = jest.requireActual('../../../src/prompts/processors/python');
    return {
        ...actual,
        pythonPromptFunction: jest.fn(),
        pythonPromptFunctionLegacy: jest.fn(),
    };
});
describe('processPythonFile', () => {
    const mockReadFileSync = jest.mocked(fs.readFileSync);
    it('should process a valid Python file without a function name or label', () => {
        const filePath = 'file.py';
        const fileContent = 'print("Hello, world!")';
        mockReadFileSync.mockReturnValue(fileContent);
        jest.mocked(python_1.pythonPromptFunctionLegacy).mockResolvedValueOnce('mocked result');
        expect((0, python_1.processPythonFile)(filePath, {}, undefined)).toEqual([
            {
                function: expect.any(Function),
                label: `${filePath}: ${fileContent}`,
                raw: fileContent,
            },
        ]);
    });
    it('should process a valid Python file with a function name without a label', () => {
        const filePath = 'file.py';
        const fileContent = (0, dedent_1.default) `
    def testFunction(context):
      print("Hello, world!")`;
        mockReadFileSync.mockReturnValue(fileContent);
        jest.mocked(python_1.pythonPromptFunction).mockResolvedValueOnce('mocked result');
        expect((0, python_1.processPythonFile)(filePath, {}, 'testFunction')).toEqual([
            {
                function: expect.any(Function),
                raw: fileContent,
                label: `file.py:testFunction`,
            },
        ]);
    });
    it('should process a valid Python file with a label without a function name', () => {
        const filePath = 'file.py';
        const fileContent = 'print("Hello, world!")';
        mockReadFileSync.mockReturnValue(fileContent);
        jest.mocked(python_1.pythonPromptFunctionLegacy).mockResolvedValueOnce('mocked result');
        expect((0, python_1.processPythonFile)(filePath, { label: 'Label' }, undefined)).toEqual([
            {
                function: expect.any(Function),
                label: `Label`,
                raw: fileContent,
            },
        ]);
    });
    it('should process a valid Python file with a label and function name', () => {
        const filePath = 'file.py';
        const fileContent = (0, dedent_1.default) `
    def testFunction(context):
      print("Hello, world!")`;
        mockReadFileSync.mockReturnValue(fileContent);
        jest.mocked(python_1.pythonPromptFunction).mockResolvedValueOnce('mocked result');
        expect((0, python_1.processPythonFile)(filePath, { label: 'Label' }, 'testFunction')).toEqual([
            {
                function: expect.any(Function),
                label: `Label`,
                raw: fileContent,
            },
        ]);
    });
    it('should process a valid Python file with config', () => {
        const filePath = 'file.py';
        const fileContent = 'print("Hello, world!")';
        mockReadFileSync.mockReturnValue(fileContent);
        jest.mocked(python_1.pythonPromptFunctionLegacy).mockResolvedValueOnce('mocked result');
        const config = { key: 'value' };
        expect((0, python_1.processPythonFile)(filePath, { config }, undefined)).toEqual([
            {
                function: expect.any(Function),
                label: `${filePath}: ${fileContent}`,
                raw: fileContent,
                config: { key: 'value' },
            },
        ]);
    });
});
//# sourceMappingURL=python.test.js.map