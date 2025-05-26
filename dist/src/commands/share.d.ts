import type { Command } from 'commander';
import Eval from '../models/eval';
export declare function notCloudEnabledShareInstructions(): void;
export declare function createAndDisplayShareableUrl(evalRecord: Eval, showAuth: boolean): Promise<string | null>;
export declare function shareCommand(program: Command): void;
//# sourceMappingURL=share.d.ts.map