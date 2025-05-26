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
exports.doRedteamRun = doRedteamRun;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const eval_1 = require("../commands/eval");
const logger_1 = __importStar(require("../logger"));
const share_1 = require("../share");
const util_1 = require("../util");
const apiHealth_1 = require("../util/apiHealth");
const default_1 = require("../util/config/default");
const generate_1 = require("./commands/generate");
const remoteGeneration_1 = require("./remoteGeneration");
async function doRedteamRun(options) {
    if (options.verbose) {
        (0, logger_1.setLogLevel)('debug');
    }
    if (options.logCallback) {
        (0, logger_1.setLogCallback)(options.logCallback);
    }
    let configPath = options.config ?? 'promptfooconfig.yaml';
    // If output filepath is not provided, locate the out file in the same directory as the config file:
    let redteamPath;
    if (options.output) {
        redteamPath = options.output;
    }
    else {
        const configDir = path.dirname(configPath);
        redteamPath = path.join(configDir, 'redteam.yaml');
    }
    // Check API health before proceeding
    try {
        const healthUrl = (0, remoteGeneration_1.getRemoteHealthUrl)();
        if (healthUrl) {
            logger_1.default.debug(`Checking Promptfoo API health at ${healthUrl}...`);
            const healthResult = await (0, apiHealth_1.checkRemoteHealth)(healthUrl);
            if (healthResult.status !== 'OK') {
                throw new Error(`Unable to proceed with redteam: ${healthResult.message}\n` +
                    'Please check your API configuration or try again later.');
            }
            logger_1.default.debug('API health check passed');
        }
    }
    catch (error) {
        logger_1.default.warn(`API health check failed with error: ${error}.\nPlease check your API configuration or try again later.`);
    }
    if (options.liveRedteamConfig) {
        // Write liveRedteamConfig to a temporary file
        const filename = options.loadedFromCloud ? `redteam-${Date.now()}.yaml` : 'redteam.yaml';
        const tmpDir = options.loadedFromCloud ? '' : os.tmpdir();
        const tmpFile = path.join(tmpDir, filename);
        fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
        fs.writeFileSync(tmpFile, js_yaml_1.default.dump(options.liveRedteamConfig));
        redteamPath = tmpFile;
        // Do not use default config.
        configPath = tmpFile;
        logger_1.default.debug(`Using live config from ${tmpFile}`);
        logger_1.default.debug(`Live config: ${JSON.stringify(options.liveRedteamConfig, null, 2)}`);
    }
    // Generate new test cases
    logger_1.default.info('Generating test cases...');
    const redteamConfig = await (0, generate_1.doGenerateRedteam)({
        ...options,
        ...(options.liveRedteamConfig?.commandLineOptions || {}),
        config: configPath,
        output: redteamPath,
        force: options.force,
        verbose: options.verbose,
        delay: options.delay,
        inRedteamRun: true,
        abortSignal: options.abortSignal,
        progressBar: options.progressBar,
    });
    // Check if redteam.yaml exists before running evaluation
    if (!redteamConfig || !fs.existsSync(redteamPath)) {
        logger_1.default.info('No test cases generated. Skipping scan.');
        return;
    }
    // Run evaluation
    logger_1.default.info('Running scan...');
    const { defaultConfig } = await (0, default_1.loadDefaultConfig)();
    const evalResult = await (0, eval_1.doEval)({
        ...options,
        config: [redteamPath],
        output: options.output ? [options.output] : undefined,
        cache: true,
        write: true,
        filterProviders: options.filterProviders,
        filterTargets: options.filterTargets,
    }, defaultConfig, redteamPath, {
        showProgressBar: options.progressBar,
        abortSignal: options.abortSignal,
        progressCallback: options.progressCallback,
    });
    logger_1.default.info(chalk_1.default.green('\nRed team scan complete!'));
    const command = (0, util_1.isRunningUnderNpx)() ? 'npx promptfoo' : 'promptfoo';
    if (options.loadedFromCloud) {
        const url = await (0, share_1.createShareableUrl)(evalResult, false);
        logger_1.default.info(`View results: ${chalk_1.default.greenBright.bold(url)}`);
    }
    else {
        if (options.liveRedteamConfig) {
            logger_1.default.info(chalk_1.default.blue(`To view the results, click the ${chalk_1.default.bold('View Report')} button or run ${chalk_1.default.bold(`${command} redteam report`)} on the command line.`));
        }
        else {
            logger_1.default.info(chalk_1.default.blue(`To view the results, run ${chalk_1.default.bold(`${command} redteam report`)}`));
        }
    }
    // Clear the callback when done
    (0, logger_1.setLogCallback)(null);
    return evalResult;
}
//# sourceMappingURL=shared.js.map