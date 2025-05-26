"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envars_1 = require("../../src/envars");
const fetch_1 = require("../../src/fetch");
const huggingfaceDatasets_1 = require("../../src/integrations/huggingfaceDatasets");
jest.mock('../../src/fetch', () => ({
    fetchWithProxy: jest.fn(),
}));
jest.mock('../../src/envars', () => ({
    getEnvString: jest.fn().mockReturnValue(''),
}));
describe('huggingfaceDatasets', () => {
    beforeEach(() => {
        jest.mocked(fetch_1.fetchWithProxy).mockClear();
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    describe('parseDatasetPath', () => {
        it('should parse path with default parameters', () => {
            const result = (0, huggingfaceDatasets_1.parseDatasetPath)('huggingface://datasets/owner/repo');
            expect(result).toEqual({
                owner: 'owner',
                repo: 'repo',
                queryParams: expect.any(URLSearchParams),
            });
            expect(result.queryParams.get('split')).toBe('test');
            expect(result.queryParams.get('config')).toBe('default');
        });
        it('should parse path with custom query parameters', () => {
            const result = (0, huggingfaceDatasets_1.parseDatasetPath)('huggingface://datasets/owner/repo?split=train&config=custom&limit=10');
            expect(result).toEqual({
                owner: 'owner',
                repo: 'repo',
                queryParams: expect.any(URLSearchParams),
            });
            expect(result.queryParams.get('split')).toBe('train');
            expect(result.queryParams.get('config')).toBe('custom');
            expect(result.queryParams.get('limit')).toBe('10');
        });
        it('should override default parameters with user parameters', () => {
            const result = (0, huggingfaceDatasets_1.parseDatasetPath)('huggingface://datasets/owner/repo?split=validation');
            expect(result.queryParams.get('split')).toBe('validation');
            expect(result.queryParams.get('config')).toBe('default');
        });
    });
    it('should fetch and parse dataset with default parameters', async () => {
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 2,
                features: [
                    { name: 'act', type: { dtype: 'string', _type: 'Value' } },
                    { name: 'prompt', type: { dtype: 'string', _type: 'Value' } },
                ],
                rows: [
                    { row: { act: 'Linux Terminal', prompt: 'List all files' } },
                    { row: { act: 'Math Tutor', prompt: 'Solve 2+2' } },
                ],
            }),
        });
        const tests = await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)('huggingface://datasets/test/dataset');
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenCalledWith('https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=test&config=default&offset=0&length=100', expect.objectContaining({
            headers: {},
        }));
        expect(tests).toHaveLength(2);
        expect(tests[0].vars).toEqual({
            act: 'Linux Terminal',
            prompt: 'List all files',
        });
        expect(tests[1].vars).toEqual({
            act: 'Math Tutor',
            prompt: 'Solve 2+2',
        });
        // Check that disableVarExpansion is set for all test cases
        tests.forEach((test) => {
            expect(test.options).toEqual({
                disableVarExpansion: true,
            });
        });
    });
    it('should include auth token when HF_TOKEN is set', async () => {
        jest.mocked(envars_1.getEnvString).mockImplementation((key) => {
            if (key === 'HF_TOKEN') {
                return 'test-token';
            }
            return '';
        });
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 1,
                features: [
                    { name: 'question', type: { dtype: 'string', _type: 'Value' } },
                    { name: 'answer', type: { dtype: 'string', _type: 'Value' } },
                ],
                rows: [{ row: { question: 'What is 2+2?', answer: '4' } }],
            }),
        });
        await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)('huggingface://datasets/test/dataset');
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenCalledWith('https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=test&config=default&offset=0&length=100', expect.objectContaining({
            headers: {
                Authorization: 'Bearer test-token',
            },
        }));
    });
    it('should handle custom query parameters', async () => {
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 1,
                features: [
                    { name: 'question', type: { dtype: 'string', _type: 'Value' } },
                    { name: 'answer', type: { dtype: 'string', _type: 'Value' } },
                ],
                rows: [{ row: { question: 'What is 2+2?', answer: '4' } }],
            }),
        });
        await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)('huggingface://datasets/test/dataset?split=train&config=custom');
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenCalledWith('https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=train&config=custom&offset=0&length=100', expect.objectContaining({
            headers: {},
        }));
    });
    it('should handle pagination', async () => {
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 3,
                features: [{ name: 'text', type: { dtype: 'string', _type: 'Value' } }],
                rows: [{ row: { text: 'First' } }, { row: { text: 'Second' } }],
            }),
        });
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 3,
                features: [{ name: 'text', type: { dtype: 'string', _type: 'Value' } }],
                rows: [{ row: { text: 'Third' } }],
            }),
        });
        const tests = await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)('huggingface://datasets/test/dataset');
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenCalledTimes(2);
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenNthCalledWith(1, 'https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=test&config=default&offset=0&length=100', expect.objectContaining({
            headers: {},
        }));
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenNthCalledWith(2, 'https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=test&config=default&offset=2&length=100', expect.objectContaining({
            headers: {},
        }));
        expect(tests).toHaveLength(3);
        expect(tests.map((t) => t.vars?.text)).toEqual(['First', 'Second', 'Third']);
        // Check that disableVarExpansion is set for all test cases
        tests.forEach((test) => {
            expect(test.options).toEqual({
                disableVarExpansion: true,
            });
        });
    });
    it('should handle API errors', async () => {
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: false,
            statusText: 'Not Found',
        });
        await expect((0, huggingfaceDatasets_1.fetchHuggingFaceDataset)('huggingface://datasets/nonexistent/dataset')).rejects.toThrow('[Huggingface Dataset] Failed to fetch dataset: Not Found');
    });
    it('should respect user-specified limit parameter', async () => {
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 5,
                features: [{ name: 'text', type: { dtype: 'string', _type: 'Value' } }],
                rows: [{ row: { text: 'First' } }, { row: { text: 'Second' } }, { row: { text: 'Third' } }],
            }),
        });
        const tests = await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)('huggingface://datasets/test/dataset?limit=2');
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenCalledWith('https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=test&config=default&limit=2&offset=0&length=2', expect.objectContaining({
            headers: {},
        }));
        expect(tests).toHaveLength(2);
        expect(tests.map((t) => t.vars?.text)).toEqual(['First', 'Second']);
        // Check that disableVarExpansion is set for all test cases
        tests.forEach((test) => {
            expect(test.options).toEqual({
                disableVarExpansion: true,
            });
        });
    });
    it('should handle limit larger than page size', async () => {
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 150,
                features: [{ name: 'text', type: { dtype: 'string', _type: 'Value' } }],
                rows: Array(100)
                    .fill(null)
                    .map((_, i) => ({ row: { text: `Item ${i + 1}` } })),
            }),
        });
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                num_rows_total: 150,
                features: [{ name: 'text', type: { dtype: 'string', _type: 'Value' } }],
                rows: Array(20)
                    .fill(null)
                    .map((_, i) => ({ row: { text: `Item ${i + 101}` } })),
            }),
        });
        const tests = await (0, huggingfaceDatasets_1.fetchHuggingFaceDataset)('huggingface://datasets/test/dataset?limit=120');
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenCalledTimes(2);
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenNthCalledWith(1, 'https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=test&config=default&limit=120&offset=0&length=100', expect.objectContaining({
            headers: {},
        }));
        expect(jest.mocked(fetch_1.fetchWithProxy)).toHaveBeenNthCalledWith(2, 'https://datasets-server.huggingface.co/rows?dataset=test%2Fdataset&split=test&config=default&limit=120&offset=100&length=20', expect.objectContaining({
            headers: {},
        }));
        expect(tests).toHaveLength(120);
        expect(tests[119].vars?.text).toBe('Item 120');
        // Check that disableVarExpansion is set for all test cases
        tests.forEach((test) => {
            expect(test.options).toEqual({
                disableVarExpansion: true,
            });
        });
    });
});
//# sourceMappingURL=huggingfaceDatasets.test.js.map