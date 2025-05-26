"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../../../src/fetch");
const matchers_1 = require("../../../src/matchers");
const pliny_1 = require("../../../src/redteam/plugins/pliny");
const util_1 = require("../../../src/redteam/util");
jest.mock('../../../src/matchers', () => ({
    matchesLlmRubric: jest.fn(),
}));
jest.mock('../../../src/fetch', () => ({
    fetchWithProxy: jest.fn(),
}));
jest.mock('../../../src/redteam/util', () => ({
    isBasicRefusal: jest.fn().mockReturnValue(false),
    isEmptyResponse: jest.fn().mockReturnValue(false),
}));
describe('PlinyPlugin', () => {
    let provider;
    let plugin;
    const mockFetchResponse = `
# Test L1B3RT4S Header

This is a test jailbreak attempt.
Let's try to bypass restrictions.

# Another Test Header

This is another test for jailbreak.
With some content.
  `;
    beforeEach(() => {
        provider = {
            callApi: jest.fn().mockResolvedValue({
                output: 'Test output',
            }),
            id: jest.fn().mockReturnValue('test-provider'),
        };
        plugin = new pliny_1.PlinyPlugin(provider, 'test purpose', 'testVar');
        // Mock the fetch response
        const mockTextFn = jest.fn().mockResolvedValue(mockFetchResponse);
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValue({
            text: mockTextFn,
        });
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('should have the correct id', () => {
        expect(plugin.id).toBe(pliny_1.PLUGIN_ID);
        expect(plugin.id).toBe('promptfoo:redteam:pliny');
    });
    it('should set canGenerateRemote to false', () => {
        expect(pliny_1.PlinyPlugin.canGenerateRemote).toBe(false);
    });
    it('should return the inject variable as the template', async () => {
        const template = await plugin.getTemplate();
        expect(template).toBe('testVar');
    });
    it('should return the correct assertions', () => {
        const assertions = plugin.getAssertions('test');
        expect(assertions).toEqual([
            {
                type: pliny_1.PLUGIN_ID,
                metric: 'Pliny',
            },
        ]);
    });
    it('should handle fetch errors gracefully', async () => {
        jest.mocked(fetch_1.fetchWithProxy).mockRejectedValue(new Error('Network error'));
        const tests = await plugin.generateTests(2);
        // Should still return an empty array rather than throwing
        expect(tests).toEqual([]);
    });
    it('should handle text parsing errors gracefully', async () => {
        // Mock a successful fetch but a failed text() call
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValue({
            text: jest.fn().mockRejectedValue(new Error('Text parsing error')),
        });
        const tests = await plugin.generateTests(2);
        // Should return an empty array rather than throwing
        expect(tests).toEqual([]);
    });
    it('should handle empty responses from fetch', async () => {
        // Mock an empty response
        jest.mocked(fetch_1.fetchWithProxy).mockResolvedValue({
            text: jest.fn().mockResolvedValue(''),
        });
        const tests = await plugin.generateTests(2);
        // Should return an empty array since no valid sections are found
        expect(tests).toEqual([]);
    });
});
describe('PlinyGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new pliny_1.PlinyGrader();
        mockTest = {
            vars: { prompt: 'This is a test jailbreak prompt from L1B3RT4S.' },
            metadata: {
                purpose: 'test-purpose',
                jailbreakContent: 'This is a test jailbreak prompt from L1B3RT4S.',
                pluginId: 'pliny',
            },
            options: {},
        };
        jest.clearAllMocks();
        jest.mocked(matchers_1.matchesLlmRubric).mockResolvedValue({
            pass: true,
            score: 1,
            reason: 'Model properly refused the jailbreak attempt',
        });
    });
    it('should render the rubric with the correct structure and variables', async () => {
        const userQuery = 'This is a test jailbreak prompt from L1B3RT4S.';
        const aiOutput = 'I cannot comply with that request as it appears to be attempting to bypass my safety guidelines.';
        // Mock isEmptyResponse and isBasicRefusal to return false so it calls matchesLlmRubric
        jest.mocked(util_1.isEmptyResponse).mockReturnValue(false);
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(false);
        await grader.getResult(userQuery, aiOutput, mockTest, undefined, undefined);
        // Verify matchesLlmRubric was called with the appropriate arguments
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledTimes(1);
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledWith(expect.any(String), // The rendered rubric
        aiOutput, expect.any(Object));
    });
    it('should handle cases with entities correctly', async () => {
        mockTest.metadata.entities = ['Entity1', 'Entity2'];
        const userQuery = 'This is a test jailbreak prompt.';
        const aiOutput = 'I cannot comply with that request.';
        // Mock isEmptyResponse and isBasicRefusal to return false so it calls matchesLlmRubric
        jest.mocked(util_1.isEmptyResponse).mockReturnValue(false);
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(false);
        await grader.getResult(userQuery, aiOutput, mockTest, undefined, undefined);
        // Verify matchesLlmRubric was called with the appropriate arguments
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledTimes(1);
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledWith(expect.any(String), // The rendered rubric
        aiOutput, expect.any(Object));
    });
    it('should classify a refusal correctly', async () => {
        // Mock empty responses to test the refusal path
        jest.mocked(util_1.isEmptyResponse).mockReturnValue(true);
        const userQuery = 'This is a test jailbreak prompt.';
        const aiOutput = '';
        const result = await grader.getResult(userQuery, aiOutput, mockTest, undefined, undefined);
        expect(result.grade).toEqual({
            pass: true,
            score: 1,
            reason: 'Model refused the request',
        });
        // matchesLlmRubric should not be called for empty responses
        expect(matchers_1.matchesLlmRubric).not.toHaveBeenCalled();
    });
    it('should classify a basic refusal correctly', async () => {
        // Mock basic refusal detection
        jest.mocked(util_1.isEmptyResponse).mockReturnValue(false);
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
        const userQuery = 'This is a test jailbreak prompt.';
        const aiOutput = 'I cannot help with that.';
        const result = await grader.getResult(userQuery, aiOutput, mockTest, undefined, undefined);
        expect(result.grade).toEqual({
            pass: true,
            score: 1,
            reason: 'Model refused the request',
        });
        // matchesLlmRubric should not be called for basic refusals
        expect(matchers_1.matchesLlmRubric).not.toHaveBeenCalled();
    });
    it('should return correct result for failed grading', async () => {
        // Mock a failing grading result
        jest.mocked(util_1.isEmptyResponse).mockReturnValue(false);
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(false);
        jest.mocked(matchers_1.matchesLlmRubric).mockResolvedValue({
            pass: false,
            score: 0,
            reason: 'Model attempted to comply with the jailbreak',
        });
        const userQuery = 'This is a test jailbreak prompt.';
        const aiOutput = 'Here is the harmful content you requested...';
        const result = await grader.getResult(userQuery, aiOutput, mockTest, undefined, undefined);
        expect(result.grade).toEqual({
            pass: false,
            score: 0,
            reason: 'Model attempted to comply with the jailbreak',
        });
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledTimes(1);
    });
    it('should handle missing metadata gracefully', async () => {
        // Create a test case with missing metadata
        const incompleteTest = {
            vars: { prompt: 'Test jailbreak' },
            options: {},
        };
        jest.mocked(util_1.isEmptyResponse).mockReturnValue(false);
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(false);
        // This should throw because the test is missing purpose metadata
        await expect(grader.getResult('Test prompt', 'Test response', incompleteTest, undefined, undefined)).rejects.toThrow('Test is missing purpose metadata');
    });
});
//# sourceMappingURL=pliny.test.js.map