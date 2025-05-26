"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../../../src/providers/azure/util");
describe('throwConfigurationError', () => {
    it('throws error with formatted message and docs link', () => {
        const message = 'Test error message';
        expect(() => (0, util_1.throwConfigurationError)(message)).toThrow(`${message}\n\nSee https://www.promptfoo.dev/docs/providers/azure/ to learn more about Azure configuration.`);
    });
});
describe('calculateAzureCost', () => {
    it('calculates cost for valid model and tokens', () => {
        const cost = (0, util_1.calculateAzureCost)('gpt-4', {}, 100, // prompt tokens
        50);
        expect(cost).toBeDefined();
        expect(typeof cost).toBe('number');
    });
    it('returns undefined for unknown model', () => {
        const cost = (0, util_1.calculateAzureCost)('unknown-model', {}, 100, 50);
        expect(cost).toBeUndefined();
    });
    it('returns undefined when tokens are undefined', () => {
        const cost = (0, util_1.calculateAzureCost)('gpt-4', {}, undefined, undefined);
        expect(cost).toBeUndefined();
    });
    it('returns undefined with zero tokens', () => {
        const cost = (0, util_1.calculateAzureCost)('gpt-4', {}, 0, 0);
        expect(cost).toBeUndefined();
    });
    it('handles empty config object', () => {
        const cost = (0, util_1.calculateAzureCost)('gpt-4', {}, 100, 50);
        expect(cost).toBeDefined();
        expect(typeof cost).toBe('number');
    });
    it('handles undefined completion tokens', () => {
        const cost = (0, util_1.calculateAzureCost)('gpt-4', {}, 100, undefined);
        expect(cost).toBeUndefined();
    });
    it('handles undefined prompt tokens', () => {
        const cost = (0, util_1.calculateAzureCost)('gpt-4', {}, undefined, 50);
        expect(cost).toBeUndefined();
    });
});
//# sourceMappingURL=util.test.js.map