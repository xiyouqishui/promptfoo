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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const promises_1 = __importDefault(require("fs/promises"));
const init = __importStar(require("../../src/commands/init"));
const logger_1 = __importDefault(require("../../src/logger"));
jest.mock('../../src/redteam/commands/init', () => ({
    redteamInit: jest.fn(),
}));
jest.mock('../../src/server/server', () => ({
    startServer: jest.fn(),
    BrowserBehavior: {
        ASK: 0,
        OPEN: 1,
        SKIP: 2,
        OPEN_TO_REPORT: 3,
        OPEN_TO_REDTEAM_CREATE: 4,
    },
}));
jest.mock('../../src/commands/init', () => {
    const actual = jest.requireActual('../../src/commands/init');
    return {
        ...actual,
        downloadDirectory: jest.fn(actual.downloadDirectory),
        downloadExample: jest.fn(actual.downloadExample),
        getExamplesList: jest.fn(actual.getExamplesList),
    };
});
jest.mock('fs/promises');
jest.mock('path');
jest.mock('../../src/constants');
jest.mock('../../src/onboarding');
jest.mock('../../src/telemetry');
jest.mock('@inquirer/confirm');
jest.mock('@inquirer/input');
jest.mock('@inquirer/select');
const mockFetch = jest.mocked(jest.fn());
global.fetch = mockFetch;
describe('init command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('downloadFile', () => {
        it('should download a file successfully', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue('file content'),
            };
            mockFetch.mockResolvedValue(mockResponse);
            await init.downloadFile('https://example.com/file.txt', '/path/to/file.txt');
            expect(mockFetch).toHaveBeenCalledWith('https://example.com/file.txt');
            expect(promises_1.default.writeFile).toHaveBeenCalledWith('/path/to/file.txt', 'file content');
        });
        it('should throw an error if download fails', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found',
            };
            mockFetch.mockResolvedValue(mockResponse);
            await expect(init.downloadFile('https://example.com/file.txt', '/path/to/file.txt')).rejects.toThrow('Failed to download file: Not Found');
        });
        it('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            await expect(init.downloadFile('https://example.com/file.txt', '/path/to/file.txt')).rejects.toThrow('Network error');
        });
    });
    describe('downloadDirectory', () => {
        it('should throw an error if fetching directory contents fails on both VERSION and main', async () => {
            const mockResponse = {
                ok: false,
                statusText: 'Not Found',
            };
            mockFetch.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockResponse);
            await expect(init.downloadDirectory('example', '/path/to/target')).rejects.toThrow('Failed to fetch directory contents: Not Found');
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch.mock.calls[0][0]).toContain('?ref=');
            expect(mockFetch.mock.calls[1][0]).toContain('?ref=main');
        });
        it('should succeed if VERSION fails but main succeeds', async () => {
            const mockFailedResponse = {
                ok: false,
                statusText: 'Not Found',
            };
            const mockSuccessResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue([]),
            };
            mockFetch
                .mockResolvedValueOnce(mockFailedResponse)
                .mockResolvedValueOnce(mockSuccessResponse);
            await init.downloadDirectory('example', '/path/to/target');
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch.mock.calls[0][0]).toContain('?ref=');
            expect(mockFetch.mock.calls[1][0]).toContain('?ref=main');
        });
        it('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            await expect(init.downloadDirectory('example', '/path/to/target')).rejects.toThrow('Network error');
        });
    });
    describe('downloadExample', () => {
        it('should throw an error if directory creation fails', async () => {
            jest.spyOn(promises_1.default, 'mkdir').mockRejectedValue(new Error('Permission denied'));
            await expect(init.downloadExample('example', '/path/to/target')).rejects.toThrow('Failed to download example: Permission denied');
        });
        it('should throw an error if downloadDirectory fails', async () => {
            jest.spyOn(promises_1.default, 'mkdir').mockResolvedValue(undefined);
            jest.mocked(init.downloadDirectory).mockRejectedValue(new Error('Download failed'));
            await expect(init.downloadExample('example', '/path/to/target')).rejects.toThrow('Failed to download example: Network error');
        });
    });
    describe('getExamplesList', () => {
        it('should return a list of examples', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue([
                    { name: 'example1', type: 'dir' },
                    { name: 'example2', type: 'dir' },
                    { name: 'not-an-example', type: 'file' },
                ]),
            };
            mockFetch.mockResolvedValue(mockResponse);
            const examples = await init.getExamplesList();
            expect(examples).toEqual(['example1', 'example2']);
        });
        it('should return an empty array if fetching fails', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found',
            };
            mockFetch.mockResolvedValue(mockResponse);
            const examples = await init.getExamplesList();
            expect(examples).toEqual([]);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Not Found'));
        });
        it('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const examples = await init.getExamplesList();
            expect(examples).toEqual([]);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
        });
    });
    describe('initCommand', () => {
        let program;
        beforeEach(() => {
            program = new commander_1.Command();
            init.initCommand(program);
            const initCmd = program.commands.find((cmd) => cmd.name() === 'init');
            if (!initCmd) {
                throw new Error('initCmd not found');
            }
        });
        it('should set up the init command correctly', () => {
            const initCmd = program.commands.find((cmd) => cmd.name() === 'init');
            expect(initCmd).toBeDefined();
            expect(initCmd?.description()).toBe('Initialize project with dummy files or download an example');
            expect(initCmd?.options).toHaveLength(2);
        });
    });
});
//# sourceMappingURL=init.test.js.map