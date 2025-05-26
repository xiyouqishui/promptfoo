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
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const cliState_1 = __importDefault(require("../../src/cliState"));
const file_1 = require("../../src/util/file");
const file_node_1 = require("../../src/util/file.node");
const fileExtensions_1 = require("../../src/util/fileExtensions");
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
}));
describe('file utilities', () => {
    // Helper to create platform-appropriate file URLs
    const getFileUrl = (path) => {
        return process.platform === 'win32'
            ? `file:///C:/${path.replace(/\\/g, '/')}`
            : `file:///${path}`;
    };
    describe('isJavascriptFile', () => {
        it('identifies JavaScript and TypeScript files', () => {
            expect((0, fileExtensions_1.isJavascriptFile)('test.js')).toBe(true);
            expect((0, fileExtensions_1.isJavascriptFile)('test.cjs')).toBe(true);
            expect((0, fileExtensions_1.isJavascriptFile)('test.mjs')).toBe(true);
            expect((0, fileExtensions_1.isJavascriptFile)('test.ts')).toBe(true);
            expect((0, fileExtensions_1.isJavascriptFile)('test.cts')).toBe(true);
            expect((0, fileExtensions_1.isJavascriptFile)('test.mts')).toBe(true);
            expect((0, fileExtensions_1.isJavascriptFile)('test.txt')).toBe(false);
            expect((0, fileExtensions_1.isJavascriptFile)('test.py')).toBe(false);
        });
    });
    describe('isImageFile', () => {
        it('identifies image files correctly', () => {
            expect((0, fileExtensions_1.isImageFile)('photo.jpg')).toBe(true);
            expect((0, fileExtensions_1.isImageFile)('image.jpeg')).toBe(true);
            expect((0, fileExtensions_1.isImageFile)('icon.png')).toBe(true);
            expect((0, fileExtensions_1.isImageFile)('anim.gif')).toBe(true);
            expect((0, fileExtensions_1.isImageFile)('image.bmp')).toBe(true);
            expect((0, fileExtensions_1.isImageFile)('photo.webp')).toBe(true);
            expect((0, fileExtensions_1.isImageFile)('icon.svg')).toBe(true);
            expect((0, fileExtensions_1.isImageFile)('doc.pdf')).toBe(false);
            expect((0, fileExtensions_1.isImageFile)('noextension')).toBe(false);
        });
    });
    describe('isVideoFile', () => {
        it('identifies video files correctly', () => {
            expect((0, fileExtensions_1.isVideoFile)('video.mp4')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('clip.webm')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('video.ogg')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('movie.mov')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('video.avi')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('clip.wmv')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('movie.mkv')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('video.m4v')).toBe(true);
            expect((0, fileExtensions_1.isVideoFile)('doc.pdf')).toBe(false);
            expect((0, fileExtensions_1.isVideoFile)('noextension')).toBe(false);
        });
    });
    describe('isAudioFile', () => {
        it('identifies audio files correctly', () => {
            expect((0, fileExtensions_1.isAudioFile)('sound.wav')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('music.mp3')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('audio.ogg')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('sound.aac')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('music.m4a')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('audio.flac')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('sound.wma')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('music.aiff')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('voice.opus')).toBe(true);
            expect((0, fileExtensions_1.isAudioFile)('doc.pdf')).toBe(false);
            expect((0, fileExtensions_1.isAudioFile)('noextension')).toBe(false);
        });
    });
    describe('maybeLoadFromExternalFile', () => {
        const mockFileContent = 'test content';
        const mockJsonContent = '{"key": "value"}';
        const mockYamlContent = 'key: value';
        beforeEach(() => {
            jest.resetAllMocks();
            jest.mocked(fs.existsSync).mockReturnValue(true);
            jest.mocked(fs.readFileSync).mockReturnValue(mockFileContent);
        });
        it('should return the input if it is not a string', () => {
            const input = { key: 'value' };
            expect((0, file_1.maybeLoadFromExternalFile)(input)).toBe(input);
        });
        it('should return the input if it does not start with "file://"', () => {
            const input = 'not a file path';
            expect((0, file_1.maybeLoadFromExternalFile)(input)).toBe(input);
        });
        it('should throw an error if the file does not exist', () => {
            jest.mocked(fs.existsSync).mockReturnValue(false);
            expect(() => (0, file_1.maybeLoadFromExternalFile)('file://nonexistent.txt')).toThrow('File does not exist');
        });
        it('should return the file contents for a non-JSON, non-YAML file', () => {
            expect((0, file_1.maybeLoadFromExternalFile)('file://test.txt')).toBe(mockFileContent);
        });
        it('should parse and return JSON content for a .json file', () => {
            jest.mocked(fs.readFileSync).mockReturnValue(mockJsonContent);
            expect((0, file_1.maybeLoadFromExternalFile)('file://test.json')).toEqual({ key: 'value' });
        });
        it('should parse and return YAML content for a .yaml file', () => {
            jest.mocked(fs.readFileSync).mockReturnValue(mockYamlContent);
            expect((0, file_1.maybeLoadFromExternalFile)('file://test.yaml')).toEqual({ key: 'value' });
        });
        it('should parse and return YAML content for a .yml file', () => {
            jest.mocked(fs.readFileSync).mockReturnValue(mockYamlContent);
            expect((0, file_1.maybeLoadFromExternalFile)('file://test.yml')).toEqual({ key: 'value' });
        });
        it('should use basePath when resolving file paths', () => {
            const basePath = '/base/path';
            cliState_1.default.basePath = basePath;
            jest.mocked(fs.readFileSync).mockReturnValue(mockFileContent);
            (0, file_1.maybeLoadFromExternalFile)('file://test.txt');
            const expectedPath = path_1.default.resolve(basePath, 'test.txt');
            expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
            expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
            cliState_1.default.basePath = undefined;
        });
        it('should handle relative paths correctly', () => {
            const basePath = './relative/path';
            cliState_1.default.basePath = basePath;
            jest.mocked(fs.readFileSync).mockReturnValue(mockFileContent);
            (0, file_1.maybeLoadFromExternalFile)('file://test.txt');
            const expectedPath = path_1.default.resolve(basePath, 'test.txt');
            expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
            expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
            cliState_1.default.basePath = undefined;
        });
        it('should handle a path with environment variables in Nunjucks template', () => {
            process.env.TEST_ROOT_PATH = '/root/dir';
            const input = 'file://{{ env.TEST_ROOT_PATH }}/test.txt';
            jest.mocked(fs.existsSync).mockReturnValue(true);
            const expectedPath = path_1.default.resolve(`${process.env.TEST_ROOT_PATH}/test.txt`);
            (0, file_1.maybeLoadFromExternalFile)(input);
            expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
            expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
            delete process.env.TEST_ROOT_PATH;
        });
        it('should ignore basePath when file path is absolute', () => {
            const basePath = '/base/path';
            cliState_1.default.basePath = basePath;
            jest.mocked(fs.readFileSync).mockReturnValue(mockFileContent);
            (0, file_1.maybeLoadFromExternalFile)('file:///absolute/path/test.txt');
            const expectedPath = path_1.default.resolve('/absolute/path/test.txt');
            expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
            expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
            cliState_1.default.basePath = undefined;
        });
        it('should handle list of paths', () => {
            const basePath = './relative/path';
            cliState_1.default.basePath = basePath;
            const input = ['file://test1.txt', 'file://test2.txt', 'file://test3.txt'];
            // Mock readFileSync to return consistent data
            const mockFileData = 'test content';
            jest.mocked(fs.readFileSync).mockReturnValue(mockFileData);
            (0, file_1.maybeLoadFromExternalFile)(input);
            expect(fs.existsSync).toHaveBeenCalledTimes(3);
            expect(fs.existsSync).toHaveBeenCalledWith(path_1.default.resolve(basePath, 'test1.txt'));
            expect(fs.existsSync).toHaveBeenCalledWith(path_1.default.resolve(basePath, 'test2.txt'));
            expect(fs.existsSync).toHaveBeenCalledWith(path_1.default.resolve(basePath, 'test3.txt'));
            expect(fs.readFileSync).toHaveBeenCalledTimes(3);
            expect(fs.readFileSync).toHaveBeenCalledWith(path_1.default.resolve(basePath, 'test1.txt'), 'utf8');
            expect(fs.readFileSync).toHaveBeenCalledWith(path_1.default.resolve(basePath, 'test2.txt'), 'utf8');
            expect(fs.readFileSync).toHaveBeenCalledWith(path_1.default.resolve(basePath, 'test3.txt'), 'utf8');
            cliState_1.default.basePath = undefined;
        });
    });
    describe('getResolvedRelativePath', () => {
        const originalCwd = process.cwd();
        beforeEach(() => {
            jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');
        });
        afterEach(() => {
            jest.spyOn(process, 'cwd').mockReturnValue(originalCwd);
        });
        it('returns absolute path unchanged', () => {
            const absolutePath = path_1.default.resolve('/absolute/path/file.txt');
            expect((0, file_1.getResolvedRelativePath)(absolutePath, false)).toBe(absolutePath);
        });
        it('uses process.cwd() when isCloudConfig is true', () => {
            expect((0, file_1.getResolvedRelativePath)('relative/file.txt', true)).toBe(path_1.default.join('/mock/cwd', 'relative/file.txt'));
        });
    });
    describe('safeResolve', () => {
        it('returns absolute path unchanged', () => {
            const absolutePath = path_1.default.resolve('/absolute/path/file.txt');
            expect((0, file_node_1.safeResolve)('some/base/path', absolutePath)).toBe(absolutePath);
        });
        it('returns file URL unchanged', () => {
            const fileUrl = getFileUrl('absolute/path/file.txt');
            expect((0, file_node_1.safeResolve)('some/base/path', fileUrl)).toBe(fileUrl);
        });
        it('resolves relative paths', () => {
            const expected = path_1.default.resolve('base/path', 'relative/file.txt');
            expect((0, file_node_1.safeResolve)('base/path', 'relative/file.txt')).toBe(expected);
        });
        it('handles multiple path segments', () => {
            const absolutePath = path_1.default.resolve('/absolute/path/file.txt');
            expect((0, file_node_1.safeResolve)('base', 'path', absolutePath)).toBe(absolutePath);
            const expected = path_1.default.resolve('base', 'path', 'relative/file.txt');
            expect((0, file_node_1.safeResolve)('base', 'path', 'relative/file.txt')).toBe(expected);
        });
        it('handles empty input', () => {
            expect((0, file_node_1.safeResolve)()).toBe(path_1.default.resolve());
            expect((0, file_node_1.safeResolve)('')).toBe(path_1.default.resolve(''));
        });
    });
    describe('safeJoin', () => {
        it('returns absolute path unchanged', () => {
            const absolutePath = path_1.default.resolve('/absolute/path/file.txt');
            expect((0, file_node_1.safeJoin)('some/base/path', absolutePath)).toBe(absolutePath);
        });
        it('returns file URL unchanged', () => {
            const fileUrl = getFileUrl('absolute/path/file.txt');
            expect((0, file_node_1.safeJoin)('some/base/path', fileUrl)).toBe(fileUrl);
        });
        it('joins relative paths', () => {
            const expected = path_1.default.join('base/path', 'relative/file.txt');
            expect((0, file_node_1.safeJoin)('base/path', 'relative/file.txt')).toBe(expected);
        });
        it('handles multiple path segments', () => {
            const absolutePath = path_1.default.resolve('/absolute/path/file.txt');
            expect((0, file_node_1.safeJoin)('base', 'path', absolutePath)).toBe(absolutePath);
            const expected = path_1.default.join('base', 'path', 'relative/file.txt');
            expect((0, file_node_1.safeJoin)('base', 'path', 'relative/file.txt')).toBe(expected);
        });
        it('handles empty input', () => {
            expect((0, file_node_1.safeJoin)()).toBe(path_1.default.join());
            expect((0, file_node_1.safeJoin)('')).toBe(path_1.default.join(''));
        });
    });
});
//# sourceMappingURL=file.test.js.map