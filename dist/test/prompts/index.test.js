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
const dedent_1 = __importDefault(require("dedent"));
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const esm_1 = require("../../src/esm");
const prompts_1 = require("../../src/prompts");
const utils_1 = require("../../src/prompts/utils");
jest.mock('proxy-agent', () => ({
    ProxyAgent: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('glob', () => {
    const actual = jest.requireActual('glob');
    return {
        ...actual,
        globSync: jest.fn(actual.globSync),
    };
});
jest.mock('fs', () => {
    const actual = jest.requireActual('fs');
    return {
        ...actual,
        existsSync: jest.fn(actual.existsSync),
        mkdirSync: jest.fn(),
        readFileSync: jest.fn(),
        statSync: jest.fn(actual.statSync),
        writeFileSync: jest.fn(),
    };
});
jest.mock('python-shell');
jest.mock('../../src/esm', () => {
    const actual = jest.requireActual('../../src/esm');
    return {
        ...actual,
        importModule: jest.fn(actual.importModule),
    };
});
jest.mock('../../src/python/wrapper');
jest.mock('../../src/prompts/utils', () => {
    const actual = jest.requireActual('../../src/prompts/utils');
    return {
        ...actual,
        maybeFilePath: jest.fn(actual.maybeFilePath),
    };
});
describe('readPrompts', () => {
    afterEach(() => {
        delete process.env.PROMPTFOO_STRICT_FILES;
        jest.mocked(fs.readFileSync).mockReset();
        jest.mocked(fs.statSync).mockReset();
        jest.mocked(glob_1.globSync).mockReset();
        jest.mocked(utils_1.maybeFilePath).mockClear();
    });
    it('should throw an error for invalid inputs', async () => {
        await expect((0, prompts_1.readPrompts)(null)).rejects.toThrow('Invalid input prompt: null');
        await expect((0, prompts_1.readPrompts)(undefined)).rejects.toThrow('Invalid input prompt: undefined');
        await expect((0, prompts_1.readPrompts)(1)).rejects.toThrow('Invalid input prompt: 1');
        await expect((0, prompts_1.readPrompts)(true)).rejects.toThrow('Invalid input prompt: true');
        await expect((0, prompts_1.readPrompts)(false)).rejects.toThrow('Invalid input prompt: false');
    });
    it('should throw an error for empty inputs', async () => {
        await expect((0, prompts_1.readPrompts)([])).rejects.toThrow('Invalid input prompt: []');
        await expect((0, prompts_1.readPrompts)({})).rejects.toThrow('Invalid input prompt: {}');
        await expect((0, prompts_1.readPrompts)('')).rejects.toThrow('Invalid input prompt: ""');
    });
    it('should throw an error when PROMPTFOO_STRICT_FILES is true and the file does not exist', async () => {
        process.env.PROMPTFOO_STRICT_FILES = 'true';
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        jest.mocked(fs.readFileSync).mockImplementationOnce(() => {
            throw new Error("ENOENT: no such file or directory, stat 'non-existent-file.txt'");
        });
        await expect((0, prompts_1.readPrompts)('non-existent-file.txt')).rejects.toThrow(expect.objectContaining({
            message: expect.stringMatching(/ENOENT: no such file or directory, stat '.*non-existent-file.txt'/),
        }));
    });
    it('should throw an error for a .txt file with no prompts', async () => {
        jest.mocked(fs.readFileSync).mockReturnValueOnce('');
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        jest.mocked(utils_1.maybeFilePath).mockReturnValueOnce(true);
        process.env.PROMPTFOO_STRICT_FILES = 'true';
        await expect((0, prompts_1.readPrompts)(['prompts.txt'])).rejects.toThrow('There are no prompts in "prompts.txt"');
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
    it('should throw an error for an unsupported file format', async () => {
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        jest.mocked(utils_1.maybeFilePath).mockReturnValueOnce(true);
        process.env.PROMPTFOO_STRICT_FILES = 'true';
        await expect((0, prompts_1.readPrompts)(['unsupported.for.mat'])).rejects.toThrow('There are no prompts in "unsupported.for.mat"');
        expect(fs.readFileSync).toHaveBeenCalledTimes(0);
    });
    it('should read a single prompt', async () => {
        const prompt = 'This is a test prompt';
        await expect((0, prompts_1.readPrompts)(prompt)).resolves.toEqual([
            {
                raw: prompt,
                label: prompt,
            },
        ]);
    });
    it('should read a list of prompts', async () => {
        const prompts = ['Sample prompt A', 'Sample prompt B'];
        await expect((0, prompts_1.readPrompts)(prompts)).resolves.toEqual([
            {
                raw: 'Sample prompt A',
                label: 'Sample prompt A',
            },
            {
                raw: 'Sample prompt B',
                label: 'Sample prompt B',
            },
        ]);
    });
    it('should read a .txt file with a single prompt', async () => {
        jest.mocked(fs.readFileSync).mockReturnValueOnce('Sample Prompt');
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        await expect((0, prompts_1.readPrompts)('prompts.txt')).resolves.toEqual([
            {
                label: 'prompts.txt: Sample Prompt',
                raw: 'Sample Prompt',
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
    it.each([['prompts.txt'], 'prompts.txt'])(`should read a single prompt file with input:%p`, async (promptPath) => {
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        jest.mocked(fs.readFileSync).mockReturnValue('Test prompt 1\n---\nTest prompt 2');
        jest.mocked(glob_1.globSync).mockImplementation((pathOrGlob) => [pathOrGlob.toString()]);
        await expect((0, prompts_1.readPrompts)(promptPath)).resolves.toEqual([
            {
                label: 'prompts.txt: Test prompt 1',
                raw: 'Test prompt 1',
            },
            {
                label: 'prompts.txt: Test prompt 2',
                raw: 'Test prompt 2',
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
    it('should read multiple prompt files', async () => {
        jest.mocked(fs.readFileSync).mockImplementation((filePath) => {
            if (filePath.toString().endsWith('prompt1.txt')) {
                return 'Test prompt 1\n---\nTest prompt 2';
            }
            else if (filePath.toString().endsWith('prompt2.txt')) {
                return 'Test prompt 3\n---\nTest prompt 4\n---\nTest prompt 5';
            }
            throw new Error(`Unexpected file path in test: ${filePath}`);
        });
        jest.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false });
        jest.mocked(glob_1.globSync).mockImplementation((pathOrGlob) => [pathOrGlob.toString()]);
        await expect((0, prompts_1.readPrompts)(['prompt1.txt', 'prompt2.txt'])).resolves.toEqual([
            {
                label: 'prompt1.txt: Test prompt 1',
                raw: 'Test prompt 1',
            },
            {
                label: 'prompt1.txt: Test prompt 2',
                raw: 'Test prompt 2',
            },
            {
                label: 'prompt2.txt: Test prompt 3',
                raw: 'Test prompt 3',
            },
            {
                label: 'prompt2.txt: Test prompt 4',
                raw: 'Test prompt 4',
            },
            {
                label: 'prompt2.txt: Test prompt 5',
                raw: 'Test prompt 5',
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
    it('should read with map input', async () => {
        jest.mocked(fs.readFileSync).mockReturnValue('some raw text');
        jest.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false });
        await expect((0, prompts_1.readPrompts)({
            'prompts.txt': 'foo1',
            'prompts2.txt': 'foo2',
        })).resolves.toEqual([
            { raw: 'some raw text', label: 'foo1: prompts.txt: some raw text' },
            { raw: 'some raw text', label: 'foo2: prompts2.txt: some raw text' },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
    it('should read a .json file', async () => {
        const mockJsonContent = JSON.stringify([
            { name: 'You are a helpful assistant', role: 'system' },
            { name: 'How do I get to the moon?', role: 'user' },
        ]);
        jest.mocked(fs.readFileSync).mockReturnValueOnce(mockJsonContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const filePath = 'file://path/to/mock.json';
        await expect((0, prompts_1.readPrompts)([filePath])).resolves.toEqual([
            {
                raw: mockJsonContent,
                label: expect.stringContaining(`mock.json: ${mockJsonContent}`),
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('mock.json'), 'utf8');
        expect(fs.statSync).toHaveBeenCalledTimes(1);
    });
    it('should read a .jsonl file', async () => {
        const data = [
            [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Who won the world series in {{ year }}?' },
            ],
            [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Who won the superbowl in {{ year }}?' },
            ],
        ];
        jest.mocked(fs.readFileSync).mockReturnValueOnce(data.map((o) => JSON.stringify(o)).join('\n'));
        jest.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false });
        await expect((0, prompts_1.readPrompts)(['prompts.jsonl'])).resolves.toEqual([
            {
                raw: JSON.stringify(data[0]),
                label: `prompts.jsonl: ${JSON.stringify(data[0])}`,
            },
            {
                raw: JSON.stringify(data[1]),
                label: `prompts.jsonl: ${JSON.stringify(data[1])}`,
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
    const yamlContent = (0, dedent_1.default) `
    - role: user
      content:
        - type: text
          text: "What's in this image?"
        - type: image_url
          image_url:
            url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"`;
    it('should read a .yaml file', async () => {
        const expectedJson = JSON.stringify([
            {
                role: 'user',
                content: [
                    { type: 'text', text: "What's in this image?" },
                    {
                        type: 'image_url',
                        image_url: {
                            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg',
                        },
                    },
                ],
            },
        ]);
        jest.mocked(fs.readFileSync).mockReturnValueOnce(yamlContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        await expect((0, prompts_1.readPrompts)('prompts.yaml')).resolves.toEqual([
            {
                raw: expectedJson,
                label: expect.stringContaining('prompts.yaml: [{"role":"user","content":[{"type":"text","text":"What\'s in this image?"}'),
                config: undefined,
            },
        ]);
    });
    it('should read a .yml file', async () => {
        const expectedJson = JSON.stringify([
            {
                role: 'user',
                content: [
                    { type: 'text', text: "What's in this image?" },
                    {
                        type: 'image_url',
                        image_url: {
                            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg',
                        },
                    },
                ],
            },
        ]);
        jest.mocked(fs.readFileSync).mockReturnValueOnce(yamlContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        await expect((0, prompts_1.readPrompts)('image-summary.yml')).resolves.toEqual([
            {
                raw: expectedJson,
                label: expect.stringContaining('image-summary.yml: [{"role":"user","content":[{"type":"text","text":"What\'s in this image?"}'),
                config: undefined,
            },
        ]);
    });
    it('should read a markdown file', async () => {
        const mdContent = '# Test Heading\n\nThis is a test markdown file.';
        jest.mocked(fs.readFileSync).mockReturnValueOnce(mdContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        jest.mocked(utils_1.maybeFilePath).mockReturnValueOnce(true);
        await expect((0, prompts_1.readPrompts)('test.md')).resolves.toEqual([
            {
                raw: mdContent,
                label: 'test.md: # Test Heading\n\nThis is a test markdown file....',
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync).toHaveBeenCalledWith('test.md', 'utf8');
    });
    it('should read a Jinja2 file', async () => {
        const jinjaContent = 'You are a helpful assistant.\nPlease answer the following question about {{ topic }}: {{ question }}';
        jest.mocked(fs.readFileSync).mockReturnValueOnce(jinjaContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        jest.mocked(utils_1.maybeFilePath).mockReturnValueOnce(true);
        const result = await (0, prompts_1.readPrompts)('template.j2');
        // Check that we get a result with the right content
        expect(result).toHaveLength(1);
        expect(result[0].raw).toEqual(jinjaContent);
        expect(result[0].config).toBeUndefined();
        // Check that the label contains the expected text but don't test exact truncation
        expect(result[0].label).toContain('template.j2: You are a helpful assistant.');
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync).toHaveBeenCalledWith('template.j2', 'utf8');
    });
    it('should read a .py prompt object array', async () => {
        const prompts = [
            { id: 'prompts.py:prompt1', label: 'First prompt' },
            { id: 'prompts.py:prompt2', label: 'Second prompt' },
        ];
        const code = (0, dedent_1.default) `
      def prompt1:
        return 'First prompt'
      def prompt2:
        return 'Second prompt'
      `;
        jest.mocked(fs.readFileSync).mockReturnValue(code);
        await expect((0, prompts_1.readPrompts)(prompts)).resolves.toEqual([
            {
                raw: code,
                label: 'First prompt',
                function: expect.any(Function),
            },
            {
                raw: code,
                label: 'Second prompt',
                function: expect.any(Function),
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
    it('should read a .py file', async () => {
        const code = `print('dummy prompt')`;
        jest.mocked(fs.readFileSync).mockReturnValue(code);
        await expect((0, prompts_1.readPrompts)('prompt.py')).resolves.toEqual([
            {
                function: expect.any(Function),
                label: `prompt.py: ${code}`,
                raw: code,
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
    it('should read a .js file without named function', async () => {
        const promptPath = 'prompt.js';
        const mockFunction = () => console.log('dummy prompt');
        jest.mocked(esm_1.importModule).mockResolvedValueOnce(mockFunction);
        jest.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false });
        await expect((0, prompts_1.readPrompts)(promptPath)).resolves.toEqual([
            {
                raw: "()=>console.log('dummy prompt')",
                label: 'prompt.js',
                function: expect.any(Function),
                config: {},
            },
        ]);
        expect(esm_1.importModule).toHaveBeenCalledWith(promptPath, undefined);
        expect(fs.statSync).toHaveBeenCalledTimes(1);
    });
    it('should read a .js file with named function', async () => {
        const promptPath = 'prompt.js:functionName';
        const mockFunction = (context) => 'dummy prompt result';
        jest.mocked(esm_1.importModule).mockResolvedValueOnce(mockFunction);
        jest.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false });
        const result = await (0, prompts_1.readPrompts)(promptPath);
        expect(result).toEqual([
            {
                raw: String(mockFunction),
                label: 'prompt.js:functionName',
                function: expect.any(Function),
                config: {},
            },
        ]);
        const promptFunction = result[0].function;
        expect(promptFunction({ vars: {}, provider: { id: () => 'foo' } })).toBe('dummy prompt result');
        expect(esm_1.importModule).toHaveBeenCalledWith('prompt.js', 'functionName');
        expect(fs.statSync).toHaveBeenCalledTimes(1);
    });
    it('should read a directory', async () => {
        jest.mocked(fs.statSync).mockImplementation((filePath) => {
            if (filePath.toString().endsWith('prompt1.txt')) {
                return { isDirectory: () => false };
            }
            else if (filePath.toString().endsWith('prompts')) {
                return { isDirectory: () => true };
            }
            throw new Error(`Unexpected file path in test: ${filePath}`);
        });
        jest.mocked(glob_1.globSync).mockImplementation(() => ['prompt1.txt', 'prompt2.txt']);
        // The mocked paths here are an artifact of our globSync mock. In a real
        // world setting we would get back `prompts/prompt1.txt` instead of `prompts/*/prompt1.txt`
        // but for the sake of this test we are just going to pretend that the globSync
        // mock is doing the right thing and giving us back the right paths.
        jest.mocked(fs.readFileSync).mockImplementation((filePath) => {
            if (filePath.toString().endsWith('prompt1.txt') ||
                filePath.toString().endsWith('*/prompt1.txt')) {
                return 'Test prompt 1\n---\nTest prompt 2';
            }
            else if (filePath.toString().endsWith('prompt2.txt') ||
                filePath.toString().endsWith('*/prompt2.txt')) {
                return 'Test prompt 3\n---\nTest prompt 4\n---\nTest prompt 5';
            }
            throw new Error(`Unexpected file path in test: ${filePath}`);
        });
        await expect((0, prompts_1.readPrompts)(['prompts/*'])).resolves.toEqual([
            {
                label: expect.stringMatching('prompt1.txt: Test prompt 1'),
                raw: 'Test prompt 1',
            },
            {
                label: expect.stringMatching('prompt1.txt: Test prompt 2'),
                raw: 'Test prompt 2',
            },
            {
                label: expect.stringMatching('prompt2.txt: Test prompt 3'),
                raw: 'Test prompt 3',
            },
            {
                label: expect.stringMatching('prompt2.txt: Test prompt 4'),
                raw: 'Test prompt 4',
            },
            {
                label: expect.stringMatching('prompt2.txt: Test prompt 5'),
                raw: 'Test prompt 5',
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(2);
        expect(fs.statSync).toHaveBeenCalledTimes(3);
    });
    it('should fall back to a string if maybeFilePath is true but a file does not exist', async () => {
        jest.mocked(glob_1.globSync).mockReturnValueOnce([]);
        jest.mocked(utils_1.maybeFilePath).mockReturnValueOnce(true);
        await expect((0, prompts_1.readPrompts)('non-existent-file.txt*')).resolves.toEqual([
            { raw: 'non-existent-file.txt*', label: 'non-existent-file.txt*' },
        ]);
    });
    it('should handle a prompt with a function', async () => {
        const promptWithFunction = {
            raw: 'dummy raw text',
            label: 'Function Prompt',
            function: jest.fn().mockResolvedValue('Hello, world!'),
        };
        await expect((0, prompts_1.readPrompts)([promptWithFunction])).resolves.toEqual([
            {
                raw: 'dummy raw text',
                label: 'Function Prompt',
                function: expect.any(Function),
            },
        ]);
        expect(promptWithFunction.function).not.toHaveBeenCalled();
    });
    it('should read a single-column CSV file with header', async () => {
        const csvContent = (0, dedent_1.default) `
      prompt
      Tell me about {{topic}}
      Explain {{topic}} in simple terms
      Write a poem about {{topic}}
    `;
        jest.mocked(fs.readFileSync).mockReturnValueOnce(csvContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const result = await (0, prompts_1.readPrompts)(['test.csv']);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            raw: 'Tell me about {{topic}}',
            label: 'Prompt 1 - Tell me about {{topic}}',
        });
        expect(result[1]).toEqual({
            raw: 'Explain {{topic}} in simple terms',
            label: 'Prompt 2 - Explain {{topic}} in simple terms',
        });
        expect(result[2]).toEqual({
            raw: 'Write a poem about {{topic}}',
            label: 'Prompt 3 - Write a poem about {{topic}}',
        });
    });
    it('should read a single-column CSV file without header', async () => {
        const csvContent = (0, dedent_1.default) `
      Tell me about {{topic}}
      Explain {{topic}} in simple terms
      Write a poem about {{topic}}
    `;
        jest.mocked(fs.readFileSync).mockReturnValueOnce(csvContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const result = await (0, prompts_1.readPrompts)(['test.csv']);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            raw: 'Tell me about {{topic}}',
            label: 'Prompt 1 - Tell me about {{topic}}',
        });
        expect(result[1]).toEqual({
            raw: 'Explain {{topic}} in simple terms',
            label: 'Prompt 2 - Explain {{topic}} in simple terms',
        });
        expect(result[2]).toEqual({
            raw: 'Write a poem about {{topic}}',
            label: 'Prompt 3 - Write a poem about {{topic}}',
        });
    });
    it('should read a two-column CSV file with prompt and label', async () => {
        const csvContent = (0, dedent_1.default) `
      prompt,label
      Tell me about {{topic}},Basic Query
      Explain {{topic}} in simple terms,Simple Explanation
      Write a poem about {{topic}},Poetry Generator
    `;
        jest.mocked(fs.readFileSync).mockReturnValueOnce(csvContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const result = await (0, prompts_1.readPrompts)(['test.csv']);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual({
            raw: 'Tell me about {{topic}}',
            label: 'Basic Query',
        });
        expect(result[1]).toEqual({
            raw: 'Explain {{topic}} in simple terms',
            label: 'Simple Explanation',
        });
        expect(result[2]).toEqual({
            raw: 'Write a poem about {{topic}}',
            label: 'Poetry Generator',
        });
    });
});
describe('readProviderPromptMap', () => {
    let config;
    let parsedPrompts;
    beforeEach(() => {
        parsedPrompts = [
            { label: 'prompt1', raw: 'prompt1' },
            { label: 'prompt2', raw: 'prompt2' },
        ];
    });
    it('should return an empty object if config.providers is undefined', () => {
        config = {};
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({});
    });
    it('should return a map with all prompts if config.providers is a string', () => {
        config = { providers: 'provider1' };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            provider1: ['prompt1', 'prompt2'],
        });
    });
    it('should return a map with all prompts if config.providers is a function', () => {
        config = {
            providers: () => Promise.resolve({
                providerName: 'Custom function',
                prompts: ['prompt1', 'prompt2'],
            }),
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            'Custom function': ['prompt1', 'prompt2'],
        });
    });
    it('should handle provider objects with id and prompts', () => {
        config = {
            providers: [{ id: 'provider1', prompts: ['customPrompt1'] }],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({ provider1: ['customPrompt1'] });
    });
    it('should handle provider objects with id, label, and prompts', () => {
        config = {
            providers: [{ id: 'provider1', label: 'providerLabel', prompts: ['customPrompt1'] }],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            provider1: ['customPrompt1'],
            providerLabel: ['customPrompt1'],
        });
    });
    it('should handle provider options map with id and prompts', () => {
        config = {
            providers: [
                {
                    originalProvider: {
                        id: 'provider1',
                        prompts: ['customPrompt1'],
                    },
                },
            ],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({ provider1: ['customPrompt1'] });
    });
    it('should handle provider options map without id and use original id', () => {
        config = {
            providers: [
                {
                    originalProvider: {
                        prompts: ['customPrompt1'],
                    },
                },
            ],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            originalProvider: ['customPrompt1'],
        });
    });
    it('should use rawProvider.prompts if provided for provider objects with id', () => {
        config = {
            providers: [{ id: 'provider1', prompts: ['customPrompt1'] }],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({ provider1: ['customPrompt1'] });
    });
    it('should fall back to allPrompts if no prompts provided for provider objects with id', () => {
        config = {
            providers: [{ id: 'provider1' }],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            provider1: ['prompt1', 'prompt2'],
        });
    });
    it('should use rawProvider.prompts for both id and label if provided', () => {
        config = {
            providers: [{ id: 'provider1', label: 'providerLabel', prompts: ['customPrompt1'] }],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            provider1: ['customPrompt1'],
            providerLabel: ['customPrompt1'],
        });
    });
    it('should fall back to allPrompts for both id and label if no prompts provided', () => {
        config = {
            providers: [{ id: 'provider1', label: 'providerLabel' }],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            provider1: ['prompt1', 'prompt2'],
            providerLabel: ['prompt1', 'prompt2'],
        });
    });
    it('should use providerObject.id from ProviderOptionsMap when provided', () => {
        config = {
            providers: [
                {
                    originalProvider: {
                        id: 'explicitId',
                        prompts: ['customPrompt1'],
                    },
                },
            ],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({ explicitId: ['customPrompt1'] });
    });
    it('should fallback to originalId when providerObject.id is not specified in ProviderOptionsMap', () => {
        config = {
            providers: [
                {
                    originalProvider: {
                        // 'originalProvider' is treated as originalId
                        prompts: ['customPrompt1'],
                    },
                },
            ],
        };
        expect((0, prompts_1.readProviderPromptMap)(config, parsedPrompts)).toEqual({
            originalProvider: ['customPrompt1'],
        });
    });
});
describe('processPrompts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should process function prompts', async () => {
        function testFunction(vars) {
            return `Hello ${vars.name}`;
        }
        const result = await (0, prompts_1.processPrompts)([testFunction]);
        expect(result).toEqual([
            {
                raw: testFunction.toString(),
                label: 'testFunction',
                function: testFunction,
            },
        ]);
    });
    it('should process function prompts with no name', async () => {
        function promptFn(vars) {
            return `Hello ${vars.name}`;
        }
        Object.defineProperty(promptFn, 'name', { value: '' });
        const result = await (0, prompts_1.processPrompts)([promptFn]);
        expect(result).toEqual([
            {
                raw: promptFn.toString(),
                label: '',
                function: expect.any(Function),
            },
        ]);
        expect(fs.readFileSync).toHaveBeenCalledTimes(0);
    });
    it('should process string prompts by calling readPrompts', async () => {
        jest.mocked(fs.readFileSync).mockReturnValueOnce('test prompt');
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const result = await (0, prompts_1.processPrompts)(['test.txt']);
        expect(result).toEqual([
            {
                raw: 'test prompt',
                label: 'test.txt: test prompt',
            },
        ]);
    });
    it('should process Jinja2 files', async () => {
        const jinjaContent = 'You are a helpful assistant for {{ user }}.\nPlease provide information about {{ topic }}.';
        jest.mocked(fs.readFileSync).mockReturnValueOnce(jinjaContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        jest.mocked(utils_1.maybeFilePath).mockReturnValueOnce(true);
        const result = await (0, prompts_1.processPrompts)(['template.j2']);
        // Check that we get a result with the right content
        expect(result).toHaveLength(1);
        expect(result[0].raw).toEqual(jinjaContent);
        expect(result[0].config).toBeUndefined();
        // Check that the label contains the expected text but don't test exact truncation
        expect(result[0].label).toContain('template.j2: You are a helpful assistant for {{ user }}.');
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync).toHaveBeenCalledWith('template.j2', 'utf8');
    });
    it('should process valid prompt schema objects', async () => {
        const validPrompt = {
            raw: 'test prompt',
            label: 'test label',
        };
        const result = await (0, prompts_1.processPrompts)([validPrompt]);
        expect(result).toEqual([validPrompt]);
    });
    it('should fall back to JSON serialization for invalid prompt schema objects', async () => {
        const invalidPrompt = {
            invalidField: 'some value',
            anotherField: 123,
        };
        const result = await (0, prompts_1.processPrompts)([invalidPrompt]);
        expect(result).toEqual([
            {
                raw: JSON.stringify(invalidPrompt),
                label: JSON.stringify(invalidPrompt),
            },
        ]);
    });
    it('should process multiple prompts of different types', async () => {
        function testFunction(vars) {
            return `Hello ${vars.name}`;
        }
        const validPrompt = {
            raw: 'test prompt',
            label: 'test label',
        };
        jest.mocked(fs.readFileSync).mockReturnValueOnce('file prompt');
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const result = await (0, prompts_1.processPrompts)([testFunction, 'test.txt', validPrompt]);
        expect(result).toEqual([
            {
                raw: testFunction.toString(),
                label: 'testFunction',
                function: testFunction,
            },
            {
                raw: 'file prompt',
                label: 'test.txt: file prompt',
            },
            validPrompt,
        ]);
    });
    it('should process CSV files', async () => {
        const csvContent = `prompt,label
Tell me about {{topic}},Basic Query
Explain {{topic}} in simple terms,Simple Explanation`;
        jest.mocked(fs.readFileSync).mockReturnValueOnce(csvContent);
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const result = await (0, prompts_1.processPrompts)(['test.csv']);
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
    });
    it('should flatten array results from readPrompts', async () => {
        jest.mocked(fs.readFileSync).mockReturnValueOnce('prompt1\n---\nprompt2');
        jest.mocked(fs.statSync).mockReturnValueOnce({ isDirectory: () => false });
        const result = await (0, prompts_1.processPrompts)(['test.txt']);
        expect(result).toEqual([
            { raw: 'prompt1', label: 'test.txt: prompt1' },
            { raw: 'prompt2', label: 'test.txt: prompt2' },
        ]);
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
    });
});
//# sourceMappingURL=index.test.js.map