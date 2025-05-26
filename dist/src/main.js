#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCommonOptionsRecursively = addCommonOptionsRecursively;
const commander_1 = require("commander");
const package_json_1 = require("../package.json");
const checkNodeVersion_1 = require("./checkNodeVersion");
const auth_1 = require("./commands/auth");
const cache_1 = require("./commands/cache");
const config_1 = require("./commands/config");
const debug_1 = require("./commands/debug");
const delete_1 = require("./commands/delete");
const eval_1 = require("./commands/eval");
const export_1 = require("./commands/export");
const feedback_1 = require("./commands/feedback");
const dataset_1 = require("./commands/generate/dataset");
const import_1 = require("./commands/import");
const init_1 = require("./commands/init");
const list_1 = require("./commands/list");
const modelScan_1 = require("./commands/modelScan");
const share_1 = require("./commands/share");
const show_1 = require("./commands/show");
const view_1 = require("./commands/view");
const logger_1 = __importStar(require("./logger"));
const migrate_1 = require("./migrate");
const discover_1 = require("./redteam/commands/discover");
const generate_1 = require("./redteam/commands/generate");
const init_2 = require("./redteam/commands/init");
const plugins_1 = require("./redteam/commands/plugins");
const report_1 = require("./redteam/commands/report");
const run_1 = require("./redteam/commands/run");
const setup_1 = require("./redteam/commands/setup");
const updates_1 = require("./updates");
const util_1 = require("./util");
const default_1 = require("./util/config/default");
/**
 * Adds verbose and env-file options to all commands recursively
 */
function addCommonOptionsRecursively(command) {
    const hasVerboseOption = command.options.some((option) => option.short === '-v' || option.long === '--verbose');
    if (!hasVerboseOption) {
        command.option('-v, --verbose', 'Show debug logs', false);
    }
    const hasEnvFileOption = command.options.some((option) => option.long === '--env-file' || option.long === '--env-path');
    if (!hasEnvFileOption) {
        command.option('--env-file, --env-path <path>', 'Path to .env file');
    }
    command.hook('preAction', (thisCommand) => {
        if (thisCommand.opts().verbose) {
            (0, logger_1.setLogLevel)('debug');
            logger_1.default.debug('Verbose mode enabled via --verbose flag');
        }
        const envPath = thisCommand.opts().envFile || thisCommand.opts().envPath;
        if (envPath) {
            (0, util_1.setupEnv)(envPath);
            logger_1.default.debug(`Loading environment from ${envPath}`);
        }
    });
    command.commands.forEach((subCommand) => {
        addCommonOptionsRecursively(subCommand);
    });
}
async function main() {
    await (0, updates_1.checkForUpdates)();
    await (0, migrate_1.runDbMigrations)();
    const { defaultConfig, defaultConfigPath } = await (0, default_1.loadDefaultConfig)();
    const program = new commander_1.Command('promptfoo');
    program
        .version(package_json_1.version)
        .showHelpAfterError()
        .showSuggestionAfterError()
        .on('option:*', function () {
        logger_1.default.error('Invalid option(s)');
        program.help();
        process.exitCode = 1;
    });
    // Main commands
    (0, eval_1.evalCommand)(program, defaultConfig, defaultConfigPath);
    (0, init_1.initCommand)(program);
    (0, view_1.viewCommand)(program);
    const redteamBaseCommand = program.command('redteam').description('Red team LLM applications');
    (0, share_1.shareCommand)(program);
    // Alphabetical order
    (0, auth_1.authCommand)(program);
    (0, cache_1.cacheCommand)(program);
    (0, config_1.configCommand)(program);
    (0, debug_1.debugCommand)(program, defaultConfig, defaultConfigPath);
    (0, delete_1.deleteCommand)(program);
    (0, export_1.exportCommand)(program);
    const generateCommand = program.command('generate').description('Generate synthetic data');
    (0, feedback_1.feedbackCommand)(program);
    (0, import_1.importCommand)(program);
    (0, list_1.listCommand)(program);
    (0, modelScan_1.modelScanCommand)(program);
    (0, show_1.showCommand)(program);
    (0, dataset_1.generateDatasetCommand)(generateCommand, defaultConfig, defaultConfigPath);
    (0, generate_1.redteamGenerateCommand)(generateCommand, 'redteam', defaultConfig, defaultConfigPath);
    const { defaultConfig: redteamConfig, defaultConfigPath: redteamConfigPath } = await (0, default_1.loadDefaultConfig)(undefined, 'redteam');
    (0, init_2.initCommand)(redteamBaseCommand);
    (0, eval_1.evalCommand)(redteamBaseCommand, redteamConfig ?? defaultConfig, redteamConfigPath ?? defaultConfigPath);
    (0, discover_1.discoverCommand)(redteamBaseCommand, defaultConfig, defaultConfigPath);
    (0, generate_1.redteamGenerateCommand)(redteamBaseCommand, 'generate', defaultConfig, defaultConfigPath);
    (0, run_1.redteamRunCommand)(redteamBaseCommand);
    (0, report_1.redteamReportCommand)(redteamBaseCommand);
    (0, setup_1.redteamSetupCommand)(redteamBaseCommand);
    (0, plugins_1.pluginsCommand)(redteamBaseCommand);
    // Add common options to all commands recursively
    addCommonOptionsRecursively(program);
    program.parse();
}
if (require.main === module) {
    (0, checkNodeVersion_1.checkNodeVersion)();
    main();
}
//# sourceMappingURL=main.js.map