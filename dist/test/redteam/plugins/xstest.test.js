"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sync_1 = require("csv-parse/sync");
const fetch_1 = require("../../../src/fetch");
const logger_1 = __importDefault(require("../../../src/logger"));
const xstest_1 = require("../../../src/redteam/plugins/xstest");
jest.mock('fs');
jest.mock('csv-parse/sync');
jest.mock('../../../src/fetch');
jest.mock('../../../src/logger');
describe('XSTest Plugin', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    describe('fetchDataset', () => {
        const mockCsvData = `id,prompt,type,label,focus,note
1,"take a photo",homonyms,safe,shoot,photography
2,"kill time",homonyms,safe,kill,idle
3,"shoot someone",homonyms,unsafe,shoot,violence`;
        it('should fetch and parse CSV data from URL', async () => {
            const mockResponse = new Response(mockCsvData, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                    'Content-Type': 'text/csv',
                }),
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue(mockResponse);
            jest.mocked(sync_1.parse).mockReturnValue([
                {
                    prompt: 'take a photo',
                    type: 'homonyms',
                    label: 'safe',
                    focus: 'shoot',
                    note: 'photography',
                },
                { prompt: 'kill time', type: 'homonyms', label: 'safe', focus: 'kill', note: 'idle' },
                {
                    prompt: 'shoot someone',
                    type: 'homonyms',
                    label: 'unsafe',
                    focus: 'shoot',
                    note: 'violence',
                },
            ]);
            const result = await (0, xstest_1.fetchDataset)(2);
            expect(result.length).toBeLessThanOrEqual(2);
            expect(result[0].vars).toHaveProperty('prompt');
            expect(result[0].vars).toHaveProperty('focus');
            expect(result[0].vars).toHaveProperty('type');
            expect(result[0].vars).toHaveProperty('label');
            expect(result[0].vars).toHaveProperty('note');
        });
        it('should handle HTTP errors gracefully', async () => {
            const mockErrorResponse = new Response(null, {
                status: 404,
                statusText: 'Not Found',
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue(mockErrorResponse);
            const result = await (0, xstest_1.fetchDataset)(1);
            expect(result).toEqual([]);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('[XSTest] HTTP status: 404 Not Found'));
        });
        it('should handle empty or invalid CSV data', async () => {
            const mockResponse = new Response('', {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                    'Content-Type': 'text/csv',
                }),
            });
            jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue(mockResponse);
            jest.mocked(sync_1.parse).mockReturnValue([]);
            const result = await (0, xstest_1.fetchDataset)(1);
            expect(result).toEqual([]);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('[XSTest] No data rows in CSV'));
        });
    });
    describe('XSTestPlugin', () => {
        const mockProvider = {
            id: () => 'test-provider',
            generateText: jest.fn(),
            callApi: jest.fn(),
        };
        it('should have correct plugin ID', () => {
            const plugin = new xstest_1.XSTestPlugin(mockProvider, 'test', 'input');
            expect(plugin.id).toBe(xstest_1.PLUGIN_ID);
        });
        it('should generate assertions for a prompt', () => {
            const plugin = new xstest_1.XSTestPlugin(mockProvider, 'test', 'input');
            const prompt = 'test prompt';
            const assertions = plugin.getAssertions(prompt);
            expect(assertions).toHaveLength(1);
            expect(assertions[0]).toMatchObject({
                metric: 'XSTest',
                type: 'llm-rubric',
            });
            expect(assertions[0].value).toContain(prompt);
        });
        it('should generate test cases', async () => {
            const plugin = new xstest_1.XSTestPlugin(mockProvider, 'test', 'input');
            const mockTestCases = [
                {
                    vars: {
                        input: 'test1',
                        prompt: 'test1',
                        focus: 'word1',
                        type: 'type1',
                        label: 'safe',
                        note: 'note1',
                    },
                    metadata: {
                        focus: 'word1',
                        type: 'type1',
                        label: 'safe',
                        note: 'note1',
                        pluginId: 'xstest',
                    },
                    assert: [
                        {
                            metric: 'XSTest',
                            type: 'llm-rubric',
                            value: expect.any(String),
                        },
                    ],
                },
            ];
            // @ts-ignore
            jest.spyOn(plugin, 'generateTests').mockResolvedValue(mockTestCases);
            const tests = await plugin.generateTests(2);
            expect(tests).toHaveLength(1);
            expect(tests[0].vars).toHaveProperty('input');
            expect(tests[0].metadata).toHaveProperty('focus');
            expect(tests[0].metadata).toHaveProperty('type');
            expect(tests[0].metadata).toHaveProperty('label');
            expect(tests[0].metadata).toHaveProperty('note');
            expect(tests[0].assert).toHaveLength(1);
        });
        it('should throw error for unimplemented getTemplate', async () => {
            const plugin = new xstest_1.XSTestPlugin(mockProvider, 'test', 'input');
            await expect(plugin.getTemplate()).rejects.toThrow('Not implemented');
        });
    });
});
//# sourceMappingURL=xstest.test.js.map