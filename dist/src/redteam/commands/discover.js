"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_TURN_COUNT = exports.DEFAULT_TURN_COUNT = exports.ArgsSchema = exports.TargetPurposeDiscoveryTaskResponseSchema = exports.TargetPurposeDiscoveryResultSchema = exports.TargetPurposeDiscoveryRequestSchema = exports.TargetPurposeDiscoveryStateSchema = void 0;
exports.doTargetPurposeDiscovery = doTargetPurposeDiscovery;
exports.mergeTargetPurposeDiscoveryResults = mergeTargetPurposeDiscoveryResults;
exports.discoverCommand = discoverCommand;
const chalk_1 = __importDefault(require("chalk"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const crypto_1 = require("crypto");
const dedent_1 = __importDefault(require("dedent"));
const fs = __importStar(require("fs"));
const zod_1 = require("zod");
const constants_1 = require("../../constants");
const evaluatorHelpers_1 = require("../../evaluatorHelpers");
const fetch_1 = require("../../fetch");
const accounts_1 = require("../../globalConfig/accounts");
const cloud_1 = require("../../globalConfig/cloud");
const logger_1 = __importDefault(require("../../logger"));
const providers_1 = require("../../providers");
const telemetry_1 = __importDefault(require("../../telemetry"));
const cloud_2 = require("../../util/cloud");
const load_1 = require("../../util/config/load");
const invariant_1 = __importDefault(require("../../util/invariant"));
const remoteGeneration_1 = require("../remoteGeneration");
// ========================================================
// Schemas
// ========================================================
exports.TargetPurposeDiscoveryStateSchema = zod_1.z.object({
    currentQuestionIndex: zod_1.z.number(),
    answers: zod_1.z.array(zod_1.z.string()),
});
exports.TargetPurposeDiscoveryRequestSchema = zod_1.z.object({
    state: exports.TargetPurposeDiscoveryStateSchema,
    task: zod_1.z.literal('target-purpose-discovery'),
    version: zod_1.z.string(),
    email: zod_1.z.string().optional().nullable(),
});
exports.TargetPurposeDiscoveryResultSchema = zod_1.z.object({
    purpose: zod_1.z.string().nullable(),
    limitations: zod_1.z.string().nullable(),
    user: zod_1.z.string().nullable(),
    tools: zod_1.z.array(zod_1.z
        .object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        arguments: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            type: zod_1.z.string(),
        })),
    })
        .nullable()),
});
exports.TargetPurposeDiscoveryTaskResponseSchema = zod_1.z.object({
    done: zod_1.z.boolean(),
    question: zod_1.z.string().optional(),
    purpose: exports.TargetPurposeDiscoveryResultSchema.optional(),
    state: exports.TargetPurposeDiscoveryStateSchema,
    error: zod_1.z.string().optional(),
});
exports.ArgsSchema = zod_1.z
    .object({
    config: zod_1.z.string().optional(),
    target: zod_1.z.string().optional(),
})
    // Config and target are mutually exclusive:
    .refine((data) => !(data.config && data.target), {
    message: 'Cannot specify both config and target!',
    path: ['config', 'target'],
});
// ========================================================
// Constants
// ========================================================
exports.DEFAULT_TURN_COUNT = 5;
exports.MAX_TURN_COUNT = 10;
// ========================================================
// Utils
// ========================================================
/**
 * Queries Cloud for the purpose-discovery logic, sends each logic to the target,
 * and summarizes the results.
 *
 * @param target - The target API provider.
 * @param prompt - The prompt to use for the discovery.
 * @returns The discovery result.
 */
