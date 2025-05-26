"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const portkey_1 = require("../../src/providers/portkey");
describe('toKebabCase', () => {
    it('should convert simple camelCase to kebab-case', () => {
        expect((0, portkey_1.toKebabCase)('camelCase')).toBe('camel-case');
        expect((0, portkey_1.toKebabCase)('thisIsSimple')).toBe('this-is-simple');
    });
    it('should handle empty string', () => {
        expect((0, portkey_1.toKebabCase)('')).toBe('');
    });
    it('should handle single word', () => {
        expect((0, portkey_1.toKebabCase)('word')).toBe('word');
        expect((0, portkey_1.toKebabCase)('WORD')).toBe('word');
    });
    it('should preserve existing kebab-case', () => {
        expect((0, portkey_1.toKebabCase)('already-kebab-case')).toBe('already-kebab-case');
    });
    it('should handle single letters', () => {
        expect((0, portkey_1.toKebabCase)('a')).toBe('a');
        expect((0, portkey_1.toKebabCase)('A')).toBe('a');
    });
});
describe('getPortkeyHeaders', () => {
    it('should return headers with correct format for portkey config keys', () => {
        const config = {
            portkeyApiKey: 'test-api-key',
            portkeyCustomHost: 'custom.host.com',
            portkeyMetadata: { key1: 'value1', key2: 'value2' },
        };
        const headers = (0, portkey_1.getPortkeyHeaders)(config);
        expect(headers).toEqual({
            'x-portkey-api-key': 'test-api-key',
            'x-portkey-custom-host': 'custom.host.com',
            'x-portkey-metadata': JSON.stringify({ key1: 'value1', key2: 'value2' }),
        });
    });
    it('should ignore config keys with undefined or null values', () => {
        const config = {
            portkeyApiKey: 'test-api-key',
            portkeyCustomHost: undefined,
            portkeyMetadata: null,
        };
        const headers = (0, portkey_1.getPortkeyHeaders)(config);
        expect(headers).toEqual({
            'x-portkey-api-key': 'test-api-key',
        });
    });
    it('should handle empty config object', () => {
        const config = {};
        const headers = (0, portkey_1.getPortkeyHeaders)(config);
        expect(headers).toEqual({});
    });
    it('should handle non-portkey config keys without modification', () => {
        const config = {
            apiKey: 'test-api-key',
            customHost: 'custom.host.com',
        };
        const headers = (0, portkey_1.getPortkeyHeaders)(config);
        expect(headers).toEqual({
            apiKey: 'test-api-key',
            customHost: 'custom.host.com',
        });
    });
    it('should handle mixed portkey and non-portkey config keys', () => {
        const config = {
            portkeyApiKey: 'test-portkey',
            apiKey: 'test-regular',
            portkeyCustomHost: 'custom.host.com',
            regularSetting: 'value',
        };
        const headers = (0, portkey_1.getPortkeyHeaders)(config);
        expect(headers).toEqual({
            'x-portkey-api-key': 'test-portkey',
            apiKey: 'test-regular',
            'x-portkey-custom-host': 'custom.host.com',
            regularSetting: 'value',
        });
    });
    it('should handle boolean values', () => {
        const config = {
            portkeyFeatureFlag: true,
            portkeyAnotherFlag: false,
        };
        const headers = (0, portkey_1.getPortkeyHeaders)(config);
        expect(headers).toEqual({
            'x-portkey-feature-flag': 'true',
            'x-portkey-another-flag': 'false',
        });
    });
    it('should handle numeric values', () => {
        const config = {
            portkeyTimeout: 1000,
            portkeyRetries: 3,
        };
        const headers = (0, portkey_1.getPortkeyHeaders)(config);
        expect(headers).toEqual({
            'x-portkey-timeout': '1000',
            'x-portkey-retries': '3',
        });
    });
});
//# sourceMappingURL=portkey.test.js.map