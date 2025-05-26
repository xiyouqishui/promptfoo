"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bam_1 = require("../../src/providers/bam");
describe('BAM Provider', () => {
    describe('convertResponse', () => {
        it('should convert successful response with single result', () => {
            const response = {
                id: null,
                model_id: 'test-model',
                created_at: new Date().toISOString(),
                results: [
                    {
                        input_token_count: 10,
                        generated_token_count: 20,
                        generated_text: 'test response',
                        stop_reason: 'max_tokens',
                        token_count: 30,
                    },
                ],
            };
            const result = (0, bam_1.convertResponse)(response);
            expect(result).toEqual({
                error: undefined,
                output: 'test response',
                tokenUsage: {
                    total: 20,
                    prompt: 10,
                    completion: 10,
                },
                cost: undefined,
                cached: undefined,
                logProbs: undefined,
            });
        });
        it('should convert successful response with multiple results', () => {
            const response = {
                id: null,
                model_id: 'test-model',
                created_at: new Date().toISOString(),
                results: [
                    {
                        input_token_count: 5,
                        generated_token_count: 10,
                        generated_text: 'response 1',
                        stop_reason: 'max_tokens',
                        token_count: 15,
                    },
                    {
                        input_token_count: 5,
                        generated_token_count: 15,
                        generated_text: 'response 2',
                        stop_reason: 'max_tokens',
                        token_count: 20,
                    },
                ],
            };
            const result = (0, bam_1.convertResponse)(response);
            expect(result).toEqual({
                error: undefined,
                output: 'response 1, response 2',
                tokenUsage: {
                    total: 25,
                    prompt: 5,
                    completion: 20,
                },
                cost: undefined,
                cached: undefined,
                logProbs: undefined,
            });
        });
        it('should handle response with no input token count', () => {
            const response = {
                id: null,
                model_id: 'test-model',
                created_at: new Date().toISOString(),
                results: [
                    {
                        generated_token_count: 10,
                        generated_text: 'test response',
                        stop_reason: 'max_tokens',
                        token_count: 10,
                    },
                ],
            };
            const result = (0, bam_1.convertResponse)(response);
            expect(result).toEqual({
                error: undefined,
                output: 'test response',
                tokenUsage: {
                    total: 10,
                    prompt: 0,
                    completion: 10,
                },
                cost: undefined,
                cached: undefined,
                logProbs: undefined,
            });
        });
        it('should handle empty results array', () => {
            const response = {
                id: null,
                model_id: 'test-model',
                created_at: new Date().toISOString(),
                results: [],
            };
            const result = (0, bam_1.convertResponse)(response);
            expect(result).toEqual({
                error: undefined,
                output: '',
                tokenUsage: {
                    total: 0,
                    prompt: 0,
                    completion: 0,
                },
                cost: undefined,
                cached: undefined,
                logProbs: undefined,
            });
        });
    });
});
//# sourceMappingURL=bam.test.js.map