async function doTargetPurposeDiscovery(target, prompt) {
    // Generate a unique session id to pass to the target across all turns.
    const sessionId = (0, crypto_1.randomUUID)();
    const pbar = new cli_progress_1.default.SingleBar({
        format: `Discovery phase - probing the target {bar} {percentage}% | {value}${exports.DEFAULT_TURN_COUNT ? '/{total}' : ''} turns`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
    });
    pbar.start(exports.DEFAULT_TURN_COUNT, 0);
    let done = false;
    let question;
    let discoveryResult;
    let state = exports.TargetPurposeDiscoveryStateSchema.parse({
        currentQuestionIndex: 0,
        answers: [],
    });
    let turn = 0;
    while (!done && turn < exports.MAX_TURN_COUNT) {
        try {
            turn++;
            logger_1.default.debug(`[TargetPurposeDiscovery] Starting the purpose discovery loop, turn: ${turn}`);
            const response = await (0, fetch_1.fetchWithProxy)((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${cloud_1.cloudConfig.getApiKey()}`,
                },
                body: JSON.stringify(exports.TargetPurposeDiscoveryRequestSchema.parse({
                    state: {
                        currentQuestionIndex: state.currentQuestionIndex,
                        answers: state.answers,
                    },
                    task: 'target-purpose-discovery',
                    version: constants_1.VERSION,
                    email: (0, accounts_1.getUserEmail)(),
                })),
            });
            if (!response.ok) {
                const error = await response.text();
                logger_1.default.error(`[TargetPurposeDiscovery] Error getting the next question from remote server: ${error}`);
                continue;
            }
            const responseData = await response.json();
            const data = exports.TargetPurposeDiscoveryTaskResponseSchema.parse(responseData);
            logger_1.default.debug(`[TargetPurposeDiscovery] Received response from remote server: ${JSON.stringify(data, null, 2)}`);
            done = data.done;
            question = data.question;
            discoveryResult = data.purpose;
            state = data.state;
            if (data.error) {
                logger_1.default.error(`[TargetPurposeDiscovery] Error from remote server: ${data.error}`);
            }
            // Should another question be asked?
            else if (!done) {
                (0, invariant_1.default)(question, 'Question should always be defined if `done` is falsy.');
                const renderedPrompt = prompt
                    ? await (0, evaluatorHelpers_1.renderPrompt)(prompt, { prompt: question }, {}, target)
                    : question;
                const targetResponse = await target.callApi(renderedPrompt, {
                    prompt: { raw: question, label: 'Target Purpose Discovery Question' },
                    vars: { sessionId },
                });
                if (targetResponse.error) {
                    logger_1.default.error(`[TargetPurposeDiscovery] Error from target: ${targetResponse.error}`);
                    if (turn > exports.MAX_TURN_COUNT) {
                        logger_1.default.error('[TargetPurposeDiscovery] Too many retries, giving up.');
                        return undefined;
                    }
                    continue;
                }
                logger_1.default.debug(`[TargetPurposeDiscovery] Received response from target: ${JSON.stringify(targetResponse, null, 2)}`);
                state.answers.push(targetResponse.output);
            }
        }
        catch (error) {
            logger_1.default.error(`An unexpected error occurred during target discovery: ${error instanceof Error ? error.message : String(error)}\n${error instanceof Error ? error.stack : ''}`);
        }
        finally {
            pbar.increment(1);
        }
    }
    pbar.stop();
    return discoveryResult;
}
/**
 * Merges the human-defined purpose with the discovered information, structuring these as markdown to be used by test generation.
 * @param humanDefinedPurpose - The human-defined purpose.
 * @param discoveryResult - The discovery result.
 * @returns The merged purpose as markdown.
 */
function mergeTargetPurposeDiscoveryResults(humanDefinedPurpose, discoveryResult) {
    return [
        humanDefinedPurpose &&
            (0, dedent_1.default) `
      # Human Defined Target Purpose

      This purpose was defined by the user and should be trusted and treated as absolute truth:

      ${humanDefinedPurpose}
    `,
        discoveryResult &&
            (0, dedent_1.default) `
      # Agent Discovered Target Purpose

      The following information was discovered by the agent through conversations with the target.
      
      The boundaries of the agent's capabilities, limitations, and tool access should be tested.
      
      If there are any discrepancies, the Human Defined Purpose should be trusted and treated as absolute truth.
    `,
        discoveryResult?.purpose &&
            (0, dedent_1.default) `
      ## Purpose

      The target believes its purpose is:

      ${discoveryResult.purpose}
    `,
        discoveryResult?.limitations &&
            (0, dedent_1.default) `
      ## Limitations

      The target believes its limitations are:
      
      ${discoveryResult.limitations}
    `,
        discoveryResult?.tools &&
            (0, dedent_1.default) `
      ## Tools

      The target believes it has access to these tools:

      ${JSON.stringify(discoveryResult.tools, null)}
    `,
        discoveryResult?.user &&
            (0, dedent_1.default) `
      ## User

      The target believes the user of the application is:

      ${discoveryResult.user}
    `,
    ]
        .filter(Boolean)
        .join('\n');
}
// ========================================================
// Command
// ========================================================
/**
 * Registers the `discover` command with the CLI.
 */
function discoverCommand(program, defaultConfig, defaultConfigPath) {
    program
        .command('discover')
        .description((0, dedent_1.default) `
        Automatically discover a target application's purpose, enhancing attack probe efficacy.

        If neither a config file nor a target ID is provided, the current working directory will be checked for a promptfooconfig.yaml file,
        and the target will be discovered from the first provider in that config.
      `)
        .option('-c, --config <path>', 'Path to `promptfooconfig.yaml` configuration file.')
        .option('-t, --target <id>', 'UUID of a Cloud-defined target to run the discovery on')
        .action(async (rawArgs) => {
        // Check that remote generation is enabled:
        if ((0, remoteGeneration_1.neverGenerateRemote)()) {
            logger_1.default.error((0, dedent_1.default) `
          Discovery relies on remote generation which is disabled.

          To enable remote generation, unset the PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION environment variable.
        `);
            process.exit(1);
        }
        // Validate the arguments:
        const { success, data: args, error } = exports.ArgsSchema.safeParse(rawArgs);
        if (!success) {
            logger_1.default.error('Invalid options:');
            error.issues.forEach((issue) => {
                logger_1.default.error(`  ${issue.path.join('.')}: ${issue.message}`);
            });
            process.exitCode = 1;
            return;
        }
        // Record telemetry:
        telemetry_1.default.record('command_used', {
            name: 'redteam discover',
        });
        let config = null;
        // Although the providers/targets property supports multiple values, Redteaming only supports
        // a single target at a time.
        let target = undefined;
        // Fallback to the default config path:
        // If user provides a config, read the target from it:
        if (args.config) {
            // Validate that the config is a valid path:
            if (!fs.existsSync(args.config)) {
                throw new Error(`Config not found at ${args.config}`);
            }
            config = await (0, load_1.readConfig)(args.config);
            if (!config) {
                throw new Error(`Config is invalid at ${args.config}`);
            }
            if (!config.providers) {
                throw new Error('Config must contain a target');
            }
            const providers = await (0, providers_1.loadApiProviders)(config.providers);
            target = providers[0];
        }
        // If the target flag is provided, load it from Cloud:
        else if (args.target) {
            // Let the internal error handling bubble up:
            const providerOptions = await (0, cloud_2.getProviderFromCloud)(args.target);
            target = await (0, providers_1.loadApiProvider)(providerOptions.id, { options: providerOptions });
        }
        // Check the current working directory for a promptfooconfig.yaml file:
        else if (defaultConfig) {
            if (!defaultConfig) {
                throw new Error(`Config is invalid at ${defaultConfigPath}`);
            }
            if (!defaultConfig.providers) {
                throw new Error('Config must contain a target or provider');
            }
            const providers = await (0, providers_1.loadApiProviders)(defaultConfig.providers);
            target = providers[0];
            // Alert the user that we're using a config from the current working directory:
            logger_1.default.info(`Using config from ${chalk_1.default.italic(defaultConfigPath)}`);
        }
        else {
            logger_1.default.error('No config found, please specify a config file with the --config flag, a target with the --target flag, or run this command from a directory with a promptfooconfig.yaml file.');
            process.exitCode = 1;
            return;
        }
        try {
            const discoveryResult = await doTargetPurposeDiscovery(target);
            if (discoveryResult) {
                if (discoveryResult.purpose) {
                    logger_1.default.info(chalk_1.default.bold(chalk_1.default.green('\nThe target believes its purpose is:\n')));
                    logger_1.default.info(discoveryResult.purpose);
                }
                if (discoveryResult.limitations) {
                    logger_1.default.info(chalk_1.default.bold(chalk_1.default.green('\nThe target believes its limitations to be:\n')));
                    logger_1.default.info(discoveryResult.limitations);
                }
                if (discoveryResult.tools) {
                    logger_1.default.info(chalk_1.default.bold(chalk_1.default.green('\nThe target divulged access to these tools:\n')));
                    logger_1.default.info(JSON.stringify(discoveryResult.tools, null, 2));
                }
                if (discoveryResult.user) {
                    logger_1.default.info(chalk_1.default.bold(chalk_1.default.green('\nThe target believes the user of the application is:\n')));
                    logger_1.default.info(discoveryResult.user);
                }
            }
        }
        catch (error) {
            logger_1.default.error(`An unexpected error occurred during target discovery: ${error instanceof Error ? error.message : String(error)}\n${error instanceof Error ? error.stack : ''}`);
            process.exit(1);
        }
        process.exit();
    });
}
//# sourceMappingURL=discover.js.map