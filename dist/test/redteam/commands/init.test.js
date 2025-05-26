"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const js_yaml_1 = __importDefault(require("js-yaml"));
const init_1 = require("../../../src/redteam/commands/init");
(0, globals_1.describe)('renderRedteamConfig', () => {
    (0, globals_1.it)('should generate valid YAML that conforms to RedteamFileConfig', () => {
        const input = {
            purpose: 'Test chatbot security',
            numTests: 5,
            plugins: [{ id: 'rbac', numTests: 2 }],
            strategies: ['prompt-injection'],
            prompts: ['Hello {{prompt}}'],
            providers: ['openai:gpt-4'],
            descriptions: {
                'math-prompt': 'Basic prompt injection test',
                rbac: 'Basic RBAC test',
            },
        };
        const renderedConfig = (0, init_1.renderRedteamConfig)(input);
        (0, globals_1.expect)(renderedConfig).toBeDefined();
        const parsedConfig = js_yaml_1.default.load(renderedConfig);
        (0, globals_1.expect)(parsedConfig.redteam.purpose).toBe(input.purpose);
        (0, globals_1.expect)(parsedConfig.redteam.numTests).toBe(input.numTests);
        (0, globals_1.expect)(parsedConfig.redteam.plugins).toHaveLength(1);
        (0, globals_1.expect)(parsedConfig.redteam.plugins?.[0]).toMatchObject({
            id: 'rbac',
            numTests: 2,
        });
    });
    (0, globals_1.it)('should handle minimal configuration', () => {
        const input = {
            purpose: 'Basic test',
            numTests: 1,
            plugins: [],
            strategies: [],
            prompts: [],
            providers: [],
            descriptions: {},
        };
        const renderedConfig = (0, init_1.renderRedteamConfig)(input);
        const parsedConfig = js_yaml_1.default.load(renderedConfig);
        (0, globals_1.expect)(parsedConfig.redteam.purpose).toBe(input.purpose);
        (0, globals_1.expect)(parsedConfig.redteam.numTests).toBe(input.numTests);
        (0, globals_1.expect)(parsedConfig.redteam.plugins || []).toEqual([]);
        (0, globals_1.expect)(parsedConfig.redteam.strategies || []).toEqual([]);
    });
    (0, globals_1.it)('should include all provided plugins and strategies', () => {
        const input = {
            purpose: 'Test all plugins',
            numTests: 3,
            plugins: [
                { id: 'prompt-injection', numTests: 1 },
                { id: 'policy', numTests: 2 },
            ],
            strategies: ['basic', 'jailbreak'],
            prompts: ['Test {{prompt}}'],
            providers: ['openai:gpt-4'],
            descriptions: {
                'basic-injection': 'Basic test',
                'advanced-injection': 'Advanced test',
            },
        };
        const renderedConfig = (0, init_1.renderRedteamConfig)(input);
        const parsedConfig = js_yaml_1.default.load(renderedConfig);
        (0, globals_1.expect)(parsedConfig.redteam.plugins).toHaveLength(2);
        (0, globals_1.expect)(parsedConfig.redteam.strategies).toHaveLength(2);
        (0, globals_1.expect)(parsedConfig.redteam.plugins).toEqual(globals_1.expect.arrayContaining([
            { id: 'prompt-injection', numTests: 1 },
            { id: 'policy', numTests: 2 },
        ]));
        (0, globals_1.expect)(parsedConfig.redteam.strategies).toEqual(globals_1.expect.arrayContaining(['basic', 'jailbreak']));
    });
    (0, globals_1.it)('should handle custom provider configuration', () => {
        const input = {
            purpose: 'Test custom provider',
            numTests: 1,
            plugins: [],
            strategies: [],
            prompts: ['Test'],
            providers: [
                {
                    id: 'custom-provider',
                    label: 'Custom API',
                    config: {
                        apiKey: '{{CUSTOM_API_KEY}}',
                        baseUrl: 'https://api.custom.com',
                    },
                },
            ],
            descriptions: {},
        };
        const renderedConfig = (0, init_1.renderRedteamConfig)(input);
        const parsedConfig = js_yaml_1.default.load(renderedConfig);
        (0, globals_1.expect)(parsedConfig.targets).toBeDefined();
        (0, globals_1.expect)(parsedConfig.targets[0]).toMatchObject({
            id: 'custom-provider',
            label: 'Custom API',
            config: {
                apiKey: '{{CUSTOM_API_KEY}}',
                baseUrl: 'https://api.custom.com',
            },
        });
    });
});
//# sourceMappingURL=init.test.js.map