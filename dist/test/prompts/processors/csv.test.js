"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const csv_1 = require("../../../src/prompts/processors/csv");
jest.mock('fs');
describe('processCsvPrompts', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should process a single column CSV with header', async () => {
        const csvContent = (0, ts_dedent_1.default) `
      prompt
      Tell me about {{topic}}
      Explain {{topic}} in simple terms
      Write a poem about {{topic}}
    `;
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(csvContent);
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', {});
        expect(result).toHaveLength(3);
        expect(result).toEqual([
            {
                raw: 'Tell me about {{topic}}',
                label: 'Prompt 1 - Tell me about {{topic}}',
            },
            {
                raw: 'Explain {{topic}} in simple terms',
                label: 'Prompt 2 - Explain {{topic}} in simple terms',
            },
            {
                raw: 'Write a poem about {{topic}}',
                label: 'Prompt 3 - Write a poem about {{topic}}',
            },
        ]);
    });
    it('should process a single column text file without header', async () => {
        const csvContent = (0, ts_dedent_1.default) `
      Tell me about {{topic}}
      Explain {{topic}} in simple terms
      Write a poem about {{topic}}
    `;
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(csvContent);
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', {});
        expect(result).toHaveLength(3);
        expect(result).toEqual([
            {
                raw: 'Tell me about {{topic}}',
                label: 'Prompt 1 - Tell me about {{topic}}',
            },
            {
                raw: 'Explain {{topic}} in simple terms',
                label: 'Prompt 2 - Explain {{topic}} in simple terms',
            },
            {
                raw: 'Write a poem about {{topic}}',
                label: 'Prompt 3 - Write a poem about {{topic}}',
            },
        ]);
    });
    it('should process a two column CSV with prompt and label', async () => {
        const csvContent = (0, ts_dedent_1.default) `
      prompt,label
      Tell me about {{topic}},Basic Query
      Explain {{topic}} in simple terms,Simple Explanation
      Write a poem about {{topic}},Poetry Generator
    `;
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(csvContent);
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', {});
        expect(result).toHaveLength(3);
        expect(result).toEqual([
            {
                raw: 'Tell me about {{topic}}',
                label: 'Basic Query',
            },
            {
                raw: 'Explain {{topic}} in simple terms',
                label: 'Simple Explanation',
            },
            {
                raw: 'Write a poem about {{topic}}',
                label: 'Poetry Generator',
            },
        ]);
    });
    it('should generate labels from prompt content when not provided', async () => {
        const csvContent = (0, ts_dedent_1.default) `
      prompt
      This is a very long prompt that should be truncated for the label
    `;
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(csvContent);
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', {});
        expect(result).toHaveLength(1);
        expect(result).toEqual([
            {
                raw: 'This is a very long prompt that should be truncated for the label',
                label: 'Prompt 1 - This is a very long prompt that should be truncated for the label',
            },
        ]);
    });
    it('should use base prompt properties if provided', async () => {
        const csvContent = (0, ts_dedent_1.default) `
      prompt
      Tell me about {{topic}}
    `;
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(csvContent);
        const basePrompt = {
            label: 'Base Label',
            id: 'base-id',
        };
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', basePrompt);
        expect(result).toHaveLength(1);
        expect(result).toEqual([
            {
                raw: 'Tell me about {{topic}}',
                label: 'Base Label',
                id: 'base-id',
            },
        ]);
    });
    it('should skip rows with missing prompt values', async () => {
        const csvContent = (0, ts_dedent_1.default) `
      prompt,label
      Tell me about {{topic}},Basic Query

      Write a poem about {{topic}},Poetry Generator
    `;
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(csvContent);
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', {});
        expect(result).toHaveLength(2);
        expect(result).toEqual([
            {
                raw: 'Tell me about {{topic}}',
                label: 'Basic Query',
            },
            {
                raw: 'Write a poem about {{topic}}',
                label: 'Poetry Generator',
            },
        ]);
    });
    it('should handle custom delimiters', async () => {
        const csvContent = (0, ts_dedent_1.default) `
      prompt;label
      Tell me about {{topic}};Basic Query
      Explain {{topic}} in simple terms;Simple Explanation
    `;
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(csvContent);
        process.env.PROMPTFOO_CSV_DELIMITER = ';';
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', {});
        expect(result).toHaveLength(2);
        expect(result).toEqual([
            {
                raw: 'Tell me about {{topic}}',
                label: 'Basic Query',
            },
            {
                raw: 'Explain {{topic}} in simple terms',
                label: 'Simple Explanation',
            },
        ]);
        delete process.env.PROMPTFOO_CSV_DELIMITER;
    });
    it('should handle empty files', async () => {
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('');
        const result = await (0, csv_1.processCsvPrompts)('prompts.csv', {});
        expect(result).toHaveLength(0);
    });
});
//# sourceMappingURL=csv.test.js.map