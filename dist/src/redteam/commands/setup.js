"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redteamSetupCommand = redteamSetupCommand;
const constants_1 = require("../../constants");
const server_1 = require("../../server/server");
const telemetry_1 = __importDefault(require("../../telemetry"));
const util_1 = require("../../util");
const manage_1 = require("../../util/config/manage");
const server_2 = require("../../util/server");
function redteamSetupCommand(program) {
    program
        .command('setup [configDirectory]')
        .description('Start browser UI and open to redteam setup')
        .option('-p, --port <number>', 'Port number', (0, constants_1.getDefaultPort)().toString())
        .option('--filter-description <pattern>', 'Filter evals by description using a regex pattern')
        .option('--env-file, --env-path <path>', 'Path to .env file')
        .action(async (directory, cmdObj) => {
        (0, util_1.setupEnv)(cmdObj.envPath);
        telemetry_1.default.record('command_used', {
            name: 'redteam setup',
        });
        await telemetry_1.default.send();
        if (directory) {
            (0, manage_1.setConfigDirectoryPath)(directory);
        }
        const isRunning = await (0, server_2.checkServerRunning)();
        const browserBehavior = server_2.BrowserBehavior.OPEN_TO_REDTEAM_CREATE;
        if (isRunning) {
            await (0, server_2.openBrowser)(browserBehavior);
        }
        else {
            await (0, server_1.startServer)(cmdObj.port, browserBehavior, cmdObj.filterDescription);
        }
    });
}
//# sourceMappingURL=setup.js.map