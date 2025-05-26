"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiAssistantProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const _1 = require(".");
const logger_1 = __importDefault(require("../../logger"));
const util_1 = require("../../util");
const time_1 = require("../../util/time");
const shared_1 = require("../shared");
const util_2 = require("./util");
class OpenAiAssistantProvider extends _1.OpenAiGenericProvider {
    constructor(assistantId, options = {}) {
        super(assistantId, options);
        this.assistantConfig = options.config || {};
        this.assistantId = assistantId;
    }
    async callApi(prompt, context, callApiOptions) {
        if (!this.getApiKey()) {
            throw new Error('OpenAI API key is not set. Set the OPENAI_API_KEY environment variable or add `apiKey` to the provider config.');
        }
        const openai = new openai_1.default({
            apiKey: this.getApiKey(),
            organization: this.getOrganization(),
            baseURL: this.getApiUrl(),
            maxRetries: 3,
            timeout: shared_1.REQUEST_TIMEOUT_MS,
            defaultHeaders: this.assistantConfig.headers,
        });
        const messages = (0, shared_1.parseChatPrompt)(prompt, [
            {
                role: 'user',
                content: prompt,
                ...(this.assistantConfig.attachments
                    ? { attachments: this.assistantConfig.attachments }
                    : {}),
            },
        ]);
        const body = {
            assistant_id: this.assistantId,
            model: this.assistantConfig.modelName || undefined,
            instructions: this.assistantConfig.instructions || undefined,
            tools: (0, util_1.maybeLoadToolsFromExternalFile)(this.assistantConfig.tools, context?.vars) || undefined,
            metadata: this.assistantConfig.metadata || undefined,
            temperature: this.assistantConfig.temperature || undefined,
            tool_choice: this.assistantConfig.toolChoice || undefined,
            tool_resources: this.assistantConfig.tool_resources || undefined,
            thread: {
                messages,
            },
        };
        logger_1.default.debug(`Calling OpenAI API, creating thread run: ${JSON.stringify(body)}`);
        let run;
        try {
            run = await openai.beta.threads.createAndRun(body);
        }
        catch (err) {
            return (0, util_2.failApiCall)(err);
        }
        logger_1.default.debug(`\tOpenAI thread run API response: ${JSON.stringify(run)}`);
        while (true) {
            const currentRun = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
            if (currentRun.status === 'completed') {
                run = currentRun;
                break;
            }
            if (currentRun.status === 'requires_action') {
                const requiredAction = currentRun.required_action;
                if (requiredAction === null || requiredAction.type !== 'submit_tool_outputs') {
                    run = currentRun;
                    break;
                }
                const functionCallsWithCallbacks = requiredAction.submit_tool_outputs.tool_calls.filter((toolCall) => {
                    return (toolCall.type === 'function' &&
                        toolCall.function.name in (this.assistantConfig.functionToolCallbacks ?? {}));
                });
                if (functionCallsWithCallbacks.length === 0) {
                    run = currentRun;
                    break;
                }
                logger_1.default.debug(`Calling functionToolCallbacks for functions: ${functionCallsWithCallbacks.map(({ function: { name } }) => name)}`);
                const toolOutputs = await Promise.all(functionCallsWithCallbacks.map(async (toolCall) => {
                    logger_1.default.debug(`Calling functionToolCallbacks[${toolCall.function.name}]('${toolCall.function.arguments}')`);
                    const functionResult = await this.assistantConfig.functionToolCallbacks[toolCall.function.name](toolCall.function.arguments);
                    return {
                        tool_call_id: toolCall.id,
                        output: functionResult,
                    };
                }));
                logger_1.default.debug(`Calling OpenAI API, submitting tool outputs for ${currentRun.thread_id}: ${JSON.stringify(toolOutputs)}`);
                try {
                    run = await openai.beta.threads.runs.submitToolOutputs(currentRun.thread_id, currentRun.id, {
                        tool_outputs: toolOutputs,
                    });
                }
                catch (err) {
                    return (0, util_2.failApiCall)(err);
                }
                continue;
            }
            if (currentRun.status === 'failed' ||
                currentRun.status === 'cancelled' ||
                currentRun.status === 'expired') {
                run = currentRun;
                break;
            }
            await (0, time_1.sleep)(1000);
        }
        if (run.status !== 'completed' && run.status !== 'requires_action') {
            if (run.last_error) {
                return {
                    error: `Thread run failed: ${run.last_error.message}`,
                };
            }
            return {
                error: `Thread run failed: ${run.status}`,
            };
        }
        // Get run steps
        logger_1.default.debug(`Calling OpenAI API, getting thread run steps for ${run.thread_id}`);
        let steps;
        try {
            steps = await openai.beta.threads.runs.steps.list(run.thread_id, run.id, {
                order: 'asc',
            });
        }
        catch (err) {
            return (0, util_2.failApiCall)(err);
        }
        logger_1.default.debug(`\tOpenAI thread run steps API response: ${JSON.stringify(steps)}`);
        const outputBlocks = [];
        for (const step of steps.data) {
            if (step.step_details.type === 'message_creation') {
                logger_1.default.debug(`Calling OpenAI API, getting message ${step.id}`);
                let message;
                try {
                    message = await openai.beta.threads.messages.retrieve(run.thread_id, step.step_details.message_creation.message_id);
                }
                catch (err) {
                    return (0, util_2.failApiCall)(err);
                }
                logger_1.default.debug(`\tOpenAI thread run step message API response: ${JSON.stringify(message)}`);
                const content = message.content
                    .map((content) => content.type === 'text' ? content.text.value : `<${content.type} output>`)
                    .join('\n');
                outputBlocks.push(`[${(0, shared_1.toTitleCase)(message.role)}] ${content}`);
            }
            else if (step.step_details.type === 'tool_calls') {
                for (const toolCall of step.step_details.tool_calls) {
                    if (toolCall.type === 'function') {
                        outputBlocks.push(`[Call function ${toolCall.function.name} with arguments ${toolCall.function.arguments}]`);
                        outputBlocks.push(`[Function output: ${toolCall.function.output}]`);
                    }
                    else if (toolCall.type === 'file_search') {
                        outputBlocks.push(`[Ran file search]`);
                    }
                    else if (toolCall.type === 'code_interpreter') {
                        const output = toolCall.code_interpreter.outputs
                            .map((output) => (output.type === 'logs' ? output.logs : `<${output.type} output>`))
                            .join('\n');
                        outputBlocks.push(`[Code interpreter input]`);
                        outputBlocks.push(toolCall.code_interpreter.input);
                        outputBlocks.push(`[Code interpreter output]`);
                        outputBlocks.push(output);
                    }
                    else {
                        outputBlocks.push(`[Unknown tool call type: ${toolCall.type}]`);
                    }
                }
            }
            else {
                outputBlocks.push(`[Unknown step type: ${step.step_details.type}]`);
            }
        }
        return {
            output: outputBlocks.join('\n\n').trim(),
            tokenUsage: (0, util_2.getTokenUsage)(run, false),
        };
    }
}
exports.OpenAiAssistantProvider = OpenAiAssistantProvider;
//# sourceMappingURL=assistant.js.map