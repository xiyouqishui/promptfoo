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
const fs = __importStar(require("fs"));
const jinja_1 = require("../../../src/prompts/processors/jinja");
jest.mock('fs');
describe('processJinjaFile', () => {
    const mockReadFileSync = jest.mocked(fs.readFileSync);
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should process a Jinja2 file without a label', () => {
        const filePath = 'template.j2';
        const fileContent = 'You are a helpful assistant for Promptfoo.\nPlease answer the following question about {{ topic }}: {{ question }}';
        mockReadFileSync.mockReturnValue(fileContent);
        const result = (0, jinja_1.processJinjaFile)(filePath, {});
        expect(result).toEqual([
            {
                raw: fileContent,
                label: `${filePath}: ${fileContent.slice(0, 50)}...`,
                config: undefined,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
    it('should process a Jinja2 file with a label', () => {
        const filePath = 'template.j2';
        const fileContent = 'You are a helpful assistant for Promptfoo.\nPlease answer the following question about {{ topic }}: {{ question }}';
        mockReadFileSync.mockReturnValue(fileContent);
        const result = (0, jinja_1.processJinjaFile)(filePath, { label: 'Custom Label' });
        expect(result).toEqual([
            {
                raw: fileContent,
                label: 'Custom Label',
                config: undefined,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
    it('should include config when provided', () => {
        const filePath = 'template.j2';
        const fileContent = 'You are a helpful assistant for Promptfoo.\nPlease answer the following question about {{ topic }}: {{ question }}';
        const config = { temperature: 0.7, max_tokens: 150 };
        mockReadFileSync.mockReturnValue(fileContent);
        const result = (0, jinja_1.processJinjaFile)(filePath, { config });
        expect(result).toEqual([
            {
                raw: fileContent,
                label: `${filePath}: ${fileContent.slice(0, 50)}...`,
                config,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
    it('should throw an error if the file cannot be read', () => {
        const filePath = 'nonexistent.j2';
        mockReadFileSync.mockImplementation(() => {
            throw new Error('File not found');
        });
        expect(() => (0, jinja_1.processJinjaFile)(filePath, {})).toThrow('File not found');
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
    it('should handle variable interpolation syntax properly', () => {
        const filePath = 'complex.j2';
        const fileContent = `
    {% if condition %}
      Handle {{ variable1 }} with condition
    {% else %}
      Handle {{ variable2 }} without condition
    {% endif %}
    `;
        mockReadFileSync.mockReturnValue(fileContent);
        const result = (0, jinja_1.processJinjaFile)(filePath, {});
        expect(result).toEqual([
            {
                raw: fileContent,
                label: `${filePath}: ${fileContent.slice(0, 50)}...`,
                config: undefined,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
});
//# sourceMappingURL=jinja.test.js.map