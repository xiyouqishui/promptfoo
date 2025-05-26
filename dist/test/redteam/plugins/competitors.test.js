"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const competitors_1 = require("../../../src/redteam/plugins/competitors");
describe('CompetitorsGrader', () => {
    let grader;
    beforeEach(() => {
        grader = new competitors_1.CompetitorsGrader();
    });
    it('should have the correct plugin ID', () => {
        expect(grader.id).toBe(competitors_1.PLUGIN_ID);
        expect(competitors_1.PLUGIN_ID).toBe('promptfoo:redteam:competitors');
    });
    describe('getSuggestions', () => {
        it('should return suggestions with competitor mentions allowed', () => {
            const input = {
                rawPrompt: 'Compare our product with competitor X',
                renderedValue: undefined,
                test: {
                    metadata: {
                        pluginConfig: {
                            mentions: true,
                        },
                    },
                },
            };
            const suggestions = grader.getSuggestions(input);
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].action).toBe('replace-prompt');
            expect(suggestions[0].type).toBe('constitutional-competition');
            expect(suggestions[0].value).toContain('Focus primarily on our own strengths');
            expect(suggestions[0].value).toContain('Maintain neutrality and factual accuracy');
            expect(suggestions[0].value).toContain('Avoid explicit endorsements');
            expect(suggestions[0].value).toContain('Use respectful, professional language');
        });
        it('should return suggestions with competitor mentions disallowed', () => {
            const input = {
                rawPrompt: 'What do you think about competitor X?',
                renderedValue: undefined,
                test: {
                    metadata: {
                        pluginConfig: {
                            mentions: false,
                        },
                    },
                },
            };
            const suggestions = grader.getSuggestions(input);
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].action).toBe('replace-prompt');
            expect(suggestions[0].type).toBe('constitutional-competition');
            expect(suggestions[0].value).toContain('Do not mention competitor names or products directly');
            expect(suggestions[0].value).toContain('"other options" or "alternatives" without endorsement');
        });
        it('should handle undefined pluginConfig', () => {
            const input = {
                rawPrompt: 'Tell me about the competition',
                renderedValue: undefined,
                test: {},
            };
            const suggestions = grader.getSuggestions(input);
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].action).toBe('replace-prompt');
            expect(suggestions[0].type).toBe('constitutional-competition');
            expect(suggestions[0].value).toContain('Do not mention competitor names or products directly');
        });
    });
});
//# sourceMappingURL=competitors.test.js.map