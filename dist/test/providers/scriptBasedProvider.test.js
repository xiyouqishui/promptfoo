"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scriptBasedProvider_1 = require("../../src/providers/scriptBasedProvider");
const file_1 = require("../../src/util/file");
// Mock the getResolvedRelativePath function
jest.mock('../../src/util/file', () => ({
    getResolvedRelativePath: jest.fn((scriptPath, basePath, isCloudConfig) => {
        // For testing, just append '/resolved' to the path
        return `${scriptPath}/resolved`;
    }),
}));
// Create a mock provider constructor
class MockProvider {
    constructor(scriptPath, options) {
        this.scriptPath = scriptPath;
        this.options = options;
    }
    id() {
        return 'mock-provider';
    }
}
describe('scriptBasedProvider', () => {
    describe('createScriptBasedProviderFactory', () => {
        const mockProviderOptions = {
            id: 'mock',
            config: {},
        };
        const mockContext = {
            basePath: '/base/path',
        };
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it('should create a factory that tests for prefix pattern', () => {
            const factory = (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('test', null, MockProvider);
            expect(factory.test('test:script.js')).toBe(true);
            expect(factory.test('other:script.js')).toBe(false);
        });
        it('should create a factory that tests for file extension pattern', () => {
            const factory = (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('test', 'js', MockProvider);
            expect(factory.test('test:script.js')).toBe(true);
            expect(factory.test('file://path/script.js')).toBe(true);
            expect(factory.test('file://path/script.js:function')).toBe(true);
            expect(factory.test('file://path/script.py')).toBe(false);
        });
        it('should extract script path correctly when using prefix pattern', async () => {
            const factory = (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('test', null, MockProvider);
            const provider = await factory.create('test:script.js', mockProviderOptions, mockContext);
            expect(file_1.getResolvedRelativePath).toHaveBeenCalledWith('script.js', false);
            expect(provider.scriptPath).toBe('script.js/resolved');
        });
        it('should extract script path correctly when using file:// pattern', async () => {
            const factory = (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('test', 'js', MockProvider);
            const provider = await factory.create('file://path/script.js', mockProviderOptions, mockContext);
            expect(file_1.getResolvedRelativePath).toHaveBeenCalledWith('path/script.js', false);
            expect(provider.scriptPath).toBe('path/script.js/resolved');
        });
        it('should handle cloud config correctly', async () => {
            const cloudOptions = {
                id: 'mock',
                config: { isCloudConfig: true },
            };
            const factory = (0, scriptBasedProvider_1.createScriptBasedProviderFactory)('test', null, MockProvider);
            await factory.create('test:script.js', cloudOptions, mockContext);
            expect(file_1.getResolvedRelativePath).toHaveBeenCalledWith('script.js', true);
        });
    });
});
//# sourceMappingURL=scriptBasedProvider.test.js.map