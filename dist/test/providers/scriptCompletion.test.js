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
const child_process_1 = require("child_process");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const cacheModule = __importStar(require("../../src/cache"));
const scriptCompletion_1 = require("../../src/providers/scriptCompletion");
jest.mock('fs');
jest.mock('crypto');
jest.mock('child_process');
jest.mock('../../src/cache');
describe('parseScriptParts', () => {
    it('should parse script parts correctly', () => {
        const scriptPath = `node script.js "arg with 'spaces'" 'another arg' simple_arg`;
        const result = (0, scriptCompletion_1.parseScriptParts)(scriptPath);
        expect(result).toEqual(['node', 'script.js', "arg with 'spaces'", 'another arg', 'simple_arg']);
    });
    it('should handle script path with no arguments', () => {
        const scriptPath = '/bin/bash script.sh';
        const result = (0, scriptCompletion_1.parseScriptParts)(scriptPath);
        expect(result).toEqual(['/bin/bash', 'script.sh']);
    });
});
describe('getFileHashes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should return file hashes for existing files', () => {
        const scriptParts = ['file1.js', 'file2.js', 'nonexistent.js'];
        const mockFileContent1 = 'content1';
        const mockFileContent2 = 'content2';
        const mockHash1 = 'hash1';
        const mockHash2 = 'hash2';
        jest.mocked(fs_1.default.existsSync).mockImplementation((path) => path !== 'nonexistent.js');
        jest.mocked(fs_1.default.statSync).mockReturnValue({
            isFile: () => true,
            isDirectory: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
        });
        jest.mocked(fs_1.default.readFileSync).mockImplementation((path) => {
            if (path === 'file1.js') {
                return mockFileContent1;
            }
            if (path === 'file2.js') {
                return mockFileContent2;
            }
            throw new Error('File not found');
        });
        const mockHashUpdate = {
            update: jest.fn().mockReturnThis(),
            digest: jest.fn(),
        };
        jest
            .mocked(mockHashUpdate.digest)
            .mockReturnValueOnce(mockHash1)
            .mockReturnValueOnce(mockHash2);
        jest.mocked(crypto_1.default.createHash).mockReturnValue(mockHashUpdate);
        const result = (0, scriptCompletion_1.getFileHashes)(scriptParts);
        expect(result).toEqual([mockHash1, mockHash2]);
        expect(fs_1.default.existsSync).toHaveBeenCalledTimes(3);
        expect(fs_1.default.readFileSync).toHaveBeenCalledTimes(2);
        expect(crypto_1.default.createHash).toHaveBeenCalledTimes(2);
    });
    it('should return an empty array for non-existent files', () => {
        const scriptParts = ['nonexistent1.js', 'nonexistent2.js'];
        jest.mocked(fs_1.default.existsSync).mockReturnValue(false);
        const result = (0, scriptCompletion_1.getFileHashes)(scriptParts);
        expect(result).toEqual([]);
        expect(fs_1.default.existsSync).toHaveBeenCalledTimes(2);
        expect(fs_1.default.readFileSync).not.toHaveBeenCalled();
        expect(crypto_1.default.createHash).not.toHaveBeenCalled();
    });
});
describe('ScriptCompletionProvider', () => {
    let provider;
    beforeEach(() => {
        provider = new scriptCompletion_1.ScriptCompletionProvider('node script.js');
        jest.clearAllMocks();
        jest.mocked(cacheModule.getCache).mockReset();
        jest.mocked(cacheModule.isCacheEnabled).mockReset();
    });
    it('should return the correct id', () => {
        expect(provider.id()).toBe('exec:node script.js');
    });
    it('should handle UTF-8 characters in script output', async () => {
        const utf8Output = 'Hello, 世界!';
        jest.mocked(child_process_1.execFile).mockImplementation((cmd, args, options, callback) => {
            callback(null, Buffer.from(utf8Output), '');
            return {};
        });
        const result = await provider.callApi('test prompt');
        expect(result.output).toBe(utf8Output);
    });
    it('should handle UTF-8 characters in error output', async () => {
        const utf8Error = 'エラー発生';
        jest.mocked(child_process_1.execFile).mockImplementation((cmd, args, options, callback) => {
            if (typeof callback === 'function') {
                callback(null, '', Buffer.from(utf8Error));
            }
            return {};
        });
        await expect(provider.callApi('test prompt')).rejects.toThrow(utf8Error);
    });
    it('should use cache when available', async () => {
        const cachedResult = { output: 'cached result' };
        const mockCache = {
            get: jest.fn().mockResolvedValue(JSON.stringify(cachedResult)),
            set: jest.fn(),
        };
        jest.spyOn(cacheModule, 'getCache').mockResolvedValue(mockCache);
        jest.spyOn(cacheModule, 'isCacheEnabled').mockReturnValue(true);
        // Mock fs.existsSync to return true for at least one file
        jest.mocked(fs_1.default.existsSync).mockReturnValue(true);
        jest.mocked(fs_1.default.statSync).mockReturnValue({ isFile: () => true });
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('file content');
        const mockHashUpdate = {
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('mock hash'),
        };
        jest.mocked(crypto_1.default.createHash).mockReturnValue(mockHashUpdate);
        const result = await provider.callApi('test prompt');
        expect(result).toEqual(cachedResult);
        expect(mockCache.get).toHaveBeenCalledWith('exec:node script.js:mock hash:mock hash:test prompt:undefined');
        expect(child_process_1.execFile).not.toHaveBeenCalled();
    });
    it('should handle script execution errors', async () => {
        const errorMessage = 'Script execution failed';
        jest.mocked(child_process_1.execFile).mockImplementation((cmd, args, options, callback) => {
            if (typeof callback === 'function') {
                callback(new Error(errorMessage), '', '');
            }
            return {};
        });
        await expect(provider.callApi('test prompt')).rejects.toThrow(errorMessage);
    });
    it('should handle empty standard output with error output', async () => {
        const errorOutput = 'Warning: Something went wrong';
        jest.mocked(child_process_1.execFile).mockImplementation((cmd, args, options, callback) => {
            if (typeof callback === 'function') {
                callback(null, '', Buffer.from(errorOutput));
            }
            return {};
        });
        await expect(provider.callApi('test prompt')).rejects.toThrow(errorOutput);
    });
    it('should strip ANSI escape codes from output', async () => {
        const ansiOutput = '\x1b[31mColored\x1b[0m \x1b[1mBold\x1b[0m';
        const strippedOutput = 'Colored Bold';
        jest.mocked(child_process_1.execFile).mockImplementation((cmd, args, options, callback) => {
            if (typeof callback === 'function') {
                callback(null, Buffer.from(ansiOutput), '');
            }
            return {};
        });
        const result = await provider.callApi('test prompt');
        expect(result.output).toBe(strippedOutput);
    });
});
//# sourceMappingURL=scriptCompletion.test.js.map