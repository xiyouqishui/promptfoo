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
exports.getDbPath = getDbPath;
exports.getDbSignalPath = getDbSignalPath;
exports.getDb = getDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const better_sqlite3_2 = require("drizzle-orm/better-sqlite3");
const logger_1 = require("drizzle-orm/logger");
const path = __importStar(require("path"));
const envars_1 = require("../envars");
const logger_2 = __importDefault(require("../logger"));
const manage_1 = require("../util/config/manage");
class DrizzleLogWriter {
    write(message) {
        if ((0, envars_1.getEnvBool)('PROMPTFOO_ENABLE_DATABASE_LOGS', false)) {
            logger_2.default.debug(`Drizzle: ${message}`);
        }
    }
}
let dbInstance = null;
function getDbPath() {
    return path.resolve((0, manage_1.getConfigDirectoryPath)(true /* createIfNotExists */), 'promptfoo.db');
}
function getDbSignalPath() {
    return path.resolve((0, manage_1.getConfigDirectoryPath)(true /* createIfNotExists */), 'evalLastWritten');
}
function getDb() {
    if (!dbInstance) {
        const sqlite = new better_sqlite3_1.default((0, envars_1.getEnvBool)('IS_TESTING') ? ':memory:' : getDbPath());
        const logger = new logger_1.DefaultLogger({ writer: new DrizzleLogWriter() });
        dbInstance = (0, better_sqlite3_2.drizzle)(sqlite, { logger });
    }
    return dbInstance;
}
//# sourceMappingURL=index.js.map