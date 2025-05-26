"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvString = getEnvString;
exports.getEnvBool = getEnvBool;
exports.getEnvInt = getEnvInt;
exports.getEnvFloat = getEnvFloat;
exports.getEvalTimeoutMs = getEvalTimeoutMs;
exports.isCI = isCI;
require("dotenv/config");
const cliState_1 = __importDefault(require("./cliState"));
function getEnvString(key, defaultValue) {
    // First check if the key exists in CLI state env config
    if (cliState_1.default.config?.env && typeof cliState_1.default.config.env === 'object') {
        // Handle both ProviderEnvOverridesSchema and Record<string, string|number|boolean> type
        const envValue = cliState_1.default.config.env[key];
        if (envValue !== undefined) {
            return String(envValue);
        }
    }
    // Fallback to process.env
    const value = process.env[key];
    if (value === undefined) {
        return defaultValue;
    }
    return value;
}
/**
 * Get a boolean environment variable.
 * @param key The name of the environment variable.
 * @param defaultValue Optional default value if the environment variable is not set.
 * @returns The boolean value of the environment variable, or the default value if provided.
 */
function getEnvBool(key, defaultValue) {
    const value = getEnvString(key) || defaultValue;
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return ['1', 'true', 'yes', 'yup', 'yeppers'].includes(value.toLowerCase());
    }
    return Boolean(defaultValue);
}
function getEnvInt(key, defaultValue) {
    const value = getEnvString(key) || defaultValue;
    if (typeof value === 'number') {
        return Math.floor(value);
    }
    if (typeof value === 'string') {
        const parsedValue = Number.parseInt(value, 10);
        if (!Number.isNaN(parsedValue)) {
            return parsedValue;
        }
    }
    return defaultValue;
}
function getEnvFloat(key, defaultValue) {
    const value = getEnvString(key) || defaultValue;
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsedValue = Number.parseFloat(value);
        if (!Number.isNaN(parsedValue)) {
            return parsedValue;
        }
    }
    return defaultValue;
}
/**
 * Get the evaluation timeout in milliseconds.
 * @param defaultValue Optional default value if the environment variable is not set. Defaults to 0 (no timeout).
 * @returns The timeout value in milliseconds, or the default value if not set.
 */
function getEvalTimeoutMs(defaultValue = 0) {
    return getEnvInt('PROMPTFOO_EVAL_TIMEOUT_MS', defaultValue);
}
/**
 * Check if the application is running in a CI environment.
 * @returns True if running in a CI environment, false otherwise.
 */
function isCI() {
    return (getEnvBool('CI') ||
        getEnvBool('GITHUB_ACTIONS') ||
        getEnvBool('TRAVIS') ||
        getEnvBool('CIRCLECI') ||
        getEnvBool('JENKINS') ||
        getEnvBool('GITLAB_CI') ||
        getEnvBool('APPVEYOR') ||
        getEnvBool('CODEBUILD_BUILD_ID') ||
        getEnvBool('TF_BUILD') ||
        getEnvBool('BITBUCKET_COMMIT') ||
        getEnvBool('BUDDY') ||
        getEnvBool('BUILDKITE') ||
        getEnvBool('TEAMCITY_VERSION'));
}
//# sourceMappingURL=envars.js.map