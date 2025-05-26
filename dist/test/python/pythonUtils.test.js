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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const python_shell_1 = require("python-shell");
const stream_1 = require("stream");
const envars_1 = require("../../src/envars");
const logger_1 = __importDefault(require("../../src/logger"));
const execAsync_1 = require("../../src/python/execAsync");
const pythonUtils = __importStar(require("../../src/python/pythonUtils"));
jest.mock('fs', () => ({
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    unlinkSync: jest.fn(),
}));
jest.mock('python-shell', () => ({
    PythonShell: {
        run: jest.fn(),
    },
}));
jest.mock('../../src/envars', () => ({
    getEnvString: jest.fn(),
}));
jest.mock('../../src/python/execAsync', () => ({
    execAsync: jest.fn(),
}));
const mockPythonShellInstance = {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    end: jest.fn(),
};
jest.mock('python-shell', () => ({
    PythonShell: jest.fn(() => mockPythonShellInstance),
}));
// Helper to create a minimal ChildProcess-like object for mocks
function createMockChildProcess() {
    // Create dummy streams to satisfy type requirements
    const dummyWritable = Object.assign(new stream_1.Writable(), {});
    const dummyReadable = Object.assign(new stream_1.Readable({ read() { } }), {});
    // @ts-expect-error: Only minimal fields for testing
    return {
        stdin: dummyWritable,
        stdout: dummyReadable,
        stderr: dummyReadable,
        stdio: [dummyWritable, dummyReadable, dummyReadable, null, null],
        pid: 1234,
        connected: false,
        kill: jest.fn(),
        send: jest.fn(),
        disconnect: jest.fn(),
        unref: jest.fn(),
        ref: jest.fn(),
        addListener: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        prependListener: jest.fn(),
        prependOnceListener: jest.fn(),
        removeAllListeners: jest.fn(),
        removeListener: jest.fn(),
        eventNames: jest.fn(),
        getMaxListeners: jest.fn(),
        listenerCount: jest.fn(),
        listeners: jest.fn(),
        off: jest.fn(),
        rawListeners: jest.fn(),
        setMaxListeners: jest.fn(),
    };
}
describe('pythonUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pythonUtils.state.cachedPythonPath = null;
    });
    describe('tryPath', () => {
        it('should return the path for a valid Python 3 executable', async () => {
            jest.mocked(execAsync_1.execAsync).mockResolvedValue({
                stdout: 'Python 3.8.10\n',
                stderr: '',
                child: createMockChildProcess(),
            });
            const result = await pythonUtils.tryPath('/usr/bin/python3');
            expect(result).toBe('/usr/bin/python3');
            expect(execAsync_1.execAsync).toHaveBeenCalledWith('/usr/bin/python3 --version');
        });
        it('should return null for a non-existent executable', async () => {
            jest.mocked(execAsync_1.execAsync).mockRejectedValue(new Error('Command failed'));
            const result = await pythonUtils.tryPath('/usr/bin/nonexistent');
            expect(result).toBeNull();
            expect(execAsync_1.execAsync).toHaveBeenCalledWith('/usr/bin/nonexistent --version');
        });
        it('should return null if the command times out', async () => {
            jest.useFakeTimers();
            jest.mocked(execAsync_1.execAsync).mockImplementation(() => {
                return Object.assign(new Promise((resolve) => {
                    setTimeout(() => resolve({
                        stdout: 'Python 3.8.10\n',
                        stderr: '',
                    }), 3000);
                }), { child: createMockChildProcess() });
            });
            const resultPromise = pythonUtils.tryPath('/usr/bin/python3');
            jest.advanceTimersByTime(2501);
            const result = await resultPromise;
            expect(result).toBeNull();
            expect(execAsync_1.execAsync).toHaveBeenCalledWith('/usr/bin/python3 --version');
            jest.useRealTimers();
        }, 10000);
    });
    describe('validatePythonPath', () => {
        it('should validate an existing Python 3 path', async () => {
            jest.mocked(execAsync_1.execAsync).mockResolvedValue({
                stdout: 'Python 3.8.10\n',
                stderr: '',
                child: createMockChildProcess(),
            });
            const result = await pythonUtils.validatePythonPath('python', false);
            expect(result).toBe('python');
            expect(pythonUtils.state.cachedPythonPath).toBe('python');
            expect(execAsync_1.execAsync).toHaveBeenCalledWith('python --version');
        });
        it('should return the cached path on subsequent calls', async () => {
            pythonUtils.state.cachedPythonPath = '/usr/bin/python3';
            const result = await pythonUtils.validatePythonPath('python', false);
            expect(result).toBe('/usr/bin/python3');
        });
        it('should fall back to alternative paths for non-existent programs when not explicit', async () => {
            jest
                .mocked(execAsync_1.execAsync)
                .mockRejectedValueOnce(new Error('Command failed'))
                .mockResolvedValueOnce({
                stdout: 'Python 3.9.5\n',
                stderr: '',
                child: createMockChildProcess(),
            });
            const result = await pythonUtils.validatePythonPath('non_existent_program', false);
            expect(result).toBe(process.platform === 'win32' ? 'py -3' : 'python3');
            expect(execAsync_1.execAsync).toHaveBeenCalledTimes(2);
        });
        it('should throw an error for non-existent programs when explicit', async () => {
            jest.mocked(execAsync_1.execAsync).mockRejectedValue(new Error('Command failed'));
            await expect(pythonUtils.validatePythonPath('non_existent_program', true)).rejects.toThrow(/Python 3 not found\. Tried "non_existent_program"/);
            expect(execAsync_1.execAsync).toHaveBeenCalledWith('non_existent_program --version');
        });
        it('should throw an error when no valid Python path is found', async () => {
            jest.mocked(execAsync_1.execAsync).mockRejectedValue(new Error('Command failed'));
            await expect(pythonUtils.validatePythonPath('python', false)).rejects.toThrow(/Python 3 not found\. Tried "python" and ".+"/);
            expect(execAsync_1.execAsync).toHaveBeenCalledTimes(2);
        });
        it('should use PROMPTFOO_PYTHON environment variable when provided', async () => {
            jest.mocked(envars_1.getEnvString).mockReturnValue('/custom/python/path');
            jest.mocked(execAsync_1.execAsync).mockResolvedValue({
                stdout: 'Python 3.8.10\n',
                stderr: '',
                child: createMockChildProcess(),
            });
            const result = await pythonUtils.validatePythonPath('/custom/python/path', true);
            expect(result).toBe('/custom/python/path');
            expect(execAsync_1.execAsync).toHaveBeenCalledWith('/custom/python/path --version');
        });
    });
    describe('runPython', () => {
        beforeEach(() => {
            pythonUtils.state.cachedPythonPath = '/usr/bin/python3';
            jest.clearAllMocks();
        });
        it('should correctly run a Python script with provided arguments and read the output file', async () => {
            const mockOutput = JSON.stringify({ type: 'final_result', data: 'test result' });
            jest.mocked(fs_1.default.writeFileSync).mockImplementation();
            jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockOutput);
            jest.mocked(fs_1.default.unlinkSync).mockImplementation();
            mockPythonShellInstance.end.mockImplementation((callback) => callback());
            const result = await pythonUtils.runPython('testScript.py', 'testMethod', [
                'arg1',
                { key: 'value' },
            ]);
            expect(result).toBe('test result');
            expect(python_shell_1.PythonShell).toHaveBeenCalledWith('wrapper.py', expect.objectContaining({
                args: expect.arrayContaining([
                    expect.stringContaining('testScript.py'),
                    'testMethod',
                    expect.stringContaining('promptfoo-python-input-json'),
                    expect.stringContaining('promptfoo-python-output-json'),
                ]),
            }));
            expect(fs_1.default.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('promptfoo-python-input-json'), expect.any(String), 'utf-8');
            expect(fs_1.default.readFileSync).toHaveBeenCalledWith(expect.stringContaining('promptfoo-python-output-json'), 'utf-8');
            expect(fs_1.default.unlinkSync).toHaveBeenCalledTimes(2);
        });
        it('should log stdout and stderr', async () => {
            const mockOutput = JSON.stringify({ type: 'final_result', data: 'test result' });
            jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockOutput);
            let stdoutCallback = null;
            let stderrCallback = null;
            mockPythonShellInstance.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    stdoutCallback = callback;
                }
            });
            mockPythonShellInstance.stderr.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    stderrCallback = callback;
                }
            });
            mockPythonShellInstance.end.mockImplementation((callback) => {
                if (stdoutCallback) {
                    stdoutCallback(Buffer.from('stdout message'));
                }
                if (stderrCallback) {
                    stderrCallback(Buffer.from('stderr message'));
                }
                callback();
            });
            await pythonUtils.runPython('testScript.py', 'testMethod', ['arg1']);
            expect(logger_1.default.debug).toHaveBeenCalledWith('stdout message');
            expect(logger_1.default.error).toHaveBeenCalledWith('stderr message');
        });
        it('should throw an error if the Python script execution fails', async () => {
            const mockError = new Error('Test Error');
            mockPythonShellInstance.end.mockImplementation((callback) => callback(mockError));
            await expect(pythonUtils.runPython('testScript.py', 'testMethod', ['arg1'])).rejects.toThrow('Error running Python script: Test Error');
        });
        it('should handle Python script returning incorrect result type', async () => {
            const mockOutput = JSON.stringify({ type: 'unexpected_result', data: 'test result' });
            jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockOutput);
            mockPythonShellInstance.end.mockImplementation((callback) => callback());
            await expect(pythonUtils.runPython('testScript.py', 'testMethod', ['arg1'])).rejects.toThrow('The Python script `call_api` function must return a dict with an `output`');
        });
        it('should handle invalid JSON in the output file', async () => {
            jest.mocked(fs_1.default.readFileSync).mockReturnValue('Invalid JSON');
            mockPythonShellInstance.end.mockImplementation((callback) => callback());
            await expect(pythonUtils.runPython('testScript.py', 'testMethod', ['arg1'])).rejects.toThrow('Invalid JSON:');
        });
        it('should log and throw an error with stack trace when Python script execution fails', async () => {
            const mockError = new Error('Test Error');
            mockError.stack = '--- Python Traceback ---\nError details';
            mockPythonShellInstance.end.mockImplementation((callback) => callback(mockError));
            await expect(pythonUtils.runPython('testScript.py', 'testMethod', ['arg1'])).rejects.toThrow('Error running Python script: Test Error\nStack Trace: Python Traceback: \nError details');
            expect(logger_1.default.error).toHaveBeenCalledWith('Error running Python script: Test Error\nStack Trace: Python Traceback: \nError details');
        });
        it('should handle error without stack trace', async () => {
            const mockError = new Error('Test Error Without Stack');
            mockError.stack = undefined;
            mockPythonShellInstance.end.mockImplementation((callback) => callback(mockError));
            await expect(pythonUtils.runPython('testScript.py', 'testMethod', ['arg1'])).rejects.toThrow('Error running Python script: Test Error Without Stack\nStack Trace: No Python traceback available');
            expect(logger_1.default.error).toHaveBeenCalledWith('Error running Python script: Test Error Without Stack\nStack Trace: No Python traceback available');
        });
        it('should log an error when unable to remove temporary files', async () => {
            const mockOutput = JSON.stringify({ type: 'final_result', data: 'test result' });
            jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockOutput);
            mockPythonShellInstance.end.mockImplementation((callback) => callback());
            jest.mocked(fs_1.default.unlinkSync).mockImplementation(() => {
                throw new Error('Unable to delete file');
            });
            await pythonUtils.runPython('testScript.py', 'testMethod', ['arg1']);
            expect(logger_1.default.error).toHaveBeenCalledWith(expect.stringContaining('Error removing'));
        });
        it('should log debug messages about parsed output type and structure', async () => {
            const mockOutput = JSON.stringify({
                type: 'final_result',
                data: { key1: 'value1', key2: 'value2' },
            });
            jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockOutput);
            mockPythonShellInstance.end.mockImplementation((callback) => callback());
            await pythonUtils.runPython('testScript.py', 'testMethod', ['arg1']);
            expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining(`Python script ${path_1.default.resolve('testScript.py')} parsed output type: object`));
            expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Python script result data type: object'));
        });
        it('should handle undefined result data gracefully', async () => {
            const mockOutput = JSON.stringify({
                type: 'final_result',
                data: undefined,
            });
            jest.mocked(fs_1.default.readFileSync).mockReturnValue(mockOutput);
            mockPythonShellInstance.end.mockImplementation((callback) => callback());
            const result = await pythonUtils.runPython('testScript.py', 'testMethod', ['arg1']);
            expect(result).toBeUndefined();
            expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining(`Python script ${path_1.default.resolve('testScript.py')} parsed output type: object, structure: ["type"]`));
        });
    });
});
//# sourceMappingURL=pythonUtils.test.js.map