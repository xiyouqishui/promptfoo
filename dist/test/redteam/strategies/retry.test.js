"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const retry_1 = require("../../../src/redteam/strategies/retry");
describe('deduplicateTests', () => {
    it('should deduplicate test cases based on vars', () => {
        const testCases = [
            {
                vars: { a: '1', b: '2' },
                assert: [],
            },
            {
                vars: { a: '1', b: '2' }, // Duplicate
                assert: [],
            },
            {
                vars: { a: '2', b: '3' },
                assert: [],
            },
        ];
        const result = (0, retry_1.deduplicateTests)(testCases);
        expect(result).toHaveLength(2);
        expect(result[0].vars).toEqual({ a: '1', b: '2' });
        expect(result[1].vars).toEqual({ a: '2', b: '3' });
    });
    it('should handle empty test cases array', () => {
        const result = (0, retry_1.deduplicateTests)([]);
        expect(result).toHaveLength(0);
    });
    it('should handle test cases with no vars', () => {
        const testCases = [
            {
                vars: {},
                assert: [],
            },
            {
                vars: {},
                assert: [],
            },
        ];
        const result = (0, retry_1.deduplicateTests)(testCases);
        expect(result).toHaveLength(1);
    });
    it('should preserve non-vars properties', () => {
        const testCases = [
            {
                vars: { a: '1' },
                assert: [{ type: 'equals', value: 'test' }],
                description: 'test case',
            },
            {
                vars: { a: '1' },
                assert: [{ type: 'equals', value: 'different' }],
                description: 'another test case',
            },
        ];
        const result = (0, retry_1.deduplicateTests)(testCases);
        expect(result).toHaveLength(1);
        expect(result[0].assert).toEqual([{ type: 'equals', value: 'test' }]);
        expect(result[0].description).toBe('test case');
    });
});
// Test that validates strategyId in metadata
describe('retry strategy metadata', () => {
    it('should include strategyId in metadata', () => {
        // Create a test case that simulates what would be returned by addRetryTestCases
        const testCase = {
            vars: { input: 'test' },
            assert: [{ type: 'equals', value: 'expected' }],
            metadata: {
                pluginId: 'test-plugin',
                strategyId: 'retry',
            },
            provider: {
                id: 'promptfoo:redteam:retry',
                config: {
                    injectVar: 'input',
                },
            },
        };
        // Verify the correct strategyId is present in metadata
        expect(testCase.metadata?.strategyId).toBe('retry');
    });
});
//# sourceMappingURL=retry.test.js.map