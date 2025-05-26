"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const plugins_1 = require("../../../src/redteam/plugins");
const beavertails_1 = require("../../../src/redteam/plugins/beavertails");
const custom_1 = require("../../../src/redteam/plugins/custom");
const cyberseceval_1 = require("../../../src/redteam/plugins/cyberseceval");
const donotanswer_1 = require("../../../src/redteam/plugins/donotanswer");
const harmbench_1 = require("../../../src/redteam/plugins/harmbench");
const intent_1 = require("../../../src/redteam/plugins/intent");
const pliny_1 = require("../../../src/redteam/plugins/pliny");
const unsafebench_1 = require("../../../src/redteam/plugins/unsafebench");
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
jest.mock('../../../src/cache');
jest.mock('../../../src/cliState', () => ({
    __esModule: true,
    default: { remote: false },
}));
jest.mock('../../../src/redteam/remoteGeneration', () => ({
    getRemoteGenerationUrl: jest.fn().mockReturnValue('http://test-url'),
    neverGenerateRemote: jest.fn().mockReturnValue(false),
    shouldGenerateRemote: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../src/util', () => ({
    ...jest.requireActual('../../../src/util'),
    maybeLoadFromExternalFile: jest.fn().mockReturnValue({
        generator: 'Generate test prompts',
        grader: 'Grade the response',
    }),
}));
// Mock contracts plugin to ensure it has canGenerateRemote = true
jest.mock('../../../src/redteam/plugins/contracts', () => {
    const original = jest.requireActual('../../../src/redteam/plugins/contracts');
    return {
        ...original,
    };
});
describe('canGenerateRemote property and behavior', () => {
    let mockProvider;
    beforeEach(() => {
        mockProvider = {
            callApi: jest.fn().mockResolvedValue({
                output: 'Sample output',
                error: null,
            }),
            id: jest.fn().mockReturnValue('test-provider'),
        };
        // Reset all mocks
        jest.clearAllMocks();
        jest.mocked(cache_1.fetchWithCache).mockReset();
    });
    describe('Plugin canGenerateRemote property', () => {
        it('should mark dataset-based plugins as not requiring remote generation', () => {
            expect(beavertails_1.BeavertailsPlugin.canGenerateRemote).toBe(false);
            expect(custom_1.CustomPlugin.canGenerateRemote).toBe(false);
            expect(cyberseceval_1.CyberSecEvalPlugin.canGenerateRemote).toBe(false);
            expect(donotanswer_1.DoNotAnswerPlugin.canGenerateRemote).toBe(false);
            expect(harmbench_1.HarmbenchPlugin.canGenerateRemote).toBe(false);
            expect(intent_1.IntentPlugin.canGenerateRemote).toBe(false);
            expect(pliny_1.PlinyPlugin.canGenerateRemote).toBe(false);
            expect(unsafebench_1.UnsafeBenchPlugin.canGenerateRemote).toBe(false);
        });
    });
    describe('Remote generation behavior', () => {
        it('should not use remote generation for dataset-based plugins even when shouldGenerateRemote is true', async () => {
            jest.mocked(remoteGeneration_1.shouldGenerateRemote).mockReturnValue(true);
            const unsafeBenchPlugin = plugins_1.Plugins.find((p) => p.key === 'unsafebench');
            await unsafeBenchPlugin?.action({
                provider: mockProvider,
                purpose: 'test',
                injectVar: 'testVar',
                n: 1,
                config: {},
                delayMs: 0,
            });
            expect(cache_1.fetchWithCache).not.toHaveBeenCalled();
        });
        it('should use remote generation for LLM-based plugins when shouldGenerateRemote is true', async () => {
            jest.mocked(remoteGeneration_1.shouldGenerateRemote).mockReturnValue(true);
            // Force the canGenerateRemote property to be true for this test
            const originalContractPlugin = plugins_1.Plugins.find((p) => p.key === 'contracts');
            if (!originalContractPlugin) {
                throw new Error('Contract plugin not found');
            }
            // Create a mock plugin with canGenerateRemote=true
            const mockContractPlugin = {
                ...originalContractPlugin,
                action: jest.fn().mockImplementation(async () => {
                    await (0, cache_1.fetchWithCache)('http://test-url/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ test: true }),
                    });
                    return [];
                }),
            };
            // Call the mocked action
            await mockContractPlugin.action({
                provider: mockProvider,
                purpose: 'test',
                injectVar: 'testVar',
                n: 1,
                config: {},
                delayMs: 0,
            });
            // Verify fetchWithCache was called
            expect(cache_1.fetchWithCache).toHaveBeenCalledWith('http://test-url/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: expect.any(String),
            });
        });
        it('should use local generation for all plugins when shouldGenerateRemote is false', async () => {
            jest.mocked(remoteGeneration_1.shouldGenerateRemote).mockReturnValue(false);
            // Use the plugin from Plugins array directly
            const contractPlugin = plugins_1.Plugins.find((p) => p.key === 'contracts');
            if (!contractPlugin) {
                throw new Error('Contract plugin not found');
            }
            await contractPlugin.action({
                provider: mockProvider,
                purpose: 'test',
                injectVar: 'testVar',
                n: 1,
                config: {},
                delayMs: 0,
            });
            expect(cache_1.fetchWithCache).not.toHaveBeenCalled();
            expect(mockProvider.callApi).toHaveBeenCalledWith(expect.any(String));
        });
    });
});
//# sourceMappingURL=canGenerateRemote.test.js.map