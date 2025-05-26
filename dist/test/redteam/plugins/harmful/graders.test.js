"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graders_1 = require("../../../../src/redteam/plugins/harmful/graders");
const util_1 = require("../../../../src/redteam/util");
jest.mock('../../../../src/redteam/util');
const createMockProvider = () => ({
    id: () => 'test-provider',
});
const createMockTest = (overrides) => ({
    vars: {
        purpose: 'To assist users with general tasks while avoiding harmful content',
        harmCategory: 'test harm',
        prompt: 'test prompt',
        entities: ['entity1', 'entity2'],
        ...overrides?.vars,
    },
    ...overrides,
});
describe('HarmfulGrader', () => {
    let grader;
    let mockProvider;
    let mockTest;
    beforeEach(() => {
        grader = new graders_1.HarmfulGrader();
        mockProvider = createMockProvider();
        mockTest = createMockTest();
        jest.mocked(util_1.isBasicRefusal).mockReset();
    });
    it('should have correct id', () => {
        expect(grader.id).toBe('promptfoo:redteam:harmful');
    });
    describe('getResult', () => {
        it('should pass and return score 1 for basic refusal', async () => {
            jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
            const result = await grader.getResult('test prompt', 'I cannot help with that.', mockTest, mockProvider);
            expect(result.grade).toEqual({
                pass: true,
                score: 1,
                reason: 'The output contains a standard refusal.',
            });
            expect(result.rubric).toBe(grader.rubric);
        });
        it('should fallback to superclass getResult for non-refusal', async () => {
            jest.mocked(util_1.isBasicRefusal).mockReturnValue(false);
            const superGetResult = jest.spyOn(Object.getPrototypeOf(graders_1.HarmfulGrader.prototype), 'getResult');
            superGetResult.mockResolvedValue({
                grade: {
                    pass: false,
                    score: 0,
                    reason: 'test reason',
                },
                rubric: 'test rubric',
            });
            const result = await grader.getResult('test prompt', 'harmful response', mockTest, mockProvider);
            expect(superGetResult).toHaveBeenCalledWith('test prompt', 'harmful response', mockTest, mockProvider, undefined);
            expect(result).toEqual({
                grade: {
                    pass: false,
                    score: 0,
                    reason: 'test reason',
                },
                rubric: 'test rubric',
            });
            superGetResult.mockRestore();
        });
    });
    describe('renderRubric', () => {
        it('should render rubric with variables', () => {
            const vars = {
                purpose: 'test purpose',
                harmCategory: 'test harm',
                prompt: 'test prompt',
                entities: ['entity1', 'entity2'],
            };
            const renderedRubric = grader.renderRubric(vars);
            expect(renderedRubric).toContain('test purpose');
            expect(renderedRubric).toContain('test harm');
            expect(renderedRubric).toContain('test prompt');
            expect(renderedRubric).toContain('entity1');
            expect(renderedRubric).toContain('entity2');
        });
        it('should handle missing entities in rubric', () => {
            const vars = {
                purpose: 'test purpose',
                harmCategory: 'test harm',
                prompt: 'test prompt',
            };
            const renderedRubric = grader.renderRubric(vars);
            expect(renderedRubric).toContain('test purpose');
            expect(renderedRubric).toContain('test harm');
            expect(renderedRubric).not.toContain('AllowedEntities');
        });
    });
});
describe('HarmfulPrivacyGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new graders_1.HarmfulPrivacyGrader();
        mockTest = createMockTest();
    });
    it('should have correct id', () => {
        expect(grader.id).toBe('promptfoo:redteam:harmful:privacy');
    });
    it('should have privacy-specific rubric', () => {
        expect(grader.rubric).toContain('privacy violation');
    });
    it('should inherit basic refusal handling from parent', async () => {
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
        const result = await grader.getResult('test prompt', 'I cannot help with that.', mockTest, createMockProvider());
        expect(result.grade.pass).toBe(true);
        expect(result.grade.score).toBe(1);
    });
});
describe('SelfHarmGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new graders_1.SelfHarmGrader();
        mockTest = createMockTest();
    });
    it('should have correct id', () => {
        expect(grader.id).toBe('promptfoo:redteam:harmful:self-harm');
    });
    it('should have self-harm specific rubric', () => {
        expect(grader.rubric).toContain('self-harm');
    });
    it('should inherit basic refusal handling from parent', async () => {
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
        const result = await grader.getResult('test prompt', 'I cannot help with that.', mockTest, createMockProvider());
        expect(result.grade.pass).toBe(true);
        expect(result.grade.score).toBe(1);
    });
});
describe('GraphicContentGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new graders_1.GraphicContentGrader();
        mockTest = createMockTest();
    });
    it('should have correct id', () => {
        expect(grader.id).toBe('promptfoo:redteam:harmful:graphic-content');
    });
    it('should have graphic content specific rubric', () => {
        expect(grader.rubric).toContain('gratuitously graphic');
        expect(grader.rubric).toContain('disturbing content');
    });
    it('should inherit basic refusal handling from parent', async () => {
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
        const result = await grader.getResult('test prompt', 'I cannot help with that.', mockTest, createMockProvider());
        expect(result.grade.pass).toBe(true);
        expect(result.grade.score).toBe(1);
    });
});
describe('SexualContentGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new graders_1.SexualContentGrader();
        mockTest = createMockTest();
    });
    it('should have correct id', () => {
        expect(grader.id).toBe('promptfoo:redteam:harmful:sexual-content');
    });
    it('should have sexual content specific rubric', () => {
        expect(grader.rubric).toContain('inappropriate sexual content');
        expect(grader.rubric).toContain('Sexually suggestive');
    });
    it('should inherit basic refusal handling from parent', async () => {
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
        const result = await grader.getResult('test prompt', 'I cannot help with that.', mockTest, createMockProvider());
        expect(result.grade.pass).toBe(true);
        expect(result.grade.score).toBe(1);
    });
});
describe('ProfanityGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new graders_1.ProfanityGrader();
        mockTest = createMockTest();
    });
    it('should have correct id', () => {
        expect(grader.id).toBe('promptfoo:redteam:harmful:profanity');
    });
    it('should have profanity specific rubric', () => {
        expect(grader.rubric).toContain('profanity');
        expect(grader.rubric).toContain('inappropriate language');
    });
    it('should inherit basic refusal handling from parent', async () => {
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
        const result = await grader.getResult('test prompt', 'I cannot help with that.', mockTest, createMockProvider());
        expect(result.grade.pass).toBe(true);
        expect(result.grade.score).toBe(1);
    });
});
describe('CopyrightViolationGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new graders_1.CopyrightViolationGrader();
        mockTest = createMockTest();
    });
    it('should have correct id', () => {
        expect(grader.id).toBe('promptfoo:redteam:harmful:copyright-violations');
    });
    it('should have copyright specific rubric', () => {
        expect(grader.rubric).toContain('copyright violations');
        expect(grader.rubric).toContain('copyrighted content');
    });
    it('should inherit basic refusal handling from parent', async () => {
        jest.mocked(util_1.isBasicRefusal).mockReturnValue(true);
        const result = await grader.getResult('test prompt', 'I cannot help with that.', mockTest, createMockProvider());
        expect(result.grade.pass).toBe(true);
        expect(result.grade.score).toBe(1);
    });
});
//# sourceMappingURL=graders.test.js.map