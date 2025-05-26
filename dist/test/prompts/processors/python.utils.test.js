"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const python_shell_1 = require("python-shell");
const logger_1 = __importDefault(require("../../../src/logger"));
const python_1 = require("../../../src/prompts/processors/python");
const pythonUtils_1 = require("../../../src/python/pythonUtils");
jest.mock('fs');
jest.mock('python-shell');
jest.mock('../../../src/python/pythonUtils');
describe('pythonPromptFunction', () => {
    it('should call python wrapper function with correct arguments', async () => {
        const filePath = 'path/to/script.py';
        const functionName = 'testFunction';
        const context = {
            vars: { key: 'value' },
            provider: {
                id: () => 'providerId',
                label: 'providerLabel',
                callApi: jest.fn(),
            },
        };
        const mockRunPython = jest.mocked(pythonUtils_1.runPython);
        mockRunPython.mockResolvedValue('mocked result');
        await expect((0, python_1.pythonPromptFunction)(filePath, functionName, context)).resolves.toBe('mocked result');
        expect(mockRunPython).toHaveBeenCalledWith(filePath, functionName, [
            {
                ...context,
                provider: {
                    id: 'providerId',
                    label: 'providerLabel',
                },
                config: {},
            },
        ]);
    });
    it('should call legacy function with correct arguments', async () => {
        const filePath = 'path/to/script.py';
        const context = {
            vars: { key: 'value' },
            provider: { id: () => 'providerId', label: 'providerLabel' },
        };
        const mockPythonShellRun = jest.mocked(python_shell_1.PythonShell.run);
        const mockLoggerDebug = jest.mocked(logger_1.default.debug);
        mockPythonShellRun.mockImplementation(() => {
            return Promise.resolve(['mocked result']);
        });
        await expect((0, python_1.pythonPromptFunctionLegacy)(filePath, context)).resolves.toBe('mocked result');
        expect(mockPythonShellRun).toHaveBeenCalledWith(filePath, {
            mode: 'text',
            pythonPath: process.env.PROMPTFOO_PYTHON || 'python',
            args: [
                JSON.stringify({
                    vars: context.vars,
                    provider: {
                        id: context.provider.id(),
                        label: context.provider.label,
                    },
                    config: {},
                }),
            ],
        });
        expect(mockLoggerDebug).toHaveBeenCalledWith(`Executing python prompt script ${filePath}`);
        expect(mockLoggerDebug).toHaveBeenCalledWith(`Python prompt script ${filePath} returned: mocked result`);
    });
});
//# sourceMappingURL=python.utils.test.js.map