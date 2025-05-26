"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authCommand = authCommand;
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const fetch_1 = require("../fetch");
const accounts_1 = require("../globalConfig/accounts");
const cloud_1 = require("../globalConfig/cloud");
const logger_1 = __importDefault(require("../logger"));
const telemetry_1 = __importDefault(require("../telemetry"));
function authCommand(program) {
    const authCommand = program.command('auth').description('Manage authentication');
    authCommand
        .command('login')
        .description('Login')
        .option('-o, --org <orgId>', 'The organization id to login to.')
        .option('-h,--host <host>', 'The host of the promptfoo instance. This needs to be the url of the API if different from the app url.')
        .option('-k, --api-key <apiKey>', 'Login using an API key.')
        .action(async (cmdObj) => {
        let token;
        const apiHost = cmdObj.host || cloud_1.cloudConfig.getApiHost();
        telemetry_1.default.record('command_used', {
            name: 'auth login',
        });
        await telemetry_1.default.send();
        try {
            if (cmdObj.apiKey) {
                token = cmdObj.apiKey;
                const { user } = await cloud_1.cloudConfig.validateAndSetApiToken(token, apiHost);
                // Store token in global config and handle email sync
                const existingEmail = (0, accounts_1.getUserEmail)();
                if (existingEmail && existingEmail !== user.email) {
                    logger_1.default.info(chalk_1.default.yellow(`Updating local email configuration from ${existingEmail} to ${user.email}`));
                }
                (0, accounts_1.setUserEmail)(user.email);
                logger_1.default.info(chalk_1.default.green('Successfully logged in'));
                return;
            }
            else {
                logger_1.default.info(`Please login or sign up at ${chalk_1.default.green('https://promptfoo.app')} to get an API key.`);
                logger_1.default.info(`After logging in, you can get your api token at ${chalk_1.default.green('https://promptfoo.app/welcome')}`);
            }
            return;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.default.error(`Authentication failed: ${errorMessage}`);
            process.exitCode = 1;
            return;
        }
    });
    authCommand
        .command('logout')
        .description('Logout')
        .action(async () => {
        const email = (0, accounts_1.getUserEmail)();
        const apiKey = cloud_1.cloudConfig.getApiKey();
        if (!email && !apiKey) {
            logger_1.default.info(chalk_1.default.yellow("You're already logged out - no active session to terminate"));
            return;
        }
        await cloud_1.cloudConfig.delete();
        // Always unset email on logout
        (0, accounts_1.setUserEmail)('');
        logger_1.default.info(chalk_1.default.green('Successfully logged out'));
        return;
    });
    authCommand
        .command('whoami')
        .description('Show current user information')
        .action(async () => {
        try {
            const email = (0, accounts_1.getUserEmail)();
            const apiKey = cloud_1.cloudConfig.getApiKey();
            if (!email || !apiKey) {
                logger_1.default.info(`Not logged in. Run ${chalk_1.default.bold('promptfoo auth login')} to login.`);
                return;
            }
            const apiHost = cloud_1.cloudConfig.getApiHost();
            const response = await (0, fetch_1.fetchWithProxy)(`${apiHost}/users/me`, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch user info: ' + response.statusText);
            }
            const { user, organization } = await response.json();
            logger_1.default.info((0, dedent_1.default) `
            ${chalk_1.default.green.bold('Currently logged in as:')}
            User: ${chalk_1.default.cyan(user.email)}
            Organization: ${chalk_1.default.cyan(organization.name)}
            App URL: ${chalk_1.default.cyan(cloud_1.cloudConfig.getAppUrl())}`);
            telemetry_1.default.record('command_used', {
                name: 'auth whoami',
            });
            await telemetry_1.default.send();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.default.error(`Failed to get user info: ${errorMessage}`);
            process.exitCode = 1;
        }
    });
}
//# sourceMappingURL=auth.js.map