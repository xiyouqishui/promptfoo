"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envars_1 = require("../../../../src/envars");
const constants_1 = require("../../../../src/redteam/constants");
const graders_1 = require("../../../../src/redteam/graders");
const common_1 = require("../../../../src/redteam/plugins/harmful/common");
jest.mock('../../../../src/envars');
describe('harmful plugin', () => {
    beforeEach(() => {
        jest.mocked(envars_1.getEnvBool).mockReset();
        jest.mocked(envars_1.getEnvString).mockReset();
    });
    describe('getHarmfulAssertions', () => {
        beforeEach(() => {
            jest.mocked(envars_1.getEnvBool).mockReset();
            jest.mocked(envars_1.getEnvString).mockReset();
        });
        it('should return basic assertion for privacy category', () => {
            const assertions = (0, common_1.getHarmfulAssertions)('harmful:privacy');
            expect(assertions).toEqual([
                { metric: 'Harmful', type: 'promptfoo:redteam:harmful:privacy' },
            ]);
        });
        it('should return basic assertion for non-privacy category', () => {
            const assertions = (0, common_1.getHarmfulAssertions)('harmful:intellectual-property');
            expect(assertions).toEqual([
                { metric: 'Harmful', type: 'promptfoo:redteam:harmful:intellectual-property' },
            ]);
        });
        it('should return only basic assertions when moderation is disabled', () => {
            jest.mocked(envars_1.getEnvBool).mockImplementation((key) => {
                if (key === 'PROMPTFOO_DISABLE_REDTEAM_MODERATION') {
                    return true;
                }
                return false;
            });
            jest.mocked(envars_1.getEnvString).mockReturnValue('test-key');
            const assertions = (0, common_1.getHarmfulAssertions)('harmful:privacy');
            expect(assertions).toHaveLength(1);
            expect(assertions).not.toContainEqual(expect.objectContaining({ type: 'moderation' }));
        });
        it('should prioritize Replicate over OpenAI when both keys are present', () => {
            jest.mocked(envars_1.getEnvString).mockImplementation((key) => {
                if (key === 'REPLICATE_API_KEY') {
                    return 'replicate-key';
                }
                if (key === 'OPENAI_API_KEY') {
                    return 'openai-key';
                }
                return '';
            });
            const assertions = (0, common_1.getHarmfulAssertions)('harmful:privacy');
            expect(assertions).toContainEqual({
                metric: 'Harmful',
                type: 'moderation',
                value: constants_1.LLAMA_GUARD_ENABLED_CATEGORIES,
                provider: constants_1.LLAMA_GUARD_REPLICATE_PROVIDER,
            });
            expect(assertions).toHaveLength(2);
        });
        it('should handle REPLICATE_API_TOKEN', () => {
            jest.mocked(envars_1.getEnvString).mockImplementation((key) => {
                if (key === 'REPLICATE_API_TOKEN') {
                    return 'replicate-token';
                }
                return '';
            });
            const assertions = (0, common_1.getHarmfulAssertions)('harmful:privacy');
            expect(assertions).toContainEqual({
                metric: 'Harmful',
                type: 'moderation',
                value: constants_1.LLAMA_GUARD_ENABLED_CATEGORIES,
                provider: constants_1.LLAMA_GUARD_REPLICATE_PROVIDER,
            });
        });
    });
    describe('createTestCase', () => {
        it('should create test case with single line output', () => {
            const testCase = (0, common_1.createTestCase)('inputVar', 'single line output', 'harmful:privacy');
            expect(testCase).toEqual({
                vars: {
                    inputVar: 'single line output',
                },
                metadata: {
                    harmCategory: constants_1.HARM_PLUGINS['harmful:privacy'],
                    pluginId: 'harmful:privacy',
                },
                assert: expect.any(Array),
            });
        });
        it('should handle multiline output', () => {
            const testCase = (0, common_1.createTestCase)('inputVar', 'first line\nsecond line\nthird line', 'harmful:privacy');
            expect(testCase.vars?.inputVar).toBe('first line\nsecond line\nthird line');
        });
        it('should handle whitespace in output', () => {
            const testCase = (0, common_1.createTestCase)('inputVar', '  padded output  ', 'harmful:privacy');
            expect(testCase.vars?.inputVar).toBe('padded output');
        });
        it('should use harm category as fallback when not in HARM_PLUGINS', () => {
            const unknownCategory = 'harmful:unknown';
            const testCase = (0, common_1.createTestCase)('inputVar', 'test output', unknownCategory);
            expect(testCase.metadata?.harmCategory).toBe(unknownCategory);
        });
    });
    describe('harm categories and graders', () => {
        it('should have corresponding graders for all harmful categories', () => {
            const harmCategories = Object.keys(constants_1.HARM_PLUGINS);
            harmCategories.forEach((category) => {
                const graderKey = `promptfoo:redteam:${category}`;
                expect(graders_1.GRADERS[graderKey]).toBeDefined();
            });
            const harmGraders = Object.keys(graders_1.GRADERS).filter((key) => key.startsWith('promptfoo:redteam:harmful:') || key === 'promptfoo:redteam:bias:gender');
            expect(harmGraders.length).toBeGreaterThanOrEqual(harmCategories.length);
        });
    });
});
//# sourceMappingURL=common.test.js.map