"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const esm_1 = require("../src/esm");
const logger_1 = __importDefault(require("../src/logger"));
jest.mock('../src/logger', () => ({
    __esModule: true,
    default: {
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));
describe('ESM utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('importModule', () => {
        it('imports JavaScript modules', async () => {
            const modulePath = path_1.default.resolve(__dirname, 'fixtures/testModule.js');
            // Mock the file system module
            jest.mock('fs', () => ({
                existsSync: jest.fn().mockReturnValue(true),
                readFileSync: jest
                    .fn()
                    .mockReturnValue('module.exports = { testFunction: () => "test result" }'),
            }));
            // Mock the module
            jest.doMock(modulePath, () => ({
                default: { testFunction: () => 'test result' },
            }), { virtual: true });
            const result = await (0, esm_1.importModule)(modulePath);
            expect(result).toEqual({ testFunction: expect.any(Function) });
            expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('Successfully required module'));
        });
        it('imports TypeScript modules', async () => {
            const modulePath = path_1.default.resolve(__dirname, 'fixtures/testModule.ts');
            jest.doMock(modulePath, () => ({
                default: { testFunction: () => 'test result' },
            }), { virtual: true });
            const result = await (0, esm_1.importModule)(modulePath);
            expect(result).toEqual({ testFunction: expect.any(Function) });
            expect(logger_1.default.debug).toHaveBeenCalledWith(expect.stringContaining('TypeScript/ESM module detected'));
        });
        it('handles absolute paths', async () => {
            const absolutePath = path_1.default.resolve('/absolute/path/module.js');
            jest.doMock(absolutePath, () => ({
                default: { testFunction: () => 'absolute path result' },
            }), { virtual: true });
            const result = await (0, esm_1.importModule)(absolutePath);
            expect(result).toEqual({ testFunction: expect.any(Function) });
        });
    });
});
//# sourceMappingURL=esm.test.js.map