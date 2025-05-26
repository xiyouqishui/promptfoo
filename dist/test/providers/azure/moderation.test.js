"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moderation_1 = require("../../../src/providers/azure/moderation");
describe('Azure Moderation', () => {
    describe('parseAzureModerationResponse', () => {
        it('should parse valid response with categories', () => {
            const response = {
                categoriesAnalysis: [
                    {
                        category: 'Hate',
                        severity: 4,
                    },
                    {
                        category: 'Sexual',
                        severity: 0,
                    },
                ],
            };
            const result = (0, moderation_1.parseAzureModerationResponse)(response);
            expect(result).toEqual({
                flags: [
                    {
                        code: 'hate',
                        description: 'Content flagged for Hate',
                        confidence: 4 / 7,
                    },
                ],
            });
        });
        it('should handle null/undefined response', () => {
            expect((0, moderation_1.parseAzureModerationResponse)(null)).toEqual({ flags: [] });
            expect((0, moderation_1.parseAzureModerationResponse)(undefined)).toEqual({ flags: [] });
        });
        it('should handle empty categories', () => {
            const response = {
                categoriesAnalysis: [],
            };
            expect((0, moderation_1.parseAzureModerationResponse)(response)).toEqual({ flags: [] });
        });
        it('should handle multiple categories with severity', () => {
            const response = {
                categoriesAnalysis: [
                    {
                        category: 'Hate',
                        severity: 3,
                    },
                    {
                        category: 'Violence',
                        severity: 5,
                    },
                    {
                        category: 'Sexual',
                        severity: 0,
                    },
                ],
            };
            const result = (0, moderation_1.parseAzureModerationResponse)(response);
            expect(result).toEqual({
                flags: [
                    {
                        code: 'hate',
                        description: 'Content flagged for Hate',
                        confidence: 3 / 7,
                    },
                    {
                        code: 'violence',
                        description: 'Content flagged for Violence',
                        confidence: 5 / 7,
                    },
                ],
            });
        });
        it('should handle parsing errors', () => {
            const malformedResponse = Object.create(null);
            Object.defineProperty(malformedResponse, 'categoriesAnalysis', {
                get() {
                    throw new Error('Invalid access');
                },
            });
            const result = (0, moderation_1.parseAzureModerationResponse)(malformedResponse);
            expect(result.flags).toEqual([]);
            expect(result.error).toBe('Failed to parse moderation response');
        });
        it('should handle both categories and blocklist matches', () => {
            const response = {
                categoriesAnalysis: [
                    {
                        category: 'Hate',
                        severity: 5,
                    },
                ],
                blocklistsMatch: [
                    {
                        blocklistName: 'custom-list',
                        blocklistItemId: '456',
                        blocklistItemText: 'forbidden term',
                    },
                ],
            };
            const result = (0, moderation_1.parseAzureModerationResponse)(response);
            expect(result.flags).toEqual([
                {
                    code: 'hate',
                    description: 'Content flagged for Hate',
                    confidence: 5 / 7,
                },
                {
                    code: 'blocklist:custom-list',
                    description: 'Content matched blocklist item: forbidden term',
                    confidence: 1.0,
                },
            ]);
        });
    });
    describe('handleApiError', () => {
        it('should format error with message', () => {
            const error = new Error('API failure');
            const result = (0, moderation_1.handleApiError)(error);
            expect(result).toEqual({
                error: 'API failure',
                flags: [],
            });
        });
        it('should handle error without message', () => {
            const result = (0, moderation_1.handleApiError)({});
            expect(result).toEqual({
                error: 'Unknown error',
                flags: [],
            });
        });
        it('should include additional data if provided', () => {
            const error = new Error('API error');
            const data = { detail: 'Additional info' };
            const result = (0, moderation_1.handleApiError)(error, data);
            expect(result.error).toBe('API error');
            expect(result.flags).toEqual([]);
        });
    });
    describe('getModerationCacheKey', () => {
        it('should generate correct cache key', () => {
            const modelName = 'test-model';
            const config = { apiKey: 'test-key' };
            const content = 'test content';
            const key = (0, moderation_1.getModerationCacheKey)(modelName, config, content);
            expect(key).toBe('azure-moderation:test-model:"test content"');
        });
        it('should handle empty content', () => {
            const key = (0, moderation_1.getModerationCacheKey)('model', {}, '');
            expect(key).toBe('azure-moderation:model:""');
        });
        it('should handle complex config object', () => {
            const config = {
                apiKey: 'key',
                endpoint: 'https://test.com',
                headers: { 'X-Test': 'value' },
            };
            const key = (0, moderation_1.getModerationCacheKey)('model', config, 'content');
            expect(key).toBe('azure-moderation:model:"content"');
        });
    });
});
//# sourceMappingURL=moderation.test.js.map