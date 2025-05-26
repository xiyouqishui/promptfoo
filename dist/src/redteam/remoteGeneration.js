"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemoteGenerationUrl = getRemoteGenerationUrl;
exports.neverGenerateRemote = neverGenerateRemote;
exports.getRemoteHealthUrl = getRemoteHealthUrl;
exports.shouldGenerateRemote = shouldGenerateRemote;
exports.getRemoteGenerationUrlForUnaligned = getRemoteGenerationUrlForUnaligned;
const cliState_1 = __importDefault(require("../cliState"));
const envars_1 = require("../envars");
const cloud_1 = require("../globalConfig/cloud");
function getRemoteGenerationUrl() {
    // Check env var first
    const envUrl = (0, envars_1.getEnvString)('PROMPTFOO_REMOTE_GENERATION_URL');
    if (envUrl) {
        return envUrl;
    }
    // If logged into cloud use that url + /task
    const cloudConfig = new cloud_1.CloudConfig();
    if (cloudConfig.isEnabled()) {
        return cloudConfig.getApiHost() + '/api/v1/task';
    }
    // otherwise use the default
    return 'https://api.promptfoo.app/api/v1/task';
}
function neverGenerateRemote() {
    return (0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION');
}
/**
 * Gets the URL for checking remote API health based on configuration.
 * @returns The health check URL, or null if remote generation is disabled.
 */
function getRemoteHealthUrl() {
    if (neverGenerateRemote()) {
        return null;
    }
    const envUrl = (0, envars_1.getEnvString)('PROMPTFOO_REMOTE_GENERATION_URL');
    if (envUrl) {
        try {
            const url = new URL(envUrl);
            url.pathname = '/health';
            return url.toString();
        }
        catch {
            return 'https://api.promptfoo.app/health';
        }
    }
    const cloudConfig = new cloud_1.CloudConfig();
    if (cloudConfig.isEnabled()) {
        return `${cloudConfig.getApiHost()}/health`;
    }
    return 'https://api.promptfoo.app/health';
}
function shouldGenerateRemote() {
    // Generate remotely when the user has not disabled it and does not have an OpenAI key.
    return (!neverGenerateRemote() && !(0, envars_1.getEnvString)('OPENAI_API_KEY')) || (cliState_1.default.remote ?? false);
}
function getRemoteGenerationUrlForUnaligned() {
    // Check env var first
    const envUrl = (0, envars_1.getEnvString)('PROMPTFOO_UNALIGNED_INFERENCE_ENDPOINT');
    if (envUrl) {
        return envUrl;
    }
    // If logged into cloud use that url + /task
    const cloudConfig = new cloud_1.CloudConfig();
    if (cloudConfig.isEnabled()) {
        return cloudConfig.getApiHost() + '/api/v1/task/harmful';
    }
    // otherwise use the default
    return 'https://api.promptfoo.app/api/v1/task/harmful';
}
//# sourceMappingURL=remoteGeneration.js.map