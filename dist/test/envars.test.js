"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliState_1 = __importDefault(require("../src/cliState"));
const envars_1 = require("../src/envars");
describe('envars', () => {
    const originalEnv = process.env;
    const originalCliState = { ...cliState_1.default };
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        // Reset cliState to empty for each test
        Object.keys(cliState_1.default).forEach((key) => {
            delete cliState_1.default[key];
        });
    });
    afterAll(() => {
        process.env = originalEnv;
        // Restore original cliState
        Object.keys(cliState_1.default).forEach((key) => {
            delete cliState_1.default[key];
        });
        Object.assign(cliState_1.default, originalCliState);
    });
    describe('getEnvar', () => {
        it('should return the value of an existing environment variable', () => {
            process.env.PROMPTFOO_AUTHOR = 'test value';
            expect((0, envars_1.getEnvString)('PROMPTFOO_AUTHOR')).toBe('test value');
        });
        it('should return undefined for a non-existing environment variable', () => {
            expect((0, envars_1.getEnvString)('PROMPTFOO_AUTHOR')).toBeUndefined();
        });
        it('should return the default value for a non-existing environment variable', () => {
            expect((0, envars_1.getEnvString)('PROMPTFOO_AUTHOR', 'default')).toBe('default');
        });
        it('should prioritize cliState.config.env over process.env', () => {
            process.env.OPENAI_API_KEY = 'process-env-key';
            cliState_1.default.config = {
                env: {
                    OPENAI_API_KEY: 'config-env-key',
                },
            };
            expect((0, envars_1.getEnvString)('OPENAI_API_KEY')).toBe('config-env-key');
        });
        it('should convert non-string values from cliState.config.env to strings', () => {
            cliState_1.default.config = {
                env: {
                    OPENAI_TEMPERATURE: 0.7,
                    PROMPTFOO_CACHE_ENABLED: true,
                },
            };
            expect((0, envars_1.getEnvString)('OPENAI_TEMPERATURE')).toBe('0.7');
            expect((0, envars_1.getEnvString)('PROMPTFOO_CACHE_ENABLED')).toBe('true');
        });
        it('should handle HTTP proxy environment variables', () => {
            process.env.HTTP_PROXY = 'http://proxy.example.com:8080';
            process.env.HTTPS_PROXY = 'https://proxy.example.com:8443';
            expect((0, envars_1.getEnvString)('HTTP_PROXY')).toBe('http://proxy.example.com:8080');
            expect((0, envars_1.getEnvString)('HTTPS_PROXY')).toBe('https://proxy.example.com:8443');
        });
        it('should handle provider-specific environment variables', () => {
            process.env.CDP_DOMAIN = 'custom.domain';
            process.env.PORTKEY_API_BASE_URL = 'https://api.portkey.example.com';
            expect((0, envars_1.getEnvString)('CDP_DOMAIN')).toBe('custom.domain');
            expect((0, envars_1.getEnvString)('PORTKEY_API_BASE_URL')).toBe('https://api.portkey.example.com');
        });
        it('should handle arbitrary string keys not defined in EnvVars type', () => {
            process.env.CUSTOM_ENV_VAR = 'custom value';
            expect((0, envars_1.getEnvString)('CUSTOM_ENV_VAR')).toBe('custom value');
        });
    });
    describe('getEnvBool', () => {
        it('should return true for truthy string values', () => {
            ['1', 'true', 'yes', 'yup', 'yeppers'].forEach((value) => {
                process.env.PROMPTFOO_CACHE_ENABLED = value;
                expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(true);
            });
        });
        it('should return false for falsy string values', () => {
            ['0', 'false', 'no', 'nope'].forEach((value) => {
                process.env.PROMPTFOO_CACHE_ENABLED = value;
                expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(false);
            });
        });
        it('should return the default value for a non-existing environment variable', () => {
            expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED', true)).toBe(true);
            expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED', false)).toBe(false);
        });
        it('should return true for uppercase truthy string values', () => {
            ['TRUE', 'YES', 'YUP', 'YEPPERS'].forEach((value) => {
                process.env.PROMPTFOO_CACHE_ENABLED = value;
                expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(true);
            });
        });
        it('should return false for any other string values', () => {
            ['maybe', 'enabled', 'on'].forEach((value) => {
                process.env.PROMPTFOO_CACHE_ENABLED = value;
                expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(false);
            });
        });
        it('should return true when the environment variable is set to "1"', () => {
            process.env.PROMPTFOO_CACHE_ENABLED = '1';
            expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(true);
        });
        it('should return false when the environment variable is set to "0"', () => {
            process.env.PROMPTFOO_CACHE_ENABLED = '0';
            expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(false);
        });
        it('should return false when no default value is provided and the environment variable is not set', () => {
            delete process.env.PROMPTFOO_CACHE_ENABLED;
            expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(false);
        });
        it('should prioritize cliState.config.env over process.env for boolean values', () => {
            process.env.PROMPTFOO_CACHE_ENABLED = 'false';
            cliState_1.default.config = {
                env: {
                    PROMPTFOO_CACHE_ENABLED: true,
                },
            };
            expect((0, envars_1.getEnvBool)('PROMPTFOO_CACHE_ENABLED')).toBe(true);
        });
        it('should handle arbitrary string keys for boolean values', () => {
            process.env.CUSTOM_BOOL_VAR = 'true';
            expect((0, envars_1.getEnvBool)('CUSTOM_BOOL_VAR')).toBe(true);
        });
    });
    describe('getEnvInt', () => {
        it('should return the integer value of an existing environment variable', () => {
            process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT = '42';
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT')).toBe(42);
        });
        it('should return undefined for a non-numeric environment variable', () => {
            process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT = 'not a number';
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT')).toBeUndefined();
        });
        it('should return the default value for a non-existing environment variable', () => {
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT', 100)).toBe(100);
        });
        it('should floor a floating-point number in the environment variable', () => {
            process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT = '42.7';
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT')).toBe(42);
        });
        it('should handle negative numbers', () => {
            process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT = '-42';
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT')).toBe(-42);
        });
        it('should return undefined for empty string', () => {
            process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT = '';
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT')).toBeUndefined();
        });
        it('should return the default value when the environment variable is undefined', () => {
            delete process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT;
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT', 100)).toBe(100);
        });
        it('should return undefined when no default value is provided and the environment variable is not set', () => {
            delete process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT;
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT')).toBeUndefined();
        });
        it('should prioritize cliState.config.env over process.env for integer values', () => {
            process.env.PROMPTFOO_CACHE_MAX_FILE_COUNT = '100';
            cliState_1.default.config = {
                env: {
                    PROMPTFOO_CACHE_MAX_FILE_COUNT: 42,
                },
            };
            expect((0, envars_1.getEnvInt)('PROMPTFOO_CACHE_MAX_FILE_COUNT')).toBe(42);
        });
        it('should handle arbitrary string keys for integer values', () => {
            process.env.CUSTOM_INT_VAR = '123';
            expect((0, envars_1.getEnvInt)('CUSTOM_INT_VAR')).toBe(123);
        });
    });
    describe('getEnvFloat', () => {
        it('should return the float value of an existing environment variable', () => {
            process.env.OPENAI_TEMPERATURE = '3.14';
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE')).toBe(3.14);
        });
        it('should return undefined for a non-numeric environment variable', () => {
            process.env.OPENAI_TEMPERATURE = 'not a number';
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE')).toBeUndefined();
        });
        it('should return the default value for a non-existing environment variable', () => {
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 2.718)).toBe(2.718);
        });
        it('should handle integer values', () => {
            process.env.OPENAI_TEMPERATURE = '42';
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE')).toBe(42);
        });
        it('should handle negative numbers', () => {
            process.env.OPENAI_TEMPERATURE = '-3.14';
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE')).toBe(-3.14);
        });
        it('should return undefined for empty string', () => {
            process.env.OPENAI_TEMPERATURE = '';
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE')).toBeUndefined();
        });
        it('should return the default value when the environment variable is undefined', () => {
            delete process.env.OPENAI_TEMPERATURE;
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE', 2.718)).toBe(2.718);
        });
        it('should return undefined when no default value is provided and the environment variable is not set', () => {
            delete process.env.OPENAI_TEMPERATURE;
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE')).toBeUndefined();
        });
        it('should prioritize cliState.config.env over process.env for float values', () => {
            process.env.OPENAI_TEMPERATURE = '1.0';
            cliState_1.default.config = {
                env: {
                    OPENAI_TEMPERATURE: 0.7,
                },
            };
            expect((0, envars_1.getEnvFloat)('OPENAI_TEMPERATURE')).toBe(0.7);
        });
        it('should handle arbitrary string keys for float values', () => {
            process.env.CUSTOM_FLOAT_VAR = '3.14159';
            expect((0, envars_1.getEnvFloat)('CUSTOM_FLOAT_VAR')).toBe(3.14159);
        });
    });
    describe('isCI', () => {
        const ciEnvironments = [
            'CI',
            'GITHUB_ACTIONS',
            'TRAVIS',
            'CIRCLECI',
            'JENKINS',
            'GITLAB_CI',
            'APPVEYOR',
            'CODEBUILD_BUILD_ID',
            'TF_BUILD',
            'BITBUCKET_COMMIT',
            'BUDDY',
            'BUILDKITE',
            'TEAMCITY_VERSION',
        ];
        beforeEach(() => {
            // Clear all CI-related environment variables before each test
            ciEnvironments.forEach((env) => delete process.env[env]);
        });
        it('should return false when no CI environment variables are set', () => {
            expect((0, envars_1.isCI)()).toBe(false);
        });
        ciEnvironments.forEach((env) => {
            it(`should return true when ${env} is set to 'true'`, () => {
                process.env[env] = 'true';
                expect((0, envars_1.isCI)()).toBe(true);
            });
            it(`should return false when ${env} is set to 'false'`, () => {
                process.env[env] = 'false';
                expect((0, envars_1.isCI)()).toBe(false);
            });
        });
        it('should return true if any CI environment variable is set to true', () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.TRAVIS = 'false';
            expect((0, envars_1.isCI)()).toBe(true);
        });
        it('should prioritize cliState.config.env over process.env for CI detection', () => {
            process.env.CI = 'false';
            cliState_1.default.config = {
                env: {
                    CI: 'true',
                },
            };
            expect((0, envars_1.isCI)()).toBe(true);
        });
    });
});
//# sourceMappingURL=envars.test.js.map