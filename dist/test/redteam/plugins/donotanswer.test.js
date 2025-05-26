"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../../../src/fetch");
const logger_1 = __importDefault(require("../../../src/logger"));
const donotanswer_1 = require("../../../src/redteam/plugins/donotanswer");
jest.mock('fs');
jest.mock('../../../src/fetch');
jest.mock('../../../src/logger');
describe('DoNotAnswerPlugin', () => {
    let plugin;
    beforeEach(() => {
        jest.resetAllMocks();
        plugin = new donotanswer_1.DoNotAnswerPlugin({}, 'test', 'input');
    });
    describe('fetchDataset', () => {
        it('should fetch and parse dataset correctly', async () => {
            const mockData = `id,risk_area,types_of_harm,specific_harms,question
1,test_area,test_harm,specific,test_question`;
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockData),
            });
            const result = await (0, donotanswer_1.fetchDataset)(1);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                vars: {
                    risk_area: 'test_area',
                    types_of_harm: 'test_harm',
                    specific_harms: 'specific',
                    question: 'test_question',
                },
            });
        });
        it('should handle fetch errors gracefully', async () => {
            jest.mocked(fetch_1.fetchWithTimeout).mockRejectedValue(new Error('Fetch failed'));
            const result = await (0, donotanswer_1.fetchDataset)(1);
            expect(result).toEqual([]);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error fetching dataset'));
        });
    });
    describe('DoNotAnswerPlugin class', () => {
        it('should have correct plugin ID', () => {
            expect(plugin.id).toBe(donotanswer_1.PLUGIN_ID);
        });
        it('should set canGenerateRemote to false', () => {
            expect(donotanswer_1.DoNotAnswerPlugin.canGenerateRemote).toBe(false);
        });
        it('should throw error for getTemplate', async () => {
            await expect(plugin.getTemplate()).rejects.toThrow('Not implemented');
        });
        it('should return correct assertions', () => {
            const prompt = 'test prompt';
            const assertions = plugin.getAssertions(prompt);
            expect(assertions).toHaveLength(1);
            expect(assertions[0]).toMatchObject({
                metric: 'DoNotAnswer',
                type: 'llm-rubric',
            });
        });
        it('should generate tests correctly', async () => {
            const mockData = `id,risk_area,types_of_harm,specific_harms,question
1,test_area,test_harm,specific,test_question`;
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(mockData),
            });
            const tests = await plugin.generateTests(1);
            expect(tests).toHaveLength(1);
            expect(tests[0]).toMatchObject({
                vars: {
                    input: 'test_question',
                },
                metadata: {
                    risk_area: 'test_area',
                    types_of_harm: 'test_harm',
                    specific_harms: 'specific',
                    pluginId: 'donotanswer',
                },
            });
        });
        it('should handle fetch errors gracefully in generateTests', async () => {
            jest.mocked(fetch_1.fetchWithTimeout).mockRejectedValue(new Error('Fetch failed'));
            const tests = await plugin.generateTests(1);
            expect(tests).toEqual([]);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error fetching dataset'));
        });
    });
});
//# sourceMappingURL=donotanswer.test.js.map