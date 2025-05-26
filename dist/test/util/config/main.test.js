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
const fs = __importStar(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../../../src/logger"));
const manage_1 = require("../../../src/util/config/manage");
jest.mock('os');
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('../../../src/logger', () => ({
    __esModule: true,
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
describe('config', () => {
    const mockHomedir = '/mock/home';
    const defaultConfigPath = path.join(mockHomedir, '.promptfoo');
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(os.homedir).mockReturnValue(mockHomedir);
        jest.mocked(fs.existsSync).mockReturnValue(false);
        delete process.env.PROMPTFOO_CONFIG_DIR;
        (0, manage_1.setConfigDirectoryPath)(undefined);
    });
    afterEach(() => {
        (0, manage_1.setConfigDirectoryPath)(undefined);
    });
    describe('getConfigDirectoryPath', () => {
        it('returns default path when no custom path is set', () => {
            expect((0, manage_1.getConfigDirectoryPath)()).toBe(defaultConfigPath);
        });
        it('does not create directory when createIfNotExists is false', () => {
            (0, manage_1.getConfigDirectoryPath)(false);
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
        it('creates directory when createIfNotExists is true and directory does not exist', () => {
            (0, manage_1.getConfigDirectoryPath)(true);
            expect(fs.mkdirSync).toHaveBeenCalledWith(defaultConfigPath, { recursive: true });
        });
        it('does not create directory when it already exists', () => {
            jest.mocked(fs.existsSync).mockReturnValue(true);
            (0, manage_1.getConfigDirectoryPath)(true);
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });
    describe('setConfigDirectoryPath', () => {
        it('updates the config directory path', () => {
            const newPath = '/new/config/path';
            (0, manage_1.setConfigDirectoryPath)(newPath);
            expect((0, manage_1.getConfigDirectoryPath)()).toBe(newPath);
        });
        it('overrides the environment variable', () => {
            const envPath = '/env/path';
            const newPath = '/new/path';
            process.env.PROMPTFOO_CONFIG_DIR = envPath;
            (0, manage_1.setConfigDirectoryPath)(newPath);
            expect((0, manage_1.getConfigDirectoryPath)()).toBe(newPath);
        });
    });
});
describe('writePromptfooConfig', () => {
    const mockOutputPath = '/mock/output/path.yaml';
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('writes a basic config to the specified path', () => {
        const mockConfig = { description: 'Test config' };
        const mockYaml = 'description: Test config\n';
        jest.mocked(js_yaml_1.default.dump).mockReturnValue(mockYaml);
        (0, manage_1.writePromptfooConfig)(mockConfig, mockOutputPath);
        expect(fs.writeFileSync).toHaveBeenCalledWith(mockOutputPath, `# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json\n${mockYaml}`);
    });
    it('orders the keys of the config correctly', () => {
        const mockConfig = {
            tests: [{ assert: [{ type: 'equals', value: 'test assertion' }] }],
            description: 'Test config',
            prompts: ['prompt1'],
            providers: ['provider1'],
            defaultTest: { assert: [{ type: 'equals', value: 'default assertion' }] },
        };
        (0, manage_1.writePromptfooConfig)(mockConfig, mockOutputPath);
        const dumpCall = jest.mocked(js_yaml_1.default.dump).mock.calls[0][0];
        const keys = Object.keys(dumpCall);
        expect(keys).toEqual(['description', 'prompts', 'providers', 'defaultTest', 'tests']);
    });
    it('uses js-yaml to dump the config with skipInvalid option', () => {
        const mockConfig = { description: 'Test config' };
        (0, manage_1.writePromptfooConfig)(mockConfig, mockOutputPath);
        expect(js_yaml_1.default.dump).toHaveBeenCalledWith(expect.anything(), { skipInvalid: true });
    });
    it('handles empty config', () => {
        const mockConfig = {};
        (0, manage_1.writePromptfooConfig)(mockConfig, mockOutputPath);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(logger_1.default.warn).toHaveBeenCalledWith('Warning: config is empty, skipping write');
    });
    it('preserves all fields of the UnifiedConfig', () => {
        const mockConfig = {
            description: 'Full config test',
            prompts: ['prompt1', 'prompt2'],
            providers: ['provider1', 'provider2'],
            defaultTest: { assert: [{ type: 'equals', value: 'default assertion' }] },
            tests: [
                { assert: [{ type: 'equals', value: 'test assertion 1' }] },
                { assert: [{ type: 'equals', value: 'test assertion 2' }] },
            ],
            outputPath: './output',
        };
        (0, manage_1.writePromptfooConfig)(mockConfig, mockOutputPath);
        const dumpCall = jest.mocked(js_yaml_1.default.dump).mock.calls[0][0];
        expect(dumpCall).toEqual(expect.objectContaining(mockConfig));
    });
    it('handles config with undefined values', () => {
        const mockConfig = {
            description: 'Config with undefined',
            prompts: undefined,
            providers: ['provider1'],
        };
        (0, manage_1.writePromptfooConfig)(mockConfig, mockOutputPath);
        const dumpCall = jest.mocked(js_yaml_1.default.dump).mock.calls[0][0];
        expect(dumpCall).toHaveProperty('description', 'Config with undefined');
        expect(dumpCall).toHaveProperty('providers', ['provider1']);
        expect(dumpCall).not.toHaveProperty('prompts');
    });
});
//# sourceMappingURL=main.test.js.map