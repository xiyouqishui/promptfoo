"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base64_1 = require("../../../src/redteam/strategies/base64");
describe('addBase64Encoding', () => {
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
    it('should encode the inject variable to base64', () => {
        const result = (0, base64_1.addBase64Encoding)(mockTestCases, 'query');
        expect(result[0].vars?.query).toBe('SGVsbG8sIHdvcmxkIQ==');
        expect(result[0].metadata).toEqual({
            strategyId: 'base64',
        });
    });
});
//# sourceMappingURL=base64.test.js.map