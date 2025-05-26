"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNunjucksEngine = getNunjucksEngine;
exports.extractVariablesFromTemplate = extractVariablesFromTemplate;
exports.extractVariablesFromTemplates = extractVariablesFromTemplates;
exports.getTemplateContext = getTemplateContext;
const nunjucks_1 = __importDefault(require("nunjucks"));
const cliState_1 = __importDefault(require("../cliState"));
const envars_1 = require("../envars");
/**
 * Get a Nunjucks engine instance with optional filters and configuration.
 * @param filters - Optional map of custom Nunjucks filters.
 * @param throwOnUndefined - Whether to throw an error on undefined variables.
 * @param isGrader - Whether this engine is being used in a grader context.
 * Nunjucks is always enabled in grader mode.
 * @returns A configured Nunjucks environment.
 */
function getNunjucksEngine(filters, throwOnUndefined = false, isGrader = false) {
    if (!isGrader && (0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_TEMPLATING')) {
        return {
            renderString: (template) => template,
        };
    }
    const env = nunjucks_1.default.configure({
        autoescape: false,
        throwOnUndefined,
    });
    // Configure environment variables as template globals unless disabled. Defaults to disabled in self-hosted mode
    if (!(0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS', (0, envars_1.getEnvBool)('PROMPTFOO_SELF_HOSTED', false))) {
        env.addGlobal('env', {
            ...process.env,
            ...cliState_1.default.config?.env,
        });
    }
    env.addFilter('load', function (str) {
        return JSON.parse(str);
    });
    if (filters) {
        for (const [name, filter] of Object.entries(filters)) {
            env.addFilter(name, filter);
        }
    }
    return env;
}
/**
 * Parse Nunjucks template to extract variables.
 * @param template - The Nunjucks template string.
 * @returns An array of variables used in the template.
 */
function extractVariablesFromTemplate(template) {
    const variableSet = new Set();
    const regex = /\{\{[\s]*([^{}\s|]+)[\s]*(?:\|[^}]+)?\}\}|\{%[\s]*(?:if|for)[\s]+([^{}\s]+)[\s]*.*?%\}/g;
    const commentRegex = /\{#[\s\S]*?#\}/g;
    // Remove comments
    template = template.replace(commentRegex, '');
    let match;
    while ((match = regex.exec(template)) !== null) {
        const variable = match[1] || match[2];
        if (variable) {
            // Split by dot and add only the full path
            variableSet.add(variable);
        }
    }
    // Handle for loops separately
    const forLoopRegex = /\{%[\s]*for[\s]+(\w+)[\s]+in[\s]+(\w+)[\s]*%\}/g;
    while ((match = forLoopRegex.exec(template)) !== null) {
        variableSet.delete(match[1]); // Remove loop variable
        variableSet.add(match[2]); // Add the iterated variable
    }
    return Array.from(variableSet);
}
/**
 * Extract variables from multiple Nunjucks templates.
 * @param templates - An array of Nunjucks template strings.
 * @returns An array of variables used in the templates.
 */
function extractVariablesFromTemplates(templates) {
    const variableSet = new Set();
    for (const template of templates) {
        const variables = extractVariablesFromTemplate(template);
        variables.forEach((variable) => variableSet.add(variable));
    }
    return Array.from(variableSet);
}
function getTemplateContext(additionalContext = {}) {
    if ((0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS', false)) {
        return additionalContext;
    }
    return {
        ...additionalContext,
        // Add environment variables with config.env taking precedence
        env: {
            ...process.env,
            ...(cliState_1.default.config?.env || {}),
            ...additionalContext.env,
        },
    };
}
//# sourceMappingURL=templates.js.map