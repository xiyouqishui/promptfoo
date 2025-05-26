"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ngrams_1 = require("../../src/assertions/ngrams");
describe('getNGrams', () => {
    it('should generate unigrams correctly', () => {
        const words = ['hello', 'world', 'how', 'are', 'you'];
        const expected = ['hello', 'world', 'how', 'are', 'you'];
        const result = (0, ngrams_1.getNGrams)(words, 1);
        expect(result).toEqual(expected);
    });
    it('should generate bigrams correctly', () => {
        const words = ['hello', 'world', 'how', 'are', 'you'];
        const expected = ['hello world', 'world how', 'how are', 'are you'];
        const result = (0, ngrams_1.getNGrams)(words, 2);
        expect(result).toEqual(expected);
    });
    it('should generate trigrams correctly', () => {
        const words = ['hello', 'world', 'how', 'are', 'you'];
        const expected = ['hello world how', 'world how are', 'how are you'];
        const result = (0, ngrams_1.getNGrams)(words, 3);
        expect(result).toEqual(expected);
    });
    it('should handle n greater than words length', () => {
        const words = ['hello', 'world'];
        const result = (0, ngrams_1.getNGrams)(words, 3);
        expect(result).toEqual([]);
    });
    it('should handle n equal to words length', () => {
        const words = ['hello', 'world', 'how'];
        const expected = ['hello world how'];
        const result = (0, ngrams_1.getNGrams)(words, 3);
        expect(result).toEqual(expected);
    });
    it('should handle empty words array', () => {
        const words = [];
        const result = (0, ngrams_1.getNGrams)(words, 1);
        expect(result).toEqual([]);
    });
    it('should handle sentence with repeated words', () => {
        const words = ['the', 'cat', 'the', 'cat'];
        const expected = ['the cat', 'cat the', 'the cat'];
        const result = (0, ngrams_1.getNGrams)(words, 2);
        expect(result).toEqual(expected);
    });
    it('should handle single word array', () => {
        const words = ['hello'];
        const result = (0, ngrams_1.getNGrams)(words, 1);
        expect(result).toEqual(['hello']);
    });
    it('should return empty array for n <= 0', () => {
        const words = ['hello', 'world'];
        // TypeScript allows this even though it doesn't make logical sense
        const result = (0, ngrams_1.getNGrams)(words, 0);
        expect(result).toEqual([]);
    });
    it('should work with special characters in words', () => {
        const words = ['hello,', 'world!', 'how?'];
        const expected = ['hello, world!', 'world! how?'];
        const result = (0, ngrams_1.getNGrams)(words, 2);
        expect(result).toEqual(expected);
    });
    it('should maintain word order', () => {
        const words = ['one', 'two', 'three', 'four', 'five'];
        const expected = ['one two three', 'two three four', 'three four five'];
        const result = (0, ngrams_1.getNGrams)(words, 3);
        expect(result).toEqual(expected);
        expect(result).not.toEqual(['three two one', 'four three two', 'five four three']);
    });
});
//# sourceMappingURL=ngrams.test.js.map