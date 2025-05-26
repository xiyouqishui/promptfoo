"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../../../src/redteam/constants");
describe('Plugin IDs', () => {
    const findPluginIdAssignments = (fileContent) => {
        // Look for patterns like `id = 'plugin-name'` or `PLUGIN_ID = 'plugin-name'`
        const idAssignmentRegex = /\b(id|PLUGIN_ID)\s*=\s*['"]([^'"]+)['"]/g;
        const matches = [];
        let match;
        while ((match = idAssignmentRegex.exec(fileContent)) !== null) {
            matches.push(match[2]);
        }
        return matches;
    };
    it('should use plugin IDs that match those defined in constants', () => {
        // Get all plugin implementation files
        const pluginDir = path_1.default.resolve(__dirname, '../../../src/redteam/plugins');
        const pluginFiles = fs_1.default
            .readdirSync(pluginDir)
            .filter((file) => file.endsWith('.ts') &&
            !file.endsWith('.d.ts') &&
            file !== 'index.ts' &&
            file !== 'base.ts');
        // Track all plugin IDs used in implementations
        const usedPluginIds = [];
        pluginFiles.forEach((file) => {
            const filePath = path_1.default.join(pluginDir, file);
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            const ids = findPluginIdAssignments(content);
            if (ids.length > 0) {
                usedPluginIds.push(...ids);
            }
        });
        // Also check subdirectories
        const subdirectories = fs_1.default
            .readdirSync(pluginDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        subdirectories.forEach((subdir) => {
            const subdirPath = path_1.default.join(pluginDir, subdir);
            const subFiles = fs_1.default
                .readdirSync(subdirPath)
                .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts') && file !== 'index.ts');
            subFiles.forEach((file) => {
                const filePath = path_1.default.join(subdirPath, file);
                const content = fs_1.default.readFileSync(filePath, 'utf8');
                const ids = findPluginIdAssignments(content);
                if (ids.length > 0) {
                    usedPluginIds.push(...ids);
                }
            });
        });
        // Filter out duplicates
        const uniqueIds = [...new Set(usedPluginIds)];
        // Create a comprehensive list of all expected plugin IDs, including the prefixed versions
        const expectedPrefixedPluginIds = new Set();
        // Add common plugin format - 'promptfoo:redteam:plugin-name'
        constants_1.ALL_PLUGINS.forEach((pluginId) => {
            if (typeof pluginId === 'string' && !pluginId.includes(':')) {
                expectedPrefixedPluginIds.add(`promptfoo:redteam:${pluginId}`);
            }
        });
        // Add harm plugins which might have different prefixes
        Object.keys(constants_1.HARM_PLUGINS).forEach((harmPlugin) => {
            if (typeof harmPlugin === 'string') {
                const fullPluginId = `promptfoo:redteam:${harmPlugin}`;
                expectedPrefixedPluginIds.add(fullPluginId);
            }
        });
        // Add PII plugins with their prefixes
        constants_1.PII_PLUGINS.forEach((piiPlugin) => {
            expectedPrefixedPluginIds.add(`promptfoo:redteam:${piiPlugin}`);
        });
        // Add special case for general PII plugin
        expectedPrefixedPluginIds.add('promptfoo:redteam:pii');
        // Add special case for general harmful plugin
        expectedPrefixedPluginIds.add('promptfoo:redteam:harmful');
        // Add special cases from harm sub-categories
        // These are handled specially in the constants file as nested objects
        uniqueIds.forEach((id) => {
            if (id.startsWith('promptfoo:redteam:harmful:')) {
                expectedPrefixedPluginIds.add(id);
            }
        });
        // Handle special case: 'policy' without prefix
        uniqueIds.forEach((id) => {
            if (id === 'policy') {
                // This is a special case where the ID is not prefixed in the code
                console.log("Note: Found 'policy' ID without prefix - this is a special case");
            }
        });
        // For each plugin ID found in the implementations, check if it matches an expected format
        const unexpectedPlugins = [];
        uniqueIds.forEach((id) => {
            if (!id.startsWith('promptfoo:redteam:') && id !== 'policy') {
                console.warn(`Plugin ID '${id}' does not start with the expected prefix 'promptfoo:redteam:'`);
            }
            if (!expectedPrefixedPluginIds.has(id) && id !== 'policy') {
                const baseId = id.replace('promptfoo:redteam:', '');
                const isHarmSubcategory = baseId.startsWith('harmful:');
                // Special case for harm subcategories
                if (!isHarmSubcategory) {
                    // Non-harm plugins should match one of the plugin types in constants
                    const allPluginsList = [
                        ...constants_1.BASE_PLUGINS,
                        ...constants_1.ADDITIONAL_PLUGINS,
                        ...constants_1.CONFIG_REQUIRED_PLUGINS,
                        ...constants_1.PII_PLUGINS,
                        'pii', // Add the general pii plugin
                        'harmful', // Add the general harmful plugin
                        ...Object.keys(constants_1.HARM_PLUGINS),
                    ];
                    const matchesExpectedPlugin = allPluginsList.some((p) => baseId === p);
                    if (!matchesExpectedPlugin) {
                        console.warn(`Plugin ID '${id}' (base: '${baseId}') is not listed in constants`);
                        unexpectedPlugins.push({ id, baseId });
                    }
                }
            }
        });
        // Make a single assertion for all unexpected plugins
        expect(unexpectedPlugins).toEqual([]);
    });
});
//# sourceMappingURL=pluginId.test.js.map