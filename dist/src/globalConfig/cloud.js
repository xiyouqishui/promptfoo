"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudConfig = exports.CloudConfig = exports.API_HOST = void 0;
const chalk_1 = __importDefault(require("chalk"));
const envars_1 = require("../envars");
const fetch_1 = require("../fetch");
const logger_1 = __importDefault(require("../logger"));
const globalConfig_1 = require("./globalConfig");
exports.API_HOST = (0, envars_1.getEnvString)('API_HOST', 'https://api.promptfoo.app');
class CloudConfig {
    constructor() {
        const savedConfig = (0, globalConfig_1.readGlobalConfig)()?.cloud || {};
        this.config = {
            appUrl: savedConfig.appUrl || 'https://www.promptfoo.app',
            apiHost: savedConfig.apiHost || exports.API_HOST,
            apiKey: savedConfig.apiKey,
        };
    }
    isEnabled() {
        return !!this.config.apiKey;
    }
    setApiHost(apiHost) {
        this.config.apiHost = apiHost;
        this.saveConfig();
    }
    setApiKey(apiKey) {
        this.config.apiKey = apiKey;
        this.saveConfig();
    }
    getApiKey() {
        return this.config.apiKey;
    }
    getApiHost() {
        return this.config.apiHost;
    }
    setAppUrl(appUrl) {
        this.config.appUrl = appUrl;
        this.saveConfig();
    }
    getAppUrl() {
        return this.config.appUrl;
    }
    delete() {
        (0, globalConfig_1.writeGlobalConfigPartial)({ cloud: {} });
    }
    saveConfig() {
        (0, globalConfig_1.writeGlobalConfigPartial)({ cloud: this.config });
        this.reload();
    }
    reload() {
        const savedConfig = (0, globalConfig_1.readGlobalConfig)()?.cloud || {};
        this.config = {
            appUrl: savedConfig.appUrl || 'https://www.promptfoo.app',
            apiHost: savedConfig.apiHost || exports.API_HOST,
            apiKey: savedConfig.apiKey,
        };
    }
    async validateAndSetApiToken(token, apiHost) {
        try {
            const response = await (0, fetch_1.fetchWithProxy)(`${apiHost}/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                const errorMessage = await response.text();
                logger_1.default.error(`[Cloud] Failed to validate API token: ${errorMessage}. HTTP Status: ${response.status} - ${response.statusText}.`);
                throw new Error('Failed to validate API token: ' + response.statusText);
            }
            const { user, organization, app } = await response.json();
            this.setApiKey(token);
            this.setApiHost(apiHost);
            this.setAppUrl(app.url);
            logger_1.default.info(chalk_1.default.green.bold('Successfully logged in'));
            logger_1.default.info(chalk_1.default.dim('Logged in as:'));
            logger_1.default.info(`User: ${chalk_1.default.cyan(user.email)}`);
            logger_1.default.info(`Organization: ${chalk_1.default.cyan(organization.name)}`);
            logger_1.default.info(`Access the app at ${chalk_1.default.cyan(app.url)}`);
            return {
                user,
                organization,
                app,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.default.error(`[Cloud] Failed to validate API token with host ${apiHost}: ${errorMessage}`);
            if (error.cause) {
                logger_1.default.error(`Cause: ${error.cause}`);
            }
            throw error;
        }
    }
}
exports.CloudConfig = CloudConfig;
// singleton instance
exports.cloudConfig = new CloudConfig();
//# sourceMappingURL=cloud.js.map