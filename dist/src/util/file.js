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
exports.getNunjucksEngineForFilePath = getNunjucksEngineForFilePath;
exports.maybeLoadFromExternalFile = maybeLoadFromExternalFile;
exports.getResolvedRelativePath = getResolvedRelativePath;
const sync_1 = require("csv-parse/sync");
const fs = __importStar(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const nunjucks_1 = __importDefault(require("nunjucks"));
const path = __importStar(require("path"));
const cliState_1 = __importDefault(require("../cliState"));
/**
 * Simple Nunjucks engine specifically for file paths
 * This function is separate from the main getNunjucksEngine to avoid circular dependencies
 */
function getNunjucksEngineForFilePath() {
    const env = nunjucks_1.default.configure({
        autoescape: false,
    });
    // Add environment variables as template globals
    env.addGlobal('env', {
        ...process.env,
        ...cliState_1.default.config?.env,
    });
    return env;
}
/**
 * Loads content from an external file if the input is a file path, otherwise
 * returns the input as-is. Supports Nunjucks templating for file paths.
 *
 * @param filePath - The input to process. Can be a file path string starting with "file://",
 * an array of file paths, or any other type of data.
 * @returns The loaded content if the input was a file path, otherwise the original input.
 * For JSON and YAML files, the content is parsed into an object.
 * For other file types, the raw file content is returned as a string.
 *
 * @throws {Error} If the specified file does not exist.
 */
function maybeLoadFromExternalFile(filePath) {
    if (Array.isArray(filePath)) {
        return filePath.map((path) => {
            const content = maybeLoadFromExternalFile(path);
            return content;
        });
    }
    if (typeof filePath !== 'string') {
        return filePath;
    }
    if (!filePath.startsWith('file://')) {
        return filePath;
    }
    // Render the file path using Nunjucks
    const renderedFilePath = getNunjucksEngineForFilePath().renderString(filePath, {});
    const finalPath = path.resolve(cliState_1.default.basePath || '', renderedFilePath.slice('file://'.length));
    if (!fs.existsSync(finalPath)) {
        throw new Error(`File does not exist: ${finalPath}`);
    }
    const contents = fs.readFileSync(finalPath, 'utf8');
    if (finalPath.endsWith('.json')) {
        return JSON.parse(contents);
    }
    if (finalPath.endsWith('.yaml') || finalPath.endsWith('.yml')) {
        return js_yaml_1.default.load(contents);
    }
    if (finalPath.endsWith('.csv')) {
        const records = (0, sync_1.parse)(contents, { columns: true });
        // If single column, return array of values
        if (records.length > 0 && Object.keys(records[0]).length === 1) {
            return records.map((record) => Object.values(record)[0]);
        }
        return records;
    }
    return contents;
}
/**
 * Resolves a relative file path with respect to a base path, handling cloud configuration appropriately.
 * When using a cloud configuration, the current working directory is always used instead of the context's base path.
 *
 * @param filePath - The relative or absolute file path to resolve.
 * @param isCloudConfig - Whether this is a cloud configuration.
 * @returns The resolved absolute file path.
 */
function getResolvedRelativePath(filePath, isCloudConfig) {
    // If it's already an absolute path, or not a cloud config, return it as is
    if (path.isAbsolute(filePath) || !isCloudConfig) {
        return filePath;
    }
    // Join the basePath and filePath to get the resolved path
    return path.join(process.cwd(), filePath);
}
//# sourceMappingURL=file.js.map