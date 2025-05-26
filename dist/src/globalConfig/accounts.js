"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserEmail = getUserEmail;
exports.setUserEmail = setUserEmail;
exports.getAuthor = getAuthor;
exports.promptForEmailUnverified = promptForEmailUnverified;
exports.checkEmailStatusOrExit = checkEmailStatusOrExit;
const input_1 = __importDefault(require("@inquirer/input"));
const chalk_1 = __importDefault(require("chalk"));
const zod_1 = require("zod");
const constants_1 = require("../constants");
const envars_1 = require("../envars");
const fetch_1 = require("../fetch");
const logger_1 = __importDefault(require("../logger"));
const telemetry_1 = __importDefault(require("../telemetry"));
const globalConfig_1 = require("./globalConfig");
function getUserEmail() {
    const globalConfig = (0, globalConfig_1.readGlobalConfig)();
    return globalConfig?.account?.email || null;
}
function setUserEmail(email) {
    const config = { account: { email } };
    (0, globalConfig_1.writeGlobalConfigPartial)(config);
}
function getAuthor() {
    return (0, envars_1.getEnvString)('PROMPTFOO_AUTHOR') || getUserEmail() || null;
}
async function promptForEmailUnverified() {
    let email = (0, envars_1.isCI)() ? 'ci-placeholder@promptfoo.dev' : getUserEmail();
    if (!email) {
        await telemetry_1.default.record('feature_used', {
            feature: 'promptForEmailUnverified',
        });
        const emailSchema = zod_1.z.string().email('Please enter a valid email address');
        email = await (0, input_1.default)({
            message: 'Redteam evals require email verification. Please enter your work email:',
            validate: (input) => {
                const result = emailSchema.safeParse(input);
                return result.success || result.error.errors[0].message;
            },
        });
        setUserEmail(email);
        await telemetry_1.default.record('feature_used', {
            feature: 'userCompletedPromptForEmailUnverified',
        });
    }
    await telemetry_1.default.saveConsent(email, {
        source: 'promptForEmailUnverified',
    });
}
async function checkEmailStatusOrExit() {
    const email = (0, envars_1.isCI)() ? 'ci-placeholder@promptfoo.dev' : getUserEmail();
    if (!email) {
        logger_1.default.debug('Skipping email status check because email is not set');
        return;
    }
    try {
        const resp = await (0, fetch_1.fetchWithTimeout)(`https://api.promptfoo.app/api/users/status?email=${email}`, undefined, 500);
        const data = (await resp.json());
        if (data?.status === 'exceeded_limit') {
            logger_1.default.error('You have exceeded the maximum cloud inference limit. Please contact inquiries@promptfoo.dev to upgrade your account.');
            process.exit(1);
        }
        if (data?.status === 'show_usage_warning' && data?.message) {
            const border = '='.repeat(constants_1.TERMINAL_MAX_WIDTH);
            logger_1.default.info(chalk_1.default.yellow(border));
            logger_1.default.warn(chalk_1.default.yellow(data.message));
            logger_1.default.info(chalk_1.default.yellow(border));
        }
    }
    catch (e) {
        logger_1.default.debug(`Failed to check user status: ${e}`);
    }
}
//# sourceMappingURL=accounts.js.map