"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redteamRunCommand = redteamRunCommand;
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const zod_1 = require("zod");
const cliState_1 = __importDefault(require("../../cliState"));
const constants_1 = require("../../constants");
const logger_1 = __importDefault(require("../../logger"));
const telemetry_1 = __importDefault(require("../../telemetry"));
const util_1 = require("../../util");
const cloud_1 = require("../../util/cloud");
const shared_1 = require("../shared");
const poison_1 = require("./poison");
const UUID_REGEX = /^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}$/;
function redteamRunCommand(program) {
    program
        .command('run')
        .description((0, dedent_1.default) `
        ${chalk_1.default.red('Red team')} a target application, a two-step process:

        1. Generates dynamic attack probes (i.e. test cases) tailored to your target application using specialized uncensored models.
        2. Evaluates the generated probes against your target application.
      `)
        .option('-c, --config [path]', 'Path to configuration file or cloud config UUID. Defaults to promptfooconfig.yaml')
        .option('-o, --output [path]', 'Path to output file for generated tests. Defaults to redteam.yaml in the same directory as the configuration file.')
        .option('--no-cache', 'Do not read or write results to disk cache', false)
        .option('-j, --max-concurrency <number>', 'Maximum number of concurrent API calls', (val) => Number.parseInt(val, 10))
        .option('--delay <number>', 'Delay in milliseconds between API calls', (val) => Number.parseInt(val, 10))
        .option('--remote', 'Force remote inference wherever possible', false)
        .option('--force', 'Force generation even if no changes are detected', false)
        .option('--no-progress-bar', 'Do not show progress bar')
        .option('--filter-providers, --filter-targets <providers>', 'Only run tests with these providers (regex match)')
        .option('-t, --target <id>', 'Cloud provider target ID to run the scan on')
        .action(async (opts) => {
        (0, util_1.setupEnv)(opts.envPath);
        telemetry_1.default.record('command_used', {
            name: 'redteam run',
        });
        await telemetry_1.default.send();
        if (opts.config && UUID_REGEX.test(opts.config)) {
            if (opts.target && !UUID_REGEX.test(opts.target)) {
                throw new Error('Invalid target ID, it must be a valid UUID');
            }
            const configObj = await (0, cloud_1.getConfigFromCloud)(opts.config, opts.target);
            // backwards compatible for old cloud servers
            if (opts.target &&
                UUID_REGEX.test(opts.target) &&
                (!configObj.targets || configObj.targets?.length === 0)) {
                configObj.targets = [{ id: `${constants_1.CLOUD_PROVIDER_PREFIX}${opts.target}`, config: {} }];
            }
            opts.liveRedteamConfig = configObj;
            opts.config = undefined;
            opts.loadedFromCloud = true;
        }
        else if (opts.target) {
            logger_1.default.error(`Target ID (-t) can only be used when -c is used. To use a cloud target inside of a config set the id of the target to ${constants_1.CLOUD_PROVIDER_PREFIX}${opts.target}. `);
            process.exitCode = 1;
            return;
        }
        try {
            if (opts.remote) {
                cliState_1.default.remote = true;
            }
            await (0, shared_1.doRedteamRun)(opts);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                logger_1.default.error('Invalid options:');
                error.errors.forEach((err) => {
                    logger_1.default.error(`  ${err.path.join('.')}: ${err.message}`);
                });
            }
            else {
                logger_1.default.error(`An unexpected error occurred during red team run: ${error instanceof Error ? error.message : String(error)}\n${error instanceof Error ? error.stack : ''}`);
            }
            process.exitCode = 1;
        }
    });
    (0, poison_1.poisonCommand)(program);
}
//# sourceMappingURL=run.js.map