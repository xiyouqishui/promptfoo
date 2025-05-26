"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOUD_PROVIDER_PREFIX = exports.TERMINAL_MAX_WIDTH = exports.DEFAULT_API_BASE_URL = exports.DEFAULT_QUERY_LIMIT = exports.VERSION = void 0;
exports.getShareApiBaseUrl = getShareApiBaseUrl;
exports.getDefaultShareViewBaseUrl = getDefaultShareViewBaseUrl;
exports.getShareViewBaseUrl = getShareViewBaseUrl;
exports.getDefaultPort = getDefaultPort;
const package_json_1 = __importDefault(require("../package.json"));
const envars_1 = require("./envars");
exports.VERSION = package_json_1.default.version;
exports.DEFAULT_QUERY_LIMIT = 100;
// Default API base URL used for sharing and other API operations
exports.DEFAULT_API_BASE_URL = 'https://api.promptfoo.app';
// This is used for sharing evals.
function getShareApiBaseUrl() {
    return (
    // TODO(ian): Backwards compatibility, 2024-04-01
    (0, envars_1.getEnvString)('NEXT_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL') ||
        (0, envars_1.getEnvString)('NEXT_PUBLIC_PROMPTFOO_BASE_URL') ||
        (0, envars_1.getEnvString)('PROMPTFOO_REMOTE_API_BASE_URL') ||
        exports.DEFAULT_API_BASE_URL);
}
function getDefaultShareViewBaseUrl() {
    return (0, envars_1.getEnvString)('PROMPTFOO_SHARING_APP_BASE_URL', `https://promptfoo.app`);
}
// This is used for creating shared eval links.
function getShareViewBaseUrl() {
    return ((0, envars_1.getEnvString)('NEXT_PUBLIC_PROMPTFOO_BASE_URL') ||
        (0, envars_1.getEnvString)('PROMPTFOO_REMOTE_APP_BASE_URL') ||
        getDefaultShareViewBaseUrl());
}
function getDefaultPort() {
    return (0, envars_1.getEnvInt)('API_PORT', 15500);
}
// Maximum width for terminal outputs.
exports.TERMINAL_MAX_WIDTH = process?.stdout?.isTTY && process?.stdout?.columns && process?.stdout?.columns > 10
    ? process?.stdout?.columns - 10
    : 120;
exports.CLOUD_PROVIDER_PREFIX = 'promptfoo://provider/';
//# sourceMappingURL=constants.js.map