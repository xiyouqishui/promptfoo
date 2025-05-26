"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const invariant_1 = __importDefault(require("../../src/util/invariant"));
describe('invariant', () => {
    it('should not throw when condition is true', () => {
        expect(() => (0, invariant_1.default)(true)).not.toThrow();
        expect(() => (0, invariant_1.default)(1)).not.toThrow();
        expect(() => (0, invariant_1.default)({})).not.toThrow();
    });
    it('should throw when condition is false', () => {
        expect(() => (0, invariant_1.default)(false)).toThrow('Invariant failed');
        expect(() => (0, invariant_1.default)(0)).toThrow('Invariant failed');
        expect(() => (0, invariant_1.default)(null)).toThrow('Invariant failed');
        expect(() => (0, invariant_1.default)(undefined)).toThrow('Invariant failed');
    });
    it('should include the provided message in the error', () => {
        const message = 'Custom error message';
        expect(() => (0, invariant_1.default)(false, message)).toThrow('Invariant failed: Custom error message');
    });
    it('should support message callback functions', () => {
        const getMessage = () => 'Dynamic message';
        expect(() => (0, invariant_1.default)(false, getMessage)).toThrow('Invariant failed: Dynamic message');
    });
    it('should work for type narrowing', () => {
        const value = 'test';
        // This should compile without type errors
        (0, invariant_1.default)(value !== null, 'Value should not be null');
        // After the invariant, TypeScript should know that value is a string
        const length = value.length;
        expect(length).toBe(4);
    });
});
//# sourceMappingURL=invariant.test.js.map