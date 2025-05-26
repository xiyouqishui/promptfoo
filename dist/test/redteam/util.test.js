"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../../src/redteam/util");
describe('removePrefix', () => {
    it('should remove a simple prefix', () => {
        expect((0, util_1.removePrefix)('Prompt: Hello world', 'Prompt')).toBe('Hello world');
    });
    it('should be case insensitive', () => {
        expect((0, util_1.removePrefix)('PROMPT: Hello world', 'prompt')).toBe('Hello world');
    });
    it('should remove asterisks from the prefix', () => {
        expect((0, util_1.removePrefix)('**Prompt:** Hello world', 'Prompt')).toBe('Hello world');
    });
    it('should handle multiple asterisks', () => {
        expect((0, util_1.removePrefix)('***Prompt:*** Hello world', 'Prompt')).toBe('Hello world');
    });
    it('should return the same string if prefix is not found', () => {
        expect((0, util_1.removePrefix)('Hello world', 'Prefix')).toBe('Hello world');
    });
    it('should handle empty strings', () => {
        expect((0, util_1.removePrefix)('', 'Prefix')).toBe('');
    });
    it('should handle prefix that is the entire string', () => {
        expect((0, util_1.removePrefix)('Prompt:', 'Prompt')).toBe('');
    });
});
describe('normalizeApostrophes', () => {
    it('should normalize different types of apostrophes', () => {
        expect((0, util_1.normalizeApostrophes)("I'm")).toBe("I'm");
        expect((0, util_1.normalizeApostrophes)('I′m')).toBe("I'm");
        expect((0, util_1.normalizeApostrophes)("I'm")).toBe("I'm");
        expect((0, util_1.normalizeApostrophes)("I'm")).toBe("I'm");
    });
    it('should handle strings without apostrophes', () => {
        expect((0, util_1.normalizeApostrophes)('Hello world')).toBe('Hello world');
    });
});
describe('isEmptyResponse', () => {
    it('should return true for empty responses', () => {
        expect((0, util_1.isEmptyResponse)('')).toBe(true);
        expect((0, util_1.isEmptyResponse)('   ')).toBe(true);
        expect((0, util_1.isEmptyResponse)('{}')).toBe(true);
        expect((0, util_1.isEmptyResponse)('  {}  ')).toBe(true);
    });
    it('should return false for non-empty responses', () => {
        expect((0, util_1.isEmptyResponse)('Hello')).toBe(false);
        expect((0, util_1.isEmptyResponse)('{"key": "value"}')).toBe(false);
    });
});
describe('isBasicRefusal', () => {
    it('should detect refusal prefixes', () => {
        expect((0, util_1.isBasicRefusal)('I am sorry, I cannot help with that')).toBe(true);
        expect((0, util_1.isBasicRefusal)("I'm not able to assist with this request")).toBe(true);
        expect((0, util_1.isBasicRefusal)('I apologize, but I cannot do that')).toBe(true);
    });
    it('should detect refusal substrings', () => {
        expect((0, util_1.isBasicRefusal)('As an AI language model, I cannot help with that')).toBe(true);
        expect((0, util_1.isBasicRefusal)('I cannot assist with that request')).toBe(true);
        expect((0, util_1.isBasicRefusal)('That would not be appropriate')).toBe(true);
    });
    it('should normalize apostrophes in responses', () => {
        expect((0, util_1.isBasicRefusal)("I′m sorry, I can't help")).toBe(true);
        expect((0, util_1.isBasicRefusal)("I'm unable to assist")).toBe(true);
    });
    it('should handle case insensitivity', () => {
        expect((0, util_1.isBasicRefusal)('I AM SORRY, I CANNOT HELP')).toBe(true);
        expect((0, util_1.isBasicRefusal)('as an ai language model')).toBe(true);
    });
    it('should return false for non-refusal responses', () => {
        expect((0, util_1.isBasicRefusal)('I will help you with that')).toBe(false);
        expect((0, util_1.isBasicRefusal)('Here is the information you requested')).toBe(false);
        expect((0, util_1.isBasicRefusal)('The answer is 42')).toBe(false);
    });
});
//# sourceMappingURL=util.test.js.map