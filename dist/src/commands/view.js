"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewCommand = viewCommand;
const constants_1 = require("../constants");
const server_1 = require("../server/server");
const telemetry_1 = __importDefault(require("../telemetry"));
const util_1 = require("../util");
const manage_1 = require("../util/config/manage");
const server_2 = require("../util/server");
function viewCommand(program) {
    program
        .command('view [directory]')
        .description('Start browser UI')
        .option('-p, --port <number>', 'Port number', (0, constants_1.getDefaultPort)().toString())
        .option('-y, --yes', 'Skip confirmation and auto-open the URL')
        .option('-n, --no', 'Skip confirmation and do not open the URL')
        .option('--filter-description <pattern>', 'Filter evals by description using a regex pattern')
        .option('--env-file, --env-path <path>', 'Path to .env file')
        .action(async (directory, cmdObj) => {
        (0, util_1.setupEnv)(cmdObj.envPath);
        telemetry_1.default.record('command_used', {
            name: 'view',
        });
        await telemetry_1.default.send();
        if (directory) {
            (0, manage_1.setConfigDirectoryPath)(directory);
        }
        // Block indefinitely on server
        const browserBehavior = cmdObj.yes
            ? server_2.BrowserBehavior.OPEN
            : cmdObj.no
                ? server_2.BrowserBehavior.SKIP
                : server_2.BrowserBehavior.ASK;
        await (0, server_1.startServer)(cmdObj.port, browserBehavior, cmdObj.filterDescription);
    });
}
//# sourceMappingURL=view.js.map