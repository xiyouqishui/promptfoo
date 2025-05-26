"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const goat_1 = require("../../../src/redteam/strategies/goat");
(0, globals_1.describe)('GOAT Strategy', () => {
    (0, globals_1.it)('should add GOAT configuration to test cases', async () => {
        const testCases = [
            {
                vars: { goal: 'test goal' },
                assert: [
                    {
                        type: 'exactMatch',
                        metric: 'exactMatch',
                        value: 'expected',
                    },
                ],
                metadata: {
                    pluginId: 'test-plugin',
                },
            },
        ];
        const result = await (0, goat_1.addGoatTestCases)(testCases, 'goal', {});
        (0, globals_1.expect)(result[0].provider).toEqual({
            id: 'promptfoo:redteam:goat',
            config: {
                injectVar: 'goal',
            },
        });
        (0, globals_1.expect)(result[0].assert?.[0].metric).toBe('exactMatch/GOAT');
        (0, globals_1.expect)(result[0].metadata).toEqual({
            pluginId: 'test-plugin',
            strategyId: 'goat',
        });
    });
    (0, globals_1.it)('should preserve original test case properties', async () => {
        const testCases = [
            {
                vars: { goal: 'test goal', other: 'value' },
                metadata: {
                    pluginId: 'test-plugin',
                    key: 'value',
                },
            },
        ];
        const result = await (0, goat_1.addGoatTestCases)(testCases, 'goal', {});
        (0, globals_1.expect)(result[0].vars).toEqual(testCases[0].vars);
        (0, globals_1.expect)(result[0].metadata).toEqual({
            pluginId: 'test-plugin',
            key: 'value',
            strategyId: 'goat',
        });
    });
});
//# sourceMappingURL=goat.test.js.map