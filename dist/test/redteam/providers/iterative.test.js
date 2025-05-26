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
const globals_1 = require("@jest/globals");
const iterative_1 = __importStar(require("../../../src/redteam/providers/iterative"));
const mockGetProvider = globals_1.jest.fn();
const mockGetTargetResponse = globals_1.jest.fn();
const mockCheckPenalizedPhrases = globals_1.jest.fn();
globals_1.jest.mock('../../../src/redteam/providers/shared', () => ({
    redteamProviderManager: {
        getProvider: mockGetProvider,
    },
    getTargetResponse: mockGetTargetResponse,
    checkPenalizedPhrases: mockCheckPenalizedPhrases,
}));
describe('RedteamIterativeProvider', () => {
    let mockRedteamProvider;
    let mockTargetProvider;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        mockRedteamProvider = {
            id: globals_1.jest.fn().mockReturnValue('mock-redteam'),
            callApi: globals_1.jest
                .fn()
                .mockImplementation(async (prompt) => {
                const input = JSON.parse(prompt);
                if (Array.isArray(input) && input[0]?.role === 'system') {
                    return {
                        output: JSON.stringify({
                            improvement: 'test improvement',
                            prompt: 'test prompt',
                        }),
                    };
                }
                else if (Array.isArray(input) && input[0]?.content?.includes('on-topic')) {
                    return {
                        output: JSON.stringify({ onTopic: true }),
                    };
                }
                else {
                    return {
                        output: JSON.stringify({
                            currentResponse: { rating: 5, explanation: 'test' },
                            previousBestResponse: { rating: 0, explanation: 'none' },
                        }),
                    };
                }
            }),
        };
        mockTargetProvider = {
            id: globals_1.jest.fn().mockReturnValue('mock-target'),
            callApi: globals_1.jest.fn().mockResolvedValue({
                output: 'mock target response',
            }),
        };
        mockGetProvider.mockImplementation(() => Promise.resolve(mockRedteamProvider));
        mockGetTargetResponse.mockImplementation(() => Promise.resolve({
            output: 'mock target response',
        }));
        mockCheckPenalizedPhrases.mockImplementation(() => false);
    });
    describe('constructor', () => {
        it('should throw if injectVar is not provided', () => {
            expect(() => new iterative_1.default({})).toThrow('Expected injectVar to be set');
        });
        it('should create instance with valid config', () => {
            const provider = new iterative_1.default({ injectVar: 'test' });
            expect(provider).toBeInstanceOf(iterative_1.default);
            expect(provider.id()).toBe('promptfoo:redteam:iterative');
        });
        it('should use default numIterations if not provided', () => {
            const provider = new iterative_1.default({ injectVar: 'test' });
            expect(provider['numIterations']).toBe(4);
        });
        it('should use configured numIterations when provided', () => {
            const provider = new iterative_1.default({
                injectVar: 'test',
                numIterations: '5',
            });
            // The environment variable takes precedence
            expect(provider['numIterations']).toBe(4);
        });
        it('should use environment variable for numIterations if set', () => {
            process.env.PROMPTFOO_NUM_JAILBREAK_ITERATIONS = '15';
            const provider = new iterative_1.default({ injectVar: 'test' });
            expect(provider['numIterations']).toBe(15);
            delete process.env.PROMPTFOO_NUM_JAILBREAK_ITERATIONS;
        });
    });
    describe('runRedteamConversation', () => {
        it('should stop iteration when score reaches 10', async () => {
            mockRedteamProvider.callApi
                .mockImplementationOnce(async () => ({
                output: JSON.stringify({
                    improvement: 'test',
                    prompt: 'test',
                }),
            }))
                .mockImplementationOnce(async () => ({
                output: JSON.stringify({ onTopic: true }),
            }))
                .mockImplementationOnce(async () => ({
                output: JSON.stringify({
                    currentResponse: { rating: 10, explanation: 'perfect' },
                    previousBestResponse: { rating: 5, explanation: 'good' },
                }),
            }));
            const result = await (0, iterative_1.runRedteamConversation)({
                context: { prompt: { raw: '', label: '' }, vars: {} },
                filters: undefined,
                injectVar: 'test',
                numIterations: 5,
                options: {},
                prompt: { raw: 'test', label: 'test' },
                redteamProvider: mockRedteamProvider,
                gradingProvider: mockRedteamProvider,
                targetProvider: mockTargetProvider,
                vars: { test: 'goal' },
                excludeTargetOutputFromAgenticAttackGeneration: false,
            });
            expect(result.metadata.finalIteration).toBe(1);
            expect(result.metadata.highestScore).toBe(10);
        });
    });
});
//# sourceMappingURL=iterative.test.js.map