"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// We are mocking the dynamic import of runEval inside callTarget.
const evaluator_1 = require("../../../src/evaluator");
const fetch_1 = require("../../../src/fetch");
const pandamonium_1 = __importDefault(require("../../../src/redteam/providers/pandamonium"));
jest.mock('../../../src/evaluator', () => ({
    runEval: jest.fn(),
}));
jest.mock('../../../src/fetch', () => ({
    fetchWithRetries: jest.fn(),
}));
// Dummy target provider stub
const dummyTargetProvider = { id: jest.fn(), callApi: jest.fn() };
describe('RedteamPandamoniumProvider', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should terminate loop when no test cases returned from /next endpoint', async () => {
        // Create a minimal dummy test
        const dummyTest = {
            vars: { example: 'dummy prompt', harmCateogry: 'dummy' },
            metadata: { pluginId: 'dummyPlugin' },
        };
        // Construct a dummy RunEvalOptions object with all required properties.
        const allTests = [
            {
                test: dummyTest,
                provider: dummyTargetProvider, // Required field
                prompt: { raw: 'dummy prompt', label: 'dummy prompt' },
                delay: 0, // Required field (set delay to 0 for testing)
                testIdx: 0,
                promptIdx: 0,
                repeatIndex: 0,
                isRedteam: true,
            },
        ];
        // Instantiate the provider
        const provider = new pandamonium_1.default({ injectVar: 'example' });
        // For runPandamonium, we expect two calls to fetchWithRetries:
        // 1. /start endpoint
        // 2. /next endpoint (which returns no test cases so that the loop breaks)
        const startResponse = {
            ok: true,
            json: async () => ({
                id: 'run123',
                iteration: 0,
                pendingPlugins: [],
                version: 1,
            }),
        };
        const nextResponse = {
            ok: true,
            json: async () => ({
                id: 'run123',
                iteration: 1,
                pendingPlugins: [],
                testCases: [],
            }),
        };
        jest
            .mocked(fetch_1.fetchWithRetries)
            .mockResolvedValueOnce(startResponse) // for /start
            .mockResolvedValueOnce(nextResponse); // for /next
        const results = await provider.runPandamonium(dummyTargetProvider, dummyTest, allTests);
        expect(results).toEqual([]);
        // Verify that /start and /next endpoints were called.
        const calls = jest.mocked(fetch_1.fetchWithRetries).mock.calls;
        expect(calls.some((call) => call[0].includes('/start'))).toBe(true);
        expect(calls.some((call) => call[0].includes('/next'))).toBe(true);
    });
    it('should call target provider with test cases and aggregate results, triggering success', async () => {
        const dummyTest = {
            vars: { example: 'dummy prompt', harmCateogry: 'dummy' },
            metadata: { pluginId: 'dummyPlugin' },
        };
        const allTests = [
            {
                test: dummyTest,
                provider: dummyTargetProvider,
                prompt: { raw: 'dummy prompt', label: 'dummy prompt' },
                delay: 0,
                testIdx: 0,
                promptIdx: 0,
                repeatIndex: 0,
                isRedteam: true,
            },
        ];
        // Set maxTurns to 2 to limit the iterations of the pandamonium loop.
        const provider = new pandamonium_1.default({ injectVar: 'example', maxTurns: 2 });
        // Set up sequential mocked responses for the network calls via fetchWithRetries:
        // 1. For the /start endpoint.
        // 2. First call to /next returns a test case.
        // 3. The /success endpoint call.
        // 4. Second call to /next returns no test cases, breaking the loop.
        const startResponse = {
            ok: true,
            json: async () => ({
                id: 'run123',
                iteration: 0,
                pendingPlugins: ['dummyPlugin'],
                version: 1,
            }),
        };
        const nextResponse1 = {
            ok: true,
            json: async () => ({
                id: 'run123',
                iteration: 1,
                pendingPlugins: [],
                testCases: [
                    {
                        pluginId: 'dummyPlugin',
                        prompt: 'dummy prompt',
                        program: 'dummy program',
                        testIdx: 0,
                    },
                ],
            }),
        };
        const successResponse = {
            ok: true,
            json: async () => ({}),
        };
        const nextResponse2 = {
            ok: true,
            json: async () => ({
                id: 'run123',
                iteration: 2,
                pendingPlugins: [],
                testCases: [],
            }),
        };
        jest
            .mocked(fetch_1.fetchWithRetries)
            .mockResolvedValueOnce(startResponse) // /start
            .mockResolvedValueOnce(nextResponse1) // first /next call
            .mockResolvedValueOnce(successResponse) // /success
            .mockResolvedValueOnce(nextResponse2); // second /next call
        // Mock runEval to simulate evaluation.
        // The provider's callTarget function expects runEval to return an array with an EvaluateResult.
        jest.mocked(evaluator_1.runEval).mockResolvedValue([
            {
                success: false,
                prompt: { raw: 'result prompt', label: 'result prompt' },
                gradingResult: { pass: false, score: 0, reason: 'dummy reason' },
                promptIdx: 0,
                testIdx: 0,
                testCase: dummyTest,
                promptId: 'dummyPlugin',
                score: 0,
                isRedteam: true,
            },
        ]);
        const results = await provider.runPandamonium(dummyTargetProvider, dummyTest, allTests);
        // Updated expectation: the function returns the full EvaluateResult object as returned by runEval.
        expect(results).toEqual([
            {
                success: false,
                prompt: { raw: 'result prompt', label: 'result prompt' },
                gradingResult: { pass: false, score: 0, reason: 'dummy reason' },
                promptIdx: 0,
                testIdx: 0,
                testCase: dummyTest,
                promptId: 'dummyPlugin',
                score: 0,
                isRedteam: true,
            },
        ]);
        // Verify that runEval was invoked with the test provider and result prompt
        expect(evaluator_1.runEval).toHaveBeenCalledWith(expect.objectContaining({
            provider: dummyTargetProvider,
            prompt: { raw: 'dummy prompt', label: 'dummy prompt' },
        }));
        // Confirm that /start, /next, and /success endpoints were called.
        const calls = jest.mocked(fetch_1.fetchWithRetries).mock.calls;
        expect(calls.some((call) => call[0].includes('/start'))).toBe(true);
        expect(calls.some((call) => call[0].includes('/next'))).toBe(true);
        expect(calls.some((call) => call[0].includes('/success'))).toBe(true);
    });
    it('should handle error during pandamonium run gracefully', async () => {
        const dummyTest = {
            vars: { example: 'dummy prompt', harmCateogry: 'dummy' },
            metadata: { pluginId: 'dummyPlugin' },
        };
        const allTests = [
            {
                test: dummyTest,
                provider: dummyTargetProvider,
                prompt: { raw: 'dummy prompt', label: 'dummy prompt' },
                delay: 0,
                testIdx: 0,
                promptIdx: 0,
                repeatIndex: 0,
                isRedteam: true,
            },
        ];
        const provider = new pandamonium_1.default({ injectVar: 'example' });
        // Simulate a network error during the /start endpoint.
        jest.mocked(fetch_1.fetchWithRetries).mockRejectedValueOnce(new Error('Network error'));
        const results = await provider.runPandamonium(dummyTargetProvider, dummyTest, allTests);
        // On error, an empty result array should be returned.
        expect(results).toEqual([]);
    });
});
//# sourceMappingURL=pandamonium.test.js.map