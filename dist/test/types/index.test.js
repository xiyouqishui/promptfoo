"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const glob_1 = require("glob");
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const types_1 = require("../../src/types");
describe('AssertionSchema', () => {
    it('should validate a basic assertion', () => {
        const basicAssertion = {
            type: 'equals',
            value: 'expected value',
        };
        const result = types_1.AssertionSchema.safeParse(basicAssertion);
        expect(result.success).toBe(true);
    });
    it('should validate an assertion with all optional fields', () => {
        const fullAssertion = {
            type: 'similar',
            value: 'expected value',
            threshold: 0.8,
            weight: 2,
            provider: 'openai:gpt-4o-mini',
            rubricPrompt: 'Custom rubric prompt',
            metric: 'similarity_score',
            transform: 'toLowerCase()',
        };
        const result = types_1.AssertionSchema.safeParse(fullAssertion);
        expect(result.success).toBe(true);
    });
    it('should validate all base assertion types', () => {
        const baseTypes = types_1.BaseAssertionTypesSchema.options;
        baseTypes.forEach((type) => {
            const assertion = {
                type,
                value: 'test value',
            };
            const result = types_1.AssertionSchema.safeParse(assertion);
            expect(result.success).toBe(true);
        });
    });
    it('should validate "not-" prefixed assertion types', () => {
        const notPrefixedAssertion = {
            type: 'not-contains',
            value: 'unwanted value',
        };
        const result = types_1.AssertionSchema.safeParse(notPrefixedAssertion);
        expect(result.success).toBe(true);
    });
    it('should validate assertions with function values', () => {
        const functionAssertion = {
            type: 'equals',
            value: (output) => output === 'expected value',
        };
        const result = types_1.AssertionSchema.safeParse(functionAssertion);
        expect(result.success).toBe(true);
    });
    it('should validate assertions with array values', () => {
        const arrayAssertion = {
            type: 'contains-all',
            value: ['value1', 'value2', 'value3'],
        };
        const result = types_1.AssertionSchema.safeParse(arrayAssertion);
        expect(result.success).toBe(true);
    });
});
describe('VarsSchema', () => {
    it('should validate and transform various types of values', () => {
        expect.assertions(9);
        const testCases = [
            { input: { key: 'string value' }, expected: { key: 'string value' } },
            { input: { key: 42 }, expected: { key: 42 } },
            { input: { key: true }, expected: { key: true } },
            { input: { key: false }, expected: { key: false } },
            { input: { key: ['a', 'b', 'c'] }, expected: { key: ['a', 'b', 'c'] } },
            { input: { key: [1, 2, 3] }, expected: { key: [1, 2, 3] } },
            { input: { key: [true, false] }, expected: { key: [true, false] } },
            { input: { key: [{ nested: 'object' }] }, expected: { key: [{ nested: 'object' }] } },
            {
                input: { key: { arbitrary: 'value', nested: { object: true } } },
                expected: { key: { arbitrary: 'value', nested: { object: true } } },
            },
        ];
        testCases.forEach(({ input, expected }) => {
            expect(types_1.VarsSchema.safeParse(input)).toEqual({ success: true, data: expected });
        });
    });
    it('should throw an error for invalid types', () => {
        expect.assertions(4);
        const invalidCases = [
            { key: null },
            { key: undefined },
            { key: Symbol('test') },
            { key: () => { } },
        ];
        invalidCases.forEach((invalidInput) => {
            expect(() => types_1.VarsSchema.parse(invalidInput)).toThrow(zod_1.z.ZodError);
        });
    });
});
describe('isGradingResult', () => {
    it('should return true for valid grading result object', () => {
        const validResult = {
            pass: true,
            score: 0.8,
            reason: 'Test passed',
        };
        expect((0, types_1.isGradingResult)(validResult)).toBe(true);
    });
    it('should return true for grading result with optional fields', () => {
        const resultWithOptional = {
            pass: false,
            score: 0.2,
            reason: 'Test failed',
            namedScores: { accuracy: 0.5 },
            tokensUsed: { total: 100 },
            componentResults: [],
            assertion: { type: 'equals', value: 'expected' },
            comment: 'Needs improvement',
        };
        expect((0, types_1.isGradingResult)(resultWithOptional)).toBe(true);
    });
    it('should correctly identify valid GradingResult objects', () => {
        const validResults = [
            { pass: true, score: 1, reason: 'Perfect' },
            { pass: false, score: 0, reason: 'Failed', namedScores: { accuracy: 0 } },
            { pass: true, score: 0.5, reason: 'Partial', tokensUsed: { total: 100 } },
            { pass: true, score: 1, reason: 'Good', componentResults: [] },
            { pass: false, score: 0, reason: 'Bad', assertion: null },
            { pass: true, score: 1, reason: 'Excellent', comment: 'Great job!' },
        ];
        validResults.forEach((result) => {
            expect((0, types_1.isGradingResult)(result)).toBe(true);
        });
    });
    it('should return false for null', () => {
        expect((0, types_1.isGradingResult)(null)).toBe(false);
    });
    it('should return false for non-object', () => {
        expect((0, types_1.isGradingResult)('not an object')).toBe(false);
        expect((0, types_1.isGradingResult)(123)).toBe(false);
        expect((0, types_1.isGradingResult)(undefined)).toBe(false);
    });
    it('should return false if missing required fields', () => {
        expect((0, types_1.isGradingResult)({ score: 1, reason: 'test' })).toBe(false);
        expect((0, types_1.isGradingResult)({ pass: true, reason: 'test' })).toBe(false);
        expect((0, types_1.isGradingResult)({ pass: true, score: 1 })).toBe(false);
    });
    it('should correctly identify invalid GradingResult objects', () => {
        const invalidResults = [
            {},
            { pass: 'true', score: 1, reason: 'Invalid pass type' },
            { pass: true, score: '1', reason: 'Invalid score type' },
            { pass: true, score: 1, reason: 42 },
            { pass: true, score: 1, reason: 'Valid', namedScores: 'invalid' },
            { pass: true, score: 1, reason: 'Valid', tokensUsed: 'invalid' },
            { pass: true, score: 1, reason: 'Valid', componentResults: 'invalid' },
            { pass: true, score: 1, reason: 'Valid', assertion: 'invalid' },
            { pass: true, score: 1, reason: 'Valid', comment: 42 },
        ];
        invalidResults.forEach((result) => {
            expect((0, types_1.isGradingResult)(result)).toBe(false);
        });
    });
    it('should return false if fields have wrong types', () => {
        expect((0, types_1.isGradingResult)({
            pass: 'true',
            score: '0.8',
            reason: 123,
        })).toBe(false);
    });
    it('should return false if optional fields have wrong types', () => {
        expect((0, types_1.isGradingResult)({
            pass: true,
            score: 0.8,
            reason: 'test',
            namedScores: 'invalid',
            tokensUsed: 'invalid',
            componentResults: 'invalid',
            assertion: 'invalid',
            comment: 123,
        })).toBe(false);
    });
});
describe('TestCaseSchema assertScoringFunction', () => {
    it('should validate test case with valid file-based scoring function', () => {
        const testCase = {
            description: 'Test with file scoring',
            assertScoringFunction: 'file://path/to/score.js:scoreFunc',
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
    it('should validate test case with valid custom scoring function', () => {
        const testCase = {
            description: 'Test with custom scoring',
            assertScoringFunction: async (scores) => {
                return {
                    pass: scores.accuracy > 0.8,
                    score: scores.accuracy,
                    reason: 'Custom scoring applied',
                };
            },
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
    it('should validate test case with missing assertScoringFunction', () => {
        const testCase = {
            description: 'No scoring function',
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
    it('should validate test case with python file scoring function', () => {
        const testCase = {
            description: 'Python scoring function',
            assertScoringFunction: 'file://path/to/score.py:score_func',
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
    it('should validate test case with typescript file scoring function', () => {
        const testCase = {
            description: 'TypeScript scoring function',
            assertScoringFunction: 'file://path/to/score.ts:scoreFunc',
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
    it('should validate test case with file path containing dots', () => {
        const testCase = {
            description: 'File path with dots',
            assertScoringFunction: 'file://path/to/my.score.js:myNamespace.scoreFunc',
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
    it('should validate test case with absolute file path', () => {
        const testCase = {
            description: 'Absolute file path',
            assertScoringFunction: 'file:///absolute/path/to/score.js:scoreFunc',
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
    it('should validate test case with relative file path', () => {
        const testCase = {
            description: 'Relative file path',
            assertScoringFunction: 'file://./relative/path/score.js:scoreFunc',
            vars: { input: 'test' },
        };
        expect(() => types_1.TestCaseSchema.parse(testCase)).not.toThrow('Invalid test case schema');
    });
});
describe('CommandLineOptionsSchema', () => {
    it('should validate options with filterErrorsOnly string', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
            filterErrorsOnly: 'true',
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).not.toThrow('Invalid command line options');
    });
    it('should validate options without filterErrorsOnly', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).not.toThrow('Invalid command line options');
    });
    it('should validate options with empty filterErrorsOnly string', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
            filterErrorsOnly: '',
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).not.toThrow('Invalid command line options');
    });
    it('should validate options with non-boolean filterErrorsOnly string', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
            filterErrorsOnly: 'errors-only',
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).not.toThrow('Invalid command line options');
    });
    it('should reject options with non-string filterErrorsOnly', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
            filterErrorsOnly: true,
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).toThrow('Expected string, received boolean');
    });
    it('should validate options with filterErrorsOnly and other filter options', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
            filterErrorsOnly: 'true',
            filterFailing: 'true',
            filterFirstN: 5,
            filterMetadata: 'meta',
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).not.toThrow('Invalid command line options');
    });
    it('should validate options with filterErrorsOnly and minimal required fields', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
            filterErrorsOnly: 'true',
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).not.toThrow('Invalid command line options');
    });
    it('should validate options with all possible filter combinations', () => {
        const options = {
            providers: ['provider1'],
            output: ['output1'],
            filterErrorsOnly: 'true',
            filterFailing: 'true',
            filterFirstN: 10,
            filterMetadata: 'metadata',
            filterPattern: 'pattern',
            filterProviders: 'provider1',
            filterSample: 5,
            filterTargets: 'target1',
        };
        expect(() => types_1.CommandLineOptionsSchema.parse(options)).not.toThrow('Invalid command line options');
    });
});
describe('TestSuiteConfigSchema', () => {
    const rootDir = path_1.default.join(__dirname, '../..');
    const configFiles = (0, glob_1.globSync)(`${rootDir}/examples/**/promptfooconfig.{yaml,yml,json}`);
    it('should find configuration files', () => {
        expect(configFiles.length).toBeGreaterThan(0);
    });
    describe('env property', () => {
        it('should validate config with string env values', () => {
            const config = {
                providers: ['provider1'],
                prompts: ['prompt1'],
                env: {
                    API_KEY: 'abc123',
                    DEBUG: 'true',
                },
            };
            expect(() => types_1.TestSuiteConfigSchema.parse(config)).not.toThrow();
        });
        it('should validate config with number env values converted to strings', () => {
            const config = {
                providers: ['provider1'],
                prompts: ['prompt1'],
                env: {
                    PORT: 3000,
                    TIMEOUT: 5000,
                },
            };
            expect(() => types_1.TestSuiteConfigSchema.parse(config)).not.toThrow();
        });
        it('should validate config with boolean env values converted to strings', () => {
            const config = {
                providers: ['provider1'],
                prompts: ['prompt1'],
                env: {
                    DEBUG: true,
                    VERBOSE: false,
                },
            };
            expect(() => types_1.TestSuiteConfigSchema.parse(config)).not.toThrow();
        });
        it('should validate config with undefined env property', () => {
            const config = {
                providers: ['provider1'],
                prompts: ['prompt1'],
            };
            expect(() => types_1.TestSuiteConfigSchema.parse(config)).not.toThrow();
        });
        it('should validate env field with primitive values that get transformed to strings', () => {
            const customEnvVars = {
                CUSTOM_STRING_VALUE: 'string-value',
                CUSTOM_NUMBER_VALUE: 42,
                CUSTOM_BOOLEAN_TRUE: true,
                CUSTOM_BOOLEAN_FALSE: false,
            };
            const recordSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()]).transform(String));
            const recordResult = recordSchema.safeParse(customEnvVars);
            expect(recordResult.success).toBe(true);
            const parsedData = recordResult.success ? recordResult.data : {};
            expect(parsedData.CUSTOM_STRING_VALUE).toBe('string-value');
            expect(parsedData.CUSTOM_NUMBER_VALUE).toBe('42');
            expect(parsedData.CUSTOM_BOOLEAN_TRUE).toBe('true');
            expect(parsedData.CUSTOM_BOOLEAN_FALSE).toBe('false');
            const config = {
                providers: [{ id: 'test-provider' }],
                prompts: ['test prompt'],
                env: customEnvVars,
            };
            const result = types_1.TestSuiteConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
            const testProvider = result.success
                ? {
                    id: 'test-provider',
                    config: { someConfig: true },
                    env: result.data.env,
                }
                : { id: 'test-provider', config: { someConfig: true } };
            expect(Object.keys(testProvider)).toContain('env');
        });
    });
    describe('extensions field', () => {
        const minimalConfig = {
            providers: ['provider1'],
            prompts: ['prompt1'],
        };
        it('should accept null extensions', () => {
            const config = {
                ...minimalConfig,
                extensions: null,
            };
            const result = types_1.TestSuiteConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
        });
        it('should accept undefined extensions (optional field)', () => {
            const config = { ...minimalConfig };
            // Explicitly not setting extensions
            const result = types_1.TestSuiteConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
        });
        it('should accept empty array extensions', () => {
            const config = {
                ...minimalConfig,
                extensions: [],
            };
            const result = types_1.TestSuiteConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
        });
        it('should accept array of extension strings', () => {
            const config = {
                ...minimalConfig,
                extensions: ['file://path/to/extension.js:functionName'],
            };
            const result = types_1.TestSuiteConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
        });
        it('should transform and remove null, undefined, and empty array extensions', () => {
            // We need to use UnifiedConfigSchema for transformation tests
            // since the transform is applied there
            const configs = [
                { ...minimalConfig, extensions: null },
                { ...minimalConfig }, // undefined extensions
                { ...minimalConfig, extensions: [] },
            ];
            configs.forEach((config) => {
                const result = types_1.UnifiedConfigSchema.safeParse(config);
                expect(result.success).toBe(true);
                // Only access data properties if we're sure parsing succeeded
                expect(result).toEqual(expect.objectContaining({
                    success: true,
                    data: expect.not.objectContaining({ extensions: expect.anything() }),
                }));
            });
        });
        it('should keep non-empty extensions arrays', () => {
            const config = {
                ...minimalConfig,
                extensions: ['file://path/to/extension.js:functionName'],
            };
            const result = types_1.UnifiedConfigSchema.safeParse(config);
            expect(result.success).toBe(true);
            // Only access data properties if we're sure parsing succeeded
            expect(result).toEqual(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    extensions: ['file://path/to/extension.js:functionName'],
                }),
            }));
        });
    });
    for (const file of configFiles) {
        it(`should validate ${path_1.default.relative(rootDir, file)}`, async () => {
            const configContent = fs_1.default.readFileSync(file, 'utf8');
            const config = js_yaml_1.default.load(configContent);
            const extendedSchema = types_1.TestSuiteConfigSchema.extend({
                targets: zod_1.z.union([types_1.TestSuiteConfigSchema.shape.providers, zod_1.z.undefined()]),
                providers: zod_1.z.union([types_1.TestSuiteConfigSchema.shape.providers, zod_1.z.undefined()]),
                ...(typeof config.redteam !== 'undefined' && {
                    prompts: zod_1.z.optional(types_1.TestSuiteConfigSchema.shape.prompts),
                }),
            }).refine((data) => {
                const hasTargets = Boolean(data.targets);
                const hasProviders = Boolean(data.providers);
                return (hasTargets && !hasProviders) || (!hasTargets && hasProviders);
            }, {
                message: "Exactly one of 'targets' or 'providers' must be provided, but not both",
            });
            const result = extendedSchema.safeParse(config);
            if (!result.success) {
                console.error(`Validation failed for ${file}:`, result.error);
            }
            expect(result.success).toBe(true);
        });
    }
});
describe('UnifiedConfigSchema extensions handling', () => {
    it('should remove null extensions', () => {
        const config = {
            providers: ['provider1'],
            prompts: ['prompt1'],
            extensions: null,
        };
        const parsed = types_1.UnifiedConfigSchema.parse(config);
        expect(parsed.extensions).toBeUndefined();
    });
    it('should remove undefined extensions', () => {
        const config = {
            providers: ['provider1'],
            prompts: ['prompt1'],
            extensions: undefined,
        };
        const parsed = types_1.UnifiedConfigSchema.parse(config);
        expect(parsed.extensions).toBeUndefined();
    });
    it('should remove empty array extensions', () => {
        const config = {
            providers: ['provider1'],
            prompts: ['prompt1'],
            extensions: [],
        };
        const parsed = types_1.UnifiedConfigSchema.parse(config);
        expect(parsed.extensions).toBeUndefined();
    });
    it('should preserve valid extensions array', () => {
        const config = {
            providers: ['provider1'],
            prompts: ['prompt1'],
            extensions: ['ext1', 'ext2'],
        };
        const parsed = types_1.UnifiedConfigSchema.parse(config);
        expect(parsed.extensions).toEqual(['ext1', 'ext2']);
    });
    it('should transform targets to providers when only targets is present', () => {
        const config = {
            targets: ['target1', 'target2'],
            prompts: ['prompt1'],
        };
        const parsed = types_1.UnifiedConfigSchema.parse(config);
        expect(parsed.providers).toEqual(['target1', 'target2']);
        expect(parsed.targets).toBeUndefined();
    });
    it('should throw an error when both targets and providers are present', () => {
        const config = {
            providers: ['provider1', 'provider2'],
            targets: ['target1', 'target2'],
            prompts: ['prompt1'],
        };
        expect(() => types_1.UnifiedConfigSchema.parse(config)).toThrow("Exactly one of 'targets' or 'providers' must be provided, but not both");
    });
});
describe('TestSuiteSchema', () => {
    const baseTestSuite = {
        providers: [
            {
                id: () => 'mock-provider',
                callApi: () => Promise.resolve({}),
            },
        ],
        prompts: [{ raw: 'Hello, world!', label: 'mock-prompt' }],
    };
    describe('extensions field', () => {
        it('should allow null extensions', () => {
            const suite = {
                providers: [{ id: () => 'provider1' }],
                prompts: [{ raw: 'prompt1', label: 'test' }],
                extensions: null,
            };
            expect(() => types_1.TestSuiteSchema.parse(suite)).not.toThrow();
        });
        it('should allow undefined extensions', () => {
            const suite = {
                providers: [{ id: () => 'provider1' }],
                prompts: [{ raw: 'prompt1', label: 'test' }],
            };
            expect(() => types_1.TestSuiteSchema.parse(suite)).not.toThrow();
        });
        it('should accept valid Python extension paths', () => {
            const validExtensions = [
                'file://path/to/file.py:function_name',
                'file://./relative/path.py:function_name',
                'file:///absolute/path.py:function_name',
            ];
            validExtensions.forEach((extension) => {
                const result = types_1.TestSuiteSchema.safeParse({ ...baseTestSuite, extensions: [extension] });
                expect(result.success).toBe(true);
            });
        });
        it('should accept valid JavaScript extension paths', () => {
            const validExtensions = [
                'file://path/to/file.js:function_name',
                'file://./relative/path.ts:function_name',
                'file:///absolute/path.mjs:function_name',
                'file://path/to/file.cjs:function_name',
            ];
            validExtensions.forEach((extension) => {
                const result = types_1.TestSuiteSchema.safeParse({ ...baseTestSuite, extensions: [extension] });
                expect(result.success).toBe(true);
            });
        });
        it.each([
            ['path/to/file.py:function_name', 'Missing file:// prefix'],
            ['file://path/to/file.txt:function_name', 'Invalid file extension'],
            ['file://path/to/file.py', 'Missing function name'],
            ['file://path/to/file.py:', 'Empty function name'],
            ['file://:function_name', 'Missing file path'],
            ['file://path/to/file.py:function_name:extra_arg', 'Extra argument'],
        ])('should reject invalid extension path: %s (%s)', (extension, reason) => {
            const result = types_1.TestSuiteSchema.safeParse({ ...baseTestSuite, extensions: [extension] });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].message).toMatch(/Extension must/);
        });
        it('should allow an empty array of extensions', () => {
            const result = types_1.TestSuiteSchema.safeParse({ ...baseTestSuite, extensions: [] });
            expect(result.success).toBe(true);
        });
    });
});
//# sourceMappingURL=index.test.js.map