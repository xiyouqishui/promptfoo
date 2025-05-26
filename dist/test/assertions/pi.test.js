"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pi_1 = require("../../src/assertions/pi");
const matchers_1 = require("../../src/matchers");
const templates_1 = require("../../src/util/templates");
jest.mock('../../src/matchers');
jest.mock('../../src/util/templates');
describe('handlePiScorer', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        const mockNunjucksEnv = {
            options: { autoescape: true },
            render: jest.fn(),
            renderString: jest.fn().mockImplementation((str) => str),
            addFilter: jest.fn(),
            getFilter: jest.fn(),
            hasExtension: jest.fn(),
            addExtension: jest.fn(),
            removeExtension: jest.fn(),
            getExtension: jest.fn(),
            addGlobal: jest.fn(),
            getGlobal: jest.fn(),
            getTemplate: jest.fn(),
            express: jest.fn(),
            on: jest.fn(),
        };
        jest.mocked(templates_1.getNunjucksEngine).mockReturnValue(mockNunjucksEnv);
        jest.mocked(matchers_1.matchesClosedQa).mockResolvedValue({
            pass: true,
            score: 1,
            reason: 'test reason',
        });
    });
    it('should validate string value', async () => {
        const params = {
            assertion: { type: 'pi' },
            baseType: 'pi',
            context: {
                prompt: 'test prompt',
                vars: {},
                test: { vars: {} },
                logProbs: undefined,
                provider: undefined,
                providerResponse: undefined,
            },
            inverse: false,
            output: 'test output',
            outputString: 'test output',
            prompt: 'test prompt',
            providerResponse: {},
            renderedValue: {},
            test: {
                options: {},
                vars: {},
            },
        };
        await expect((0, pi_1.handlePiScorer)(params)).rejects.toThrow('"pi" assertion type must have a string value');
    });
    it('should validate prompt exists', async () => {
        const params = {
            assertion: { type: 'pi' },
            baseType: 'pi',
            context: {
                prompt: undefined,
                vars: {},
                test: { vars: {} },
                logProbs: undefined,
                provider: undefined,
                providerResponse: undefined,
            },
            inverse: false,
            output: 'test output',
            outputString: 'test output',
            prompt: undefined,
            providerResponse: {},
            renderedValue: 'test value',
            test: {
                options: {},
                vars: {},
            },
        };
        await expect((0, pi_1.handlePiScorer)(params)).rejects.toThrow('"pi" assertion must have a prompt that is a string');
    });
    it('should call handlePiScorer with correct parameters', async () => {
        const params = {
            assertion: { type: 'pi', value: 'test question' },
            baseType: 'pi',
            context: {
                prompt: 'test prompt',
                vars: { var: 'value' },
                test: { vars: { var: 'value' } },
                logProbs: undefined,
                provider: undefined,
                providerResponse: undefined,
            },
            inverse: false,
            output: 'test output',
            outputString: 'test output',
            prompt: 'test prompt',
            providerResponse: {},
            renderedValue: 'test question',
            test: {
                options: {
                    rubricPrompt: 'test rubric',
                },
                vars: {
                    var: 'value',
                },
            },
        };
        await (0, pi_1.handlePiScorer)(params);
        expect(matchers_1.matchesPiScore).toHaveBeenCalledWith('test question', 'test prompt', 'test output', {
            type: 'pi',
            value: 'test question',
        });
    });
});
//# sourceMappingURL=pi.test.js.map