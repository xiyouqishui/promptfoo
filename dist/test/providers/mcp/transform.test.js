"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transform_1 = require("../../../src/providers/mcp/transform");
describe('transformMCPToolsToOpenAi', () => {
    it('should transform MCP tools to OpenAI format', () => {
        const mcpTools = [
            {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                    properties: {
                        param1: { type: 'string' },
                        param2: { type: 'number' },
                    },
                    required: ['param1'],
                },
            },
        ];
        const expected = [
            {
                type: 'function',
                function: {
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            param1: { type: 'string' },
                            param2: { type: 'number' },
                        },
                        required: ['param1'],
                    },
                },
            },
        ];
        const result = (0, transform_1.transformMCPToolsToOpenAi)(mcpTools);
        expect(result).toEqual(expected);
    });
    it('should handle tools without properties in schema', () => {
        const mcpTools = [
            {
                name: 'simple_tool',
                description: 'A simple tool',
                inputSchema: {
                    type: 'string',
                },
            },
        ];
        const expected = [
            {
                type: 'function',
                function: {
                    name: 'simple_tool',
                    description: 'A simple tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            type: 'string',
                        },
                    },
                },
            },
        ];
        const result = (0, transform_1.transformMCPToolsToOpenAi)(mcpTools);
        expect(result).toEqual(expected);
    });
    it('should handle empty input schema', () => {
        const mcpTools = [
            {
                name: 'empty_tool',
                description: 'A tool with empty schema',
                inputSchema: {},
            },
        ];
        const expected = [
            {
                type: 'function',
                function: {
                    name: 'empty_tool',
                    description: 'A tool with empty schema',
                    parameters: {
                        type: 'object',
                        properties: {},
                    },
                },
            },
        ];
        const result = (0, transform_1.transformMCPToolsToOpenAi)(mcpTools);
        expect(result).toEqual(expected);
    });
    it('should handle multiple tools', () => {
        const mcpTools = [
            {
                name: 'tool1',
                description: 'First tool',
                inputSchema: {
                    properties: {
                        param1: { type: 'string' },
                    },
                },
            },
            {
                name: 'tool2',
                description: 'Second tool',
                inputSchema: {
                    properties: {
                        param2: { type: 'number' },
                    },
                },
            },
        ];
        const result = (0, transform_1.transformMCPToolsToOpenAi)(mcpTools);
        expect(result).toHaveLength(2);
        expect(result[0].function.name).toBe('tool1');
        expect(result[1].function.name).toBe('tool2');
    });
});
//# sourceMappingURL=transform.test.js.map