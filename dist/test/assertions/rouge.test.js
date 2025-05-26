"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const rouge = __importStar(require("js-rouge"));
const rouge_1 = require("../../src/assertions/rouge");
jest.mock('js-rouge', () => ({
    n: jest.fn(),
    l: jest.fn(),
    s: jest.fn(),
}));
describe('handleRougeScore', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    const mockAssertion = {
        type: 'rouge-n',
        value: 'expected text',
    };
    const baseParams = {
        baseType: 'rouge-n',
        assertion: mockAssertion,
        renderedValue: 'expected text',
        outputString: 'actual text',
        inverse: false,
        context: {
            prompt: 'test prompt',
            vars: {},
            test: { assert: [mockAssertion] },
            logProbs: undefined,
            provider: undefined,
            providerResponse: {
                raw: 'actual text',
                error: undefined,
                cached: false,
                cost: 0,
                tokenUsage: {},
            },
        },
        output: { text: 'actual text' },
        providerResponse: {
            raw: 'actual text',
            error: undefined,
            cached: false,
            cost: 0,
            tokenUsage: {},
        },
        test: { assert: [mockAssertion] },
    };
    it('should pass when score is above default threshold', () => {
        jest.mocked(rouge.n).mockReturnValue(0.8);
        const result = (0, rouge_1.handleRougeScore)(baseParams);
        expect(result.pass).toBe(true);
        expect(result.score).toBe(0.8);
        expect(result.reason).toBe('ROUGE-N score 0.80 is greater than or equal to threshold 0.75');
        expect(rouge.n).toHaveBeenCalledWith('actual text', 'expected text', {});
    });
    it('should fail when score is below default threshold', () => {
        jest.mocked(rouge.n).mockReturnValue(0.7);
        const result = (0, rouge_1.handleRougeScore)(baseParams);
        expect(result.pass).toBe(false);
        expect(result.score).toBe(0.7);
        expect(result.reason).toBe('ROUGE-N score 0.70 is less than threshold 0.75');
        expect(rouge.n).toHaveBeenCalledWith('actual text', 'expected text', {});
    });
    it('should use custom threshold when provided', () => {
        jest.mocked(rouge.n).mockReturnValue(0.6);
        const result = (0, rouge_1.handleRougeScore)({
            ...baseParams,
            assertion: { ...mockAssertion, threshold: 0.5 },
        });
        expect(result.pass).toBe(true);
        expect(result.score).toBe(0.6);
        expect(result.reason).toBe('ROUGE-N score 0.60 is greater than or equal to threshold 0.5');
        expect(rouge.n).toHaveBeenCalledWith('actual text', 'expected text', {});
    });
    it('should handle inverse scoring', () => {
        jest.mocked(rouge.n).mockReturnValue(0.8);
        const result = (0, rouge_1.handleRougeScore)({
            ...baseParams,
            inverse: true,
        });
        expect(result.pass).toBe(false);
        expect(result.score).toBeCloseTo(0.2, 5);
        expect(result.reason).toBe('ROUGE-N score 0.80 is less than threshold 0.75');
        expect(rouge.n).toHaveBeenCalledWith('actual text', 'expected text', {});
    });
    it('should use ROUGE-L method', () => {
        jest.mocked(rouge.l).mockReturnValue(0.8);
        const result = (0, rouge_1.handleRougeScore)({
            ...baseParams,
            baseType: 'rouge-l',
        });
        expect(rouge.l).toHaveBeenCalledWith('actual text', 'expected text', {});
        expect(result.pass).toBe(true);
        expect(result.reason).toBe('ROUGE-L score 0.80 is greater than or equal to threshold 0.75');
    });
    it('should use ROUGE-S method', () => {
        jest.mocked(rouge.s).mockReturnValue(0.8);
        const result = (0, rouge_1.handleRougeScore)({
            ...baseParams,
            baseType: 'rouge-s',
        });
        expect(rouge.s).toHaveBeenCalledWith('actual text', 'expected text', {});
        expect(result.pass).toBe(true);
        expect(result.reason).toBe('ROUGE-S score 0.80 is greater than or equal to threshold 0.75');
    });
    it('should throw error if renderedValue is not a string', () => {
        expect(() => (0, rouge_1.handleRougeScore)({
            ...baseParams,
            renderedValue: 123,
        })).toThrow('"rouge" assertion type must be a string value');
    });
});
//# sourceMappingURL=rouge.test.js.map