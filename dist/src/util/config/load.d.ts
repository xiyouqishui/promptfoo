import { type CommandLineOptions, type TestSuite, type UnifiedConfig } from '../../types';
export declare function dereferenceConfig(rawConfig: UnifiedConfig): Promise<UnifiedConfig>;
export declare function readConfig(configPath: string): Promise<UnifiedConfig>;
export declare function maybeReadConfig(configPath: string): Promise<UnifiedConfig | undefined>;
/**
 * Reads multiple configuration files and combines them into a single UnifiedConfig.
 *
 * @param {string[]} configPaths - An array of paths to configuration files. Supports glob patterns.
 * @returns {Promise<UnifiedConfig>} A promise that resolves to a unified configuration object.
 */
export declare function combineConfigs(configPaths: string[]): Promise<UnifiedConfig>;
/**
 * @param type - The type of configuration file. Incrementally implemented; currently supports `DatasetGeneration`.
 *  TODO(Optimization): Perform type-specific validation e.g. using Zod schemas for data model variants.
 */
export declare function resolveConfigs(cmdObj: Partial<CommandLineOptions>, _defaultConfig: Partial<UnifiedConfig>, type?: 'DatasetGeneration'): Promise<{
    testSuite: TestSuite;
    config: Partial<UnifiedConfig>;
    basePath: string;
}>;
//# sourceMappingURL=load.d.ts.map