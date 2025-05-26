"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
const cliState_1 = __importDefault(require("../src/cliState"));
const constants_1 = require("../src/constants");
const providers_1 = require("../src/providers");
const http_1 = require("../src/providers/http");
const chat_1 = require("../src/providers/openai/chat");
const embedding_1 = require("../src/providers/openai/embedding");
const pythonCompletion_1 = require("../src/providers/pythonCompletion");
const scriptCompletion_1 = require("../src/providers/scriptCompletion");
const websocket_1 = require("../src/providers/websocket");
const cloud_1 = require("../src/util/cloud");
jest.mock('fs');
jest.mock('js-yaml');
jest.mock('../src/fetch');
jest.mock('../src/providers/http');
jest.mock('../src/providers/openai/chat');
jest.mock('../src/providers/openai/embedding');
jest.mock('../src/providers/pythonCompletion');
jest.mock('../src/providers/scriptCompletion');
jest.mock('../src/providers/websocket');
jest.mock('../src/util/cloud');
describe('loadApiProvider', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(process, 'exit').mockImplementation((() => { }));
    });
    it('should load echo provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('echo');
        expect(provider.id()).toBe('echo');
        await expect(provider.callApi('test')).resolves.toEqual({
            output: 'test',
            raw: 'test',
            cost: 0,
            cached: false,
            isRefusal: false,
            tokenUsage: {
                total: 0,
                prompt: 0,
                completion: 0,
            },
            metadata: {},
        });
    });
    it('should load file provider from yaml', async () => {
        const yamlContent = {
            id: 'openai:chat:gpt-4',
            config: {
                apiKey: 'test-key',
                temperature: 0.7,
            },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const provider = await (0, providers_1.loadApiProvider)('file://test.yaml', {
            basePath: '/test',
        });
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(path_1.default.join('/test', 'test.yaml'), 'utf8');
        expect(js_yaml_1.default.load).toHaveBeenCalledWith('yaml content');
        expect(provider).toBeDefined();
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.any(Object));
    });
    it('should load file provider from json', async () => {
        const jsonContent = {
            id: 'openai:chat:gpt-4',
            config: {
                apiKey: 'test-key',
            },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue(JSON.stringify(jsonContent));
        jest.mocked(js_yaml_1.default.load).mockReturnValue(jsonContent);
        const provider = await (0, providers_1.loadApiProvider)('file://test.json', {
            basePath: '/test',
        });
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(path_1.default.join('/test', 'test.json'), 'utf8');
        expect(js_yaml_1.default.load).toHaveBeenCalledWith(JSON.stringify(jsonContent));
        expect(provider).toBeDefined();
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.any(Object));
    });
    it('should load Provider from cloud', async () => {
        jest.mocked(cloud_1.getProviderFromCloud).mockResolvedValue({
            id: 'openai:chat:gpt-4',
            config: {
                apiKey: 'test-key',
                temperature: 0.7,
            },
        });
        const provider = await (0, providers_1.loadApiProvider)(`${constants_1.CLOUD_PROVIDER_PREFIX}123`);
        expect(provider).toBeDefined();
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', {
            config: expect.objectContaining({
                apiKey: 'test-key',
                temperature: 0.7,
            }),
            id: 'openai:chat:gpt-4',
        });
    });
    it('should load OpenAI chat provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:chat:gpt-4.1');
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4.1', expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load OpenAI chat provider with default model', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:chat');
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4.1-2025-04-14', expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load OpenAI embedding provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('openai:embedding');
        expect(embedding_1.OpenAiEmbeddingProvider).toHaveBeenCalledWith('text-embedding-3-large', expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load DeepSeek provider with default model', async () => {
        const provider = await (0, providers_1.loadApiProvider)('deepseek:');
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('deepseek-chat', {
            config: expect.objectContaining({
                apiBaseUrl: 'https://api.deepseek.com/v1',
                apiKeyEnvar: 'DEEPSEEK_API_KEY',
            }),
        });
        expect(provider).toBeDefined();
    });
    it('should load DeepSeek provider with specific model', async () => {
        const provider = await (0, providers_1.loadApiProvider)('deepseek:deepseek-coder');
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('deepseek-coder', {
            config: expect.objectContaining({
                apiBaseUrl: 'https://api.deepseek.com/v1',
                apiKeyEnvar: 'DEEPSEEK_API_KEY',
            }),
        });
        expect(provider).toBeDefined();
    });
    it('should load Hyperbolic provider with specific model', async () => {
        const provider = await (0, providers_1.loadApiProvider)('hyperbolic:meta-llama/Meta-Llama-3-8B-Instruct-Turbo');
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('meta-llama/Meta-Llama-3-8B-Instruct-Turbo', {
            config: expect.objectContaining({
                apiBaseUrl: 'https://api.hyperbolic.xyz/v1',
                apiKeyEnvar: 'HYPERBOLIC_API_KEY',
            }),
        });
        expect(provider).toBeDefined();
    });
    it('should load HTTP provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('http://test.com');
        expect(http_1.HttpProvider).toHaveBeenCalledWith('http://test.com', expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load HTTPS provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('https://test.com');
        expect(http_1.HttpProvider).toHaveBeenCalledWith('https://test.com', expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load WebSocket provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('ws://test.com');
        expect(websocket_1.WebSocketProvider).toHaveBeenCalledWith('ws://test.com', expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load script provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('exec:test.sh');
        expect(scriptCompletion_1.ScriptCompletionProvider).toHaveBeenCalledWith(expect.stringMatching(/test\.sh$/), expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load Python provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('python:test.py');
        expect(pythonCompletion_1.PythonProvider).toHaveBeenCalledWith(expect.stringMatching(/test\.py$/), expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should load Python provider from file path', async () => {
        const provider = await (0, providers_1.loadApiProvider)('file://test.py');
        expect(pythonCompletion_1.PythonProvider).toHaveBeenCalledWith(expect.stringMatching(/test\.py$/), expect.any(Object));
        expect(provider).toBeDefined();
    });
    it('should handle unidentified provider', async () => {
        await expect((0, providers_1.loadApiProvider)('unknown:provider')).rejects.toThrow('Could not identify provider');
    });
    it('should load JFrog ML provider', async () => {
        const provider = await (0, providers_1.loadApiProvider)('jfrog:test-model');
        expect(provider).toBeDefined();
    });
    it('should handle invalid file path for yaml/json config', async () => {
        jest.mocked(fs_1.default.readFileSync).mockImplementation(() => {
            throw new Error('File not found');
        });
        await expect((0, providers_1.loadApiProvider)('file://invalid.yaml')).rejects.toThrow('File not found');
    });
    it('should handle invalid yaml content', async () => {
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('invalid: yaml: content:');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(null);
        await expect((0, providers_1.loadApiProvider)('file://invalid.yaml')).rejects.toThrow('Provider config');
    });
    it('should handle yaml config without id', async () => {
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('config:\n  key: value');
        jest.mocked(js_yaml_1.default.load).mockReturnValue({ config: { key: 'value' } });
        await expect((0, providers_1.loadApiProvider)('file://invalid.yaml')).rejects.toThrow('must have an id');
    });
    it('should handle provider with custom base path', async () => {
        const mockProvider = {
            id: () => 'python:script.py',
            config: {
                basePath: '/custom/path',
            },
            callApi: async (input) => ({ output: input }),
        };
        jest.mocked(pythonCompletion_1.PythonProvider).mockImplementation(() => mockProvider);
        const provider = await (0, providers_1.loadApiProvider)('python:script.py', {
            basePath: '/custom/path',
            options: {
                config: {},
            },
        });
        expect(provider.config.basePath).toBe('/custom/path');
    });
    it('should handle provider with delay', async () => {
        const provider = await (0, providers_1.loadApiProvider)('echo', {
            options: {
                delay: 1000,
            },
        });
        expect(provider.delay).toBe(1000);
    });
    it('should handle provider with custom label template', async () => {
        process.env.CUSTOM_LABEL = 'my-label';
        const provider = await (0, providers_1.loadApiProvider)('echo', {
            options: {
                label: '{{ env.CUSTOM_LABEL }}',
            },
        });
        expect(provider.label).toBe('my-label');
        delete process.env.CUSTOM_LABEL;
    });
    it('should throw error when file provider array is loaded with loadApiProvider', async () => {
        const yamlContent = [
            {
                id: 'openai:chat:gpt-4',
                config: { apiKey: 'test-key1' },
            },
            {
                id: 'anthropic:claude-2',
                config: { apiKey: 'test-key2' },
            },
        ];
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        await expect((0, providers_1.loadApiProvider)('file://test.yaml')).rejects.toThrow('Multiple providers found in test.yaml. Use loadApiProviders instead of loadApiProvider.');
    });
    it('should handle file provider with environment variables', async () => {
        process.env.OPENAI_API_KEY = 'test-key-from-env';
        const yamlContent = {
            id: 'openai:chat:gpt-4',
            config: {
                apiKey: '{{ env.OPENAI_API_KEY }}',
            },
            env: {
                OPENAI_API_KEY: 'override-key',
            },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const provider = await (0, providers_1.loadApiProvider)('file://test.yaml', {
            basePath: '/test',
            env: { OPENAI_API_KEY: 'final-override-key' },
        });
        expect(provider).toBeDefined();
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.objectContaining({
            config: expect.objectContaining({
                apiKey: expect.any(String),
            }),
            env: expect.objectContaining({
                OPENAI_API_KEY: 'final-override-key',
            }),
        }));
        delete process.env.OPENAI_API_KEY;
    });
    it('should load multiple providers from yaml file using loadApiProviders', async () => {
        const yamlContent = [
            {
                id: 'openai:chat:gpt-4o-mini',
                config: { apiKey: 'test-key1' },
            },
            {
                id: 'anthropic:claude-3-7-sonnet-20250219',
                config: { apiKey: 'test-key2' },
            },
        ];
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const providers = await (0, providers_1.loadApiProviders)('file://test.yaml');
        expect(providers).toHaveLength(2);
        expect(providers[0]).toBeDefined();
        expect(providers[1]).toBeDefined();
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(expect.stringContaining('test.yaml'), 'utf8');
        expect(js_yaml_1.default.load).toHaveBeenCalledWith('yaml content');
    });
    it('should handle absolute file paths', async () => {
        const yamlContent = {
            id: 'openai:chat:gpt-4',
            config: { apiKey: 'test-key' },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const absolutePath = path_1.default.resolve('/absolute/path/to/providers.yaml');
        const provider = await (0, providers_1.loadApiProvider)(`file://${absolutePath}`);
        expect(provider).toBeDefined();
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(absolutePath, 'utf8');
    });
    it('should handle provider with null or undefined config values', async () => {
        const yamlContent = {
            id: 'openai:chat:gpt-4',
            config: {
                apiKey: 'test-key',
                nullValue: null,
                undefinedValue: undefined,
            },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const provider = await (0, providers_1.loadApiProvider)('file://test.yaml');
        expect(provider).toBeDefined();
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.objectContaining({
            config: expect.objectContaining({
                apiKey: 'test-key',
            }),
        }));
    });
    it('should handle provider with undefined options', async () => {
        const provider = await (0, providers_1.loadApiProvider)('echo', {
            options: undefined,
        });
        expect(provider).toBeDefined();
    });
    it('should throw error for invalid providerPaths type', async () => {
        // Test with a number, which is an invalid type
        await expect((0, providers_1.loadApiProviders)(42)).rejects.toThrow('Invalid providers list');
        // Test with an object that doesn't match any valid format
        await expect((0, providers_1.loadApiProviders)({ foo: 'bar' })).rejects.toThrow('Invalid providers list');
    });
    it('should handle non-yaml/json file paths', async () => {
        // Test with a text file path
        await expect((0, providers_1.loadApiProviders)('file://test.txt')).rejects.toThrow(/Could not identify provider/);
    });
});
describe('loadApiProviders', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        cliState_1.default.config = undefined;
    });
    it('should load single provider from string', async () => {
        const providers = await (0, providers_1.loadApiProviders)('echo');
        expect(providers).toHaveLength(1);
        expect(providers[0].id()).toBe('echo');
    });
    it('should load multiple providers from array of strings', async () => {
        const providers = await (0, providers_1.loadApiProviders)(['echo', 'openai:chat:gpt-4']);
        expect(providers).toHaveLength(2);
        expect(providers[0].id()).toBe('echo');
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.any(Object));
    });
    it('should load provider from function', async () => {
        const customFunction = async (prompt) => ({ output: prompt });
        const providers = await (0, providers_1.loadApiProviders)(customFunction);
        expect(providers).toHaveLength(1);
        expect(providers[0].id()).toBe('custom-function');
        await expect(providers[0].callApi('test')).resolves.toEqual({ output: 'test' });
    });
    it('should load provider from function with label', async () => {
        const customFunction = async (prompt) => ({ output: prompt });
        customFunction.label = 'custom-label';
        const providers = await (0, providers_1.loadApiProviders)([customFunction]);
        expect(providers).toHaveLength(1);
        expect(providers[0].id()).toBe('custom-label');
    });
    it('should load provider from options object', async () => {
        const options = {
            id: 'openai:chat:gpt-4',
            config: {
                apiKey: 'test-key',
            },
        };
        const providers = await (0, providers_1.loadApiProviders)([options]);
        expect(providers).toHaveLength(1);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.any(Object));
    });
    it('should load provider from options map', async () => {
        const providers = await (0, providers_1.loadApiProviders)([
            {
                'openai:chat:gpt-4': {
                    config: {
                        apiKey: 'test-key',
                    },
                },
            },
        ]);
        expect(providers).toHaveLength(1);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.any(Object));
    });
    it('should throw error for invalid providers list', async () => {
        await expect((0, providers_1.loadApiProviders)({})).rejects.toThrow('Invalid providers list');
    });
    it('should handle loadApiProviders with empty array', async () => {
        const providers = await (0, providers_1.loadApiProviders)([]);
        expect(providers).toHaveLength(0);
    });
    it('should handle loadApiProviders with mixed provider types', async () => {
        const customFunction = async (prompt) => ({ output: prompt });
        const providers = await (0, providers_1.loadApiProviders)([
            'echo',
            customFunction,
            { id: 'openai:chat', config: {} },
            { 'openai:completion': { config: {} } },
        ]);
        expect(providers).toHaveLength(4);
    });
    it('should handle provider with null config', async () => {
        const provider = await (0, providers_1.loadApiProvider)('echo', {
            options: {
                config: null,
            },
        });
        expect(provider).toBeDefined();
    });
    it('should handle provider with undefined options', async () => {
        const provider = await (0, providers_1.loadApiProvider)('echo', {
            options: undefined,
        });
        expect(provider).toBeDefined();
    });
    it('should handle relative file paths', async () => {
        const yamlContent = {
            id: 'openai:chat:gpt-4',
            config: { apiKey: 'test-key' },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const relativePath = 'relative/path/to/providers.yaml';
        const providers = await (0, providers_1.loadApiProviders)(`file://${relativePath}`, {
            basePath: '/test/base/path',
        });
        expect(providers).toHaveLength(1);
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(path_1.default.join('/test/base/path', relativePath), 'utf8');
    });
    it('should handle absolute file paths in loadApiProviders', async () => {
        const yamlContent = {
            id: 'openai:chat:gpt-4',
            config: { apiKey: 'test-key' },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const absolutePath = path_1.default.resolve('/absolute/path/to/providers.yaml');
        const providers = await (0, providers_1.loadApiProviders)(`file://${absolutePath}`);
        expect(providers).toHaveLength(1);
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(absolutePath, 'utf8');
        expect(js_yaml_1.default.load).toHaveBeenCalledWith('yaml content');
    });
    it('should load multiple providers from a file specified in a providers array', async () => {
        // Setup mock file with multiple providers
        const yamlContent = [
            {
                id: 'echo',
                config: { prefix: 'Echo Provider: ' },
            },
            {
                id: 'openai:gpt-4o-mini',
                config: { temperature: 0.1 },
            },
        ];
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        // Create provider array with a mix of direct provider and file reference
        const providerArray = [
            'anthropic:claude-3-5-sonnet-20241022',
            'file://./providers.yaml', // This should expand to the two providers above
        ];
        const providers = await (0, providers_1.loadApiProviders)(providerArray);
        // We should get 3 providers: 1 direct + 2 from file
        expect(providers).toHaveLength(3);
        // Just verify that all providers are defined
        providers.forEach((provider) => {
            expect(provider).toBeDefined();
        });
        // Verify file was read correctly
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(expect.stringContaining('providers.yaml'), 'utf8');
        expect(js_yaml_1.default.load).toHaveBeenCalledWith('yaml content');
    });
    it('should handle nested arrays of providers from multiple file references', async () => {
        // First file
        const firstFileContent = [
            {
                id: 'echo',
                config: { prefix: 'First file: ' },
            },
        ];
        // Second file
        const secondFileContent = [
            {
                id: 'openai:gpt-4o-mini',
                config: { temperature: 0.1 },
            },
            {
                id: 'anthropic:claude-3-5-sonnet-20241022',
                config: { temperature: 0.7 },
            },
        ];
        // Mock the file system read for different paths
        jest.mocked(fs_1.default.readFileSync).mockImplementation((filePath) => {
            if (filePath.toString().includes('first.yaml')) {
                return 'first file content';
            }
            else if (filePath.toString().includes('second.yaml')) {
                return 'second file content';
            }
            return '';
        });
        // Mock yaml loading based on different file contents
        jest.mocked(js_yaml_1.default.load).mockImplementation((content) => {
            if (content === 'first file content') {
                return firstFileContent;
            }
            else if (content === 'second file content') {
                return secondFileContent;
            }
            return null;
        });
        // Provider array with multiple file references
        const providerArray = ['file://./first.yaml', 'file://./second.yaml'];
        const providers = await (0, providers_1.loadApiProviders)(providerArray);
        // We should get 3 providers total: 1 from first file + 2 from second file
        expect(providers).toHaveLength(3);
        // Just verify all providers are defined
        providers.forEach((provider) => {
            expect(provider).toBeDefined();
        });
        // Verify both files were read
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(expect.stringContaining('first.yaml'), 'utf8');
        expect(fs_1.default.readFileSync).toHaveBeenCalledWith(expect.stringContaining('second.yaml'), 'utf8');
    });
    it('should use env values from cliState.config', async () => {
        // Set up dummy config with env block
        cliState_1.default.config = {
            env: {
                TEST_API_KEY: 'test-key-from-cli-state',
                OTHER_VAR: 'other-value',
            },
        };
        const yamlContent = {
            id: 'openai:chat:gpt-4',
            config: {
                apiKey: '{{ env.TEST_API_KEY }}',
            },
        };
        jest.mocked(fs_1.default.readFileSync).mockReturnValue('yaml content');
        jest.mocked(js_yaml_1.default.load).mockReturnValue(yamlContent);
        const providers = await (0, providers_1.loadApiProviders)('file://test.yaml');
        expect(providers).toHaveLength(1);
        expect(chat_1.OpenAiChatCompletionProvider).toHaveBeenCalledWith('gpt-4', expect.objectContaining({
            config: expect.objectContaining({
                apiKey: expect.any(String),
            }),
            env: expect.objectContaining({
                TEST_API_KEY: 'test-key-from-cli-state',
                OTHER_VAR: 'other-value',
            }),
        }));
    });
});
//# sourceMappingURL=providers.test.js.map