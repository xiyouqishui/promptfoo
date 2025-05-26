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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugCommand = debugCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const package_json_1 = require("../../package.json");
const envars_1 = require("../envars");
const logger_1 = __importDefault(require("../logger"));
const util_1 = require("../util");
const load_1 = require("../util/config/load");
async function doDebug(options) {
    const debugInfo = {
        version: package_json_1.version,
        platform: {
            os: os.platform(),
            release: os.release(),
            arch: os.arch(),
            nodeVersion: process.version,
        },
        env: {
            NODE_ENV: (0, envars_1.getEnvString)('NODE_ENV'),
            httpProxy: (0, envars_1.getEnvString)('HTTP_PROXY') || (0, envars_1.getEnvString)('http_proxy'),
            httpsProxy: (0, envars_1.getEnvString)('HTTPS_PROXY') || (0, envars_1.getEnvString)('https_proxy'),
            allProxy: (0, envars_1.getEnvString)('ALL_PROXY') || (0, envars_1.getEnvString)('all_proxy'),
            noProxy: (0, envars_1.getEnvString)('NO_PROXY') || (0, envars_1.getEnvString)('no_proxy'),
            nodeExtra: (0, envars_1.getEnvString)('NODE_EXTRA_CA_CERTS'),
            nodeTls: (0, envars_1.getEnvString)('NODE_TLS_REJECT_UNAUTHORIZED'),
        },
        configInfo: {
            defaultConfigPath: options.defaultConfigPath,
            specifiedConfigPath: options.config,
            configExists: false,
            configContent: null,
        },
    };
    // Try to load config if available
    const configPath = options.config || options.defaultConfigPath;
    if (configPath && fs.existsSync(configPath)) {
        debugInfo.configInfo.configExists = true;
        try {
            const resolved = await (0, load_1.resolveConfigs)({
                config: [configPath],
            }, options.defaultConfig);
            debugInfo.configInfo.configContent = resolved;
        }
        catch (err) {
            debugInfo.configInfo.configContent = `Error loading config: ${err}`;
        }
    }
    (0, util_1.printBorder)();
    logger_1.default.info(chalk_1.default.bold('Promptfoo Debug Information'));
    (0, util_1.printBorder)();
    logger_1.default.info(JSON.stringify(debugInfo, null, 2));
    (0, util_1.printBorder)();
    logger_1.default.info(chalk_1.default.yellow('Please include this output when reporting issues on GitHub: https://github.com/promptfoo/promptfoo/issues'));
}
function debugCommand(program, defaultConfig, defaultConfigPath) {
    program
        .command('debug')
        .description('Display debug information for troubleshooting')
        .option('-c, --config [path]', 'Path to configuration file. Defaults to promptfooconfig.yaml')
        .action((opts) => doDebug({ ...opts, defaultConfig, defaultConfigPath }));
}
//# sourceMappingURL=debug.js.map