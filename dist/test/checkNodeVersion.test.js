"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const checkNodeVersion_1 = require("../src/checkNodeVersion");
const logger_1 = __importDefault(require("../src/logger"));
jest.mock('../package.json', () => ({
    engines: { node: '>=18.0.1' },
}));
const setNodeVersion = (version) => {
    Object.defineProperty(process, 'version', {
        value: version,
        configurable: true,
    });
};
describe('checkNodeVersion', () => {
    const originalProcessVersion = process.version;
    afterEach(() => {
        setNodeVersion(originalProcessVersion);
    });
    it('should handle version strings correctly and throw if required version is not met', () => {
        setNodeVersion('v18.0.0');
        expect(() => (0, checkNodeVersion_1.checkNodeVersion)()).toThrow('You are using Node.js 18.0.0. This version is not supported. Please use Node.js >=18.0.1.');
    });
    it('should not throw if Node.js version is supported', () => {
        setNodeVersion('v18.0.1');
        expect(() => (0, checkNodeVersion_1.checkNodeVersion)()).not.toThrow();
    });
    it('should log a warning if Node.js version format is unexpected', () => {
        setNodeVersion('v18');
        (0, checkNodeVersion_1.checkNodeVersion)();
        expect(logger_1.default.warn).toHaveBeenCalledWith(chalk_1.default.yellow('Unexpected Node.js version format: v18. Please use Node.js >=18.0.1.'));
    });
});
//# sourceMappingURL=checkNodeVersion.test.js.map