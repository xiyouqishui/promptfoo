"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const leetspeak_1 = require("../../../src/redteam/strategies/leetspeak");
describe('addLeetspeak', () => {
    const mockTestCases = [
        {
            vars: { query: 'Hello, world!' },
            assert: [{ type: 'equals', value: 'Expected output', metric: 'Harmful' }],
        },
        {
            vars: { userInput: 'Test input' },
            assert: [{ type: 'contains', value: 'test', metric: 'DebugAccess' }],
        },
    ];
    it('should convert the inject variable to leetspeak', () => {
        const result = (0, leetspeak_1.addLeetspeak)(mockTestCases, 'query');
        expect(result[0].vars?.query).toBe('H3110, w0r1d!');
        expect(result[0].metadata).toEqual({
            strategyId: 'leetspeak',
        });
    });
    it('should handle uppercase and lowercase letters', () => {
        const testCase = {
            vars: { text: 'HELLO hello' },
            assert: [{ type: 'equals', value: 'Test', metric: 'Test' }],
        };
        const result = (0, leetspeak_1.addLeetspeak)([testCase], 'text');
        expect(result[0].vars?.text).toBe('H3110 h3110');
    });
});
//# sourceMappingURL=leetspeak.test.js.map