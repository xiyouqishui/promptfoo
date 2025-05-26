"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../src/redteam/constants");
const sharedFrontend_1 = require("../../src/redteam/sharedFrontend");
describe('getRiskCategorySeverityMap', () => {
    it('should return default severity map when no plugins provided', () => {
        const result = (0, sharedFrontend_1.getRiskCategorySeverityMap)();
        expect(result).toBeDefined();
        expect(result['contracts']).toBe(constants_1.Severity.Medium);
    });
    it('should override default severities with plugin severities', () => {
        const plugins = [
            { id: 'contracts', severity: constants_1.Severity.High },
            { id: 'politics', severity: constants_1.Severity.Critical },
        ];
        const result = (0, sharedFrontend_1.getRiskCategorySeverityMap)(plugins);
        expect(result['contracts']).toBe(constants_1.Severity.High);
        expect(result['politics']).toBe(constants_1.Severity.Critical);
    });
    it('should handle plugins without severity override', () => {
        const plugins = [
            { id: 'contracts' },
            { id: 'politics', severity: constants_1.Severity.Critical },
        ];
        const result = (0, sharedFrontend_1.getRiskCategorySeverityMap)(plugins);
        expect(result['contracts']).toBe(constants_1.Severity.Medium); // Default severity
        expect(result['politics']).toBe(constants_1.Severity.Critical);
    });
});
describe('getUnifiedConfig', () => {
    const baseConfig = {
        description: 'Test config',
        prompts: ['test prompt'],
        target: {
            id: 'test-target',
            config: {
                sessionSource: 'test-session',
                stateful: true,
                apiKey: 'test-key',
            },
        },
        plugins: ['test-plugin'],
        strategies: ['basic'],
        purpose: 'testing',
        applicationDefinition: {},
        entities: [],
    };
    it('should transform config correctly', () => {
        const result = (0, sharedFrontend_1.getUnifiedConfig)(baseConfig);
        expect(result.description).toBe('Test config');
        expect(result.prompts).toEqual(['test prompt']);
        // @ts-ignore
        expect(result.targets[0].config.sessionSource).toBeUndefined();
        // @ts-ignore
        expect(result.targets[0].config.stateful).toBeUndefined();
        expect(result.redteam.purpose).toBe('testing');
    });
    it('should handle defaultTest transformation', () => {
        const configWithDefaultTest = {
            ...baseConfig,
            defaultTest: {
                vars: { test: 'value' },
                options: { someOption: true },
            },
        };
        const result = (0, sharedFrontend_1.getUnifiedConfig)(configWithDefaultTest);
        expect(result.defaultTest.vars).toEqual({ test: 'value' });
        expect(result.defaultTest.options.transformVars).toBe('{ ...vars, sessionId: context.uuid }');
    });
    it('should transform plugins correctly', () => {
        const configWithPlugins = {
            ...baseConfig,
            plugins: ['simple-plugin', { id: 'complex-plugin', config: { setting: true } }],
        };
        const result = (0, sharedFrontend_1.getUnifiedConfig)(configWithPlugins);
        expect(result.redteam.plugins).toEqual([
            { id: 'simple-plugin' },
            { id: 'complex-plugin', config: { setting: true } },
        ]);
    });
    it('should transform strategies with stateful config', () => {
        const configWithStrategies = {
            ...baseConfig,
            strategies: ['basic', 'goat', { id: 'custom', config: { option: true } }],
        };
        const result = (0, sharedFrontend_1.getUnifiedConfig)(configWithStrategies);
        expect(result.redteam.strategies).toEqual([
            { id: 'basic' },
            { id: 'goat', config: { stateful: true } },
            { id: 'custom', config: { option: true } },
        ]);
    });
});
//# sourceMappingURL=sharedFrontend.test.js.map