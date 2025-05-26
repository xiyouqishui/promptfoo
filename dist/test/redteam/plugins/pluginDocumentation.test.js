"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PLUGINS_DIR = path_1.default.join(__dirname, '../../../src/redteam/plugins');
const DOCS_DIR = path_1.default.join(__dirname, '../../../site/docs/red-team/plugins');
function getFiles(dir, extension, excludes = []) {
    return fs_1.default
        .readdirSync(dir)
        .filter((file) => file.endsWith(extension) && !excludes.includes(file))
        .map((file) => file.replace(extension, ''));
}
function toKebabCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
function toCamelCase(str) {
    return str.replace(/-./g, (x) => x[1].toUpperCase());
}
describe('Plugin Documentation', () => {
    const pluginFiles = getFiles(PLUGINS_DIR, '.ts', ['index.ts', 'base.ts']);
    const docFiles = getFiles(DOCS_DIR, '.md', ['_category_.json']);
    it('should have matching plugin and documentation files', () => {
        const pluginSet = new Set(pluginFiles.map(toKebabCase));
        const docSet = new Set(docFiles);
        // Check that all plugins have corresponding docs
        pluginSet.forEach((plugin) => {
            expect(docSet.has(plugin)).toBe(true);
        });
    });
    it('should have correct naming conventions for plugins and docs', () => {
        pluginFiles.forEach((plugin) => {
            const kebabPlugin = toKebabCase(plugin);
            expect(docFiles).toContain(kebabPlugin);
            expect(pluginFiles).toContain(toCamelCase(kebabPlugin));
        });
    });
});
//# sourceMappingURL=pluginDocumentation.test.js.map