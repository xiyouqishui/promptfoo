import nunjucks from 'nunjucks';
import type { NunjucksFilterMap } from '../types';
/**
 * Get a Nunjucks engine instance with optional filters and configuration.
 * @param filters - Optional map of custom Nunjucks filters.
 * @param throwOnUndefined - Whether to throw an error on undefined variables.
 * @param isGrader - Whether this engine is being used in a grader context.
 * Nunjucks is always enabled in grader mode.
 * @returns A configured Nunjucks environment.
 */
export declare function getNunjucksEngine(filters?: NunjucksFilterMap, throwOnUndefined?: boolean, isGrader?: boolean): nunjucks.Environment;
/**
 * Parse Nunjucks template to extract variables.
 * @param template - The Nunjucks template string.
 * @returns An array of variables used in the template.
 */
export declare function extractVariablesFromTemplate(template: string): string[];
/**
 * Extract variables from multiple Nunjucks templates.
 * @param templates - An array of Nunjucks template strings.
 * @returns An array of variables used in the templates.
 */
export declare function extractVariablesFromTemplates(templates: string[]): string[];
export declare function getTemplateContext(additionalContext?: Record<string, any>): Record<string, any>;
//# sourceMappingURL=templates.d.ts.map