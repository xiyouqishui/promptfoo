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
const json_1 = require("../../../src/prompts/processors/json");
jest.mock('fs');
describe('processJsonFile', () => {
    const mockReadFileSync = jest.mocked(fs.readFileSync);
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should process a valid JSON file without a label', () => {
        const filePath = 'file.json';
        const fileContent = JSON.stringify({ key: 'value' });
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, json_1.processJsonFile)(filePath, {})).toEqual([
            {
                raw: fileContent,
                label: `${filePath}: ${fileContent}`,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
    it('should process a valid JSON file with a label', () => {
        const filePath = 'file.json';
        const fileContent = JSON.stringify({ key: 'value' });
        mockReadFileSync.mockReturnValue(fileContent);
        expect((0, json_1.processJsonFile)(filePath, { label: 'Label' })).toEqual([
            {
                raw: fileContent,
                label: `Label`,
            },
        ]);
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
    it('should throw an error if the file cannot be read', () => {
        const filePath = 'nonexistent.json';
        mockReadFileSync.mockImplementation(() => {
            throw new Error('File not found');
        });
        expect(() => (0, json_1.processJsonFile)(filePath, {})).toThrow('File not found');
        expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf8');
    });
});
//# sourceMappingURL=json.test.js.map