"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../src/prompts/utils");
jest.mock('fs', () => ({
    statSync: jest.fn(jest.requireActual('fs').statSync),
}));
jest.mock('glob', () => ({
    globSync: jest.fn(jest.requireActual('glob').globSync),
}));
describe('maybeFilePath', () => {
    it('should return true for valid file paths', () => {
        expect((0, utils_1.maybeFilePath)('C:\\path\\to\\file.txt')).toBe(true);
        expect((0, utils_1.maybeFilePath)('file.*')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.ext')).toBe(true);
        expect((0, utils_1.maybeFilePath)('path/to/file.txt')).toBe(true);
    });
    it('should return false for strings with new lines', () => {
        expect((0, utils_1.maybeFilePath)('path/to\nfile.txt')).toBe(false);
        expect((0, utils_1.maybeFilePath)('file\nname.ext')).toBe(false);
    });
    it('should return false for strings with "portkey://"', () => {
        expect((0, utils_1.maybeFilePath)('portkey://path/to/file')).toBe(false);
    });
    it('should return false for strings with "langfuse://"', () => {
        expect((0, utils_1.maybeFilePath)('langfuse://path/to/file')).toBe(false);
    });
    it('should return false for strings with "helicone://"', () => {
        expect((0, utils_1.maybeFilePath)('helicone://path/to/file')).toBe(false);
    });
    it('should return false for strings without file path indicators', () => {
        expect((0, utils_1.maybeFilePath)('anotherstring')).toBe(false);
        expect((0, utils_1.maybeFilePath)('justastring')).toBe(false);
        expect((0, utils_1.maybeFilePath)('stringwith.dotbutnotfile')).toBe(false);
    });
    it('should return true for strings with file:// prefix', () => {
        expect((0, utils_1.maybeFilePath)('file://path/to/file.txt')).toBe(true);
    });
    it('should return true for strings with wildcard character', () => {
        expect((0, utils_1.maybeFilePath)('*.txt')).toBe(true);
        expect((0, utils_1.maybeFilePath)('path/to/*.txt')).toBe(true);
    });
    it('should return true for strings with file extension at the third or fourth last position', () => {
        expect((0, utils_1.maybeFilePath)('file.ext')).toBe(true);
        expect((0, utils_1.maybeFilePath)('file.name.ext')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.e')).toBe(false);
        expect((0, utils_1.maybeFilePath)('filename.ex')).toBe(true);
    });
    it('should work for files that end with specific allowed extensions', () => {
        expect((0, utils_1.maybeFilePath)('filename.cjs')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.js')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.js:functionName')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.j2')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.json')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.jsonl')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.mjs')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.py')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.py:functionName')).toBe(true);
        expect((0, utils_1.maybeFilePath)('filename.txt')).toBe(true);
    });
    // Additional tests
    it('should return false for empty strings', () => {
        expect((0, utils_1.maybeFilePath)('')).toBe(false);
    });
    it('should return false for whitespace strings', () => {
        expect((0, utils_1.maybeFilePath)('   ')).toBe(false);
        expect((0, utils_1.maybeFilePath)('\t')).toBe(false);
    });
    it('should return false for non-string inputs', () => {
        expect(() => (0, utils_1.maybeFilePath)(123)).toThrow('Invalid input: 123');
        expect(() => (0, utils_1.maybeFilePath)({})).toThrow('Invalid input: {}');
        expect(() => (0, utils_1.maybeFilePath)([])).toThrow('Invalid input: []');
    });
    it('should return false for strings with invalid and valid indicators mixed', () => {
        expect((0, utils_1.maybeFilePath)('file://path/to\nfile.txt')).toBe(false);
        expect((0, utils_1.maybeFilePath)('path/to/file.txtportkey://')).toBe(false);
    });
    it('should return true for very long valid file paths', () => {
        const longPath = `${'a/'.repeat(100)}file.txt`;
        expect((0, utils_1.maybeFilePath)(longPath)).toBe(true);
    });
    it('should return false for very long invalid file paths', () => {
        const longInvalidPath = `${'a/'.repeat(100)}file\n.txt`;
        expect((0, utils_1.maybeFilePath)(longInvalidPath)).toBe(false);
    });
    it('should return false for strings ending with a dot', () => {
        expect((0, utils_1.maybeFilePath)('Write a tweet about {{topic}}.')).toBe(false);
    });
    it('should recognize Jinja2 template files', () => {
        expect((0, utils_1.maybeFilePath)('template.j2')).toBe(true);
        expect((0, utils_1.maybeFilePath)('path/to/template.j2')).toBe(true);
        expect((0, utils_1.maybeFilePath)('file://path/to/template.j2')).toBe(true);
        expect((0, utils_1.maybeFilePath)('*.j2')).toBe(true);
        expect((0, utils_1.maybeFilePath)('path/to/*.j2')).toBe(true);
        expect((0, utils_1.maybeFilePath)('template.j2:functionName')).toBe(true);
    });
    it('should return false for prompt strings resembling Jinja2 syntax', () => {
        expect((0, utils_1.maybeFilePath)('Hello {{ name }}! How are you?')).toBe(false);
        expect((0, utils_1.maybeFilePath)('{% if condition %}Content{% endif %}')).toBe(false);
        expect((0, utils_1.maybeFilePath)('{{ variable | filter }}')).toBe(false);
        expect((0, utils_1.maybeFilePath)('Text with {{ variable.attribute }} in it.')).toBe(false);
    });
});
describe('normalizeInput', () => {
    it('rejects invalid input types', () => {
        expect(() => (0, utils_1.normalizeInput)(null)).toThrow('Invalid input prompt: null');
        expect(() => (0, utils_1.normalizeInput)(undefined)).toThrow('Invalid input prompt: undefined');
        expect(() => (0, utils_1.normalizeInput)(1)).toThrow('Invalid input prompt: 1');
        expect(() => (0, utils_1.normalizeInput)(true)).toThrow('Invalid input prompt: true');
        expect(() => (0, utils_1.normalizeInput)(false)).toThrow('Invalid input prompt: false');
    });
    it('rejects empty inputs', () => {
        expect(() => (0, utils_1.normalizeInput)([])).toThrow('Invalid input prompt: []');
        expect(() => (0, utils_1.normalizeInput)({})).toThrow('Invalid input prompt: {}');
        expect(() => (0, utils_1.normalizeInput)('')).toThrow('Invalid input prompt: ""');
    });
    it('returns array with single string when input is a non-empty string', () => {
        expect((0, utils_1.normalizeInput)('valid string')).toEqual([{ raw: 'valid string' }]);
    });
    it('returns input array when input is a non-empty array', () => {
        const inputArray = ['prompt1', { raw: 'prompt2' }];
        expect((0, utils_1.normalizeInput)(inputArray)).toEqual([{ raw: 'prompt1' }, { raw: 'prompt2' }]);
    });
    // NOTE: Legacy mode. This is deprecated and will be removed in a future version.
    it('returns array of prompts when input is an object', () => {
        const inputObject = {
            'prompts1.txt': 'label A',
            'prompts2.txt': 'label B',
        };
        expect((0, utils_1.normalizeInput)(inputObject)).toEqual([
            {
                label: 'label A',
                raw: 'prompts1.txt',
            },
            {
                label: 'label B',
                raw: 'prompts2.txt',
            },
        ]);
    });
});
//# sourceMappingURL=utils.test.js.map