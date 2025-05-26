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
const contextRecall_1 = require("../../src/assertions/contextRecall");
const matchers = __importStar(require("../../src/matchers"));
jest.mock('../../src/matchers');
describe('handleContextRecall', () => {
    const mockMatchesContextRecall = jest.spyOn(matchers, 'matchesContextRecall');
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should handle context recall with prompt context', async () => {
        const mockResult = {
            pass: true,
            score: 0.9,
            reason: 'Good recall',
        };
        mockMatchesContextRecall.mockResolvedValue(mockResult);
        const mockProvider = {
            id: () => 'test-provider',
            callApi: jest.fn(),
        };
        const params = {
            assertion: { type: 'context-recall', threshold: 0.8 },
            renderedValue: 'test output',
            prompt: 'test context',
            test: {
                vars: {},
                options: {},
            },
            baseType: 'context-recall',
            context: {
                prompt: 'test context',
                vars: {},
                test: {
                    vars: {},
                    options: {},
                },
                logProbs: undefined,
                provider: mockProvider,
                providerResponse: undefined,
            },
            inverse: false,
            output: 'test output',
            outputString: 'test output',
            provider: mockProvider,
            providerResponse: {},
        };
        const result = await (0, contextRecall_1.handleContextRecall)(params);
        expect(result).toEqual({
            assertion: { type: 'context-recall', threshold: 0.8 },
            ...mockResult,
        });
        expect(mockMatchesContextRecall).toHaveBeenCalledWith('test context', 'test output', 0.8, {}, {});
    });
    it('should handle context recall with vars context', async () => {
        const mockResult = {
            pass: true,
            score: 0.85,
            reason: 'Good recall from vars',
        };
        mockMatchesContextRecall.mockResolvedValue(mockResult);
        const mockProvider = {
            id: () => 'test-provider',
            callApi: jest.fn(),
        };
        const params = {
            assertion: { type: 'context-recall', threshold: 0.7 },
            renderedValue: 'test output',
            prompt: 'original context',
            test: {
                vars: { context: 'context from vars' },
                options: {},
            },
            baseType: 'context-recall',
            context: {
                prompt: 'original context',
                vars: { context: 'context from vars' },
                test: {
                    vars: { context: 'context from vars' },
                    options: {},
                },
                logProbs: undefined,
                provider: mockProvider,
                providerResponse: undefined,
            },
            inverse: false,
            output: 'test output',
            outputString: 'test output',
            provider: mockProvider,
            providerResponse: {},
        };
        const result = await (0, contextRecall_1.handleContextRecall)(params);
        expect(result).toEqual({
            assertion: { type: 'context-recall', threshold: 0.7 },
            ...mockResult,
        });
        expect(mockMatchesContextRecall).toHaveBeenCalledWith('context from vars', 'test output', 0.7, {}, { context: 'context from vars' });
    });
    it('should use default threshold of 0 when not provided', async () => {
        const mockResult = {
            pass: true,
            score: 0.5,
            reason: 'Default threshold test',
        };
        mockMatchesContextRecall.mockResolvedValue(mockResult);
        const mockProvider = {
            id: () => 'test-provider',
            callApi: jest.fn(),
        };
        const params = {
            assertion: { type: 'context-recall' },
            renderedValue: 'test output',
            prompt: 'test context',
            test: {
                vars: {},
                options: {},
            },
            baseType: 'context-recall',
            context: {
                prompt: 'test context',
                vars: {},
                test: {
                    vars: {},
                    options: {},
                },
                logProbs: undefined,
                provider: mockProvider,
                providerResponse: undefined,
            },
            inverse: false,
            output: 'test output',
            outputString: 'test output',
            provider: mockProvider,
            providerResponse: {},
        };
        const result = await (0, contextRecall_1.handleContextRecall)(params);
        expect(result).toEqual({
            assertion: { type: 'context-recall' },
            ...mockResult,
        });
        expect(mockMatchesContextRecall).toHaveBeenCalledWith('test context', 'test output', 0, {}, {});
    });
    it('should throw error when renderedValue is not a string', async () => {
        const mockProvider = {
            id: () => 'test-provider',
            callApi: jest.fn(),
        };
        const params = {
            assertion: { type: 'context-recall' },
            renderedValue: { value: 123 }, // Changed to object to match AssertionValue type
            prompt: 'test context',
            test: {
                vars: {},
                options: {},
            },
            baseType: 'context-recall',
            context: {
                prompt: 'test context',
                vars: {},
                test: {
                    vars: {},
                    options: {},
                },
                logProbs: undefined,
                provider: mockProvider,
                providerResponse: undefined,
            },
            inverse: false,
            output: '123',
            outputString: '123',
            provider: mockProvider,
            providerResponse: {},
        };
        await expect((0, contextRecall_1.handleContextRecall)(params)).rejects.toThrow('context-recall assertion type must have a string value');
    });
    it('should throw error when prompt is missing', async () => {
        const mockProvider = {
            id: () => 'test-provider',
            callApi: jest.fn(),
        };
        const params = {
            assertion: { type: 'context-recall' },
            renderedValue: 'test output',
            prompt: undefined,
            test: {
                vars: {},
                options: {},
            },
            baseType: 'context-recall',
            context: {
                prompt: undefined,
                vars: {},
                test: {
                    vars: {},
                    options: {},
                },
                logProbs: undefined,
                provider: mockProvider,
                providerResponse: undefined,
            },
            inverse: false,
            output: 'test output',
            outputString: 'test output',
            provider: mockProvider,
            providerResponse: {},
        };
        await expect((0, contextRecall_1.handleContextRecall)(params)).rejects.toThrow('context-recall assertion type must have a prompt');
    });
});
//# sourceMappingURL=contextRecall.test.js.map