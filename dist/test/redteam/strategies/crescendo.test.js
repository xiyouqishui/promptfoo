"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crescendo_1 = require("../../../src/redteam/strategies/crescendo");
describe('addCrescendo', () => {
    it('should add crescendo configuration to test cases', () => {
        const testCases = [
            {
                description: 'Test case 1',
                vars: { input: 'test input' },
                assert: [
                    {
                        type: 'contains',
                        metric: 'exactMatch',
                        value: 'expected output',
                    },
                ],
            },
        ];
        const injectVar = 'injectedVar';
        const config = { someConfig: 'value' };
        const result = (0, crescendo_1.addCrescendo)(testCases, injectVar, config);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            description: 'Test case 1',
            vars: { input: 'test input' },
            provider: {
                id: 'promptfoo:redteam:crescendo',
                config: {
                    injectVar: 'injectedVar',
                    someConfig: 'value',
                },
            },
            metadata: {
                strategyId: 'crescendo',
            },
            assert: [
                {
                    type: 'contains',
                    metric: 'exactMatch/Crescendo',
                    value: 'expected output',
                },
            ],
        });
    });
    it('should handle test cases without assertions', () => {
        const testCases = [
            {
                description: 'Test case without assertions',
                vars: { input: 'test input' },
            },
        ];
        const result = (0, crescendo_1.addCrescendo)(testCases, 'inject', {});
        expect(result).toHaveLength(1);
        expect(result[0].assert).toBeUndefined();
        expect(result[0].provider).toEqual({
            id: 'promptfoo:redteam:crescendo',
            config: {
                injectVar: 'inject',
            },
        });
        expect(result[0].metadata).toEqual({
            strategyId: 'crescendo',
        });
    });
    it('should handle empty test cases array', () => {
        const result = (0, crescendo_1.addCrescendo)([], 'inject', {});
        expect(result).toEqual([]);
    });
    it('should preserve other test case properties', () => {
        const testCases = [
            {
                description: 'Test case',
                vars: { input: 'test' },
                provider: { id: 'original-provider' },
                assert: [{ type: 'contains', metric: 'test', value: 'value' }],
                otherProp: 'should be preserved',
            },
        ];
        const result = (0, crescendo_1.addCrescendo)(testCases, 'inject', {});
        expect(result[0]).toMatchObject({
            description: 'Test case',
            vars: { input: 'test' },
            otherProp: 'should be preserved',
            provider: {
                id: 'promptfoo:redteam:crescendo',
                config: {
                    injectVar: 'inject',
                },
            },
            metadata: {
                strategyId: 'crescendo',
            },
        });
    });
});
//# sourceMappingURL=crescendo.test.js.map