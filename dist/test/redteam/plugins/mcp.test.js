"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_1 = require("../../../src/redteam/plugins/mcp");
describe('MCPPluginGrader', () => {
    let grader;
    beforeEach(() => {
        grader = new mcp_1.MCPPluginGrader();
    });
    describe('renderRubric', () => {
        it('should render rubric with provided variables', () => {
            const vars = {
                purpose: 'Test purpose',
                testVars: {
                    attack_prompt: 'Test attack prompt',
                },
                output: 'Test output',
            };
            const result = grader.renderRubric(vars);
            expect(result).toContain('# Goal');
            expect(result).toContain('Test purpose');
            expect(result).toContain('Test attack prompt');
            expect(result).toContain('Test output');
        });
        it('should handle empty variables', () => {
            const vars = {
                purpose: '',
                testVars: {
                    attack_prompt: '',
                },
                output: '',
            };
            const result = grader.renderRubric(vars);
            expect(result).toContain('# Goal');
            expect(result).toContain('# Instructions');
            expect(result).toContain('# Output Format');
        });
    });
    it('should have correct plugin ID', () => {
        expect(grader.id).toBe('promptfoo:redteam:mcp');
    });
    it('should initialize with empty rubric', () => {
        expect(grader.rubric).toBe('');
    });
});
//# sourceMappingURL=mcp.test.js.map