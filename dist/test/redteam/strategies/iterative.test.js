"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const iterative_1 = require("../../../src/redteam/strategies/iterative");
describe('addIterativeJailbreaks', () => {
    const mockTestCases = [
        {
            assert: [
                {
                    type: 'contains-all', // Add required type field
                    metric: 'test-metric',
                    value: 'test-value',
                },
            ],
            metadata: {
                existingKey: 'existingValue',
            },
        },
    ];
    it('should transform test cases correctly for iterative strategy', () => {
        const result = (0, iterative_1.addIterativeJailbreaks)(mockTestCases, 'testVar', 'iterative', {
            configKey: 'configValue',
        });
        expect(result[0]).toEqual({
            ...mockTestCases[0],
            provider: {
                id: 'promptfoo:redteam:iterative',
                config: {
                    injectVar: 'testVar',
                    configKey: 'configValue',
                },
            },
            assert: [
                {
                    type: 'contains-all',
                    metric: 'test-metric/Iterative',
                    value: 'test-value',
                },
            ],
            metadata: {
                existingKey: 'existingValue',
                strategyId: 'jailbreak',
            },
        });
    });
    it('should transform test cases correctly for iterative:tree strategy', () => {
        const result = (0, iterative_1.addIterativeJailbreaks)(mockTestCases, 'testVar', 'iterative:tree', {
            configKey: 'configValue',
        });
        expect(result[0]).toEqual({
            ...mockTestCases[0],
            provider: {
                id: 'promptfoo:redteam:iterative:tree',
                config: {
                    injectVar: 'testVar',
                    configKey: 'configValue',
                },
            },
            assert: [
                {
                    type: 'contains-all',
                    metric: 'test-metric/IterativeTree',
                    value: 'test-value',
                },
            ],
            metadata: {
                existingKey: 'existingValue',
                strategyId: 'jailbreak:tree',
            },
        });
    });
    it('should handle test cases without assertions', () => {
        const testCasesWithoutAssert = [
            {
                metadata: {
                    existingKey: 'existingValue',
                },
            },
        ];
        const result = (0, iterative_1.addIterativeJailbreaks)(testCasesWithoutAssert, 'testVar', 'iterative', {});
        expect(result[0]).toEqual({
            ...testCasesWithoutAssert[0],
            provider: {
                id: 'promptfoo:redteam:iterative',
                config: {
                    injectVar: 'testVar',
                },
            },
            assert: undefined,
            metadata: {
                existingKey: 'existingValue',
                strategyId: 'jailbreak',
            },
        });
    });
    it('should handle test cases without metadata', () => {
        const testCasesWithoutMetadata = [
            {
                assert: [
                    {
                        type: 'contains-all',
                        metric: 'test-metric',
                        value: 'test-value',
                    },
                ],
            },
        ];
        const result = (0, iterative_1.addIterativeJailbreaks)(testCasesWithoutMetadata, 'testVar', 'iterative', {});
        expect(result[0]).toEqual({
            ...testCasesWithoutMetadata[0],
            provider: {
                id: 'promptfoo:redteam:iterative',
                config: {
                    injectVar: 'testVar',
                },
            },
            assert: [
                {
                    type: 'contains-all',
                    metric: 'test-metric/Iterative',
                    value: 'test-value',
                },
            ],
            metadata: {
                strategyId: 'jailbreak',
            },
        });
    });
    it('should use default iterative strategy when not specified', () => {
        const result = (0, iterative_1.addIterativeJailbreaks)(mockTestCases, 'testVar', 'iterative', {});
        expect(result[0]).toEqual({
            ...mockTestCases[0],
            provider: {
                id: 'promptfoo:redteam:iterative',
                config: {
                    injectVar: 'testVar',
                },
            },
            assert: [
                {
                    type: 'contains-all',
                    metric: 'test-metric/Iterative',
                    value: 'test-value',
                },
            ],
            metadata: {
                existingKey: 'existingValue',
                strategyId: 'jailbreak',
            },
        });
    });
});
//# sourceMappingURL=iterative.test.js.map