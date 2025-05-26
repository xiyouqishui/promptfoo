"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const dedent_1 = __importDefault(require("dedent"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const logger_1 = __importDefault(require("../../src/logger"));
const pythonUtils_1 = require("../../src/python/pythonUtils");
const execPromise = util_1.default.promisify(child_process_1.exec);
describe('pythonUtils Integration Tests', () => {
    const scriptsDir = path_1.default.join(__dirname, 'scripts');
    beforeAll(() => {
        if (!fs_1.default.existsSync(scriptsDir)) {
            fs_1.default.mkdirSync(scriptsDir);
        }
        fs_1.default.writeFileSync(path_1.default.join(scriptsDir, 'simple.py'), (0, dedent_1.default) `
        import json
        import sys

        def main(*args):
            message = ' '.join(str(arg) for arg in args)
            return {
                'message': message,
                'success': True
            }

        def print_to_stdout(*args):
            message = ' '.join(str(arg) for arg in args)
            print(message)
            return main(*args)

        class TestClass:
            @classmethod
            def class_method(cls, *args):
                return main(*args)

        async def async_function(*args):
            return main(*args)
        `);
        fs_1.default.writeFileSync(path_1.default.join(scriptsDir, 'with_imports.py'), (0, dedent_1.default) `
        import os
        import datetime

        def get_env_and_date():
            return {
                'env': os.environ.get('TEST_ENV', 'not set'),
                'date': str(datetime.datetime.now().date())
            }
        `);
    });
    afterAll(() => {
        fs_1.default.rmSync(path_1.default.join(scriptsDir), { recursive: true, force: true });
    });
    it('should be able to call Python directly', async () => {
        const { stdout } = await execPromise('python --version');
        expect(stdout).toContain('Python');
    });
    it('should successfully run a simple Python script', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'main', ['Hello, World!']);
        expect(result).toEqual({
            message: 'Hello, World!',
            success: true,
        });
    }, 10000);
    it('should handle multiple arguments', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'main', [
            'Multiple',
            'Arguments',
        ]);
        expect(result).toEqual({
            message: 'Multiple Arguments',
            success: true,
        });
    });
    it('should handle empty string argument', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'main', ['']);
        expect(result).toEqual({
            message: '',
            success: true,
        });
    });
    it('should handle non-string argument', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'main', [123]);
        expect(result).toEqual({
            message: '123',
            success: true,
        });
    });
    it('should throw an error for non-existent script', async () => {
        const nonExistentPath = path_1.default.join(scriptsDir, 'non_existent.py');
        await expect((0, pythonUtils_1.runPython)(nonExistentPath, 'main', ['test'])).rejects.toThrow(expect.any(Error));
    });
    it('should handle Python script that prints to stdout', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'print_to_stdout', [
            'Print to stdout',
        ]);
        expect(result).toEqual({
            message: 'Print to stdout',
            success: true,
        });
    });
    it('should handle class methods', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'TestClass.class_method', [
            'Class method',
        ]);
        expect(result).toEqual({
            message: 'Class method',
            success: true,
        });
    });
    it('should handle async functions', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'async_function', [
            'Async function',
        ]);
        expect(result).toEqual({
            message: 'Async function',
            success: true,
        });
    });
    it('should handle scripts with imports', async () => {
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'with_imports.py'), 'get_env_and_date', []);
        expect(result).toHaveProperty('env');
        expect(result).toHaveProperty('date');
        expect(result.env).toBe('not set');
        expect(new Date(result.date)).toBeInstanceOf(Date);
    });
    it('should handle scripts with environment variables', async () => {
        process.env.TEST_ENV = 'test_value';
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'with_imports.py'), 'get_env_and_date', []);
        expect(result.env).toBe('test_value');
        delete process.env.TEST_ENV;
    });
    it('should log debug messages', async () => {
        jest.clearAllMocks();
        const result = await (0, pythonUtils_1.runPython)(path_1.default.join(scriptsDir, 'simple.py'), 'main', ['Debug Test']);
        expect(result).toEqual({
            message: 'Debug Test',
            success: true,
        });
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Running Python wrapper with args'));
        expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Python script'));
    });
});
//# sourceMappingURL=python.integration.test.js.map