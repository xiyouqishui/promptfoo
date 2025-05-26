"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiskCategorySeverityMap = getRiskCategorySeverityMap;
exports.getUnifiedConfig = getUnifiedConfig;
const constants_1 = require("./constants");
function getRiskCategorySeverityMap(plugins) {
    const overrides = plugins?.reduce((acc, plugin) => {
        if (plugin.severity) {
            acc[plugin.id] = plugin.severity;
        }
        return acc;
    }, {}) || {};
    return {
        ...constants_1.riskCategorySeverityMap,
        ...overrides,
    };
}
function getUnifiedConfig(config) {
    // Remove UI specific configs from target
    const target = { ...config.target, config: { ...config.target.config } };
    delete target.config.sessionSource;
    delete target.config.stateful;
    const defaultTest = {
        ...(config.defaultTest ?? {}),
        options: {
            ...(config.defaultTest?.options ?? {}),
            transformVars: '{ ...vars, sessionId: context.uuid }',
        },
        vars: config.defaultTest?.vars,
    };
    return {
        description: config.description,
        targets: [target],
        prompts: config.prompts,
        extensions: config.extensions,
        defaultTest,
        redteam: {
            purpose: config.purpose,
            numTests: config.numTests,
            plugins: config.plugins.map((plugin) => {
                if (typeof plugin === 'string') {
                    return { id: plugin };
                }
                return {
                    id: plugin.id,
                    ...(plugin.config && Object.keys(plugin.config).length > 0 && { config: plugin.config }),
                };
            }),
            strategies: config.strategies.map((strategy) => {
                if (typeof strategy === 'string') {
                    if (constants_1.MULTI_TURN_STRATEGIES.includes(strategy) && config.target.config.stateful) {
                        return { id: strategy, config: { stateful: true } };
                    }
                    return { id: strategy };
                }
                // Determine if this is a stateful multi-turn strategy
                const isStatefulMultiTurn = constants_1.MULTI_TURN_STRATEGIES.includes(strategy.id) && config.target.config.stateful;
                // Check if we have any custom configuration
                const hasCustomConfig = strategy.config && Object.keys(strategy.config).length > 0;
                // If we don't need any configuration, return just the ID
                if (!isStatefulMultiTurn && !hasCustomConfig) {
                    return { id: strategy.id };
                }
                // Build the configuration object
                const configObject = {
                    ...(isStatefulMultiTurn && { stateful: true }),
                    ...(strategy.config || {}),
                };
                // Return the strategy with its configuration
                return {
                    id: strategy.id,
                    config: configObject,
                };
            }),
        },
    };
}
//# sourceMappingURL=sharedFrontend.js.map