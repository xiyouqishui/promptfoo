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
exports.sourceMapSupportInitialized = exports.logger = exports.winstonLogger = exports.fileFormatter = exports.consoleFormatter = exports.LOG_LEVELS = exports.globalLogCallback = void 0;
exports.setLogCallback = setLogCallback;
exports.getLogLevel = getLogLevel;
exports.setLogLevel = setLogLevel;
exports.isDebugEnabled = isDebugEnabled;
exports.initializeSourceMapSupport = initializeSourceMapSupport;
exports.getCallerLocation = getCallerLocation;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
const envars_1 = require("./envars");
exports.globalLogCallback = null;
function setLogCallback(callback) {
    exports.globalLogCallback = callback;
}
exports.LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
// Lazy source map support - only loaded when debug is enabled
let sourceMapSupportInitialized = false;
exports.sourceMapSupportInitialized = sourceMapSupportInitialized;
async function initializeSourceMapSupport() {
    if (!sourceMapSupportInitialized) {
        try {
            const sourceMapSupport = await Promise.resolve().then(() => __importStar(require('source-map-support')));
            sourceMapSupport.install();
            exports.sourceMapSupportInitialized = sourceMapSupportInitialized = true;
        }
        catch {
            // Ignore errors. This happens in the production build, because source-map-support is a dev dependency.
        }
    }
}
/**
 * Gets the caller location (filename and line number)
 * @returns String with file location information
 */
function getCallerLocation() {
    try {
        const error = new Error();
        const stack = error.stack?.split('\n') || [];
        // Skip first 3 lines (Error, getCallerLocation, and the logger method)
        const callerLine = stack[3];
        if (callerLine) {
            // Handle different stack trace formats
            const matchParens = callerLine.match(/at (?:.*) \((.+):(\d+):(\d+)\)/);
            const matchNormal = callerLine.match(/at (.+):(\d+):(\d+)/);
            const match = matchParens || matchNormal;
            if (match) {
                // matchParens has filePath at index 1, matchNormal has it at index 1 too
                const filePath = match[1];
                const line = match[2];
                // Get just the filename from the path
                const fileName = path_1.default.basename(filePath);
                return `[${fileName}:${line}]`;
            }
        }
    }
    catch {
        // Silently handle any errors in stack trace parsing
    }
    return '';
}
/**
 * Extracts the actual message string from potentially nested info objects
 */
function extractMessage(info) {
    if (typeof info.message === 'object' && info.message !== null && 'message' in info.message) {
        return typeof info.message.message === 'string'
            ? info.message.message
            : String(info.message.message);
    }
    return typeof info.message === 'string' ? info.message : JSON.stringify(info.message);
}
exports.consoleFormatter = winston_1.default.format.printf((info) => {
    const message = extractMessage(info);
    // Call the callback if it exists
    if (exports.globalLogCallback) {
        (0, exports.globalLogCallback)(message);
    }
    const location = info.location ? `${info.location} ` : '';
    if (info.level === 'error') {
        return chalk_1.default.red(`${location}${message}`);
    }
    else if (info.level === 'warn') {
        return chalk_1.default.yellow(`${location}${message}`);
    }
    else if (info.level === 'info') {
        return `${location}${message}`;
    }
    else if (info.level === 'debug') {
        return `${chalk_1.default.cyan(location)}${message}`;
    }
    throw new Error(`Invalid log level: ${info.level}`);
});
exports.fileFormatter = winston_1.default.format.printf((info) => {
    const timestamp = new Date().toISOString();
    const location = info.location ? ` ${info.location}` : '';
    const message = extractMessage(info);
    return `${timestamp} [${info.level.toUpperCase()}]${location}: ${message}`;
});
exports.winstonLogger = winston_1.default.createLogger({
    levels: exports.LOG_LEVELS,
    transports: [
        new winston_1.default.transports.Console({
            level: (0, envars_1.getEnvString)('LOG_LEVEL', 'info'),
            format: winston_1.default.format.combine(winston_1.default.format.simple(), exports.consoleFormatter),
        }),
    ],
});
if (!(0, envars_1.getEnvString)('PROMPTFOO_DISABLE_ERROR_LOG', '')) {
    exports.winstonLogger.on('data', (chunk) => {
        if (chunk.level === 'error' &&
            !exports.winstonLogger.transports.some((t) => t instanceof winston_1.default.transports.File)) {
            // Only create the errors file if there are any errors
            const fileTransport = new winston_1.default.transports.File({
                filename: path_1.default.join((0, envars_1.getEnvString)('PROMPTFOO_LOG_DIR', '.'), 'promptfoo-errors.log'),
                level: 'error',
                format: winston_1.default.format.combine(winston_1.default.format.simple(), exports.fileFormatter),
            });
            exports.winstonLogger.add(fileTransport);
            // Re-log the error that triggered this so it's written to the file
            fileTransport.write(chunk);
        }
    });
}
function getLogLevel() {
    return exports.winstonLogger.transports[0].level;
}
function setLogLevel(level) {
    if (level in exports.LOG_LEVELS) {
        exports.winstonLogger.transports[0].level = level;
        if (level === 'debug') {
            initializeSourceMapSupport();
        }
    }
    else {
        throw new Error(`Invalid log level: ${level}`);
    }
}
function isDebugEnabled() {
    return getLogLevel() === 'debug';
}
/**
 * Creates a logger method for the specified log level
 */
function createLogMethod(level) {
    return (message) => {
        const location = level === 'debug' ? getCallerLocation() : isDebugEnabled() ? getCallerLocation() : '';
        if (level === 'debug') {
            initializeSourceMapSupport();
        }
        return exports.winstonLogger[level]({ message, location });
    };
}
// Wrapper enforces strict single-string argument logging
exports.logger = Object.assign({}, exports.winstonLogger, {
    error: createLogMethod('error'),
    warn: createLogMethod('warn'),
    info: createLogMethod('info'),
    debug: createLogMethod('debug'),
    add: exports.winstonLogger.add.bind(exports.winstonLogger),
    remove: exports.winstonLogger.remove.bind(exports.winstonLogger),
    transports: exports.winstonLogger.transports,
});
// Initialize source maps if debug is enabled at startup
if ((0, envars_1.getEnvString)('LOG_LEVEL', 'info') === 'debug') {
    initializeSourceMapSupport();
}
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map