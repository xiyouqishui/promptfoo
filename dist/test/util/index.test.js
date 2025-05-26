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
const dotenv_1 = __importDefault(require("dotenv"));
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const path = __importStar(require("path"));
const database_1 = require("../../src/database");
const googleSheets = __importStar(require("../../src/googleSheets"));
const eval_1 = __importDefault(require("../../src/models/eval"));
const types_1 = require("../../src/types");
const util_1 = require("../../src/util");
const utils_1 = require("./utils");
jest.mock('../../src/database', () => ({
    getDb: jest.fn(),
}));
jest.mock('proxy-agent', () => ({
    ProxyAgent: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('glob', () => ({
    globSync: jest.fn(),
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    statSync: jest.fn(),
    readdirSync: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));
jest.mock('../../src/esm');
jest.mock('../../src/googleSheets', () => ({
    writeCsvToGoogleSheet: jest.fn(),
}));
describe('maybeLoadToolsFromExternalFile', () => {
    const mockFileContent = '{"name": "calculator", "parameters": {"type": "object"}}';
    const mockToolsArray = [
        { type: 'function', function: { name: 'calculator', parameters: { type: 'object' } } },
    ];
    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(fs.existsSync).mockReturnValue(true);
        jest.mocked(fs.readFileSync).mockReturnValue(mockFileContent);
    });
    it('should process tool objects directly', () => {
        const tools = mockToolsArray;
        const vars = { api_key: '123456' };
        expect((0, util_1.maybeLoadToolsFromExternalFile)(tools, vars)).toEqual(tools);
    });
    it('should load tools from external file', () => {
        const tools = 'file://tools.json';
        expect((0, util_1.maybeLoadToolsFromExternalFile)(tools)).toEqual(JSON.parse(mockFileContent));
    });
    it('should render variables in tools object', () => {
        const tools = [
            {
                type: 'function',
                function: {
                    name: 'calculator',
                    parameters: { type: 'object' },
                    apiKey: '{{ api_key }}',
                },
            },
        ];
        const vars = { api_key: '123456' };
        const expected = [
            {
                type: 'function',
                function: {
                    name: 'calculator',
                    parameters: { type: 'object' },
                    apiKey: '123456',
                },
            },
        ];
        expect((0, util_1.maybeLoadToolsFromExternalFile)(tools, vars)).toEqual(expected);
    });
    it('should render variables and load from external file', () => {
        const tools = 'file://{{ file_path }}.json';
        const vars = { file_path: 'tools' };
        (0, util_1.maybeLoadToolsFromExternalFile)(tools, vars);
        // Should resolve the file path with variables first
        expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('tools.json'));
        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('tools.json'), 'utf8');
    });
    it('should handle array of file paths', () => {
        const tools = ['file://tools1.json', 'file://tools2.json'];
        (0, util_1.maybeLoadToolsFromExternalFile)(tools);
        expect(fs.existsSync).toHaveBeenCalledTimes(2);
        expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
});
describe('util', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('writeOutput', () => {
        let consoleLogSpy;
        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            // @ts-ignore
            jest.mocked(database_1.getDb).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockResolvedValue([]),
                    }),
                }),
                insert: jest.fn().mockReturnValue({
                    values: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });
        });
        afterEach(() => {
            consoleLogSpy.mockRestore();
        });
        it('writeOutput with CSV output', async () => {
            // @ts-ignore
            jest.mocked(database_1.getDb).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    from: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({ all: jest.fn().mockResolvedValue([]) }),
                    }),
                }),
                insert: jest.fn().mockReturnValue({
                    values: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });
            const outputPath = 'output.csv';
            const results = [
                {
                    success: true,
                    failureReason: types_1.ResultFailureReason.NONE,
                    score: 1.0,
                    namedScores: {},
                    latencyMs: 1000,
                    provider: {
                        id: 'foo',
                    },
                    prompt: {
                        raw: 'Test prompt',
                        label: '[display] Test prompt',
                    },
                    response: {
                        output: 'Test output',
                    },
                    vars: {
                        var1: 'value1',
                        var2: 'value2',
                    },
                    promptIdx: 0,
                    testIdx: 0,
                    testCase: {},
                    promptId: 'foo',
                },
            ];
            const eval_ = new eval_1.default({});
            await eval_.addResult(results[0]);
            const shareableUrl = null;
            await (0, util_1.writeOutput)(outputPath, eval_, shareableUrl);
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        });
        it('writeOutput with JSON output', async () => {
            const outputPath = 'output.json';
            const eval_ = new eval_1.default({});
            await (0, util_1.writeOutput)(outputPath, eval_, null);
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        });
        it('writeOutput with YAML output', async () => {
            const outputPath = 'output.yaml';
            const eval_ = new eval_1.default({});
            await (0, util_1.writeOutput)(outputPath, eval_, null);
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        });
        it('writeOutput with json and txt output', async () => {
            const outputPath = ['output.json', 'output.txt'];
            const eval_ = new eval_1.default({});
            await (0, util_1.writeMultipleOutputs)(outputPath, eval_, null);
            expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
        });
        it('writes output to Google Sheets', async () => {
            const outputPath = 'https://docs.google.com/spreadsheets/d/1234567890/edit#gid=0';
            const config = { description: 'Test config' };
            const shareableUrl = null;
            const eval_ = new eval_1.default(config);
            await (0, util_1.writeOutput)(outputPath, eval_, shareableUrl);
            expect(googleSheets.writeCsvToGoogleSheet).toHaveBeenCalledTimes(1);
        });
    });
    describe('readOutput', () => {
        it('reads JSON output', async () => {
            const outputPath = 'output.json';
            jest.mocked(fs.readFileSync).mockReturnValue('{}');
            const output = await (0, util_1.readOutput)(outputPath);
            expect(output).toEqual({});
        });
        it('fails for csv output', async () => {
            await expect((0, util_1.readOutput)('output.csv')).rejects.toThrow('Unsupported output file format: csv currently only supports json');
        });
        it('fails for yaml output', async () => {
            await expect((0, util_1.readOutput)('output.yaml')).rejects.toThrow('Unsupported output file format: yaml currently only supports json');
            await expect((0, util_1.readOutput)('output.yml')).rejects.toThrow('Unsupported output file format: yml currently only supports json');
        });
    });
    it('readFilters', async () => {
        const mockFilter = jest.fn();
        jest.doMock(path.resolve('filter.js'), () => mockFilter, { virtual: true });
        jest.mocked(glob_1.globSync).mockImplementation((pathOrGlob) => [pathOrGlob].flat());
        const filters = await (0, util_1.readFilters)({ testFilter: 'filter.js' });
        expect(filters.testFilter).toBe(mockFilter);
    });
    describe('providerToIdentifier', () => {
        it('works with string', () => {
            const provider = 'openai:gpt-4';
            expect((0, util_1.providerToIdentifier)(provider)).toStrictEqual(provider);
        });
        it('works with provider id undefined', () => {
            expect((0, util_1.providerToIdentifier)(undefined)).toBeUndefined();
        });
        it('works with ApiProvider', () => {
            const providerId = 'custom';
            const apiProvider = {
                id() {
                    return providerId;
                },
            };
            expect((0, util_1.providerToIdentifier)(apiProvider)).toStrictEqual(providerId);
        });
        it('works with ProviderOptions', () => {
            const providerId = 'custom';
            const providerOptions = {
                id: providerId,
            };
            expect((0, util_1.providerToIdentifier)(providerOptions)).toStrictEqual(providerId);
        });
    });
    describe('varsMatch', () => {
        it('true with both undefined', () => {
            expect((0, util_1.varsMatch)(undefined, undefined)).toBe(true);
        });
        it('false with one undefined', () => {
            expect((0, util_1.varsMatch)(undefined, {})).toBe(false);
            expect((0, util_1.varsMatch)({}, undefined)).toBe(false);
        });
    });
    describe('resultIsForTestCase', () => {
        const testCase = {
            provider: 'provider',
            vars: {
                key: 'value',
            },
        };
        const result = {
            provider: 'provider',
            vars: {
                key: 'value',
            },
        };
        it('is true', () => {
            expect((0, util_1.resultIsForTestCase)(result, testCase)).toBe(true);
        });
        it('is false if provider is different', () => {
            const nonMatchTestCase = {
                provider: 'different',
                vars: {
                    key: 'value',
                },
            };
            expect((0, util_1.resultIsForTestCase)(result, nonMatchTestCase)).toBe(false);
        });
        it('is false if vars are different', () => {
            const nonMatchTestCase = {
                provider: 'provider',
                vars: {
                    key: 'different',
                },
            };
            expect((0, util_1.resultIsForTestCase)(result, nonMatchTestCase)).toBe(false);
        });
    });
    describe('parsePathOrGlob', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should parse a simple file path with extension', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'file.txt')).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: path.join('/base', 'file.txt'),
            });
        });
        it('should parse a file path with function name', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'file.py:myFunction')).toEqual({
                extension: '.py',
                functionName: 'myFunction',
                isPathPattern: false,
                filePath: path.join('/base', 'file.py'),
            });
        });
        it('should parse a Go file path with function name', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'script.go:CallApi')).toEqual({
                extension: '.go',
                functionName: 'CallApi',
                isPathPattern: false,
                filePath: path.join('/base', 'script.go'),
            });
        });
        it('should parse a directory path', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true });
            expect((0, util_1.parsePathOrGlob)('/base', 'dir')).toEqual({
                extension: undefined,
                functionName: undefined,
                isPathPattern: true,
                filePath: path.join('/base', 'dir'),
            });
        });
        it('should handle non-existent file path gracefully when PROMPTFOO_STRICT_FILES is false', () => {
            jest.spyOn(fs, 'statSync').mockImplementation(() => {
                throw new Error('File does not exist');
            });
            expect((0, util_1.parsePathOrGlob)('/base', 'nonexistent.js')).toEqual({
                extension: '.js',
                functionName: undefined,
                isPathPattern: false,
                filePath: path.join('/base', 'nonexistent.js'),
            });
        });
        it('should throw an error for non-existent file path when PROMPTFOO_STRICT_FILES is true', () => {
            process.env.PROMPTFOO_STRICT_FILES = 'true';
            jest.spyOn(fs, 'statSync').mockImplementation(() => {
                throw new Error('File does not exist');
            });
            expect(() => (0, util_1.parsePathOrGlob)('/base', 'nonexistent.js')).toThrow('File does not exist');
            delete process.env.PROMPTFOO_STRICT_FILES;
        });
        it('should properly test file existence when function name in the path', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            (0, util_1.parsePathOrGlob)('/base', 'script.py:myFunction');
            expect(fs.statSync).toHaveBeenCalledWith(path.join('/base', 'script.py'));
        });
        it('should return empty extension for files without extension', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'file')).toEqual({
                extension: '',
                functionName: undefined,
                isPathPattern: false,
                filePath: path.join('/base', 'file'),
            });
        });
        it('should handle relative paths', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('./base', 'file.txt')).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: path.join('./base', 'file.txt'),
            });
        });
        it('should handle paths with environment variables', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            process.env.FILE_PATH = 'file.txt';
            expect((0, util_1.parsePathOrGlob)('/base', process.env.FILE_PATH)).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: path.join('/base', 'file.txt'),
            });
            delete process.env.FILE_PATH;
        });
        it('should handle glob patterns in file path', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', '*.js')).toEqual({
                extension: undefined,
                functionName: undefined,
                isPathPattern: true,
                filePath: path.join('/base', '*.js'),
            });
        });
        it('should handle complex file paths', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'dir/subdir/file.py:func')).toEqual({
                extension: '.py',
                functionName: 'func',
                isPathPattern: false,
                filePath: path.join('/base', 'dir/subdir/file.py'),
            });
        });
        it('should handle non-standard file extensions', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'file.customext')).toEqual({
                extension: '.customext',
                functionName: undefined,
                isPathPattern: false,
                filePath: path.join('/base', 'file.customext'),
            });
        });
        it('should handle deeply nested file paths', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'a/b/c/d/e/f/g/file.py:func')).toEqual({
                extension: '.py',
                functionName: 'func',
                isPathPattern: false,
                filePath: path.join('/base', 'a/b/c/d/e/f/g/file.py'),
            });
        });
        it('should handle complex directory paths', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => true });
            expect((0, util_1.parsePathOrGlob)('/base', 'a/b/c/d/e/f/g')).toEqual({
                extension: undefined,
                functionName: undefined,
                isPathPattern: true,
                filePath: path.join('/base', 'a/b/c/d/e/f/g'),
            });
        });
        it('should join basePath and safeFilename correctly', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            const basePath = 'base';
            const relativePath = 'relative/path/to/file.txt';
            expect((0, util_1.parsePathOrGlob)(basePath, relativePath)).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: expect.stringMatching(/base[\\\/]relative[\\\/]path[\\\/]to[\\\/]file.txt/),
            });
        });
        it('should handle empty basePath', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('', 'file.txt')).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: 'file.txt',
            });
        });
        it('should handle file:// prefix', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('', 'file://file.txt')).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: 'file.txt',
            });
        });
        it('should handle file://./... with absolute base path', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/absolute/base', 'file://./prompts/file.txt')).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: expect.stringMatching(/^[/\\]absolute[/\\]base[/\\]prompts[/\\]file\.txt$/),
            });
        });
        it('should handle file://./... with relative base path', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('relative/base', 'file://file.txt')).toEqual({
                extension: '.txt',
                functionName: undefined,
                isPathPattern: false,
                filePath: expect.stringMatching(/^relative[/\\]base[/\\]file\.txt$/),
            });
        });
        it('should handle file:// prefix with Go function', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'file://script.go:CallApi')).toEqual({
                extension: '.go',
                functionName: 'CallApi',
                isPathPattern: false,
                filePath: path.join('/base', 'script.go'),
            });
        });
        it('should handle file:// prefix with absolute path and Go function', () => {
            jest.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false });
            expect((0, util_1.parsePathOrGlob)('/base', 'file:///absolute/path/script.go:CallApi')).toEqual({
                extension: '.go',
                functionName: 'CallApi',
                isPathPattern: false,
                filePath: expect.stringMatching(/^[/\\]absolute[/\\]path[/\\]script\.go$/),
            });
        });
    });
    describe('Grader', () => {
        it('should have an id and callApi attributes', async () => {
            const Grader = new utils_1.TestGrader();
            expect(Grader.id()).toBe('TestGradingProvider');
            await expect(Grader.callApi()).resolves.toEqual({
                output: JSON.stringify({
                    pass: true,
                    reason: 'Test grading output',
                }),
                tokenUsage: {
                    completion: 5,
                    prompt: 5,
                    total: 10,
                },
            });
        });
    });
});
describe('setupEnv', () => {
    let originalEnv;
    let dotenvConfigSpy;
    beforeEach(() => {
        originalEnv = { ...process.env };
        // Ensure NODE_ENV is not set at the start of each test
        delete process.env.NODE_ENV;
        // Spy on dotenv.config to verify it's called with the right parameters
        dotenvConfigSpy = jest.spyOn(dotenv_1.default, 'config').mockImplementation(() => ({ parsed: {} }));
    });
    afterEach(() => {
        process.env = originalEnv;
        jest.resetAllMocks();
    });
    it('should call dotenv.config without parameters when envPath is undefined', () => {
        (0, util_1.setupEnv)(undefined);
        expect(dotenvConfigSpy).toHaveBeenCalledTimes(1);
        expect(dotenvConfigSpy).toHaveBeenCalledWith();
    });
    it('should call dotenv.config with path and override=true when envPath is specified', () => {
        const testEnvPath = '.env.test';
        (0, util_1.setupEnv)(testEnvPath);
        expect(dotenvConfigSpy).toHaveBeenCalledTimes(1);
        expect(dotenvConfigSpy).toHaveBeenCalledWith({
            path: testEnvPath,
            override: true,
        });
    });
    it('should load environment variables with override when specified env file has conflicting values', () => {
        // Mock dotenv.config to simulate loading variables
        dotenvConfigSpy.mockImplementation((options) => {
            if (options?.path === '.env.production') {
                if (options.override) {
                    process.env.NODE_ENV = 'production';
                }
                else if (!process.env.NODE_ENV) {
                    process.env.NODE_ENV = 'production';
                }
            }
            else {
                // Default .env file
                if (!process.env.NODE_ENV) {
                    process.env.NODE_ENV = 'development';
                }
            }
            return { parsed: {} };
        });
        // First load the default .env (setting NODE_ENV to 'development')
        (0, util_1.setupEnv)(undefined);
        expect(process.env.NODE_ENV).toBe('development');
        // Then load .env.production with override (should change NODE_ENV to 'production')
        (0, util_1.setupEnv)('.env.production');
        expect(process.env.NODE_ENV).toBe('production');
    });
});
//# sourceMappingURL=index.test.js.map