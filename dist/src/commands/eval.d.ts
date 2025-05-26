import type { Command } from 'commander';
import Eval from '../models/eval';
import type { CommandLineOptions, EvaluateOptions, TestSuite, TokenUsage, UnifiedConfig } from '../types';
export declare function showRedteamProviderLabelMissingWarning(testSuite: TestSuite): void;
/**
 * Format token usage for display in CLI output
 */
export declare function formatTokenUsage(type: string, usage: Partial<TokenUsage>): string;
export declare function doEval(cmdObj: Partial<CommandLineOptions & Command>, defaultConfig: Partial<UnifiedConfig>, defaultConfigPath: string | undefined, evaluateOptions: EvaluateOptions): Promise<Eval>;
export declare function evalCommand(program: Command, defaultConfig: Partial<UnifiedConfig>, defaultConfigPath: string | undefined): Command;
//# sourceMappingURL=eval.d.ts.map