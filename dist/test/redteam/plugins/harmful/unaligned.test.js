"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envars_1 = require("../../../../src/envars");
const promptfoo_1 = require("../../../../src/providers/promptfoo");
const constants_1 = require("../../../../src/redteam/constants");
const constants_2 = require("../../../../src/redteam/constants");
const constants_3 = require("../../../../src/redteam/plugins/harmful/constants");
const unaligned_1 = require("../../../../src/redteam/plugins/harmful/unaligned");
jest.mock('../../../../src/envars');
describe('harmful plugin', () => {
    let mockProvider;
    let mockCallApi;
    beforeEach(() => {
        jest.clearAllMocks();
        mockProvider = {
            callApi: jest.fn(),
            id: jest.fn().mockReturnValue('test-provider'),
        };
        if (mockCallApi) {
            mockCallApi.mockRestore();
        }
        mockCallApi = jest.spyOn(promptfoo_1.PromptfooHarmfulCompletionProvider.prototype, 'callApi').mockReset();
        jest.mocked(envars_1.getEnvBool).mockReset();
        jest.mocked(envars_1.getEnvString).mockReset();
    });
    afterEach(() => {
        jest.clearAllMocks();
        if (mockCallApi) {
            mockCallApi.mockRestore();
        }
    });
    describe('getHarmfulTests', () => {
        it('should handle unaligned provider plugins with multiple prompts', async () => {
            const unalignedPlugin = Object.keys(constants_1.UNALIGNED_PROVIDER_HARM_PLUGINS)[0];
            mockCallApi.mockResolvedValueOnce({
                output: ['Test harmful output', 'Another test output'],
            });
            const result = await (0, unaligned_1.getHarmfulTests)({
                provider: mockProvider,
                purpose: 'test purpose',
                injectVar: 'testVar',
                n: 2,
                delayMs: 0,
            }, unalignedPlugin);
            expect(mockCallApi).toHaveBeenCalledTimes(1);
            expect(result).toHaveLength(2);
            const prompts = result.map((r) => r.vars?.testVar);
            expect(prompts).toContain('Test harmful output');
            expect(prompts).toContain('Another test output');
        });
        it('should retry when not enough unique prompts are returned', async () => {
            const unalignedPlugin = Object.keys(constants_1.UNALIGNED_PROVIDER_HARM_PLUGINS)[0];
            mockCallApi
                .mockResolvedValueOnce({ output: ['Test output'] })
                .mockResolvedValueOnce({ output: ['Test output'] })
                .mockResolvedValueOnce({ output: ['Another test output'] });
            const result = await (0, unaligned_1.getHarmfulTests)({
                provider: mockProvider,
                purpose: 'test purpose',
                injectVar: 'testVar',
                n: 2,
                delayMs: 0,
            }, unalignedPlugin);
            expect(mockCallApi).toHaveBeenCalledTimes(3);
            expect(result).toHaveLength(2);
            const prompts = result.map((r) => r.vars?.testVar);
            expect(prompts).toContain('Test output');
            expect(prompts).toContain('Another test output');
        });
        it('should handle empty provider response', async () => {
            mockCallApi.mockResolvedValue({ output: [] });
            const result = await (0, unaligned_1.getHarmfulTests)({
                provider: mockProvider,
                purpose: 'test purpose',
                injectVar: 'testVar',
                n: 1,
                delayMs: 0,
            }, 'harmful:sex-crime');
            expect(result).toHaveLength(0);
        });
        it('should respect delay parameter between API calls', async () => {
            const unalignedPlugin = Object.keys(constants_1.UNALIGNED_PROVIDER_HARM_PLUGINS)[0];
            mockCallApi
                .mockResolvedValueOnce({ output: ['Test output'] })
                .mockResolvedValueOnce({ output: ['Another output'] });
            const startTime = Date.now();
            await (0, unaligned_1.getHarmfulTests)({
                provider: mockProvider,
                purpose: 'test purpose',
                injectVar: 'testVar',
                n: 2,
                delayMs: 100,
            }, unalignedPlugin);
            expect(Date.now() - startTime).toBeGreaterThanOrEqual(100);
        });
        it('should handle moderation assertions with OPENAI_API_KEY', async () => {
            jest.mocked(envars_1.getEnvString).mockImplementation((key) => {
                if (key === 'OPENAI_API_KEY') {
                    return 'test-key';
                }
                return '';
            });
            mockCallApi.mockResolvedValueOnce({ output: ['Test output'] });
            const result = await (0, unaligned_1.getHarmfulTests)({
                provider: mockProvider,
                purpose: 'test purpose',
                injectVar: 'testVar',
                n: 1,
                delayMs: 0,
            }, 'harmful:sex-crime');
            expect(result).toHaveLength(1);
            expect(result[0].vars?.testVar).toBe('Test output');
            expect(result[0].assert).toContainEqual(expect.objectContaining({ type: 'moderation' }));
        });
        it('should handle moderation assertions with REPLICATE_API_KEY', async () => {
            const mockCategory = {
                key: 'harmful:privacy',
                prompt: 'test prompt',
                examples: 'example1',
                label: 'Privacy violations',
                description: 'test description',
            };
            jest.spyOn(constants_3.REDTEAM_MODEL_CATEGORIES, 'find').mockReturnValue(mockCategory);
            jest.mocked(envars_1.getEnvString).mockImplementation((key) => {
                if (key === 'REPLICATE_API_KEY') {
                    return 'test-key';
                }
                return '';
            });
            const mockOutput = 'Test output';
            jest
                .spyOn(promptfoo_1.PromptfooHarmfulCompletionProvider.prototype, 'callApi')
                .mockResolvedValue({ output: [mockOutput] });
            const result = await (0, unaligned_1.getHarmfulTests)({
                provider: mockProvider,
                purpose: 'test purpose',
                injectVar: 'testVar',
                n: 1,
                delayMs: 0,
            }, 'harmful:sex-crime');
            expect(result).toHaveLength(1);
            expect(result[0].vars?.testVar).toBe('Test output');
            expect(result[0].assert).toContainEqual(expect.objectContaining({
                type: 'moderation',
                provider: constants_2.LLAMA_GUARD_REPLICATE_PROVIDER,
            }));
        });
    });
});
//# sourceMappingURL=unaligned.test.js.map