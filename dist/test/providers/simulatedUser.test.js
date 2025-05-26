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
const simulatedUser_1 = require("../../src/providers/simulatedUser");
const timeUtils = __importStar(require("../../src/util/time"));
jest.mock('../../src/util/time', () => ({
    sleep: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/fetch');
// Mock PromptfooSimulatedUserProvider
const mockUserProviderCallApi = jest.fn().mockResolvedValue({ output: 'user response' });
jest.mock('../../src/providers/promptfoo', () => {
    return {
        PromptfooSimulatedUserProvider: jest.fn().mockImplementation(() => ({
            callApi: mockUserProviderCallApi,
            id: jest.fn().mockReturnValue('mock-user-provider'),
            options: {},
        })),
    };
});
describe('SimulatedUser', () => {
    let simulatedUser;
    let originalProvider;
    beforeEach(() => {
        mockUserProviderCallApi.mockClear();
        mockUserProviderCallApi.mockResolvedValue({ output: 'user response' });
        originalProvider = {
            id: () => 'test-agent',
            callApi: jest.fn().mockImplementation(async () => ({
                output: 'agent response',
                tokenUsage: { numRequests: 1 },
            })),
        };
        simulatedUser = new simulatedUser_1.SimulatedUser({
            id: 'test-agent',
            config: {
                instructions: 'test instructions',
                maxTurns: 2,
            },
        });
        jest.clearAllMocks();
    });
    describe('id()', () => {
        it('should return the identifier', () => {
            expect(simulatedUser.id()).toBe('test-agent');
        });
        it('should use label as fallback identifier', () => {
            const userWithLabel = new simulatedUser_1.SimulatedUser({
                label: 'label-agent',
                config: {},
            });
            expect(userWithLabel.id()).toBe('label-agent');
        });
        it('should use default identifier if no id or label provided', () => {
            const userWithoutId = new simulatedUser_1.SimulatedUser({ config: {} });
            expect(userWithoutId.id()).toBe('agent-provider');
        });
    });
    describe('callApi()', () => {
        it('should simulate conversation between user and agent', async () => {
            const result = await simulatedUser.callApi('test prompt', {
                originalProvider,
                vars: { instructions: 'test instructions' },
                prompt: { raw: 'test', display: 'test', label: 'test' },
            });
            expect(result.output).toBeDefined();
            expect(result.output).toContain('User:');
            expect(result.output).toContain('Assistant:');
            expect(result.tokenUsage?.numRequests).toBe(2);
            expect(originalProvider.callApi).toHaveBeenCalledWith(expect.stringContaining('[{"role":"system","content":"test prompt"}'));
            expect(timeUtils.sleep).not.toHaveBeenCalled();
        });
        it('should respect maxTurns configuration', async () => {
            const userWithMaxTurns = new simulatedUser_1.SimulatedUser({
                config: {
                    instructions: 'test instructions',
                    maxTurns: 1,
                },
            });
            const result = await userWithMaxTurns.callApi('test prompt', {
                originalProvider,
                vars: { instructions: 'test instructions' },
                prompt: { raw: 'test', display: 'test', label: 'test' },
            });
            const messageCount = result.output?.split('---').length;
            expect(messageCount).toBe(2);
            expect(originalProvider.callApi).toHaveBeenCalledWith(expect.stringContaining('[{"role":"system","content":"test prompt"}'));
            expect(timeUtils.sleep).not.toHaveBeenCalled();
        });
        it('should stop conversation when ###STOP### is received', async () => {
            // Set up an initial message exchange to have some conversation history
            // First call is regular exchange
            const mockedCallApi = jest.mocked(originalProvider.callApi);
            mockedCallApi.mockImplementationOnce(async () => ({
                output: 'initial agent response',
                tokenUsage: { numRequests: 1 },
            }));
            // Second call returns stop command
            mockUserProviderCallApi
                .mockResolvedValueOnce({ output: 'initial user response' }) // First user response
                .mockResolvedValueOnce({ output: 'stopping now ###STOP###' }); // Second user response with STOP
            const result = await simulatedUser.callApi('test prompt', {
                originalProvider,
                vars: { instructions: 'test instructions' },
                prompt: { raw: 'test', display: 'test', label: 'test' },
            });
            expect(result.output).not.toContain('stopping now ###STOP###');
            // The original provider should be called once for the first exchange
            expect(originalProvider.callApi).toHaveBeenCalledTimes(1);
            expect(timeUtils.sleep).not.toHaveBeenCalled();
        });
        it('should throw error if originalProvider is not provided', async () => {
            await expect(simulatedUser.callApi('test', {
                vars: {},
                prompt: { raw: 'test', display: 'test', label: 'test' },
            })).rejects.toThrow('Expected originalProvider to be set');
        });
        it('should handle provider delay', async () => {
            const providerWithDelay = {
                ...originalProvider,
                delay: 100,
            };
            const result = await simulatedUser.callApi('test prompt', {
                originalProvider: providerWithDelay,
                vars: { instructions: 'test instructions' },
                prompt: { raw: 'test', display: 'test', label: 'test' },
            }, { includeLogProbs: false });
            expect(result.output).toBeDefined();
            expect(providerWithDelay.callApi).toHaveBeenCalledWith(expect.stringContaining('[{"role":"system","content":"test prompt"}'));
            expect(timeUtils.sleep).toHaveBeenCalledWith(100);
        });
    });
    describe('toString()', () => {
        it('should return correct string representation', () => {
            expect(simulatedUser.toString()).toBe('AgentProvider');
        });
    });
});
//# sourceMappingURL=simulatedUser.test.js.map