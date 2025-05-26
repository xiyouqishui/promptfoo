"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const guardrails_1 = require("../../src/assertions/guardrails");
describe('handleGuardrail', () => {
    const baseAssertion = {
        type: 'guardrails',
    };
    const defaultContext = {
        prompt: undefined,
        vars: {},
        test: {},
        logProbs: undefined,
        providerResponse: undefined,
        provider: undefined,
    };
    const defaultParams = {
        assertion: baseAssertion,
        baseType: 'guardrails',
        context: defaultContext,
        inverse: false,
        output: '',
        outputString: '',
        test: {},
        providerResponse: {
            output: '',
        },
    };
    it('should pass when guardrails are not flagged', async () => {
        const params = {
            ...defaultParams,
            providerResponse: {
                guardrails: {
                    flagged: false,
                },
                output: 'test output',
            },
        };
        const result = await (0, guardrails_1.handleGuardrails)(params);
        expect(result).toEqual({
            pass: true,
            score: 1,
            reason: 'Content passed safety checks',
            assertion: baseAssertion,
        });
    });
    it('should fail when content is flagged', async () => {
        const params = {
            ...defaultParams,
            providerResponse: {
                guardrails: {
                    flagged: true,
                },
                output: 'test output',
            },
        };
        const result = await (0, guardrails_1.handleGuardrails)(params);
        expect(result).toEqual({
            pass: false,
            score: 0,
            reason: 'Content failed safety checks',
            assertion: baseAssertion,
        });
    });
    it('should fail with specific reason when input is flagged', async () => {
        const params = {
            ...defaultParams,
            providerResponse: {
                guardrails: {
                    flagged: true,
                    flaggedInput: true,
                },
                output: 'test output',
            },
        };
        const result = await (0, guardrails_1.handleGuardrails)(params);
        expect(result).toEqual({
            pass: false,
            score: 0,
            reason: 'Prompt failed safety checks',
            assertion: baseAssertion,
        });
    });
    it('should fail with specific reason when output is flagged', async () => {
        const params = {
            ...defaultParams,
            providerResponse: {
                guardrails: {
                    flagged: true,
                    flaggedOutput: true,
                },
                output: 'test output',
            },
        };
        const result = await (0, guardrails_1.handleGuardrails)(params);
        expect(result).toEqual({
            pass: false,
            score: 0,
            reason: 'Output failed safety checks',
            assertion: baseAssertion,
        });
    });
    it('should handle case when guardrails are in redteam history', async () => {
        const params = {
            ...defaultParams,
            providerResponse: {
                metadata: {
                    redteamHistory: [
                        {
                            guardrails: {
                                flagged: true,
                            },
                        },
                    ],
                },
                output: 'test output',
            },
        };
        const result = await (0, guardrails_1.handleGuardrails)(params);
        expect(result).toEqual({
            pass: false,
            score: 0,
            reason: 'Content failed safety checks',
            assertion: baseAssertion,
        });
    });
    it('should pass with score 0 when no guardrails are present', async () => {
        const params = {
            ...defaultParams,
            providerResponse: {
                output: 'test output',
            },
        };
        const result = await (0, guardrails_1.handleGuardrails)(params);
        expect(result).toEqual({
            pass: true,
            score: 0,
            reason: 'Guardrail was not applied',
            assertion: baseAssertion,
        });
    });
});
//# sourceMappingURL=guardrails.test.js.map