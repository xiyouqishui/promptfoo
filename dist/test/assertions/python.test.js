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
const chat_1 = require("../../src/providers/openai/chat");
const pythonUtils_1 = require("../../src/python/pythonUtils");
const wrapper_1 = require("../../src/python/wrapper");
jest.mock('../../src/python/wrapper', () => {
    const actual = jest.requireActual('../../src/python/wrapper');
    return {
        ...actual,
        runPythonCode: jest.fn(actual.runPythonCode),
    };
});
jest.mock('../../src/python/pythonUtils', () => {
    const actual = jest.requireActual('../../src/python/pythonUtils');
    return {
        ...actual,
        runPython: jest.fn(actual.runPython),
    };
});
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn(jest.requireActual('path').resolve),
    extname: jest.fn(jest.requireActual('path').extname),
}));
describe('Python file references', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should handle Python file reference with function name', async () => {
        const assertion = {
            type: 'python',
            value: 'file:///path/to/assert.py:custom_function',
        };
        const mockOutput = true;
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.py');
        jest.mocked(path.extname).mockReturnValue('.py');
        jest.mocked(pythonUtils_1.runPython).mockResolvedValue(mockOutput);
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
        expect(pythonUtils_1.runPython).toHaveBeenCalledWith('/path/to/assert.py', 'custom_function', [
            output,
            expect.any(Object),
        ]);
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should correctly pass configuration to a python assert', async () => {
        const assertion = {
            type: 'python',
            value: 'file:///path/to/assert.py',
            config: {
                foo: 'bar',
            },
        };
        const mockOutput = true;
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.py');
        jest.mocked(path.extname).mockReturnValue('.py');
        jest.mocked(pythonUtils_1.runPython).mockResolvedValue(mockOutput);
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
        expect(pythonUtils_1.runPython).toHaveBeenCalledWith('/path/to/assert.py', 'get_assert', [
            output,
            expect.objectContaining({
                config: {
                    foo: 'bar',
                },
            }),
        ]);
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should use default function name for Python when none specified', async () => {
        const assertion = {
            type: 'python',
            value: 'file:///path/to/assert.py',
        };
        const mockOutput = true;
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.py');
        jest.mocked(path.extname).mockReturnValue('.py');
        jest.mocked(pythonUtils_1.runPython).mockResolvedValue(mockOutput);
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
        expect(pythonUtils_1.runPython).toHaveBeenCalledWith('/path/to/assert.py', 'get_assert', [
            output,
            expect.any(Object),
        ]);
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
        });
    });
    it('should handle Python assertion errors', async () => {
        const assertion = {
            type: 'python',
            value: 'file:///path/to/assert.py:custom_function',
        };
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.py');
        jest.mocked(path.extname).mockReturnValue('.py');
        jest.mocked(pythonUtils_1.runPython).mockRejectedValue(new Error('Python error'));
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
        expect(result).toMatchObject({
            pass: false,
            score: 0,
            reason: 'Python error',
        });
    });
    it('should handle Python returning a score', async () => {
        const assertion = {
            type: 'python',
            value: 'file:///path/to/assert.py',
        };
        jest.mocked(path.resolve).mockReturnValue('/path/to/assert.py');
        jest.mocked(path.extname).mockReturnValue('.py');
        jest.mocked(pythonUtils_1.runPython).mockResolvedValue(0.75);
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
        expect(result).toMatchObject({
            pass: true,
            score: 0.75,
            reason: 'Assertion passed',
        });
    });
    it('should handle output strings with both single and double quotes correctly in python assertion', async () => {
        const expectedPythonValue = '0.5';
        jest.mocked(wrapper_1.runPythonCode).mockResolvedValueOnce(expectedPythonValue);
        const output = 'This is a string with "double quotes"\n and \'single quotes\' \n\n and some \n\t newlines.';
        const pythonAssertion = {
            type: 'python',
            value: expectedPythonValue,
        };
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion: pythonAssertion,
            test: {},
            providerResponse,
        });
        expect(wrapper_1.runPythonCode).toHaveBeenCalledTimes(1);
        expect(wrapper_1.runPythonCode).toHaveBeenCalledWith(expect.anything(), 'main', [
            output,
            { prompt: 'Some prompt', test: {}, vars: {}, provider, providerResponse },
        ]);
        expect(result).toMatchObject({
            pass: true,
            reason: 'Assertion passed',
            score: Number(expectedPythonValue),
        });
    });
    it.each([
        ['boolean', false, 0, 'Python code returned false', false, undefined],
        ['number', 0, 0, 'Python code returned false', false, undefined],
        [
            'GradingResult',
            `{"pass": false, "score": 0, "reason": "Custom error"}`,
            0,
            'Custom error',
            false,
            undefined,
        ],
        ['boolean', true, 1, 'Assertion passed', true, undefined],
        ['number', 1, 1, 'Assertion passed', true, undefined],
        [
            'GradingResult',
            `{"pass": true, "score": 1, "reason": "Custom success"}`,
            1,
            'Custom success',
            true,
            undefined,
        ],
        [
            'GradingResult',
            // This score is less than the assertion threshold in the test
            `{"pass": true, "score": 0.4, "reason": "Foo bar"}`,
            0.4,
            'Python score 0.4 is less than threshold 0.5: Foo bar',
            false,
            0.5,
        ],
    ])('should handle inline return type %s with return value: %p', async (type, returnValue, expectedScore, expectedReason, expectedPass, threshold) => {
        const output = 'This is a string with "double quotes"\n and \'single quotes\' \n\n and some \n\t newlines.';
        let resolvedValue;
        if (type === 'GradingResult') {
            resolvedValue = JSON.parse(returnValue);
        }
        else {
            resolvedValue = returnValue;
        }
        const pythonAssertion = {
            type: 'python',
            value: returnValue.toString(),
            threshold,
        };
        jest.mocked(wrapper_1.runPythonCode).mockResolvedValueOnce(resolvedValue);
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt',
            provider,
            assertion: pythonAssertion,
            test: {},
            providerResponse,
        });
        expect(wrapper_1.runPythonCode).toHaveBeenCalledTimes(1);
        expect(wrapper_1.runPythonCode).toHaveBeenCalledWith(expect.anything(), 'main', [
            output,
            { prompt: 'Some prompt', test: {}, vars: {}, provider, providerResponse },
        ]);
        expect(result).toMatchObject({
            pass: expectedPass,
            reason: expect.stringMatching(expectedReason),
            score: expectedScore,
        });
    });
    it.each([
        ['boolean', 'True', true, 'Assertion passed'],
        ['number', '0.5', true, 'Assertion passed'],
        ['boolean', true, true, 'Assertion passed'],
        ['number', 0.5, true, 'Assertion passed'],
        [
            'GradingResult',
            '{"pass": true, "score": 1, "reason": "Custom reason"}',
            true,
            'Custom reason',
        ],
        ['boolean', 'False', false, 'Python code returned false'],
        ['number', '0', false, 'Python code returned false'],
        [
            'GradingResult',
            '{"pass": false, "score": 0, "reason": "Custom reason"}',
            false,
            'Custom reason',
        ],
    ])('should handle when the file:// assertion with .py file returns a %s', async (type, pythonOutput, expectedPass, expectedReason) => {
        const output = 'Expected output';
        jest.mocked(pythonUtils_1.runPython).mockResolvedValueOnce(pythonOutput);
        const fileAssertion = {
            type: 'python',
            value: 'file:///path/to/assert.py',
        };
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt that includes "double quotes" and \'single quotes\'',
            provider,
            assertion: fileAssertion,
            test: {},
            providerResponse,
        });
        expect(pythonUtils_1.runPython).toHaveBeenCalledWith(path.resolve('/path/to/assert.py'), 'get_assert', [
            output,
            {
                prompt: 'Some prompt that includes "double quotes" and \'single quotes\'',
                vars: {},
                test: {},
                provider,
                providerResponse,
            },
        ]);
        expect(result).toMatchObject({
            pass: expectedPass,
            reason: expect.stringContaining(expectedReason),
        });
        expect(pythonUtils_1.runPython).toHaveBeenCalledTimes(1);
    });
    it('should handle when python file assertions throw an error', async () => {
        const output = 'Expected output';
        jest
            .mocked(pythonUtils_1.runPython)
            .mockRejectedValue(new Error('The Python script `call_api` function must return a dict with an `output`'));
        const fileAssertion = {
            type: 'python',
            value: 'file:///path/to/assert.py',
        };
        const provider = new chat_1.OpenAiChatCompletionProvider('gpt-4o-mini');
        const providerResponse = { output };
        const result = await (0, assertions_1.runAssertion)({
            prompt: 'Some prompt that includes "double quotes" and \'single quotes\'',
            provider,
            assertion: fileAssertion,
            test: {},
            providerResponse,
        });
        expect(pythonUtils_1.runPython).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            assertion: {
                type: 'python',
                value: 'file:///path/to/assert.py',
            },
            pass: false,
            reason: 'The Python script `call_api` function must return a dict with an `output`',
            score: 0,
        });
    });
});
//# sourceMappingURL=python.test.js.map