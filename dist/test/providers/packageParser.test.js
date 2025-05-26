"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = require("node:module");
const path_1 = __importDefault(require("path"));
const esm_1 = require("../../src/esm");
const packageParser_1 = require("../../src/providers/packageParser");
jest.mock('node:module', () => {
    return {
        createRequire: jest.fn(() => jest.fn((path) => path)),
    };
});
jest.mock('../../src/esm', () => ({
    importModule: jest.fn(async (modulePath, functionName) => {
        const mockModule = {
            default: jest.fn((data) => data.defaultField),
            parseResponse: jest.fn((data) => data.specificField),
        };
        if (functionName) {
            return mockModule[functionName];
        }
        return mockModule;
    }),
}));
describe('isPackagePath', () => {
    it('should return true for package paths', () => {
        expect((0, packageParser_1.isPackagePath)('package:packageName:exportedClassOrFunction')).toBe(true);
    });
    it('should return false for non-package paths', () => {
        expect((0, packageParser_1.isPackagePath)('notAPackagePath')).toBe(false);
    });
});
describe('loadFromPackage', () => {
    const mockBasePath = '/mock/base/path';
    const mockPackageName = 'testpackage';
    const mockFunctionName = 'getVariable';
    const mockProviderPath = `package:${mockPackageName}:${mockFunctionName}`;
    const mockRequire = {
        resolve: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should successfully parse a valid package', async () => {
        const mockFunction = jest.fn();
        const mockPackagePath = path_1.default.join(mockBasePath, 'node_modules', mockPackageName, 'index.js');
        jest.mocked(mockRequire.resolve).mockReturnValue(mockPackagePath);
        jest.mocked(node_module_1.createRequire).mockReturnValue(mockRequire);
        jest.mocked(esm_1.importModule).mockResolvedValue({ getVariable: mockFunction });
        const result = await (0, packageParser_1.loadFromPackage)(mockProviderPath, mockBasePath);
        expect(result).toBe(mockFunction);
        result('test');
        expect(mockFunction).toHaveBeenCalledWith('test');
        expect(esm_1.importModule).toHaveBeenCalledWith(mockPackagePath);
    });
    it('should throw an error for invalid provider format', async () => {
        await expect((0, packageParser_1.loadFromPackage)('invalid:format', mockBasePath)).rejects.toThrow('Invalid package format: invalid:format. Expected format: package:packageName:exportedClassOrFunction');
    });
    it('should throw an error if package is not found', async () => {
        jest.mocked(mockRequire.resolve).mockImplementationOnce(() => {
            throw new Error('Cannot find module');
        });
        jest.mocked(node_module_1.createRequire).mockReturnValue(mockRequire);
        await expect((0, packageParser_1.loadFromPackage)(mockProviderPath, mockBasePath)).rejects.toThrow(`Package not found: ${mockPackageName}. Make sure it's installed in ${mockBasePath}`);
    });
    it('should handle nested provider names', async () => {
        const mockModule = {
            nested: {
                getVariable: jest.fn(),
            },
        };
        const mockPackagePath = path_1.default.join(mockBasePath, 'node_modules', mockPackageName, 'index.js');
        jest.mocked(mockRequire.resolve).mockReturnValue(mockPackagePath);
        jest.mocked(node_module_1.createRequire).mockReturnValue(mockRequire);
        jest.mocked(esm_1.importModule).mockResolvedValue(mockModule);
        const result = await (0, packageParser_1.loadFromPackage)(`package:${mockPackageName}:nested.getVariable`, mockBasePath);
        expect(result).toBe(mockModule.nested.getVariable);
        result('test input');
        expect(mockModule.nested.getVariable).toHaveBeenCalledWith('test input');
    });
});
describe('parsePackageProvider', () => {
    const mockBasePath = '/mock/base/path';
    const mockPackageName = 'testpackage';
    const mockProviderName = 'Provider';
    const mockProviderPath = `package:${mockPackageName}:${mockProviderName}`;
    const mockOptions = { config: {} };
    const mockRequire = {
        resolve: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should successfully parse a valid package provider', async () => {
        const mockProvider = class {
            constructor(options) {
                this.options = options;
            }
        };
        const mockPackagePath = path_1.default.join(mockBasePath, 'node_modules', mockPackageName, 'index.js');
        jest.mocked(mockRequire.resolve).mockReturnValue(mockPackagePath);
        jest.mocked(node_module_1.createRequire).mockReturnValue(mockRequire);
        jest.mocked(esm_1.importModule).mockResolvedValue({ Provider: mockProvider });
        const result = await (0, packageParser_1.parsePackageProvider)(mockProviderPath, mockBasePath, mockOptions);
        expect(result).toBeInstanceOf(mockProvider);
        expect(esm_1.importModule).toHaveBeenCalledWith(mockPackagePath);
    });
    it('should throw an error for invalid provider format', async () => {
        await expect((0, packageParser_1.parsePackageProvider)('invalid:format', mockBasePath, mockOptions)).rejects.toThrow('Invalid package format: invalid:format. Expected format: package:packageName:exportedClassOrFunction');
    });
    it('should throw an error if package is not found', async () => {
        jest.mocked(mockRequire.resolve).mockImplementationOnce(() => {
            throw new Error('Cannot find module');
        });
        jest.mocked(node_module_1.createRequire).mockReturnValue(mockRequire);
        await expect((0, packageParser_1.parsePackageProvider)(mockProviderPath, mockBasePath, mockOptions)).rejects.toThrow(`Package not found: ${mockPackageName}. Make sure it's installed in ${mockBasePath}`);
    });
    it('should handle nested provider names', async () => {
        const mockModule = {
            nested: {
                Provider: class {
                    constructor(options) {
                        this.options = options;
                    }
                },
            },
        };
        const mockPackagePath = path_1.default.join(mockBasePath, 'node_modules', mockPackageName, 'index.js');
        jest.mocked(mockRequire.resolve).mockReturnValue(mockPackagePath);
        jest.mocked(node_module_1.createRequire).mockReturnValue(mockRequire);
        jest.mocked(esm_1.importModule).mockResolvedValue(mockModule);
        const result = await (0, packageParser_1.parsePackageProvider)(`package:${mockPackageName}:nested.Provider`, mockBasePath, mockOptions);
        expect(result).toBeInstanceOf(mockModule.nested.Provider);
    });
    it('should pass options to the provider constructor', async () => {
        const MockProvider = jest.fn();
        const mockPackagePath = path_1.default.join(mockBasePath, 'node_modules', mockPackageName, 'index.js');
        jest.mocked(mockRequire.resolve).mockReturnValue(mockPackagePath);
        jest.mocked(node_module_1.createRequire).mockReturnValue(mockRequire);
        jest.mocked(esm_1.importModule).mockResolvedValue({ Provider: MockProvider });
        await (0, packageParser_1.parsePackageProvider)(mockProviderPath, mockBasePath, mockOptions);
        expect(MockProvider).toHaveBeenCalledWith(mockOptions);
    });
});
//# sourceMappingURL=packageParser.test.js.map