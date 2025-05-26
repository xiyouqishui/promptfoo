import type { ApiProvider, NunjucksFilterMap, Prompt } from './types';
export declare function extractTextFromPDF(pdfPath: string): Promise<string>;
export declare function resolveVariables(variables: Record<string, string | object>): Record<string, string | object>;
export declare function renderPrompt(prompt: Prompt, vars: Record<string, string | object>, nunjucksFilters?: NunjucksFilterMap, provider?: ApiProvider): Promise<string>;
/**
 * Runs extension hooks for the given hook name and context.
 * @param extensions - An array of extension paths, or null.
 * @param hookName - The name of the hook to run.
 * @param context - The context object to pass to the hook.
 * @returns A Promise that resolves when all hooks have been run.
 */
export declare function runExtensionHook(extensions: string[] | null | undefined, hookName: string, context: any): Promise<void>;
//# sourceMappingURL=evaluatorHelpers.d.ts.map