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
const contextFaithfulness_1 = require("../../src/assertions/contextFaithfulness");
const matchers = __importStar(require("../../src/matchers"));
jest.mock('../../src/matchers');
describe('handleContextFaithfulness', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should throw error if vars is missing', async () => {
        const params = {
            assertion: { type: 'context-faithfulness' },
            test: {},
            output: 'test output',
            baseType: 'context-faithfulness',
            context: {
                prompt: 'test prompt',
                vars: {},
                test: {},
                logProbs: null,
                tokenUsage: null,
                cached: false,
                provider: null,
                providerResponse: null,
            },
            inverse: false,
            outputString: 'test output',
            providerResponse: null,
        };
        await expect((0, contextFaithfulness_1.handleContextFaithfulness)(params)).rejects.toThrow('context-faithfulness assertion type must have a vars object');
    });
    it('should throw error if query is missing', async () => {
        const params = {
            assertion: { type: 'context-faithfulness' },
            test: {
                vars: {
                    context: 'test context',
                },
            },
            output: 'test output',
            baseType: 'context-faithfulness',
            context: {
                prompt: 'test prompt',
                vars: {},
                test: {},
                logProbs: null,
                tokenUsage: null,
                cached: false,
                provider: null,
                providerResponse: null,
            },
            inverse: false,
            outputString: 'test output',
            providerResponse: null,
        };
        await expect((0, contextFaithfulness_1.handleContextFaithfulness)(params)).rejects.toThrow('context-faithfulness assertion type must have a query var');
    });
    it('should throw error if context is missing', async () => {
        const params = {
            assertion: { type: 'context-faithfulness' },
            test: {
                vars: {
                    query: 'test query',
                },
            },
            output: 'test output',
            baseType: 'context-faithfulness',
            context: {
                prompt: 'test prompt',
                vars: {},
                test: {},
                logProbs: null,
                tokenUsage: null,
                cached: false,
                provider: null,
                providerResponse: null,
            },
            inverse: false,
            outputString: 'test output',
            providerResponse: null,
        };
        await expect((0, contextFaithfulness_1.handleContextFaithfulness)(params)).rejects.toThrow('context-faithfulness assertion type must have a context var');
    });
    it('should throw error if output is not a string', async () => {
        const params = {
            assertion: { type: 'context-faithfulness' },
            test: {
                vars: {
                    query: 'test query',
                    context: 'test context',
                },
            },
            output: 123,
            baseType: 'context-faithfulness',
            context: {
                prompt: 'test prompt',
                vars: {},
                test: {},
                logProbs: null,
                tokenUsage: null,
                cached: false,
                provider: null,
                providerResponse: null,
            },
            inverse: false,
            outputString: 'test output',
            providerResponse: null,
        };
        await expect((0, contextFaithfulness_1.handleContextFaithfulness)(params)).rejects.toThrow('context-faithfulness assertion type must have a string output');
    });
    it('should call matchesContextFaithfulness with correct params', async () => {
        const mockResult = {
            pass: true,
            score: 0.9,
            reason: 'test reason',
        };
        jest.mocked(matchers.matchesContextFaithfulness).mockResolvedValue(mockResult);
        const params = {
            assertion: {
                type: 'context-faithfulness',
                threshold: 0.8,
            },
            test: {
                vars: {
                    query: 'test query',
                    context: 'test context',
                },
                options: {
                    provider: 'test-provider',
                },
            },
            output: 'test output',
            baseType: 'context-faithfulness',
            context: {
                prompt: 'test prompt',
                vars: {},
                test: {},
                logProbs: null,
                tokenUsage: null,
                cached: false,
                provider: null,
                providerResponse: null,
            },
            inverse: false,
            outputString: 'test output',
            providerResponse: null,
        };
        const result = await (0, contextFaithfulness_1.handleContextFaithfulness)(params);
        expect(matchers.matchesContextFaithfulness).toHaveBeenCalledWith('test query', 'test output', 'test context', 0.8, { provider: 'test-provider' });
        expect(result).toEqual({
            assertion: params.assertion,
            ...mockResult,
        });
    });
    it('should use default threshold of 0 if not provided', async () => {
        const mockResult = {
            pass: true,
            score: 0.9,
            reason: 'test reason',
        };
        jest.mocked(matchers.matchesContextFaithfulness).mockResolvedValue(mockResult);
        const params = {
            assertion: {
                type: 'context-faithfulness',
            },
            test: {
                vars: {
                    query: 'test query',
                    context: 'test context',
                },
                options: {},
            },
            output: 'test output',
            baseType: 'context-faithfulness',
            context: {
                prompt: 'test prompt',
                vars: {},
                test: {},
                logProbs: null,
                tokenUsage: null,
                cached: false,
                provider: null,
                providerResponse: null,
            },
            inverse: false,
            outputString: 'test output',
            providerResponse: null,
        };
        await (0, contextFaithfulness_1.handleContextFaithfulness)(params);
        expect(matchers.matchesContextFaithfulness).toHaveBeenCalledWith('test query', 'test output', 'test context', 0, {});
    });
});
//# sourceMappingURL=contextFaithfulness.test.js.map