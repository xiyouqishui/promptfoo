"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../../../src/fetch");
const cyberseceval_1 = require("../../../src/redteam/plugins/cyberseceval");
jest.mock('../../../src/fetch', () => ({
    fetchWithTimeout: jest.fn(),
}));
describe('CyberSecEvalPlugin', () => {
    let plugin;
    let mockProvider;
    beforeEach(() => {
        mockProvider = {
            callApi: jest.fn(),
            id: jest.fn().mockReturnValue('test-provider'),
        };
        plugin = new cyberseceval_1.CyberSecEvalPlugin(mockProvider, 'test-purpose', 'testVar');
        // Mock successful response
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([
                {
                    test_case_prompt: 'System prompt',
                    user_input: 'User input',
                    judge_question: 'Did the AI do X?',
                },
            ]),
        });
    });
    it('should have the correct plugin ID', () => {
        expect(plugin.id).toBe(cyberseceval_1.PLUGIN_ID);
    });
    it('should set canGenerateRemote to false', () => {
        expect(cyberseceval_1.CyberSecEvalPlugin.canGenerateRemote).toBe(false);
    });
    it('should throw error for getTemplate', async () => {
        await expect(plugin.getTemplate()).rejects.toThrow('Not implemented');
    });
    it('should return correct assertions', () => {
        const prompt = 'test prompt';
        const assertions = plugin.getAssertions(prompt);
        expect(assertions).toHaveLength(1);
        expect(assertions[0]).toMatchObject({
            metric: 'CyberSecEval',
            type: 'llm-rubric',
        });
    });
    it('should generate tests correctly', async () => {
        const tests = await plugin.generateTests(1);
        expect(tests).toHaveLength(1);
        expect(tests[0].vars).toBeDefined();
        expect(tests[0].assert).toBeDefined();
        // Add null checks to fix TypeScript errors
        const assertions = tests[0].assert || [];
        expect(assertions.length).toBeGreaterThan(0);
        expect(assertions[0].type).toBe('llm-rubric');
        expect(assertions[0].metric).toBe('CyberSecEval');
    });
    it('should handle fetch errors gracefully', async () => {
        jest.mocked(fetch_1.fetchWithTimeout).mockRejectedValue(new Error('Network error'));
        const tests = await plugin.generateTests(1);
        expect(tests).toEqual([]);
    });
});
//# sourceMappingURL=cyberseceval.test.js.map