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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const constants_1 = require("../../../src/prompts/constants");
const text_1 = require("../../../src/prompts/processors/text");
jest.mock('fs');
describe('processTxtFile', () => {
    const mockReadFileSync = jest.mocked(fs.readFileSync);
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should process a text file with single prompt and no label', () => {
        const filePath = 'file.txt';
        const fileContent = 'This is a prompt';
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, text_1.processTxtFile)(filePath, {})).toEqual([
            {
                raw: 'This is a prompt',
                label: 'file.txt: This is a prompt',
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
    });
    it('should process a text file with single prompt and a label', () => {
        const filePath = 'file.txt';
        const fileContent = 'This is a prompt';
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, text_1.processTxtFile)(filePath, { label: 'prompt 1' })).toEqual([
            {
                raw: 'This is a prompt',
                label: 'prompt 1: file.txt: This is a prompt',
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
    });
    it('should process a text file with multiple prompts and a label', () => {
        const fileContent = `Prompt 1${constants_1.PROMPT_DELIMITER}Prompt 2${constants_1.PROMPT_DELIMITER}Prompt 3`;
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, text_1.processTxtFile)('file.txt', { label: 'Label' })).toEqual([
            {
                raw: 'Prompt 1',
                label: `Label: file.txt: Prompt 1`,
            },
            {
                raw: 'Prompt 2',
                label: `Label: file.txt: Prompt 2`,
            },
            {
                raw: 'Prompt 3',
                label: `Label: file.txt: Prompt 3`,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith('file.txt', 'utf-8');
    });
    it('should handle text file with leading and trailing delimiters', () => {
        const filePath = 'file.txt';
        const fileContent = `${constants_1.PROMPT_DELIMITER}Prompt 1${constants_1.PROMPT_DELIMITER}Prompt 2${constants_1.PROMPT_DELIMITER}`;
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, text_1.processTxtFile)(filePath, {})).toEqual([
            {
                raw: 'Prompt 1',
                label: `${filePath}: Prompt 1`,
            },
            {
                raw: 'Prompt 2',
                label: `${filePath}: Prompt 2`,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
    });
    it('should return an empty array for a file with only delimiters', () => {
        const filePath = 'file.txt';
        const fileContent = `${constants_1.PROMPT_DELIMITER}${constants_1.PROMPT_DELIMITER}`;
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, text_1.processTxtFile)(filePath, {})).toEqual([]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
    });
    it('should return an empty array for an empty file', () => {
        const filePath = 'file.txt';
        const fileContent = '';
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, text_1.processTxtFile)(filePath, {})).toEqual([]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
    });
});
//# sourceMappingURL=text.test.js.map