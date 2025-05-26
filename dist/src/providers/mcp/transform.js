"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformMCPToolsToOpenAi = transformMCPToolsToOpenAi;
exports.transformMCPToolsToAnthropic = transformMCPToolsToAnthropic;
exports.transformMCPToolsToGoogle = transformMCPToolsToGoogle;
function transformMCPToolsToOpenAi(tools) {
    return tools.map((tool) => {
        const schema = tool.inputSchema;
        let properties = {};
        let required = undefined;
        if (schema && typeof schema === 'object' && 'properties' in schema) {
            properties = schema.properties;
            required = schema.required;
        }
        else {
            properties = schema || {};
        }
        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties,
                    ...(required ? { required } : {}),
                },
            },
        };
    });
}
function transformMCPToolsToAnthropic(tools) {
    return tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
            type: 'object',
            ...tool.inputSchema,
        },
    }));
}
function transformMCPToolsToGoogle(tools) {
    const functionDeclarations = tools.map((tool) => {
        const schema = tool.inputSchema;
        let parameters = { type: 'OBJECT', properties: {} };
        if (schema && typeof schema === 'object' && 'properties' in schema) {
            parameters = { type: 'OBJECT', ...schema };
        }
        else {
            parameters = { type: 'OBJECT', properties: schema || {} };
        }
        return {
            name: tool.name,
            description: tool.description,
            parameters,
        };
    });
    return [{ functionDeclarations }];
}
//# sourceMappingURL=transform.js.map