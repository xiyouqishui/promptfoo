"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const goat_1 = __importDefault(require("../../../src/redteam/providers/goat"));
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
(0, globals_1.describe)('RedteamGoatProvider', () => {
    let mockFetch;
    (0, globals_1.beforeEach)(() => {
        mockFetch = globals_1.jest.fn().mockImplementation(async () => ({
            json: async () => ({
                message: { role: 'assistant', content: 'test response' },
            }),
            ok: true,
        }));
        global.fetch = mockFetch;
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should initialize with required config', () => {
        const provider = new goat_1.default({
            injectVar: 'goal',
            maxTurns: 3,
        });
        (0, globals_1.expect)(provider.id()).toBe('promptfoo:redteam:goat');
    });
    (0, globals_1.it)('should throw error if injectVar is missing', () => {
        (0, globals_1.expect)(() => {
            new goat_1.default({});
        }).toThrow('Expected injectVar to be set');
    });
    (0, globals_1.it)('should make correct API calls with message history', async () => {
        const provider = new goat_1.default({
            injectVar: 'goal',
            maxTurns: 2,
        });
        const targetProvider = {
            id: () => 'test-provider',
            callApi: async () => Promise.resolve({
                output: 'target response',
                tokenUsage: {},
            }),
        };
        const prompt = {
            raw: 'test prompt',
            label: 'test',
        };
        const context = {
            originalProvider: targetProvider,
            vars: { goal: 'test goal' },
            prompt,
        };
        const result = await provider.callApi('test prompt', context);
        (0, globals_1.expect)(result.metadata?.stopReason).toBe('Max turns reached');
        (0, globals_1.expect)(mockFetch).toHaveBeenCalledWith((0, remoteGeneration_1.getRemoteGenerationUrl)(), globals_1.expect.objectContaining({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: globals_1.expect.any(String),
        }));
    });
    (0, globals_1.it)('should handle grader integration and stop early on failure', async () => {
        const provider = new goat_1.default({
            injectVar: 'goal',
            maxTurns: 3,
        });
        const targetProvider = {
            id: () => 'test-provider',
            callApi: async () => Promise.resolve({
                output: 'target response',
                tokenUsage: { total: 10, prompt: 5, completion: 5 },
            }),
        };
        const context = {
            originalProvider: targetProvider,
            vars: { goal: 'test goal' },
            prompt: { raw: 'test prompt', label: 'test' },
            test: {
                vars: {},
                assert: [
                    {
                        type: 'contains',
                        value: 'expected content',
                    },
                ],
            },
        };
        globals_1.jest.mock('../../../src/redteam/graders', () => ({
            getGraderById: () => ({
                getResult: async () => ({
                    grade: {
                        pass: false,
                        tokensUsed: { total: 5, prompt: 2, completion: 3 },
                    },
                }),
            }),
        }));
        const result = await provider.callApi('test prompt', context);
        (0, globals_1.expect)(result.metadata?.stopReason).toBe('Grader failed');
        (0, globals_1.expect)(result.tokenUsage?.total).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should stringify non-string target provider responses', async () => {
        const provider = new goat_1.default({
            injectVar: 'goal',
            maxTurns: 1,
        });
        const objectResponse = { foo: 'bar', baz: 123 };
        const targetProvider = {
            id: () => 'test-provider',
            callApi: async () => Promise.resolve({
                output: objectResponse,
                tokenUsage: {},
            }),
        };
        const prompt = {
            raw: 'test prompt',
            label: 'test',
        };
        const context = {
            originalProvider: targetProvider,
            vars: { goal: 'test goal' },
            prompt,
        };
        const result = await provider.callApi('test prompt', context);
        const messages = result.metadata?.messages;
        (0, globals_1.expect)(messages[messages.length - 1].content).toBe(JSON.stringify(objectResponse));
    });
});
//# sourceMappingURL=goat.test.js.map