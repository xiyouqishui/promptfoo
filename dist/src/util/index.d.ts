import type Eval from '../models/eval';
import type { Vars } from '../types';
import { type EvaluateResult, type NunjucksFilterMap, type ResultsFile, type TestCase, type OutputFile, type CompletedPrompt } from '../types';
export declare function writeOutput(outputPath: string, evalRecord: Eval, shareableUrl: string | null): Promise<void>;
export declare function writeMultipleOutputs(outputPaths: string[], evalRecord: Eval, shareableUrl: string | null): Promise<void>;
export declare function readOutput(outputPath: string): Promise<OutputFile>;
/**
 * TODO(ian): Remove this
 * @deprecated Use readLatestResults directly instead.
 */
export declare function getLatestResultsPath(): string;
/**
 * @deprecated Used only for migration to sqlite
 */
export declare function listPreviousResultFilenames_fileSystem(): string[];
/**
 * @deprecated Used only for migration to sqlite
 */
export declare function listPreviousResults_fileSystem(): {
    fileName: string;
    description?: string;
}[];
export declare function filenameToDate(filename: string): Date;
export declare function dateToFilename(date: Date): string;
/**
 * @deprecated Used only for migration to sqlite
 */
export declare function readResult_fileSystem(name: string): {
    id: string;
    result: ResultsFile;
    createdAt: Date;
} | undefined;
export declare function readFilters(filters: Record<string, string>, basePath?: string): Promise<NunjucksFilterMap>;
export declare function printBorder(): void;
export declare function setupEnv(envPath: string | undefined): void;
export type StandaloneEval = CompletedPrompt & {
    evalId: string;
    description: string | null;
    datasetId: string | null;
    promptId: string | null;
    isRedteam: boolean;
    createdAt: number;
    uuid: string;
    pluginFailCount: Record<string, number>;
    pluginPassCount: Record<string, number>;
};
export declare function providerToIdentifier(provider: TestCase['provider']): string | undefined;
export declare function varsMatch(vars1: Vars | undefined, vars2: Vars | undefined): boolean;
export declare function resultIsForTestCase(result: EvaluateResult, testCase: TestCase): boolean;
export declare function renderVarsInObject<T>(obj: T, vars?: Record<string, string | object>): T;
/**
 * Parses a file path or glob pattern to extract function names and file extensions.
 * Function names can be specified in the filename like this:
 * prompt.py:myFunction or prompts.js:myFunction.
 * @param basePath - The base path for file resolution.
 * @param promptPath - The path or glob pattern.
 * @returns Parsed details including function name, file extension, and directory status.
 */
export declare function parsePathOrGlob(basePath: string, promptPath: string): {
    extension?: string;
    functionName?: string;
    isPathPattern: boolean;
    filePath: string;
};
export declare function isRunningUnderNpx(): boolean;
/**
 * Renders variables in a tools object and loads from external file if applicable.
 * This function combines renderVarsInObject and maybeLoadFromExternalFile into a single step
 * specifically for handling tools configurations.
 *
 * @param tools - The tools configuration object or array to process.
 * @param vars - Variables to use for rendering.
 * @returns The processed tools configuration with variables rendered and content loaded from files if needed.
 */
export declare function maybeLoadToolsFromExternalFile(tools: any, vars?: Record<string, string | object>): any;
//# sourceMappingURL=index.d.ts.map