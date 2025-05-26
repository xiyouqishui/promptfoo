"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../src/redteam/constants");
describe('constants', () => {
    it('DEFAULT_NUM_TESTS_PER_PLUGIN should be defined', () => {
        expect(constants_1.DEFAULT_NUM_TESTS_PER_PLUGIN).toBeDefined();
        expect(constants_1.DEFAULT_NUM_TESTS_PER_PLUGIN).toBe(5);
    });
    it('REDTEAM_MODEL should be defined', () => {
        expect(constants_1.REDTEAM_MODEL).toBeDefined();
        expect(constants_1.REDTEAM_MODEL).toBe('openai:chat:gpt-4.1-2025-04-14');
    });
    it('LLAMA_GUARD_REPLICATE_PROVIDER should be defined', () => {
        expect(constants_1.LLAMA_GUARD_REPLICATE_PROVIDER).toBeDefined();
        expect(constants_1.LLAMA_GUARD_REPLICATE_PROVIDER).toBe('replicate:moderation:meta/llama-guard-3-8b:146d1220d447cdcc639bc17c5f6137416042abee6ae153a2615e6ef5749205c8');
    });
    it('LLAMA_GUARD_ENABLED_CATEGORIES should contain expected categories', () => {
        expect(constants_1.LLAMA_GUARD_ENABLED_CATEGORIES).toContain('S1');
        expect(constants_1.LLAMA_GUARD_ENABLED_CATEGORIES).toContain('S2');
        expect(constants_1.LLAMA_GUARD_ENABLED_CATEGORIES).not.toContain('S7');
    });
    it('COLLECTIONS should contain expected values', () => {
        expect(constants_1.COLLECTIONS).toEqual(['default', 'foundation', 'harmful', 'pii']);
    });
    it('UNALIGNED_PROVIDER_HARM_PLUGINS should contain expected plugins', () => {
        expect(constants_1.UNALIGNED_PROVIDER_HARM_PLUGINS['harmful:child-exploitation']).toBe('Child Exploitation');
        expect(constants_1.UNALIGNED_PROVIDER_HARM_PLUGINS['harmful:hate']).toBe('Hate');
    });
    it('REDTEAM_PROVIDER_HARM_PLUGINS should contain expected plugins', () => {
        expect(constants_1.REDTEAM_PROVIDER_HARM_PLUGINS['harmful:intellectual-property']).toBe('Intellectual Property violation');
        expect(constants_1.REDTEAM_PROVIDER_HARM_PLUGINS['harmful:privacy']).toBe('Privacy violations');
    });
    it('HARM_PLUGINS should combine plugins from other harm plugin objects', () => {
        expect(constants_1.HARM_PLUGINS).toMatchObject({
            ...constants_1.UNALIGNED_PROVIDER_HARM_PLUGINS,
            ...constants_1.REDTEAM_PROVIDER_HARM_PLUGINS,
            'harmful:misinformation-disinformation': 'Misinformation & Disinformation - Harmful lies and propaganda',
            'harmful:specialized-advice': 'Specialized Advice - Financial',
        });
    });
    it('PII_PLUGINS should contain expected plugins', () => {
        expect(constants_1.PII_PLUGINS).toEqual(['pii:api-db', 'pii:direct', 'pii:session', 'pii:social']);
    });
    it('BASE_PLUGINS should contain expected plugins', () => {
        expect(constants_1.BASE_PLUGINS).toContain('contracts');
        expect(constants_1.BASE_PLUGINS).toContain('excessive-agency');
        expect(constants_1.BASE_PLUGINS).toContain('hallucination');
    });
    it('ADDITIONAL_PLUGINS should contain MCP plugin', () => {
        expect(constants_1.ADDITIONAL_PLUGINS).toContain('mcp');
    });
    it('DEFAULT_PLUGINS should be a Set containing base plugins, harm plugins and PII plugins', () => {
        expect(constants_1.DEFAULT_PLUGINS).toBeInstanceOf(Set);
        expect(constants_1.DEFAULT_PLUGINS.has('contracts')).toBe(true);
        expect(constants_1.DEFAULT_PLUGINS.has('pii:api-db')).toBe(true);
    });
    it('ALL_PLUGINS should contain all plugins sorted', () => {
        expect(constants_1.ALL_PLUGINS).toEqual([
            ...new Set([
                ...constants_1.DEFAULT_PLUGINS,
                ...constants_1.ADDITIONAL_PLUGINS,
                ...constants_1.CONFIG_REQUIRED_PLUGINS,
                ...constants_1.AGENTIC_PLUGINS,
            ]),
        ].sort());
    });
    it('DATASET_PLUGINS should contain expected plugins', () => {
        const expectedPlugins = [
            'beavertails',
            'cyberseceval',
            'donotanswer',
            'harmbench',
            'pliny',
            'unsafebench',
            'xstest',
        ];
        expect(constants_1.DATASET_PLUGINS).toEqual(expectedPlugins);
        expect(constants_1.DATASET_PLUGINS).toHaveLength(7);
        expectedPlugins.forEach((plugin) => {
            expect(constants_1.DATASET_PLUGINS).toContain(plugin);
        });
    });
    it('Severity enum should have expected values', () => {
        expect(constants_1.Severity.Critical).toBe('critical');
        expect(constants_1.Severity.High).toBe('high');
        expect(constants_1.Severity.Medium).toBe('medium');
        expect(constants_1.Severity.Low).toBe('low');
    });
    it('severityDisplayNames should have display names for all severities', () => {
        expect(constants_1.severityDisplayNames[constants_1.Severity.Critical]).toBe('Critical');
        expect(constants_1.severityDisplayNames[constants_1.Severity.High]).toBe('High');
        expect(constants_1.severityDisplayNames[constants_1.Severity.Medium]).toBe('Medium');
        expect(constants_1.severityDisplayNames[constants_1.Severity.Low]).toBe('Low');
    });
    it('PLUGIN_PRESET_DESCRIPTIONS should contain expected descriptions', () => {
        expect(constants_1.PLUGIN_PRESET_DESCRIPTIONS.RAG).toBe('Recommended plugins plus additional tests for RAG specific scenarios like access control');
        expect(constants_1.PLUGIN_PRESET_DESCRIPTIONS.Recommended).toBe('A broad set of plugins recommended by Promptfoo');
        expect(constants_1.PLUGIN_PRESET_DESCRIPTIONS['Minimal Test']).toBe('Minimal set of plugins to validate your setup');
        expect(constants_1.PLUGIN_PRESET_DESCRIPTIONS['OWASP Agentic AI Top 10']).toBe('OWASP Agentic AI Top 10 Threats and Mitigations');
    });
    it('should have MEMORY_POISONING_PLUGIN_ID in Security & Access Control category', () => {
        expect(constants_1.riskCategories['Security & Access Control']).toBeDefined();
        expect(constants_1.riskCategories['Security & Access Control']).toContain('agentic:memory-poisoning');
    });
    it('should have descriptions for all risk categories', () => {
        const categories = Object.keys(constants_1.riskCategories);
        categories.forEach((category) => {
            expect(constants_1.categoryDescriptions[category]).toBeDefined();
            expect(typeof constants_1.categoryDescriptions[category]).toBe('string');
        });
    });
    it('should have correct display name for MCP plugin', () => {
        expect(constants_1.displayNameOverrides['mcp']).toBe('Model Context Protocol');
    });
    it('should have correct severity for MCP plugin', () => {
        expect(constants_1.riskCategorySeverityMap['mcp']).toBe(constants_1.Severity.High);
    });
    it('should have correct alias for MCP plugin', () => {
        expect(constants_1.categoryAliases['mcp']).toBe('MCP');
    });
    it('should have correct plugin description for MCP plugin', () => {
        expect(constants_1.pluginDescriptions['mcp']).toBe('Tests for vulnerabilities to Model Context Protocol (MCP) attacks');
    });
    it('should have correct subcategory description for MCP plugin', () => {
        expect(constants_1.subCategoryDescriptions['mcp']).toBe('Tests for vulnerabilities to Model Context Protocol (MCP) attacks');
    });
    it('STRATEGY_COLLECTIONS should contain expected collections', () => {
        expect(constants_1.STRATEGY_COLLECTIONS).toEqual(['other-encodings']);
    });
    it('STRATEGY_COLLECTION_MAPPINGS should have correct mappings', () => {
        expect(constants_1.STRATEGY_COLLECTION_MAPPINGS['other-encodings']).toEqual(['morse', 'piglatin']);
    });
    it('ALL_STRATEGIES should include strategy collections', () => {
        expect(constants_1.ALL_STRATEGIES).toContain('other-encodings');
    });
    it('strategy collections should have proper descriptions', () => {
        expect(constants_1.strategyDescriptions['other-encodings']).toBe('Collection of alternative text transformation strategies (Morse code and Pig Latin) for testing evasion techniques');
    });
    it('strategy collections should have proper display names', () => {
        expect(constants_1.strategyDisplayNames['other-encodings']).toBe('Collection of Text Encodings');
    });
    it('strategy collections should have proper subcategory descriptions', () => {
        expect(constants_1.subCategoryDescriptions['other-encodings']).toBe('Collection of alternative text transformation strategies (Morse code and Pig Latin) for testing evasion techniques');
    });
});
//# sourceMappingURL=constants.test.js.map