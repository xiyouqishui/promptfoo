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
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("../../../src/logger"));
const redteam_1 = require("../../../src/redteam");
const discover_1 = require("../../../src/redteam/commands/discover");
const generate_1 = require("../../../src/redteam/commands/generate");
const configModule = __importStar(require("../../../src/util/config/load"));
const manage_1 = require("../../../src/util/config/manage");
jest.mock('fs');
jest.mock('../../../src/redteam');
jest.mock('../../../src/telemetry');
jest.mock('../../../src/util/config/load', () => ({
    combineConfigs: jest.fn(),
    resolveConfigs: jest.fn(),
}));
jest.mock('../../../src/envars', () => ({
    ...jest.requireActual('../../../src/envars'),
    getEnvBool: jest.fn().mockImplementation((key) => {
        if (key === 'PROMPTFOO_REDTEAM_ENABLE_PURPOSE_DISCOVERY_AGENT') {
            return true;
        }
        return false;
    }),
}));
jest.mock('../../../src/globalConfig/cloud', () => ({
    CloudConfig: jest.fn().mockImplementation(() => ({
        isEnabled: jest.fn().mockReturnValue(false),
        getApiHost: jest.fn().mockReturnValue('https://api.promptfoo.app'),
    })),
}));
jest.mock('../../../src/redteam/commands/discover', () => ({
    doTargetPurposeDiscovery: jest.fn(),
    mergeTargetPurposeDiscoveryResults: jest.fn(),
}));
jest.mock('../../../src/redteam/remoteGeneration', () => ({
    shouldGenerateRemote: jest.fn().mockReturnValue(false),
    neverGenerateRemote: jest.fn().mockReturnValue(false),
    getRemoteGenerationUrl: jest.fn().mockReturnValue('http://test-url'),
}));
jest.mock('../../../src/util/config/manage');
jest.mock('../../../src/providers', () => ({
    loadApiProviders: jest.fn().mockResolvedValue([
        {
            id: () => 'test-provider',
            callApi: jest.fn(),
            cleanup: jest.fn(),
        },
    ]),
}));
describe('doGenerateRedteam', () => {
    let mockProvider;
    beforeEach(() => {
        jest.clearAllMocks();
        mockProvider = {
            id: () => 'test-provider',
            callApi: jest.fn().mockResolvedValue({ output: 'test output' }),
            cleanup: jest.fn().mockResolvedValue(undefined),
        };
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {},
            },
        });
    });
    it('should generate redteam tests and write to output file', async () => {
        jest.mocked(configModule.combineConfigs).mockResolvedValue([
            {
                prompts: [{ raw: 'Test prompt', label: 'Test label' }],
                providers: [],
                tests: [],
            },
        ]);
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify({
            prompts: [{ raw: 'Test prompt' }],
            providers: [],
            tests: [],
        }));
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Test entity'],
            injectVar: 'input',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(redteam_1.synthesize).toHaveBeenCalledWith(expect.objectContaining({
            language: undefined,
            numTests: undefined,
            plugins: expect.any(Array),
            prompts: [],
            strategies: expect.any(Array),
        }));
        expect(manage_1.writePromptfooConfig).toHaveBeenCalledWith(expect.objectContaining({
            prompts: [{ raw: 'Test prompt' }],
            providers: [],
            tests: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            redteam: expect.objectContaining({
                purpose: 'Test purpose',
                entities: ['Test entity'],
            }),
            defaultTest: {
                metadata: {
                    purpose: 'Test purpose',
                    entities: ['Test entity'],
                },
            },
        }), 'output.yaml');
    });
    it('should write to config file when write option is true', async () => {
        const options = {
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify({}));
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: [],
            injectVar: 'input',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(manage_1.writePromptfooConfig).toHaveBeenCalledWith(expect.objectContaining({
            defaultTest: {
                metadata: {
                    purpose: 'Test purpose',
                    entities: [],
                },
            },
            redteam: expect.objectContaining({
                purpose: 'Test purpose',
                entities: [],
            }),
            tests: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
        }), 'config.yaml');
    });
    it('should handle missing configuration file', async () => {
        const options = {
            cache: true,
            defaultConfig: {},
            write: true,
            output: 'redteam.yaml',
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining("Can't generate without configuration"));
    });
    it('should use purpose when no config is provided', async () => {
        const options = {
            purpose: 'Test purpose',
            cache: true,
            defaultConfig: {},
            write: true,
            output: 'redteam.yaml',
        };
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Test entity'],
            injectVar: 'input',
        });
        jest.mocked(discover_1.mergeTargetPurposeDiscoveryResults).mockReturnValue('MERGED(Test purpose)');
        await (0, generate_1.doGenerateRedteam)(options);
        expect(discover_1.mergeTargetPurposeDiscoveryResults).toHaveBeenCalledWith('Test purpose', undefined);
        expect(redteam_1.synthesize).toHaveBeenCalledWith({
            language: undefined,
            numTests: undefined,
            purpose: 'MERGED(Test purpose)',
            plugins: expect.any(Array),
            prompts: expect.any(Array),
            strategies: expect.any(Array),
            targetLabels: [],
            showProgressBar: true,
        });
        expect(manage_1.writePromptfooConfig).toHaveBeenCalledWith(expect.objectContaining({
            tests: expect.arrayContaining([
                expect.objectContaining({
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                }),
            ]),
            redteam: expect.objectContaining({
                purpose: 'Test purpose',
                entities: ['Test entity'],
            }),
        }), 'redteam.yaml');
    });
    it('should properly handle numTests for both string and object-style plugins', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                prompts: [{ raw: 'Test prompt', label: 'Test label' }],
                providers: [],
            },
            config: {
                redteam: {
                    numTests: 1,
                    plugins: [
                        'contracts',
                        { id: 'competitors' },
                        { id: 'overreliance', numTests: 3 },
                    ],
                    strategies: [],
                },
            },
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify({
            prompts: [{ raw: 'Test prompt' }],
            providers: [],
            tests: [],
        }));
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Test entity'],
            injectVar: 'input',
        });
        const options = {
            output: 'output.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
            force: true,
            purpose: 'Test purpose',
            config: 'config.yaml',
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(redteam_1.synthesize).toHaveBeenCalledTimes(1);
        expect(redteam_1.synthesize).toHaveBeenCalledWith(expect.objectContaining({
            language: undefined,
            numTests: 1,
            plugins: expect.arrayContaining([
                expect.objectContaining({ id: 'competitors', numTests: 1 }),
                expect.objectContaining({ id: 'contracts', numTests: 1 }),
                expect.objectContaining({ id: 'overreliance', numTests: 3 }),
            ]),
            prompts: ['Test prompt'],
            strategies: [],
        }));
    });
    it('should pass entities from redteam config to synthesize', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                prompts: [{ raw: 'Test prompt', label: 'Test label' }],
                providers: [],
            },
            config: {
                redteam: {
                    entities: ['Company X', 'John Doe', 'Product Y'],
                    plugins: ['harmful:hate'],
                    strategies: [],
                },
            },
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify({
            prompts: [{ raw: 'Test prompt' }],
            providers: [],
            tests: [],
        }));
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Company X', 'John Doe', 'Product Y'],
            injectVar: 'input',
        });
        const options = {
            output: 'output.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
            force: true,
            config: 'config.yaml',
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(redteam_1.synthesize).toHaveBeenCalledWith(expect.objectContaining({
            entities: ['Company X', 'John Doe', 'Product Y'],
            plugins: expect.any(Array),
            prompts: ['Test prompt'],
            strategies: expect.any(Array),
        }));
    });
    it('should handle undefined entities in redteam config', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                prompts: [{ raw: 'Test prompt', label: 'Test label' }],
                providers: [],
            },
            config: {
                redteam: {
                    plugins: ['harmful:hate'],
                    strategies: [],
                },
            },
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify({
            prompts: [{ raw: 'Test prompt' }],
            providers: [],
            tests: [],
        }));
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: [],
            injectVar: 'input',
        });
        const options = {
            output: 'output.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
            force: true,
            config: 'config.yaml',
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(redteam_1.synthesize).toHaveBeenCalledWith(expect.objectContaining({
            plugins: [expect.objectContaining({ id: 'harmful:hate', numTests: 5 })],
            prompts: ['Test prompt'],
            strategies: [],
            abortSignal: undefined,
            delay: undefined,
            language: undefined,
            maxConcurrency: undefined,
            numTests: undefined,
        }));
    });
    it('should write entities to output config', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                prompts: [{ raw: 'Test prompt', label: 'Test label' }],
                providers: [],
            },
            config: {
                redteam: {
                    entities: ['Company X', 'John Doe', 'Product Y'],
                    plugins: ['harmful:hate'],
                    strategies: [],
                },
            },
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify({
            prompts: [{ raw: 'Test prompt' }],
            providers: [],
            tests: [],
        }));
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Company X', 'John Doe', 'Product Y'],
            injectVar: 'input',
        });
        const options = {
            output: 'output.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
            force: true,
            config: 'config.yaml',
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(manage_1.writePromptfooConfig).toHaveBeenCalledWith(expect.objectContaining({
            redteam: expect.objectContaining({
                entities: ['Company X', 'John Doe', 'Product Y'],
            }),
            defaultTest: expect.objectContaining({
                metadata: expect.objectContaining({
                    entities: ['Company X', 'John Doe', 'Product Y'],
                }),
            }),
        }), 'output.yaml');
    });
    it('should cleanup provider after generation', async () => {
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Test entity'],
            injectVar: 'input',
        });
        const options = {
            output: 'test-output.json',
            inRedteamRun: false,
            cache: false,
            defaultConfig: {},
            write: false,
            config: 'test-config.yaml',
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(mockProvider.cleanup).toHaveBeenCalledWith();
    });
    it('should handle provider cleanup errors gracefully', async () => {
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Test entity'],
            injectVar: 'input',
        });
        const options = {
            output: 'test-output.json',
            inRedteamRun: false,
            cache: false,
            defaultConfig: {},
            write: false,
            config: 'test-config.yaml',
        };
        if (mockProvider.cleanup) {
            jest.mocked(mockProvider.cleanup).mockRejectedValueOnce(new Error('Cleanup failed'));
        }
        await (0, generate_1.doGenerateRedteam)(options);
        expect(mockProvider.cleanup).toHaveBeenCalledWith();
    });
    it('should not cleanup provider during redteam run', async () => {
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'Test purpose',
            entities: ['Test entity'],
            injectVar: 'input',
        });
        const options = {
            output: 'test-output.json',
            inRedteamRun: true,
            cache: false,
            defaultConfig: {},
            write: false,
            config: 'test-config.yaml',
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(mockProvider.cleanup).not.toHaveBeenCalled();
    });
    it('should handle errors during purpose discovery', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {
                    purpose: 'Existing purpose',
                },
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        const mockError = new Error('Purpose discovery failed');
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockRejectedValue(mockError);
        await (0, generate_1.doGenerateRedteam)(options);
        expect(logger_1.default.error).toHaveBeenCalledWith('Discovery failed from error, skipping: Purpose discovery failed');
    });
    it('should call doTargetPurposeDiscovery and mergeTargetPurposeDiscoveryResults', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {},
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            purpose: 'CLI purpose',
            write: true,
        };
        const mockedPurpose = {
            purpose: 'Generated purpose',
            limitations: 'Generated limitations',
            tools: [
                {
                    name: 'search',
                    description: 'search(query: string)',
                    arguments: [{ name: 'query', description: 'query', type: 'string' }],
                },
            ],
            user: 'Generated user',
        };
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockResolvedValue(mockedPurpose);
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [],
            purpose: 'CLI purpose merged with Generated purpose',
            entities: [],
            injectVar: 'injected',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(discover_1.mergeTargetPurposeDiscoveryResults).toHaveBeenCalledWith('CLI purpose', mockedPurpose);
    });
    it('should call doTargetPurposeDiscovery with the first prompt', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [{ raw: 'Test prompt', label: 'Test label' }],
                tests: [],
            },
            config: {
                redteam: {},
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            purpose: 'CLI purpose',
            write: true,
        };
        const mockedPurpose = {
            purpose: 'Generated purpose',
            limitations: 'Generated limitations',
            tools: [
                {
                    name: 'search',
                    description: 'search(query: string)',
                    arguments: [{ name: 'query', description: 'query', type: 'string' }],
                },
            ],
            user: 'Generated user',
        };
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockResolvedValue(mockedPurpose);
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [],
            purpose: 'CLI purpose merged with Generated purpose',
            entities: [],
            injectVar: 'injected',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(discover_1.doTargetPurposeDiscovery).toHaveBeenCalledWith(expect.any(Object), {
            raw: 'Test prompt',
            label: 'Test label',
        });
    });
    it('should handle purpose discovery error with specific error message', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {},
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        const customError = new Error('Custom purpose discovery error');
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockRejectedValue(customError);
        await (0, generate_1.doGenerateRedteam)(options);
        expect(logger_1.default.error).toHaveBeenCalledWith('Discovery failed from error, skipping: Custom purpose discovery error');
    });
    it('should properly merge purposes when both exist', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {
                    purpose: 'Config purpose',
                },
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            purpose: 'CLI purpose',
            write: true,
        };
        const mockedPurpose = {
            purpose: 'Generated purpose',
            limitations: 'Generated limitations',
            tools: [
                {
                    name: 'search',
                    description: 'search(query: string)',
                    arguments: [{ name: 'query', description: 'query', type: 'string' }],
                },
            ],
            user: 'Generated user',
        };
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockResolvedValue(mockedPurpose);
        jest
            .mocked(discover_1.mergeTargetPurposeDiscoveryResults)
            .mockImplementation((a, b) => `${a} + ${JSON.stringify(b)}`);
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [],
            purpose: 'CLI purpose + Generated purpose',
            entities: [],
            injectVar: 'x',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(discover_1.mergeTargetPurposeDiscoveryResults).toHaveBeenCalledWith('Config purpose', mockedPurpose);
        expect(redteam_1.synthesize).toHaveBeenCalledWith(expect.objectContaining({
            purpose: `Config purpose + ${JSON.stringify(mockedPurpose)}`,
        }));
    });
    it('should call mergeTargetPurposeDiscoveryResults even if no existing purpose', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {},
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        const mockedPurpose = {
            purpose: 'Generated purpose',
            limitations: 'Generated limitations',
            tools: [
                {
                    name: 'search',
                    description: 'search(query: string)',
                    arguments: [{ name: 'query', description: 'query', type: 'string' }],
                },
            ],
            user: 'Generated user',
        };
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockResolvedValue(mockedPurpose);
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [],
            purpose: 'Generated purpose',
            entities: [],
            injectVar: 'input',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(discover_1.mergeTargetPurposeDiscoveryResults).toHaveBeenCalledWith(undefined, mockedPurpose);
        expect(redteam_1.synthesize).toHaveBeenCalledWith(expect.objectContaining({
            purpose: expect.stringContaining(`undefined + ${JSON.stringify(mockedPurpose)}`),
        }));
    });
    it('should log error if doTargetPurposeDiscovery throws non-Error', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {},
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockRejectedValue('Some string error');
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [],
            purpose: '',
            entities: [],
            injectVar: 'input',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(logger_1.default.error).toHaveBeenCalledWith('Discovery failed from error, skipping: Some string error');
    });
    it('should warn and not fail if no plugins are specified (uses default plugins)', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [{ raw: 'Prompt', label: 'L' }],
                tests: [],
            },
            config: {
                redteam: {},
                providers: ['test-provider'],
            },
        });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify({
            prompts: [{ raw: 'Prompt' }],
            providers: [],
            tests: [],
        }));
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockResolvedValue({
            purpose: 'Generated purpose',
            limitations: 'Generated limitations',
            tools: [
                {
                    name: 'search',
                    description: 'search(query: string)',
                    arguments: [{ name: 'query', description: 'query', type: 'string' }],
                },
            ],
            user: 'Generated user',
        });
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [],
            purpose: 'Generated purpose',
            entities: [],
            injectVar: 'input',
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        await (0, generate_1.doGenerateRedteam)(options);
        expect(redteam_1.synthesize).toHaveBeenCalledWith(expect.objectContaining({
            plugins: expect.any(Array),
        }));
    });
    it('should write targetPurposeDiscoveryResult to metadata', async () => {
        jest.mocked(configModule.resolveConfigs).mockResolvedValue({
            basePath: '/mock/path',
            testSuite: {
                providers: [mockProvider],
                prompts: [],
                tests: [],
            },
            config: {
                redteam: {},
                providers: ['test-provider'],
            },
        });
        const options = {
            output: 'output.yaml',
            config: 'config.yaml',
            cache: true,
            defaultConfig: {},
            write: true,
        };
        const mockedPurpose = {
            purpose: 'Generated purpose',
            limitations: 'Generated limitations',
            tools: [
                {
                    name: 'search',
                    description: 'search(query: string)',
                    arguments: [{ name: 'query', description: 'query', type: 'string' }],
                },
            ],
            user: 'Generated user',
        };
        jest.mocked(discover_1.doTargetPurposeDiscovery).mockResolvedValue(mockedPurpose);
        jest.mocked(discover_1.mergeTargetPurposeDiscoveryResults).mockReturnValue('merged purpose');
        jest.mocked(redteam_1.synthesize).mockResolvedValue({
            testCases: [
                {
                    vars: { input: 'Test input' },
                    assert: [{ type: 'equals', value: 'Test output' }],
                    metadata: { pluginId: 'redteam' },
                },
            ],
            purpose: 'merged purpose',
            entities: [],
            injectVar: 'input',
        });
        await (0, generate_1.doGenerateRedteam)(options);
        expect(manage_1.writePromptfooConfig).toHaveBeenCalledWith(expect.objectContaining({
            metadata: expect.objectContaining({
                targetPurposeDiscoveryResult: mockedPurpose,
            }),
        }), 'output.yaml');
    });
});
//# sourceMappingURL=generate.test.js.map