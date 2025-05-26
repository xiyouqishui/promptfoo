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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache = __importStar(require("../src/cache"));
const evaluator_1 = require("../src/evaluator");
const index = __importStar(require("../src/index"));
const index_1 = require("../src/index");
const eval_1 = __importDefault(require("../src/models/eval"));
const prompts_1 = require("../src/prompts");
const util_1 = require("../src/util");
jest.mock('../src/cache');
jest.mock('../src/database', () => ({
    getDb: jest
        .fn()
        .mockReturnValue({ select: jest.fn(), insert: jest.fn(), transaction: jest.fn() }),
}));
jest.mock('../src/evaluator', () => {
    const originalModule = jest.requireActual('../src/evaluator');
    return {
        ...originalModule,
        evaluate: jest.fn().mockResolvedValue({ results: [] }),
    };
});
jest.mock('../src/migrate');
jest.mock('../src/prompts', () => {
    const originalModule = jest.requireActual('../src/prompts');
    return {
        ...originalModule,
        readProviderPromptMap: jest.fn().mockReturnValue({}),
    };
});
jest.mock('../src/telemetry');
jest.mock('../src/util');
describe('index.ts exports', () => {
    const expectedNamedExports = [
        'assertions',
        'cache',
        'evaluate',
        'generateTable',
        'guardrails',
        'isApiProvider',
        'isGradingResult',
        'isProviderOptions',
        'loadApiProvider',
        'redteam',
    ];
    const expectedSchemaExports = [
        'AssertionSchema',
        'AssertionTypeSchema',
        'AtomicTestCaseSchema',
        'BaseAssertionTypesSchema',
        'BaseTokenUsageSchema',
        'CommandLineOptionsSchema',
        'CompletedPromptSchema',
        'CompletionTokenDetailsSchema',
        'DerivedMetricSchema',
        'NotPrefixedAssertionTypesSchema',
        'OutputConfigSchema',
        'OutputFileExtension',
        'ResultFailureReason',
        'ScenarioSchema',
        'SpecialAssertionTypesSchema',
        'TestCaseSchema',
        'TestCasesWithMetadataPromptSchema',
        'TestCasesWithMetadataSchema',
        'TestCaseWithVarsFileSchema',
        'TestSuiteConfigSchema',
        'TestSuiteSchema',
        'TokenUsageSchema',
        'UnifiedConfigSchema',
        'VarsSchema',
    ];
    it('should export all expected named modules', () => {
        expectedNamedExports.forEach((exportName) => {
            expect(index).toHaveProperty(exportName);
        });
    });
    it('should export all expected schemas', () => {
        expectedSchemaExports.forEach((exportName) => {
            expect(index).toHaveProperty(exportName);
        });
    });
    it('should not have unexpected exports', () => {
        const actualExports = Object.keys(index)
            .filter((key) => key !== 'default')
            .sort();
        expect(actualExports).toEqual([...expectedNamedExports, ...expectedSchemaExports].sort());
    });
    it('redteam should have expected properties', () => {
        expect(index.redteam).toEqual({
            Base: {
                Grader: expect.any(Function),
                Plugin: expect.any(Function),
            },
            Extractors: {
                extractEntities: expect.any(Function),
                extractSystemPurpose: expect.any(Function),
            },
            Graders: expect.any(Object),
            Plugins: expect.any(Object),
            Strategies: expect.any(Object),
        });
    });
    it('default export should match named exports', () => {
        expect(index.default).toEqual({
            assertions: index.assertions,
            cache: index.cache,
            evaluate: index.evaluate,
            guardrails: index.guardrails,
            loadApiProvider: index.loadApiProvider,
            redteam: index.redteam,
        });
    });
    it('should export cache with correct methods', () => {
        expect(cache).toHaveProperty('getCache');
        expect(cache).toHaveProperty('fetchWithCache');
        expect(cache).toHaveProperty('enableCache');
        expect(cache).toHaveProperty('disableCache');
        expect(cache).toHaveProperty('clearCache');
        expect(cache).toHaveProperty('isCacheEnabled');
    });
});
describe('evaluate function', () => {
    it('should handle function prompts correctly', async () => {
        const mockPromptFunction = function testPrompt() {
            return 'Test prompt';
        };
        const testSuite = {
            prompts: [mockPromptFunction],
            providers: [],
            tests: [],
        };
        await index.evaluate(testSuite);
        expect(prompts_1.readProviderPromptMap).toHaveBeenCalledWith(testSuite, [
            {
                raw: mockPromptFunction.toString(),
                label: 'testPrompt',
                function: mockPromptFunction,
            },
        ]);
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.objectContaining({
            prompts: [
                {
                    raw: mockPromptFunction.toString(),
                    label: 'testPrompt',
                    function: mockPromptFunction,
                },
            ],
            providerPromptMap: {},
        }), expect.anything(), expect.objectContaining({
            eventSource: 'library',
        }));
    });
    it('should process different types of prompts correctly', async () => {
        const testSuite = {
            prompts: [
                'string prompt',
                { raw: 'object prompt' },
                function functionPrompt() {
                    return 'function prompt';
                },
            ],
            providers: [],
        };
        await (0, index_1.evaluate)(testSuite);
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.objectContaining({
            prompts: expect.arrayContaining([
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
            ]),
        }), expect.anything(), expect.any(Object));
    });
    it('should resolve nested providers', async () => {
        const testSuite = {
            prompts: ['test prompt'],
            providers: [],
            tests: [{ options: { provider: 'test-provider' } }],
        };
        await (0, index_1.evaluate)(testSuite);
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.objectContaining({
            tests: expect.arrayContaining([
                expect.objectContaining({
                    options: expect.objectContaining({
                        provider: expect.anything(),
                    }),
                }),
            ]),
        }), expect.anything(), expect.anything());
    });
    it('should resolve provider configuration in defaultTest', async () => {
        const testSuite = {
            prompts: ['test prompt'],
            providers: [],
            defaultTest: {
                options: {
                    provider: {
                        id: 'azure:chat:test',
                        config: {
                            apiHost: 'test-host',
                            apiKey: 'test-key',
                        },
                    },
                },
            },
        };
        await (0, index_1.evaluate)(testSuite);
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.objectContaining({
            defaultTest: expect.objectContaining({
                options: expect.objectContaining({
                    provider: expect.anything(),
                }),
            }),
        }), expect.anything(), expect.anything());
    });
    it('should resolve provider configuration in individual tests', async () => {
        const testSuite = {
            prompts: ['test prompt'],
            providers: [],
            tests: [
                {
                    options: {
                        provider: {
                            id: 'azure:chat:test',
                            config: {
                                apiHost: 'test-host',
                                apiKey: 'test-key',
                            },
                        },
                    },
                },
            ],
        };
        await (0, index_1.evaluate)(testSuite);
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.objectContaining({
            tests: expect.arrayContaining([
                expect.objectContaining({
                    options: expect.objectContaining({
                        provider: expect.anything(),
                    }),
                }),
            ]),
        }), expect.anything(), expect.anything());
    });
    it('should resolve provider configuration in assertions', async () => {
        const testSuite = {
            prompts: ['test prompt'],
            providers: [],
            tests: [
                {
                    assert: [
                        {
                            type: 'equals',
                            value: 'expected value',
                            provider: {
                                id: 'azure:chat:test',
                                config: {
                                    apiHost: 'test-host',
                                    apiKey: 'test-key',
                                },
                            },
                        },
                    ],
                },
            ],
        };
        await (0, index_1.evaluate)(testSuite);
        expect(evaluator_1.evaluate).toHaveBeenCalledWith(expect.objectContaining({
            tests: expect.arrayContaining([
                expect.objectContaining({
                    assert: expect.arrayContaining([
                        expect.objectContaining({
                            provider: expect.anything(),
                        }),
                    ]),
                }),
            ]),
        }), expect.anything(), expect.anything());
    });
    it('should disable cache when specified', async () => {
        await (0, index_1.evaluate)({ prompts: ['test'], providers: [] }, { cache: false });
        expect(cache.disableCache).toHaveBeenCalledWith();
    });
    it('should write results to database when writeLatestResults is true', async () => {
        const createEvalSpy = jest.spyOn(eval_1.default, 'create');
        const testSuite = {
            prompts: ['test'],
            providers: [],
            writeLatestResults: true,
        };
        await (0, index_1.evaluate)(testSuite);
        expect(createEvalSpy).toHaveBeenCalledWith(expect.anything(), expect.anything());
        createEvalSpy.mockRestore();
    });
    it('should write output to file when outputPath is set', async () => {
        const testSuite = {
            prompts: ['test'],
            providers: [],
            outputPath: 'test.json',
        };
        await (0, index_1.evaluate)(testSuite);
        expect(util_1.writeOutput).toHaveBeenCalledWith('test.json', expect.any(eval_1.default), null);
    });
    it('should write multiple outputs when outputPath is an array', async () => {
        const testSuite = {
            prompts: ['test'],
            providers: [],
            outputPath: ['test1.json', 'test2.json'],
        };
        await (0, index_1.evaluate)(testSuite);
        expect(util_1.writeMultipleOutputs).toHaveBeenCalledWith(['test1.json', 'test2.json'], expect.any(eval_1.default), null);
    });
});
//# sourceMappingURL=index.test.js.map