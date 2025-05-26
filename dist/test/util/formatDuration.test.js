"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formatDuration_1 = require("../../src/util/formatDuration");
describe('formatDuration', () => {
    it('should format seconds only', () => {
        expect((0, formatDuration_1.formatDuration)(45)).toBe('45s');
        expect((0, formatDuration_1.formatDuration)(0)).toBe('0s');
        expect((0, formatDuration_1.formatDuration)(59)).toBe('59s');
    });
    it('should format minutes and seconds', () => {
        expect((0, formatDuration_1.formatDuration)(60)).toBe('1m 0s');
        expect((0, formatDuration_1.formatDuration)(65)).toBe('1m 5s');
        expect((0, formatDuration_1.formatDuration)(119)).toBe('1m 59s');
        expect((0, formatDuration_1.formatDuration)(600)).toBe('10m 0s');
    });
    it('should format hours, minutes, and seconds', () => {
        expect((0, formatDuration_1.formatDuration)(3600)).toBe('1h 0m 0s');
        expect((0, formatDuration_1.formatDuration)(3661)).toBe('1h 1m 1s');
        expect((0, formatDuration_1.formatDuration)(7382)).toBe('2h 3m 2s');
    });
    it('should handle edge cases correctly', () => {
        // Test with decimal values - should round down
        expect((0, formatDuration_1.formatDuration)(45.9)).toBe('45s');
        // Test with very large values
        expect((0, formatDuration_1.formatDuration)(86400)).toBe('24h 0m 0s'); // 1 day
        expect((0, formatDuration_1.formatDuration)(90061)).toBe('25h 1m 1s'); // 1 day, 1 hour, 1 minute, 1 second
        // Test with string numbers (TypeScript should handle this implicitly)
        expect((0, formatDuration_1.formatDuration)(Number('120'))).toBe('2m 0s');
    });
});
//# sourceMappingURL=formatDuration.test.js.map