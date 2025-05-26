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
const path = __importStar(require("path"));
const assertions_1 = require("../../src/assertions");
const esm_1 = require("../../src/esm");
const chat_1 = require("../../src/providers/openai/chat");
const packageParser_1 = require("../../src/providers/packageParser");
jest.mock('../../src/redteam/remoteGeneration', () => ({
    shouldGenerateRemote: jest.fn().mockReturnValue(false),
}));
jest.mock('proxy-agent', () => ({
    ProxyAgent: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('node:module', () => {
    const mockRequire = {
        resolve: jest.fn(),
    };
    return {
        createRequire: jest.fn().mockReturnValue(mockRequire),
    };
});
jest.mock('../../src/fetch', () => {
    const actual = jest.requireActual('../../src/fetch');
    return {
        ...actual,
        fetchWithRetries: jest.fn(actual.fetchWithRetries),
    };
});
jest.mock('glob', () => ({
    globSync: jest.fn(),
}));
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
    },
}));
jest.mock('../../src/esm', () => ({
    importModule: jest.fn().mockImplementation((path, functionName) => {
        // Make sure both parameters are captured in the mock call
        return Promise.resolve();
    }),
    __esModule: true,
}));
jest.mock('../../src/database', () => ({
    getDb: jest.fn(),
}));
jest.mock('path', () => {
    const actualPath = jest.requireActual('path');
    return {
        ...actualPath,
        resolve: jest.fn((basePath, filePath) => actualPath.join(basePath, filePath)),
        extname: jest.fn((filePath) => actualPath.extname(filePath)),
        join: actualPath.join,
    };
});
jest.mock('../../src/cliState', () => ({
    basePath: '/base/path',
}));
jest.mock('../../src/matchers', () => {
    const actual = jest.requireActual('../../src/matchers');
    return {
        ...actual,
        matchesContextRelevance: jest
            .fn()
            .mockResolvedValue({ pass: true, score: 1, reason: 'Mocked reason' }),
        matchesContextFaithfulness: jest
            .fn()
            .mockResolvedValue({ pass: true, score: 1, reason: 'Mocked reason' }),
    };
});
// Add this mock for packageParser
jest.mock('../../src/providers/packageParser', () => {
    const mockIsPackagePath = jest.fn();
    const mockLoadFromPackage = jest.fn();
    return {
        isPackagePath: mockIsPackagePath,
        loadFromPackage: mockLoadFromPackage,
        __esModule: true, // This is important for proper mocking
    };
});
const javascriptStringAssertion = {
    type: 'javascript',
    value: 'output === "Expected output"',
};
const javascriptMultilineStringAssertion = {
    type: 'javascript',
    value: `
      if (output === "Expected output") {
        return {
          pass: true,
          score: 0.5,
          reason: 'Assertion passed',
        };
      }
      return {
        pass: false,
        score: 0,
        reason: 'Assertion failed',
      };`,
};
const javascriptStringAssertionWithNumber = {
    type: 'javascript',
    value: 'output.length * 10',
};
const javascriptBooleanAssertionWithConfig = {
    type: 'javascript',
    value: 'output.length <= context.config.maximumOutputSize',
    config: {
        maximumOutputSize: 20,
    },
};
const javascriptStringAssertionWithNumberAndThreshold = {
    type: 'javascript',
    value: 'output.length * 10',
    threshold: 0.5,
};
const javascriptFunctionAssertion = {
    type: 'javascript',
    value: async (output) => ({
        pass: true,
        score: 0.5,
        reason: 'Assertion passed',
        assertion: null,
    }),
};
const javascriptFunctionFailAssertion = {
    type: 'javascript',
    value: async (output) => ({
        pass: false,
        score: 0.5,
        reason: 'Assertion failed',
        assertion: null,
    }),
};
describe('JavaScript file references', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset all mocks before each test
        jest.mocked(esm_1.importModule).mockReset();
        jest.mocked(path.resolve).mockReset();
        jest.mocked(packageParser_1.isPackagePath).mockReset();
        jest.mocked(packageParser_1.loadFromPackage).mockReset();
    });
    it('should handle JavaScript file reference with function name', async () => {
        const assertion = {
            type: 'javascript',
            value: 'file:///path/to/assert.js:customFunction',
        };
        const mockFn = jest.fn((output) => true);
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.js');
        jest.mocked(path.extname).mockReturnValue('.js');
        jest.mocked(packageParser_1.isPackagePath).mockReturnValue(false);
        // Mock importModule to return the mock function
        jest.mocked(esm_1.importModule).mockImplementationOnce((path, functionName) => {
            return Promise.resolve({
                customFunction: mockFn,
            });
        });
        const output = 'Expected output';
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion,
            test: {},
            providerResponse,
        });
        // Verify the mock was called with both parameters
        expect(esm_1.importModule).toHaveBeenCalledWith('/path/to/assert.js', 'customFunction');
        expect(mockFn).toHaveBeenCalledWith(output, {
            prompt: 'Some prompt',
            vars: {},
            test: {},
            provider,
            providerResponse,
        });
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should handle default export when no function name specified', async () => {
        const assertion = {
            type: 'javascript',
            value: 'file:///path/to/assert.js',
        };
        const mockFn = jest.fn((output) => true);
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.js');
        jest.mocked(path.extname).mockReturnValue('.js');
        jest.mocked(packageParser_1.isPackagePath).mockReturnValue(false);
        // Mock importModule to return the mock function
        jest.mocked(esm_1.importModule).mockImplementationOnce((path, functionName) => {
            return Promise.resolve(mockFn);
        });
        const output = 'Expected output';
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion,
            test: {},
            providerResponse,
        });
        expect(esm_1.importModule).toHaveBeenCalledWith('/path/to/assert.js', undefined);
        expect(mockFn).toHaveBeenCalledWith(output, {
            prompt: 'Some prompt',
            vars: {},
            test: {},
            provider,
            providerResponse,
        });
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should handle default export object with function', async () => {
        const assertion = {
            type: 'javascript',
            value: 'file:///path/to/assert.js',
        };
        const mockFn = jest.fn((output) => true);
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.js');
        jest.mocked(path.extname).mockReturnValue('.js');
        jest.mocked(packageParser_1.isPackagePath).mockReturnValue(false);
        // Mock importModule to handle both parameters
        const mockImportModule = jest.mocked(esm_1.importModule);
        mockImportModule.mockImplementationOnce((path, functionName) => {
            // Return the mock function in a default export object
            return Promise.resolve({ default: mockFn });
        });
        const output = 'Expected output';
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion,
            test: {},
            providerResponse,
        });
        expect(esm_1.importModule).toHaveBeenCalledWith('/path/to/assert.js', undefined);
        expect(mockFn).toHaveBeenCalledWith(output, {
            prompt: 'Some prompt',
            vars: {},
            test: {},
            provider,
            providerResponse,
        });
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should pass when the javascript assertion passes', async () => {
        const output = 'Expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptStringAssertion,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should pass a score through when the javascript returns a number', async () => {
        const output = 'Expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptStringAssertionWithNumber,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: true,
            score: output.length * 10,
            reason: 'Assertion passed',
        });
    });
    it('should pass when javascript returns an output string that is smaller than the maximum size threshold', async () => {
        const output = 'Expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptBooleanAssertionWithConfig,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: true,
            score: 1.0,
            reason: 'Assertion passed',
        });
    });
    it('should fail when javascript returns an output string that is larger than the maximum size threshold', async () => {
        const output = 'Expected output with some extra characters';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptBooleanAssertionWithConfig,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: false,
            score: 0,
            reason: expect.stringContaining('Custom function returned false'),
        });
    });
    it('should pass when javascript returns a number above threshold', async () => {
        const output = 'Expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptStringAssertionWithNumberAndThreshold,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: true,
            score: output.length * 10,
            reason: 'Assertion passed',
        });
    });
    it('should fail when javascript returns a number below threshold', async () => {
        const output = '';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptStringAssertionWithNumberAndThreshold,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: false,
            score: output.length * 10,
            reason: expect.stringContaining('Custom function returned false'),
        });
    });
    it('should set score when javascript returns false', async () => {
        const output = 'Test output';
        const assertion = {
            type: 'javascript',
            value: 'output.length < 1',
        };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: false,
            score: 0,
            reason: expect.stringContaining('Custom function returned false'),
        });
    });
    it('should fail when the javascript assertion fails', async () => {
        const output = 'Different output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptStringAssertion,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: false,
            reason: 'Custom function returned false\noutput === "Expected output"',
        });
    });
    it('should pass when javascript function assertion passes - with vars', async () => {
        const output = 'Expected output';
        const javascriptStringAssertionWithVars = {
            type: 'javascript',
            value: 'output === "Expected output" && context.vars.foo === "bar"',
        };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptStringAssertionWithVars,
            test: { vars: { foo: 'bar' } },
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should fail when the javascript does not match vars', async () => {
        const output = 'Expected output';
        const javascriptStringAssertionWithVars = {
            type: 'javascript',
            value: 'output === "Expected output" && context.vars.foo === "something else"',
        };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptStringAssertionWithVars,
            test: { vars: { foo: 'bar' } },
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: false,
            reason: 'Custom function returned false\noutput === "Expected output" && context.vars.foo === "something else"',
        });
    });
    it('should pass when the function returns pass', async () => {
        const output = 'Expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptFunctionAssertion,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: true,
            score: 0.5,
            reason: 'Assertion passed',
        });
    });
    it('should fail when the function returns fail', async () => {
        const output = 'Expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
            assertion: javascriptFunctionFailAssertion,
            test: {},
            providerResponse: { output },
        });
        expect(result).toMatchObject({
            pass: false,
            score: 0.5,
            reason: 'Assertion failed',
        });
    });
    it('should pass when the multiline javascript assertion passes', async () => {
        const output = 'Expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            assertion: javascriptMultilineStringAssertion,
            test: {},
            providerResponse: { output },
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
        });
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should pass when the multiline javascript assertion fails', async () => {
        const output = 'Not the expected output';
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            assertion: javascriptMultilineStringAssertion,
            test: {},
            providerResponse: { output },
            provider: new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini'),
        });
        expect(result).toMatchObject({
            pass: false,
            reason: 'Assertion failed',
        });
    });
    it.each([
        [
            'boolean',
            jest.fn((output) => output === 'Expected output'),
            true,
            'Assertion passed',
        ],
        ['number', jest.fn((output) => output.length), true, 'Assertion passed'],
        [
            'GradingResult',
            jest.fn((output) => ({ pass: true, score: 1, reason: 'Custom reason' })),
            true,
            'Custom reason',
        ],
        [
            'boolean',
            jest.fn((output) => output !== 'Expected output'),
            false,
            'Custom function returned false',
        ],
        ['number', jest.fn((output) => 0), false, 'Custom function returned false'],
        [
            'GradingResult',
            jest.fn((output) => ({ pass: false, score: 0.1, reason: 'Custom reason' })),
            false,
            'Custom reason',
        ],
        [
            'boolean Promise',
            jest.fn((output) => Promise.resolve(true)),
            true,
            'Assertion passed',
        ],
    ])('should pass when the file:// assertion with .js file returns a %s', async (type, mockFn, expectedPass, expectedReason) => {
        const output = 'Expected output';
        // Mock path.resolve to return a valid path
        jest.mocked(path.resolve).mockReturnValue('/mocked/path/to/assert.js');
        jest.mocked(path.extname).mockReturnValue('.js');
        // Mock isPackagePath to return false for file:// paths
        jest.mocked(packageParser_1.isPackagePath).mockReturnValue(false);
        // Mock importModule to handle both path and functionName
        const mockImportModule = jest.mocked(esm_1.importModule);
        mockImportModule.mockImplementation((path, functionName) => {
            // Make sure both parameters are captured in the mock
            mockImportModule.mock.calls.push([path, functionName]);
            return Promise.resolve(mockFn);
        });
        const fileAssertion = {
            type: 'javascript',
            value: 'file:///path/to/assert.js',
        };
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion: fileAssertion,
            test: {},
            providerResponse,
        });
        expect(mockFn).toHaveBeenCalledWith(output, {
            prompt: 'Some prompt',
            vars: {},
            test: {},
            provider,
            providerResponse,
        });
        expect(result).toMatchObject({
            pass: expectedPass,
            reason: expect.stringContaining(expectedReason),
        });
    });
    it.each([
        [
            'boolean',
            jest.fn((output) => output === 'Expected output'),
            true,
            'Assertion passed',
        ],
        ['number', jest.fn((output) => output.length), true, 'Assertion passed'],
        [
            'GradingResult',
            jest.fn((output) => ({ pass: true, score: 1, reason: 'Custom reason' })),
            true,
            'Custom reason',
        ],
        [
            'boolean',
            jest.fn((output) => output !== 'Expected output'),
            false,
            'Custom function returned false',
        ],
        ['number', jest.fn((output) => 0), false, 'Custom function returned false'],
        [
            'GradingResult',
            jest.fn((output) => ({ pass: false, score: 0.1, reason: 'Custom reason' })),
            false,
            'Custom reason',
        ],
        [
            'boolean Promise',
            jest.fn((output) => Promise.resolve(true)),
            true,
            'Assertion passed',
        ],
    ])('should pass when assertion is a package path', async (type, mockFn, expectedPass, expectedReason) => {
        const output = 'Expected output';
        // Mock isPackagePath to return true for package paths
        jest.mocked(packageParser_1.isPackagePath).mockReturnValue(true);
        // Mock loadFromPackage to return the mockFn
        jest.mocked(packageParser_1.loadFromPackage).mockResolvedValue(mockFn);
        const packageAssertion = {
            type: 'javascript',
            value: 'package:@promptfoo/fake:assertionFunction',
        };
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion: packageAssertion,
            test: {},
            providerResponse,
        });
        expect(mockFn).toHaveBeenCalledWith(output, {
            prompt: 'Some prompt',
            vars: {},
            test: {},
            provider,
            providerResponse,
        });
        expect(result).toMatchObject({
            pass: expectedPass,
            reason: expect.stringContaining(expectedReason),
        });
    });
    it('should resolve js paths relative to the configuration file', async () => {
        const output = 'Expected output';
        const mockFn = jest.fn((output) => output === 'Expected output');
        // Mock path.resolve to return a valid path
        jest.mocked(path.resolve).mockReturnValue('/base/path/path/to/assert.js');
        jest.mocked(path.extname).mockReturnValue('.js');
        // Mock isPackagePath to return false
        jest.mocked(packageParser_1.isPackagePath).mockReturnValue(false);
        // Mock importModule to return the mockFn
        jest.mocked(esm_1.importModule).mockResolvedValue(mockFn);
        const fileAssertion = {
            type: 'javascript',
            value: 'file://./path/to/assert.js',
        };
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion: fileAssertion,
            test: {},
            providerResponse,
        });
        expect(mockFn).toHaveBeenCalledWith(output, {
            prompt: 'Some prompt',
            vars: {},
            test: {},
            provider,
            providerResponse,
        });
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
});
//# sourceMappingURL=javascript.test.js.map