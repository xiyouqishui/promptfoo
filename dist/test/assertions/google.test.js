"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const assertions_1 = require("../../src/assertions");
const ai_studio_1 = require("../../src/providers/google/ai.studio");
const live_1 = require("../../src/providers/google/live");
const util_1 = require("../../src/providers/google/util");
const vertex_1 = require("../../src/providers/google/vertex");
jest.mock('fs');
jest.mock('path');
const mockedFs = jest.mocked(fs_1.default);
const mockedPath = jest.mocked(path_1.default);
const mockProvider = {
    id: () => 'test-provider',
    config: {
        tools: [
            {
                functionDeclarations: [
                    {
                        name: 'getCurrentTemperature',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                location: { type: 'STRING' },
                                unit: { type: 'STRING', enum: ['Celsius', 'Fahrenheit'] },
                            },
                            required: ['location', 'unit'],
                        },
                    },
                    {
                        name: 'addOne',
                    },
                ],
            },
            {
                googleSearch: {},
            },
        ],
    },
    callApi: async () => ({ output: '' }),
};
describe('Google assertions', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedPath.resolve.mockImplementation((...args) => args[args.length - 1]);
        mockedFs.existsSync.mockReturnValue(true);
    });
    describe('API agnostic handleIsValidFunctionCall assertions', () => {
        it('should pass when vertex/ais function call matches schema', () => {
            const functionOutput = [
                { text: 'test text' },
                {
                    functionCall: {
                        name: 'getCurrentTemperature',
                        args: '{"location": "San Francisco, CA", "unit": "Fahrenheit"}',
                    },
                },
            ];
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, mockProvider.config.tools, {});
            }).not.toThrow();
        });
        it('should pass when Live function call matches schema', () => {
            const functionOutput = {
                toolCall: {
                    functionCalls: [
                        {
                            name: 'getCurrentTemperature',
                            args: '{"location": "San Francisco, CA", "unit": "Fahrenheit"}',
                        },
                    ],
                },
            };
            expect(() => {
                (0, util_1.validateFunctionCall)(JSON.stringify(functionOutput), mockProvider.config.tools, {});
            }).not.toThrow();
        });
        it('should pass when matches schema no args', () => {
            const functionOutput = [
                {
                    functionCall: {
                        name: 'addOne',
                        args: '{}',
                    },
                },
            ];
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, mockProvider.config.tools, {});
            }).not.toThrow();
        });
        it('should fail when doesnt match schema parameters', () => {
            const functionOutput = [
                {
                    functionCall: {
                        name: 'addOne',
                        args: '{"number": 1}',
                    },
                },
            ];
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, mockProvider.config.tools, {});
            }).toThrow('Call to "addOne":\n{"name":"addOne","args":"{\\"number\\": 1}"}\ndoes not match schema:\n{"name":"addOne"}');
        });
        it('should fail when matches schema no args', () => {
            const functionOutput = [
                {
                    functionCall: {
                        name: 'getCurrentTemperature',
                        args: '{}',
                    },
                },
            ];
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, mockProvider.config.tools, {});
            }).toThrow('Call to "getCurrentTemperature":\n{"name":"getCurrentTemperature","args":"{}"}\ndoes not match schema:\n{"name":"getCurrentTemperature","parameters":{"type":"OBJECT","properties":{"location":{"type":"STRING"},"unit":{"type":"STRING","enum":["Celsius","Fahrenheit"]}},"required":["location","unit"]}}');
        });
        it('should load functions from external file', () => {
            const functionOutput = [
                {
                    functionCall: {
                        name: 'getCurrentTemperature',
                        args: '{"location": "San Francisco, CA", "unit": "Fahrenheit"}',
                    },
                },
            ];
            const mockYamlContent = `
      [
        {
          "functionDeclarations": [
            {
              "name": "getCurrentTemperature",
              "parameters": {
                "type": "OBJECT",
                "properties": {
                  "location": {
                    "type": "STRING"
                  },
                  "unit": {
                    "type": "STRING",
                    "enum": ["Celsius", "Fahrenheit"]
                  }
                },
                "required": ["location", "unit"]
              }
            }
          ]
        }
      ]`;
            mockedFs.readFileSync.mockReturnValue(mockYamlContent);
            const fileProvider = {
                ...mockProvider,
                config: {
                    tools: 'file://./test/fixtures/weather_functions.json',
                },
            };
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, fileProvider.config.tools, {});
            }).not.toThrow();
            expect(mockedFs.existsSync).toHaveBeenCalledWith('./test/fixtures/weather_functions.json');
            expect(mockedFs.readFileSync).toHaveBeenCalledWith('./test/fixtures/weather_functions.json', 'utf8');
        });
        it('should render variables in function definitions', () => {
            const functionOutput = [
                {
                    functionCall: {
                        name: 'getCurrentTemperature',
                        args: '{"location": "San Francisco, CA", "unit": "custom_unit"}',
                    },
                },
            ];
            const varProvider = {
                ...mockProvider,
                config: {
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: 'getCurrentTemperature',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            location: { type: 'STRING' },
                                            unit: { type: 'STRING', enum: ['{{unit}}'] },
                                        },
                                        required: ['location', 'unit'],
                                    },
                                },
                            ],
                        },
                    ],
                },
            };
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, varProvider.config.tools, {
                    unit: 'custom_unit',
                });
            }).not.toThrow();
        });
        it('should fail when functions are not defined', () => {
            const functionOutput = [
                {
                    functionCall: {
                        name: 'getCurrentTemperature',
                        args: '{"location": "San Francisco, CA"}',
                    },
                },
            ];
            const emptyProvider = {
                ...mockProvider,
                config: {
                    tools: [],
                },
            };
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, emptyProvider.config.tools, {});
            }).toThrow('Called "getCurrentTemperature", but there is no function with that name');
        });
        it('should fail when function output is not an object', () => {
            const functionOutput = 'not an object';
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, mockProvider.config.tools, {});
            }).toThrow('Google did not return a valid-looking function call');
        });
        it('should fail when function call does not match schema', () => {
            const functionOutput = [
                {
                    functionCall: {
                        name: 'getCurrentTemperature',
                        args: '{"location": "San Francisco, CA"}', // missing required 'unit'
                    },
                },
            ];
            expect(() => {
                (0, util_1.validateFunctionCall)(functionOutput, mockProvider.config.tools, {});
            }).toThrow('Call to "getCurrentTemperature":\n{"name":"getCurrentTemperature","args":"{\\"location\\": \\"San Francisco, CA\\"}"}\ndoes not match schema:\n[{"instancePath":"","schemaPath":"#/required","keyword":"required","params":{"missingProperty":"unit"},"message":"must have required property \'unit\'"}]');
        });
    });
    describe('AI Studio api is-valid-function-call assertion', () => {
        it('should pass for a valid function call with correct arguments', async () => {
            const output = [{ functionCall: { args: '{"x": 10, "y": 20}', name: 'add' } }];
            const provider = new ai_studio_1.AIStudioChatProvider('foo', {
                config: {
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: 'add',
                                    description: 'add numbers',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            x: { type: 'NUMBER' },
                                            y: { type: 'NUMBER' },
                                        },
                                        required: ['x', 'y'],
                                    },
                                },
                            ],
                        },
                        {
                            googleSearch: {},
                        },
                    ],
                },
            });
            const providerResponse = { output };
            const result = await (0, assertions_1.runAssertion)({
                prompt: 'Some prompt',
                provider,
                assertion: {
                    type: 'is-valid-function-call',
                },
                test: {},
                providerResponse,
            });
            expect(result).toMatchObject({
                pass: true,
                reason: 'Assertion passed',
            });
        });
        it('should fail for an invalid function call with incorrect arguments', async () => {
            const output = [
                {
                    functionCall: { args: '{"x": "10", "y": 20}', name: 'add' },
                },
            ];
            const result = await (0, assertions_1.runAssertion)({
                prompt: 'Some prompt',
                provider: new ai_studio_1.AIStudioChatProvider('foo', {
                    config: {
                        tools: [
                            {
                                functionDeclarations: [
                                    {
                                        name: 'add',
                                        parameters: {
                                            type: 'OBJECT',
                                            properties: {
                                                x: { type: 'NUMBER' },
                                                y: { type: 'NUMBER' },
                                            },
                                            required: ['x', 'y'],
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                }),
                assertion: {
                    type: 'is-valid-function-call',
                },
                test: {},
                providerResponse: { output },
            });
            expect(result).toMatchObject({
                pass: false,
                reason: expect.stringContaining('Call to "add":'),
            });
        });
    });
    describe('Vertex api is-valid-function-call assertion', () => {
        it('should pass for a valid function call with correct arguments', async () => {
            const output = [{ functionCall: { args: '{"x": 10, "y": 20}', name: 'add' } }];
            const provider = new vertex_1.VertexChatProvider('foo', {
                config: {
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: 'add',
                                    description: 'add numbers',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            x: { type: 'NUMBER' },
                                            y: { type: 'NUMBER' },
                                        },
                                        required: ['x', 'y'],
                                    },
                                },
                            ],
                        },
                        {
                            googleSearch: {},
                        },
                    ],
                },
            });
            const providerResponse = { output };
            const result = await (0, assertions_1.runAssertion)({
                prompt: 'Some prompt',
                provider,
                assertion: {
                    type: 'is-valid-function-call',
                },
                test: {},
                providerResponse,
            });
            expect(result).toMatchObject({
                pass: true,
                reason: 'Assertion passed',
            });
        });
        it('should fail for an invalid function call with incorrect arguments', async () => {
            const output = [
                {
                    functionCall: { args: '{"x": "10", "y": 20}', name: 'add' },
                },
            ];
            const result = await (0, assertions_1.runAssertion)({
                prompt: 'Some prompt',
                provider: new vertex_1.VertexChatProvider('foo', {
                    config: {
                        tools: [
                            {
                                functionDeclarations: [
                                    {
                                        name: 'add',
                                        parameters: {
                                            type: 'OBJECT',
                                            properties: {
                                                x: { type: 'NUMBER' },
                                                y: { type: 'NUMBER' },
                                            },
                                            required: ['x', 'y'],
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                }),
                assertion: {
                    type: 'is-valid-function-call',
                },
                test: {},
                providerResponse: { output },
            });
            expect(result).toMatchObject({
                pass: false,
                reason: expect.stringContaining('Call to "add":'),
            });
        });
    });
    describe('Live api is-valid-function-call assertion', () => {
        it('should pass for a valid function call with correct arguments', async () => {
            const output = JSON.stringify({
                toolCall: { functionCalls: [{ args: { x: 10, y: 20 }, name: 'add' }] },
            });
            const provider = new live_1.GoogleLiveProvider('foo', {
                config: {
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: 'add',
                                    description: 'add numbers',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            x: { type: 'NUMBER' },
                                            y: { type: 'NUMBER' },
                                        },
                                        required: ['x', 'y'],
                                    },
                                },
                            ],
                        },
                        {
                            googleSearch: {},
                        },
                    ],
                },
            });
            const providerResponse = { output };
            const result = await (0, assertions_1.runAssertion)({
                prompt: 'Some prompt',
                provider,
                assertion: {
                    type: 'is-valid-function-call',
                },
                test: {},
                providerResponse,
            });
            expect(result).toMatchObject({
                pass: true,
                reason: 'Assertion passed',
            });
        });
        it('should fail for an invalid function call with incorrect arguments', async () => {
            const output = JSON.stringify({
                toolCall: { functionCalls: [{ args: '{"x": "10", "y": 20}', name: 'add' }] },
            });
            const result = await (0, assertions_1.runAssertion)({
                prompt: 'Some prompt',
                provider: new live_1.GoogleLiveProvider('foo', {
                    config: {
                        tools: [
                            {
                                functionDeclarations: [
                                    {
                                        name: 'add',
                                        parameters: {
                                            type: 'OBJECT',
                                            properties: {
                                                x: { type: 'NUMBER' },
                                                y: { type: 'NUMBER' },
                                            },
                                            required: ['x', 'y'],
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                }),
                assertion: {
                    type: 'is-valid-function-call',
                },
                test: {},
                providerResponse: { output },
            });
            expect(result).toMatchObject({
                pass: false,
                reason: expect.stringContaining('Call to "add":'),
            });
        });
    });
});
//# sourceMappingURL=google.test.js.map