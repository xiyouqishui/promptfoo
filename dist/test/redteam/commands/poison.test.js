"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const accounts_1 = require("../../../src/globalConfig/accounts");
const poison_1 = require("../../../src/redteam/commands/poison");
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
jest.mock('fs');
jest.mock('path');
jest.mock('node-fetch');
describe('poison command', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(fs_1.default.mkdirSync).mockReturnValue('/mock/dir');
        jest.mocked(fs_1.default.writeFileSync).mockReturnValue();
    });
    describe('getAllFiles', () => {
        it('should get all files recursively', () => {
            const mockFiles = ['file1.txt', 'file2.txt'];
            const mockDirs = ['dir1'];
            jest.mocked(fs_1.default.readdirSync).mockReturnValueOnce([...mockFiles, ...mockDirs]);
            jest.mocked(fs_1.default.readdirSync).mockReturnValueOnce([]);
            jest.mocked(fs_1.default.statSync).mockImplementation((filePath) => ({
                isDirectory: () => filePath.toString().includes('dir1'),
            }));
            jest.mocked(path_1.default.join).mockImplementation((...parts) => parts.join('/'));
            const files = (0, poison_1.getAllFiles)('testDir');
            expect(files).toEqual(['testDir/file1.txt', 'testDir/file2.txt']);
        });
    });
    describe('generatePoisonedDocument', () => {
        it('should call remote API and return response', async () => {
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve({
                    poisonedDocument: 'poisoned content',
                    intendedResult: 'result',
                    task: 'poison-document',
                }),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: 'OK',
                type: 'basic',
                url: 'test-url',
            };
            jest.spyOn(global, 'fetch').mockImplementation().mockResolvedValue(mockResponse);
            const result = await (0, poison_1.generatePoisonedDocument)('test doc', 'test goal');
            expect(fetch).toHaveBeenCalledWith((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task: 'poison-document',
                    document: 'test doc',
                    goal: 'test goal',
                    email: (0, accounts_1.getUserEmail)(),
                }),
            });
            expect(result).toEqual({
                poisonedDocument: 'poisoned content',
                intendedResult: 'result',
                task: 'poison-document',
            });
        });
        it('should throw error on API failure', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve('API Error'),
                headers: new Headers(),
                redirected: false,
                type: 'basic',
                url: 'test-url',
            };
            jest.spyOn(global, 'fetch').mockImplementation().mockResolvedValue(mockResponse);
            await expect((0, poison_1.generatePoisonedDocument)('test doc')).rejects.toThrow('Failed to generate poisoned document');
        });
    });
    describe('poisonDocument', () => {
        it('should poison file document', async () => {
            const mockDoc = {
                docLike: 'test.txt',
                isFile: true,
                dir: null,
            };
            jest.mocked(fs_1.default.readFileSync).mockReturnValue('test content');
            jest.mocked(path_1.default.relative).mockReturnValue('test.txt');
            const mockPoisonResponse = {
                poisonedDocument: 'poisoned content',
                intendedResult: 'result',
                task: 'poison-document',
            };
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve(mockPoisonResponse),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: 'OK',
                type: 'basic',
                url: 'test-url',
            };
            jest.spyOn(global, 'fetch').mockImplementation().mockResolvedValue(mockResponse);
            const result = await (0, poison_1.poisonDocument)(mockDoc, 'output-dir');
            expect(result).toEqual({
                originalPath: 'test.txt',
                poisonedDocument: 'poisoned content',
                intendedResult: 'result',
            });
        });
        it('should poison content document', async () => {
            const mockDoc = {
                docLike: 'test content',
                isFile: false,
                dir: null,
            };
            const mockPoisonResponse = {
                poisonedDocument: 'poisoned content',
                intendedResult: 'result',
                task: 'poison-document',
            };
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve(mockPoisonResponse),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: 'OK',
                type: 'basic',
                url: 'test-url',
            };
            jest.spyOn(global, 'fetch').mockImplementation().mockResolvedValue(mockResponse);
            const result = await (0, poison_1.poisonDocument)(mockDoc, 'output-dir');
            expect(result).toEqual({
                poisonedDocument: 'poisoned content',
                intendedResult: 'result',
            });
        });
        it('should throw error when poisoning fails', async () => {
            const mockDoc = {
                docLike: 'test.txt',
                isFile: true,
                dir: null,
            };
            jest.mocked(fs_1.default.readFileSync).mockImplementation(() => {
                throw new Error('File read error');
            });
            await expect((0, poison_1.poisonDocument)(mockDoc, 'output-dir')).rejects.toThrow('Failed to poison test.txt: Error: File read error');
        });
    });
    describe('doPoisonDocuments', () => {
        it('should process multiple documents', async () => {
            const options = {
                documents: ['test.txt', 'test content'],
                goal: 'test goal',
                output: 'output.yaml',
                outputDir: 'output-dir',
            };
            jest.mocked(fs_1.default.existsSync).mockImplementation((path) => path === 'test.txt');
            jest.mocked(fs_1.default.statSync).mockReturnValue({
                isDirectory: () => false,
            });
            const mockPoisonResponse = {
                poisonedDocument: 'poisoned content',
                intendedResult: 'result',
                task: 'poison-document',
            };
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve(mockPoisonResponse),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: 'OK',
                type: 'basic',
                url: 'test-url',
            };
            jest.spyOn(global, 'fetch').mockImplementation().mockResolvedValue(mockResponse);
            await (0, poison_1.doPoisonDocuments)(options);
            expect(fs_1.default.mkdirSync).toHaveBeenCalledWith('output-dir', { recursive: true });
            expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('output.yaml', expect.any(String));
        });
        it('should handle directory input', async () => {
            const options = {
                documents: ['test-dir'],
                goal: 'test goal',
                output: 'output.yaml',
                outputDir: 'output-dir',
            };
            jest.mocked(fs_1.default.existsSync).mockReturnValue(true);
            jest
                .mocked(fs_1.default.statSync)
                .mockReturnValueOnce({
                isDirectory: () => true,
            })
                .mockReturnValue({
                isDirectory: () => false,
            });
            jest.mocked(fs_1.default.readdirSync).mockReturnValueOnce(['file1.txt']);
            jest.mocked(path_1.default.join).mockImplementation((...parts) => parts.join('/'));
            const mockPoisonResponse = {
                poisonedDocument: 'poisoned content',
                intendedResult: 'result',
                task: 'poison-document',
            };
            const mockResponse = {
                ok: true,
                json: () => Promise.resolve(mockPoisonResponse),
                headers: new Headers(),
                redirected: false,
                status: 200,
                statusText: 'OK',
                type: 'basic',
                url: 'test-url',
            };
            jest.spyOn(global, 'fetch').mockImplementation().mockResolvedValue(mockResponse);
            await (0, poison_1.doPoisonDocuments)(options);
            expect(fs_1.default.mkdirSync).toHaveBeenCalledWith('output-dir', { recursive: true });
            expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('output.yaml', expect.any(String));
        });
    });
});
//# sourceMappingURL=poison.test.js.map