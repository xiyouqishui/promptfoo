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
const yaml = __importStar(require("js-yaml"));
const os = __importStar(require("os"));
const path_1 = __importDefault(require("path"));
const generate_1 = require("../../src/redteam/commands/generate");
const shared_1 = require("../../src/redteam/shared");
const apiHealth_1 = require("../../src/util/apiHealth");
const default_1 = require("../../src/util/config/default");
const fakeDataFactory_1 = __importDefault(require("../factories/data/fakeDataFactory"));
jest.mock('../../src/redteam/commands/generate');
jest.mock('../../src/commands/eval', () => ({
    doEval: jest.fn().mockResolvedValue({
        table: [],
        version: 3,
        createdAt: new Date().toISOString(),
        results: {
            table: [],
            summary: {
                version: 3,
                stats: {
                    successes: 0,
                    failures: 0,
                    tokenUsage: {},
                },
            },
        },
    }),
}));
jest.mock('../../src/util/apiHealth');
jest.mock('../../src/util/config/default');
jest.mock('../../src/logger', () => ({
    __esModule: true,
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    setLogCallback: jest.fn(),
    setLogLevel: jest.fn(),
}));
jest.mock('../../src/globalConfig/accounts', () => ({
    getUserEmail: jest.fn(() => 'test@example.com'),
    setUserEmail: jest.fn(),
    getAuthor: jest.fn(() => 'test@example.com'),
    promptForEmailUnverified: jest.fn().mockResolvedValue(undefined),
    checkEmailStatusOrExit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/telemetry', () => ({
    record: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    saveConsent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/share', () => ({
    createShareableUrl: jest.fn().mockResolvedValue('http://example.com'),
}));
jest.mock('../../src/util', () => ({
    isRunningUnderNpx: jest.fn(() => false),
    setupEnv: jest.fn(),
}));
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('os');
describe('doRedteamRun', () => {
    const mockDate = new Date('2023-01-01T00:00:00.000Z');
    let dateNowSpy;
    beforeEach(() => {
        jest.resetAllMocks();
        dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());
        jest.mocked(apiHealth_1.checkRemoteHealth).mockResolvedValue({ status: 'OK', message: 'Healthy' });
        jest.mocked(default_1.loadDefaultConfig).mockResolvedValue({
            defaultConfig: {},
            defaultConfigPath: 'promptfooconfig.yaml',
        });
        jest.mocked(fs.existsSync).mockReturnValue(true);
        jest.mocked(os.tmpdir).mockReturnValue('/tmp');
        jest.mocked(fs.mkdirSync).mockImplementation(() => '');
        jest.mocked(fs.writeFileSync).mockImplementation(() => { });
        jest.mocked(yaml.dump).mockReturnValue('mocked-yaml-content');
        jest.mocked(generate_1.doGenerateRedteam).mockResolvedValue({});
    });
    afterEach(() => {
        jest.resetAllMocks();
        dateNowSpy.mockRestore();
    });
    it('should use default config path when not specified', async () => {
        await (0, shared_1.doRedteamRun)({});
        expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
            config: 'promptfooconfig.yaml',
        }));
    });
    it('should use provided config path when specified', async () => {
        const customConfig = 'custom/config.yaml';
        await (0, shared_1.doRedteamRun)({ config: customConfig });
        expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
            config: customConfig,
        }));
    });
    it('should use provided output path if specified', async () => {
        const outputPath = 'custom/output.yaml';
        await (0, shared_1.doRedteamRun)({ output: outputPath });
        expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
            output: outputPath,
        }));
    });
    it('should locate the out file in the same directory as the config file if output is not specified', async () => {
        // Generate a random directory path
        const dirPath = fakeDataFactory_1.default.system.directoryPath();
        const customConfig = `${dirPath}/config.yaml`;
        await (0, shared_1.doRedteamRun)({ config: customConfig });
        expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
            config: customConfig,
            output: path_1.default.normalize(`${dirPath}/redteam.yaml`),
        }));
    });
    describe('liveRedteamConfig temporary file handling', () => {
        const mockConfig = {
            prompts: ['Test prompt'],
            vars: {},
            providers: [{ id: 'test-provider' }],
        };
        it('should create timestamped temporary file in current directory when loadedFromCloud is true', async () => {
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                loadedFromCloud: true,
            });
            const expectedFilename = `redteam-${mockDate.getTime()}.yaml`;
            const expectedPath = path_1.default.join('', expectedFilename);
            expect(fs.mkdirSync).toHaveBeenCalledWith(path_1.default.dirname(expectedPath), { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, 'mocked-yaml-content');
            expect(yaml.dump).toHaveBeenCalledWith(mockConfig);
            expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
                config: expectedPath,
                output: expectedPath,
            }));
        });
        it('should create redteam.yaml file in system temp directory when loadedFromCloud is false', async () => {
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                loadedFromCloud: false,
            });
            const expectedPath = path_1.default.join('/tmp', 'redteam.yaml');
            expect(os.tmpdir).toHaveBeenCalledWith();
            expect(fs.mkdirSync).toHaveBeenCalledWith(path_1.default.dirname(expectedPath), { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, 'mocked-yaml-content');
            expect(yaml.dump).toHaveBeenCalledWith(mockConfig);
            expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
                config: expectedPath,
                output: expectedPath,
            }));
        });
        it('should create redteam.yaml file in system temp directory when loadedFromCloud is undefined', async () => {
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                // loadedFromCloud is undefined
            });
            const expectedPath = path_1.default.join('/tmp', 'redteam.yaml');
            expect(os.tmpdir).toHaveBeenCalledWith();
            expect(fs.mkdirSync).toHaveBeenCalledWith(path_1.default.dirname(expectedPath), { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, 'mocked-yaml-content');
            expect(yaml.dump).toHaveBeenCalledWith(mockConfig);
            expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
                config: expectedPath,
                output: expectedPath,
            }));
        });
        it('should generate unique timestamped filenames when loadedFromCloud is true', async () => {
            const firstTimestamp = mockDate.getTime();
            const secondTimestamp = firstTimestamp + 1000;
            // First call
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                loadedFromCloud: true,
            });
            // Update mock timestamp for second call
            dateNowSpy.mockReturnValue(secondTimestamp);
            // Second call
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                loadedFromCloud: true,
            });
            const firstExpectedPath = path_1.default.join('', `redteam-${firstTimestamp}.yaml`);
            const secondExpectedPath = path_1.default.join('', `redteam-${secondTimestamp}.yaml`);
            // Verify different filenames were generated
            expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, firstExpectedPath, 'mocked-yaml-content');
            expect(fs.writeFileSync).toHaveBeenNthCalledWith(2, secondExpectedPath, 'mocked-yaml-content');
        });
        it('should use static filename when loadedFromCloud is false', async () => {
            // First call
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                loadedFromCloud: false,
            });
            // Second call with different timestamp
            dateNowSpy.mockReturnValue(mockDate.getTime() + 1000);
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                loadedFromCloud: false,
            });
            const expectedPath = path_1.default.join('/tmp', 'redteam.yaml');
            // Verify same filename was used both times
            expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, expectedPath, 'mocked-yaml-content');
            expect(fs.writeFileSync).toHaveBeenNthCalledWith(2, expectedPath, 'mocked-yaml-content');
        });
        it('should use liveRedteamConfig.commandLineOptions when provided', async () => {
            const mockConfigWithOptions = {
                ...mockConfig,
                commandLineOptions: {
                    verbose: true,
                    delay: 500,
                },
            };
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfigWithOptions,
                loadedFromCloud: true,
            });
            expect(generate_1.doGenerateRedteam).toHaveBeenCalledWith(expect.objectContaining({
                liveRedteamConfig: {
                    ...mockConfig,
                    commandLineOptions: {
                        verbose: true,
                        delay: 500,
                    },
                },
            }));
        });
        it('should log debug information when processing liveRedteamConfig', async () => {
            // Get the mocked logger
            const mockLogger = jest.requireMock('../../src/logger').default;
            await (0, shared_1.doRedteamRun)({
                liveRedteamConfig: mockConfig,
                loadedFromCloud: true,
            });
            const expectedFilename = `redteam-${mockDate.getTime()}.yaml`;
            const expectedPath = path_1.default.join('', expectedFilename);
            expect(mockLogger.debug).toHaveBeenCalledWith(`Using live config from ${expectedPath}`);
            expect(mockLogger.debug).toHaveBeenCalledWith(`Live config: ${JSON.stringify(mockConfig, null, 2)}`);
        });
    });
});
//# sourceMappingURL=shared.test.js.map