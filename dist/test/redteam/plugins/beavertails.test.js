"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const huggingfaceDatasets_1 = require("../../../src/integrations/huggingfaceDatasets");
const beavertails_1 = require("../../../src/redteam/plugins/beavertails");
jest.mock('../../../src/integrations/huggingfaceDatasets');
describe('BeavertailsPlugin', () => {
    it('should set canGenerateRemote to false', () => {
        expect(beavertails_1.BeavertailsPlugin.canGenerateRemote).toBe(false);
    });
});
describe('BeavertailsGrader', () => {
    it('should have the correct plugin ID', () => {
        const grader = new beavertails_1.BeavertailsGrader();
        expect(grader.id).toBe(beavertails_1.PLUGIN_ID);
        expect(beavertails_1.PLUGIN_ID).toBe('promptfoo:redteam:beavertails');
    });
});
describe('fetchAllDatasets', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should fetch and filter datasets correctly', async () => {
        const mockTestCases = [
            {
                vars: {
                    prompt: 'test prompt 1',
                    is_safe: false,
                },
            },
            {
                vars: {
                    prompt: 'test prompt 2',
                    is_safe: true, // Should be filtered out
                },
            },
            {
                vars: {
                    prompt: 'test prompt 3',
                    is_safe: false,
                },
            },
        ];
        jest.mocked(huggingfaceDatasets_1.fetchHuggingFaceDataset).mockResolvedValue(mockTestCases);
        const result = await (0, beavertails_1.fetchAllDatasets)(2);
        expect(huggingfaceDatasets_1.fetchHuggingFaceDataset).toHaveBeenCalledTimes(1);
        expect(result.length).toBeLessThanOrEqual(2);
        expect(result[0].vars).toHaveProperty('prompt');
        expect(result.every((test) => !test.vars.is_safe)).toBe(true);
    });
    it('should handle empty dataset', async () => {
        jest.mocked(huggingfaceDatasets_1.fetchHuggingFaceDataset).mockResolvedValue([]);
        const result = await (0, beavertails_1.fetchAllDatasets)(5);
        expect(result).toEqual([]);
    });
    it('should handle invalid test cases', async () => {
        const invalidTestCases = [
            {},
            { vars: null },
            { vars: { prompt: null } },
            null,
            undefined,
        ];
        jest.mocked(huggingfaceDatasets_1.fetchHuggingFaceDataset).mockResolvedValue(invalidTestCases);
        const result = await (0, beavertails_1.fetchAllDatasets)(5);
        expect(result).toEqual([]);
    });
    it('should handle fetch errors', async () => {
        jest.mocked(huggingfaceDatasets_1.fetchHuggingFaceDataset).mockRejectedValue(new Error('Fetch failed'));
        const result = await (0, beavertails_1.fetchAllDatasets)(5);
        expect(result).toEqual([]);
    });
});
//# sourceMappingURL=beavertails.test.js.map