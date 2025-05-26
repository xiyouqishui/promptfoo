"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_1 = require("../../src/providers/openai/chat");
const perplexity_1 = require("../../src/providers/perplexity");
jest.mock('../../src/providers/openai/chat');
describe('Perplexity Provider', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    describe('createPerplexityProvider', () => {
        it('should create a provider with default settings', () => {
            const provider = (0, perplexity_1.createPerplexityProvider)('perplexity:sonar');
            expect(provider).toBeInstanceOf(perplexity_1.PerplexityProvider);
        });
        it('should use sonar as the default model if none is specified', () => {
            const provider = (0, perplexity_1.createPerplexityProvider)('perplexity:');
            expect(provider).toBeInstanceOf(perplexity_1.PerplexityProvider);
            // @ts-ignore - accessing private property for testing
            expect(provider.modelName).toBe('sonar');
        });
        it('should handle specific Perplexity models', () => {
            const models = [
                'sonar-pro',
                'sonar-reasoning',
                'sonar-reasoning-pro',
                'sonar-deep-research',
                'r1-1776',
            ];
            for (const model of models) {
                const provider = (0, perplexity_1.createPerplexityProvider)(`perplexity:${model}`);
                expect(provider).toBeInstanceOf(perplexity_1.PerplexityProvider);
                // @ts-ignore - accessing private property for testing
                expect(provider.modelName).toBe(model);
            }
        });
        it('should pass through configuration options', () => {
            const config = {
                temperature: 0.7,
                max_tokens: 1000,
                search_domain_filter: ['example.com'],
                search_recency_filter: 'week',
                return_related_questions: true,
            };
            const provider = (0, perplexity_1.createPerplexityProvider)('perplexity:sonar', {
                config: { config },
            });
            expect(provider).toBeInstanceOf(perplexity_1.PerplexityProvider);
            // Verify config was passed through to constructor
            // @ts-ignore - accessing private property for testing
            expect(provider.config).toMatchObject(expect.objectContaining(config));
        });
    });
    describe('PerplexityProvider', () => {
        it('should initialize with the correct API base URL and key environment variable', () => {
            const provider = new perplexity_1.PerplexityProvider('sonar');
            // @ts-ignore - accessing private properties for testing
            expect(provider.config.apiBaseUrl).toBe('https://api.perplexity.ai');
            // @ts-ignore - accessing private properties for testing
            expect(provider.config.apiKeyEnvar).toBe('PERPLEXITY_API_KEY');
        });
        it('should set the correct usage tier', () => {
            const tiers = ['high', 'medium', 'low'];
            for (const tier of tiers) {
                const provider = new perplexity_1.PerplexityProvider('sonar', {
                    config: {
                        usage_tier: tier,
                    },
                });
                // @ts-ignore - accessing private property for testing
                expect(provider.usageTier).toBe(tier);
            }
        });
        it('should default to "medium" usage tier if not specified', () => {
            const provider = new perplexity_1.PerplexityProvider('sonar');
            // @ts-ignore - accessing private property for testing
            expect(provider.usageTier).toBe('medium');
        });
        it('should have the correct id() method', () => {
            const provider = new perplexity_1.PerplexityProvider('sonar-pro');
            expect(provider.id()).toBe('sonar-pro');
        });
        it('should have the correct toString() method', () => {
            const provider = new perplexity_1.PerplexityProvider('sonar');
            expect(provider.toString()).toBe('[Perplexity Provider sonar]');
        });
        it('should have the correct toJSON() method', () => {
            const provider = new perplexity_1.PerplexityProvider('sonar-pro', {
                config: {
                    temperature: 0.7,
                    max_tokens: 1000,
                },
            });
            expect(provider.toJSON()).toEqual({
                provider: 'perplexity',
                model: 'sonar-pro',
                config: expect.objectContaining({
                    temperature: 0.7,
                    max_tokens: 1000,
                    apiKey: undefined,
                }),
            });
        });
        it('should override callApi to calculate costs correctly', async () => {
            // Mock the parent class callApi method
            jest.spyOn(chat_1.OpenAiChatCompletionProvider.prototype, 'callApi').mockResolvedValueOnce({
                output: 'Test output',
                tokenUsage: {
                    total: 20,
                    prompt: 10,
                    completion: 10,
                },
            });
            const provider = new perplexity_1.PerplexityProvider('sonar-pro');
            const result = await provider.callApi('Test prompt');
            // Verify the response has our custom cost calculation
            expect(result.cost).toBeDefined();
            expect(result.cost).toBe(0.00018); // (10/1M * $3) + (10/1M * $15) = $0.00018
        });
        it('should handle cached responses correctly', async () => {
            // Mock the parent class callApi method with a cached response
            jest.spyOn(chat_1.OpenAiChatCompletionProvider.prototype, 'callApi').mockResolvedValueOnce({
                output: 'Cached output',
                tokenUsage: {
                    total: 20,
                    cached: 20,
                },
                cached: true,
            });
            const provider = new perplexity_1.PerplexityProvider('sonar');
            const result = await provider.callApi('Test prompt');
            // Verify cached response is returned unchanged
            expect(result.cached).toBe(true);
            expect(result.tokenUsage?.cached).toBe(20);
            // Cost should not be calculated for cached responses
            expect(result.cost).toBeUndefined();
        });
        it('should pass through error responses', async () => {
            // Mock the parent class callApi method with an error
            jest.spyOn(chat_1.OpenAiChatCompletionProvider.prototype, 'callApi').mockResolvedValueOnce({
                error: 'API error',
            });
            const provider = new perplexity_1.PerplexityProvider('sonar');
            const result = await provider.callApi('Test prompt');
            // Verify error is passed through
            expect(result.error).toBe('API error');
            expect(result.cost).toBeUndefined();
        });
    });
    describe('calculatePerplexityCost', () => {
        it('should return 0 if no tokens are provided', () => {
            expect((0, perplexity_1.calculatePerplexityCost)('sonar')).toBe(0);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar', 0, 0)).toBe(0);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar', undefined, undefined)).toBe(0);
        });
        it('should calculate costs for sonar model', () => {
            // sonar: $1 per million input tokens, $1 per million output tokens
            expect((0, perplexity_1.calculatePerplexityCost)('sonar', 1000000, 1000000)).toBe(2);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar', 500000, 500000)).toBe(1);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar', 2000000, 0)).toBe(2);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar', 0, 3000000)).toBe(3);
        });
        it('should calculate costs for sonar-pro model', () => {
            // sonar-pro: $3 per million input tokens, $15 per million output tokens
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-pro', 1000000, 1000000)).toBe(18);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-pro', 500000, 500000)).toBe(9);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-pro', 2000000, 0)).toBe(6);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-pro', 0, 2000000)).toBe(30);
        });
        it('should calculate costs for sonar-reasoning model', () => {
            // sonar-reasoning: $1 per million input tokens, $5 per million output tokens
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning', 1000000, 1000000)).toBe(6);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning', 500000, 500000)).toBe(3);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning', 2000000, 0)).toBe(2);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning', 0, 2000000)).toBe(10);
        });
        it('should calculate costs for sonar-reasoning-pro model', () => {
            // sonar-reasoning-pro: $2 per million input tokens, $8 per million output tokens
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning-pro', 1000000, 1000000)).toBe(10);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning-pro', 500000, 500000)).toBe(5);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning-pro', 2000000, 0)).toBe(4);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-reasoning-pro', 0, 2000000)).toBe(16);
        });
        it('should calculate costs for sonar-deep-research model', () => {
            // sonar-deep-research: $2 per million input tokens, $8 per million output tokens
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-deep-research', 1000000, 1000000)).toBe(10);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-deep-research', 500000, 500000)).toBe(5);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-deep-research', 2000000, 0)).toBe(4);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-deep-research', 0, 2000000)).toBe(16);
        });
        it('should calculate costs for r1-1776 model', () => {
            // r1-1776: $2 per million input tokens, $8 per million output tokens
            expect((0, perplexity_1.calculatePerplexityCost)('r1-1776', 1000000, 1000000)).toBe(10);
            expect((0, perplexity_1.calculatePerplexityCost)('r1-1776', 500000, 500000)).toBe(5);
            expect((0, perplexity_1.calculatePerplexityCost)('r1-1776', 2000000, 0)).toBe(4);
            expect((0, perplexity_1.calculatePerplexityCost)('r1-1776', 0, 2000000)).toBe(16);
        });
        it('should handle unknown models by defaulting to sonar pricing', () => {
            expect((0, perplexity_1.calculatePerplexityCost)('unknown-model', 1000000, 1000000)).toBe(2);
            expect((0, perplexity_1.calculatePerplexityCost)('custom-model', 500000, 500000)).toBe(1);
        });
        it('should handle case insensitivity in model names', () => {
            expect((0, perplexity_1.calculatePerplexityCost)('SONAR-PRO', 1000000, 1000000)).toBe(18);
            expect((0, perplexity_1.calculatePerplexityCost)('Sonar-Reasoning', 1000000, 1000000)).toBe(6);
            expect((0, perplexity_1.calculatePerplexityCost)('sonar-DEEP-research', 1000000, 1000000)).toBe(10);
        });
        it('should handle different usage tiers', () => {
            // Test one model with different tiers (the tier doesn't affect the token price calculation)
            const model = 'sonar-pro';
            const inputTokens = 1000000;
            const outputTokens = 1000000;
            // All tiers should calculate the same token costs
            expect((0, perplexity_1.calculatePerplexityCost)(model, inputTokens, outputTokens, 'high')).toBe(18);
            expect((0, perplexity_1.calculatePerplexityCost)(model, inputTokens, outputTokens, 'medium')).toBe(18);
            expect((0, perplexity_1.calculatePerplexityCost)(model, inputTokens, outputTokens, 'low')).toBe(18);
        });
    });
});
//# sourceMappingURL=perplexity.test.js.map