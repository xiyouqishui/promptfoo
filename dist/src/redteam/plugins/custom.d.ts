import { z } from 'zod';
import type { ApiProvider, Assertion } from '../../types';
import { RedteamPluginBase } from './base';
declare const CustomPluginDefinitionSchema: z.ZodObject<{
    generator: z.ZodString;
    grader: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    grader: string;
    generator: string;
    id?: string | undefined;
}, {
    grader: string;
    generator: string;
    id?: string | undefined;
}>;
type CustomPluginDefinition = z.infer<typeof CustomPluginDefinitionSchema>;
export declare function loadCustomPluginDefinition(filePath: string): CustomPluginDefinition;
export declare class CustomPlugin extends RedteamPluginBase {
    private definition;
    static readonly canGenerateRemote = false;
    get id(): string;
    constructor(provider: ApiProvider, purpose: string, injectVar: string, filePath: string);
    protected getTemplate(): Promise<string>;
    protected getAssertions(prompt: string): Assertion[];
}
export {};
//# sourceMappingURL=custom.d.ts.map