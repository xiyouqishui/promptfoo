"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homoglyph_1 = require("../../../src/redteam/strategies/homoglyph");
describe('homoglyph strategy', () => {
    const testCases = [
        {
            vars: {
                prompt: 'Hello World! 123',
                expected: 'normal value',
            },
            assert: [
                {
                    type: 'equals',
                    value: 'expected value',
                    metric: 'original-metric',
                },
            ],
        },
    ];
    afterEach(() => {
        jest.resetAllMocks();
    });
    describe('toHomoglyphs', () => {
        it('should convert lowercase letters', () => {
            expect((0, homoglyph_1.toHomoglyphs)('abcdefghijklmnopqrstuvwxyz')).not.toBe('abcdefghijklmnopqrstuvwxyz');
            expect((0, homoglyph_1.toHomoglyphs)('a')).toBe(homoglyph_1.homoglyphMap['a']);
            expect((0, homoglyph_1.toHomoglyphs)('z')).toBe(homoglyph_1.homoglyphMap['z']);
        });
        it('should convert uppercase letters', () => {
            expect((0, homoglyph_1.toHomoglyphs)('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).not.toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
            expect((0, homoglyph_1.toHomoglyphs)('A')).toBe(homoglyph_1.homoglyphMap['A']);
            expect((0, homoglyph_1.toHomoglyphs)('Z')).toBe(homoglyph_1.homoglyphMap['Z']);
        });
        it('should convert numbers', () => {
            expect((0, homoglyph_1.toHomoglyphs)('0123456789')).not.toBe('0123456789');
            expect((0, homoglyph_1.toHomoglyphs)('0')).toBe(homoglyph_1.homoglyphMap['0']);
            expect((0, homoglyph_1.toHomoglyphs)('9')).toBe(homoglyph_1.homoglyphMap['9']);
        });
        it('should handle empty strings', () => {
            expect((0, homoglyph_1.toHomoglyphs)('')).toBe('');
        });
        it('should preserve unmapped characters', () => {
            expect((0, homoglyph_1.toHomoglyphs)('!@#$%^&*()')).toBe('!@#$%^&*()');
            expect((0, homoglyph_1.toHomoglyphs)(' ')).toBe(' ');
        });
        it('should handle mixed content', () => {
            const input = 'Hello123!@#';
            const output = (0, homoglyph_1.toHomoglyphs)(input);
            expect(output).not.toBe(input);
            // Note: Length check removed since homoglyphs may have different UTF-16 lengths
            expect(output).toBeTruthy();
        });
        it('should handle all mapped characters', () => {
            // Test each mapped character individually rather than all at once
            Object.keys(homoglyph_1.homoglyphMap).forEach((char) => {
                const result = (0, homoglyph_1.toHomoglyphs)(char);
                expect(result).toBe(homoglyph_1.homoglyphMap[char]);
            });
        });
        it('should handle non-ASCII characters not in the map', () => {
            const nonAsciiChars = '☺★♥♦♣♠€£¥©®™';
            expect((0, homoglyph_1.toHomoglyphs)(nonAsciiChars)).toBe(nonAsciiChars);
        });
    });
    describe('addHomoglyphs', () => {
        it('should convert text to homoglyphs', () => {
            const injectVar = 'prompt';
            const result = (0, homoglyph_1.addHomoglyphs)(testCases, injectVar);
            expect(result).toEqual([
                {
                    ...testCases[0],
                    vars: {
                        ...testCases[0].vars,
                        prompt: expect.not.stringMatching(/^Hello World! 123$/),
                    },
                    metadata: {
                        strategyId: 'homoglyph',
                    },
                    assert: [
                        {
                            type: 'equals',
                            value: 'expected value',
                            metric: 'original-metric/Homoglyph',
                        },
                    ],
                },
            ]);
        });
        it('should handle undefined vars', () => {
            const testCase = { vars: {} };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].vars.prompt).toBe((0, homoglyph_1.toHomoglyphs)('undefined'));
        });
        it('should handle missing inject var', () => {
            const testCase = { vars: { other: 'value' } };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].vars.prompt).toBe((0, homoglyph_1.toHomoglyphs)('undefined'));
            expect(result[0].vars.other).toBe('value');
        });
        it('should handle very long strings', () => {
            const longString = 'a'.repeat(1000);
            const testCase = { vars: { prompt: longString } };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].vars.prompt).not.toBe(longString);
            expect(result[0].vars.prompt).toBe(homoglyph_1.homoglyphMap['a'].repeat(1000));
        });
        it('should handle special characters', () => {
            const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
            const testCase = { vars: { prompt: specialChars } };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].vars.prompt).toBe(specialChars);
        });
        it('should handle null input by converting to string', () => {
            const testCase = { vars: { prompt: null } };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].vars.prompt).toBe((0, homoglyph_1.toHomoglyphs)('null'));
        });
        it('should handle numeric input by converting to string', () => {
            const testCase = { vars: { prompt: 12345 } };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].vars.prompt).toBe((0, homoglyph_1.toHomoglyphs)('12345'));
        });
        it('should preserve assertion objects', () => {
            const testCase = {
                vars: { prompt: 'test' },
                assert: [
                    { type: 'equals', value: 'expected', metric: 'metric1' },
                    { type: 'contains', value: 'partial', metric: 'metric2' },
                ],
            };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].assert).toEqual([
                { type: 'equals', value: 'expected', metric: 'metric1/Homoglyph' },
                { type: 'contains', value: 'partial', metric: 'metric2/Homoglyph' },
            ]);
        });
        it('should handle test cases with no assertions', () => {
            const testCase = { vars: { prompt: 'test' } };
            const result = (0, homoglyph_1.addHomoglyphs)([testCase], 'prompt');
            expect(result[0].assert).toBeUndefined();
        });
    });
});
//# sourceMappingURL=homoglyph.test.js.map