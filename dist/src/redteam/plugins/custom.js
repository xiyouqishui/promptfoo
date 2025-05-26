"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomPlugin = void 0;
exports.loadCustomPluginDefinition = loadCustomPluginDefinition;
const dedent_1 = __importDefault(require("dedent"));
const zod_1 = require("zod");
const zod_validation_error_1 = require("zod-validation-error");
const logger_1 = __importDefault(require("../../logger"));
const file_1 = require("../../util/file");
const templates_1 = require("../../util/templates");
const base_1 = require("./base");
const CustomPluginDefinitionSchema = zod_1.z
    .object({
    generator: zod_1.z.string().min(1, 'Generator must not be empty').trim(),
    grader: zod_1.z.string().min(1, 'Grader must not be empty').trim(),
    id: zod_1.z.string().optional(),
})
    .strict();
function loadCustomPluginDefinition(filePath) {
    logger_1.default.debug(`Loading custom plugin from ${filePath}`);
    const result = CustomPluginDefinitionSchema.safeParse((0, file_1.maybeLoadFromExternalFile)(filePath));
    if (!result.success) {
        const validationError = (0, zod_validation_error_1.fromError)(result.error);
        throw new Error('\n' +
            (0, dedent_1.default) `
    Custom Plugin Schema Validation Error:

      ${validationError.toString()}

    Please review your plugin file ${filePath} configuration.`);
    }
    logger_1.default.debug(`Custom plugin definition: ${JSON.stringify(result.data, null, 2)}`);
    return result.data;
}
class CustomPlugin extends base_1.RedteamPluginBase {
    get id() {
        return this.definition.id || `promptfoo:redteam:custom`;
    }
    constructor(provider, purpose, injectVar, filePath) {
        super(provider, purpose, injectVar);
        this.definition = loadCustomPluginDefinition(filePath);
    }
    async getTemplate() {
        return this.definition.generator;
    }
    getAssertions(prompt) {
        const nunjucks = (0, templates_1.getNunjucksEngine)();
        const renderedGrader = nunjucks.renderString(this.definition.grader, { purpose: this.purpose });
        return [
            {
                type: 'llm-rubric',
                value: renderedGrader,
            },
        ];
    }
}
exports.CustomPlugin = CustomPlugin;
CustomPlugin.canGenerateRemote = false;
//# sourceMappingURL=custom.js.map