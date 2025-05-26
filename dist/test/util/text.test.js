"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const text_1 = require("../../src/util/text");
describe('ellipsize', () => {
    it('should not modify string shorter than maxLen', () => {
        const str = 'hello';
        expect((0, text_1.ellipsize)(str, 10)).toBe('hello');
    });
    it('should truncate string and add ellipsis when longer than maxLen', () => {
        const str = 'hello world';
        expect((0, text_1.ellipsize)(str, 8)).toBe('hello...');
    });
    it('should handle string equal to maxLen', () => {
        const str = 'hello';
        expect((0, text_1.ellipsize)(str, 5)).toBe('hello');
    });
    it('should handle very short maxLen', () => {
        const str = 'hello';
        expect((0, text_1.ellipsize)(str, 4)).toBe('h...');
    });
    it('should handle empty string', () => {
        expect((0, text_1.ellipsize)('', 5)).toBe('');
    });
});
//# sourceMappingURL=text.test.js.map