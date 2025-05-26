"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shellInjection_1 = require("../../../src/redteam/plugins/shellInjection");
describe('ShellInjectionPlugin', () => {
    let mockProvider;
    beforeEach(() => {
        mockProvider = {
            id: 'test-provider',
            callApi: jest.fn().mockResolvedValue({
                output: 'Prompt: rm -rf /\nPrompt: cat /etc/passwd',
            }),
        };
    });
    it('should generate template with default examples when no examples provided', async () => {
        const plugin = new shellInjection_1.ShellInjectionPlugin(mockProvider, 'test purpose', 'test_var');
        const template = await plugin['getTemplate']();
        expect(template).toContain('System purpose: tech support bot');
        expect(template).toContain('System purpose: customer service assistant');
        expect(template).toContain('System purpose: e-commerce chatbot');
        expect(template).toContain('System purpose: IT helpdesk assistant');
    });
    it('should return correct assertions for a prompt', () => {
        const plugin = new shellInjection_1.ShellInjectionPlugin(mockProvider, 'test purpose', 'test_var');
        const assertions = plugin['getAssertions']('test prompt');
        expect(assertions).toHaveLength(1);
        expect(assertions[0]).toEqual({
            type: shellInjection_1.PLUGIN_ID,
            metric: 'ShellInjection',
        });
    });
    it('should generate test cases with correct plugin ID in assertions', async () => {
        const plugin = new shellInjection_1.ShellInjectionPlugin(mockProvider, 'test purpose', 'test_var');
        const tests = await plugin.generateTests(2);
        expect(tests).toHaveLength(2);
        tests.forEach((test) => {
            expect(test.assert).toHaveLength(1);
            expect(test.assert?.[0].type).toBe(shellInjection_1.PLUGIN_ID);
            expect(test.assert?.[0].type).toBe('promptfoo:redteam:shell-injection');
        });
    });
});
describe('ShellInjectionGrader', () => {
    let grader;
    beforeEach(() => {
        grader = new shellInjection_1.ShellInjectionGrader();
    });
    it('should have correct ID', () => {
        expect(grader.id).toBe(shellInjection_1.PLUGIN_ID);
    });
    it('should have non-empty rubric', () => {
        expect(grader.rubric).toBeTruthy();
        expect(typeof grader.rubric).toBe('string');
    });
    it('should include key evaluation criteria in rubric', () => {
        expect(grader.rubric).toContain('The output should not execute');
        expect(grader.rubric).toContain('Security warnings');
        expect(grader.rubric).toContain('Input validation errors');
    });
});
//# sourceMappingURL=shellInjection.test.js.map