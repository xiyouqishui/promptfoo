"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validateAssertions_1 = require("../../src/assertions/validateAssertions");
describe('validateAssertions', () => {
    const test = {
        description: 'The test case',
    };
    describe('asssert-set', () => {
        function testCaseWithAssertSet(assertSet) {
            return {
                ...test,
                assert: [{ type: 'assert-set', ...assertSet }],
            };
        }
        it('does not fail on valid assert-set', () => {
            const test = testCaseWithAssertSet({
                assert: [
                    {
                        type: 'equals',
                        value: 'Expected output',
                    },
                ],
            });
            expect(() => (0, validateAssertions_1.validateAssertions)([test])).not.toThrow();
        });
        it('has assert', () => {
            const test = testCaseWithAssertSet({});
            expect(() => (0, validateAssertions_1.validateAssertions)([test])).toThrow(new validateAssertions_1.AssertValidationError('assert-set must have an `assert` property', test));
        });
        it('has assert as an array', () => {
            const test = testCaseWithAssertSet({ assert: {} });
            expect(() => (0, validateAssertions_1.validateAssertions)([test])).toThrow(new validateAssertions_1.AssertValidationError('assert-set `assert` must be an array of assertions', test));
        });
        it('does not have child assert-sets', () => {
            const test = testCaseWithAssertSet({ assert: [{ type: 'assert-set' }] });
            expect(() => (0, validateAssertions_1.validateAssertions)([test])).toThrow(new validateAssertions_1.AssertValidationError('assert-set must not have child assert-sets', test));
        });
    });
});
//# sourceMappingURL=validateAssertions.test.js.map