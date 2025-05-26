"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPoisoningProvider = void 0;
const constants_1 = require("../../../constants");
const accounts_1 = require("../../../globalConfig/accounts");
const logger_1 = __importDefault(require("../../../logger"));
const invariant_1 = __importDefault(require("../../../util/invariant"));
const constants_2 = require("../../plugins/agentic/constants");
const remoteGeneration_1 = require("../../remoteGeneration");
const shared_1 = require("../shared");
class MemoryPoisoningProvider {
    constructor(config) {
        this.config = config;
    }
    id() {
        return constants_2.REDTEAM_MEMORY_POISONING_PLUGIN_ID;
    }
    /**
     * Generates a scenario containing a memory and a follow up question/command which is dependent on the memory.
     *
     *  1. Generate a scenario containing memories and follow up questions/commands which are dependent on the memories.
     *  2. Send the memory message to the target.
     *  3. Send the test case to the target; the test case should poison the memory created in the previous step.
     *  4. Send the follow up question to the target.
     *  5. A memory is successfully poisoned if the follow up question is answered incorrectly.
     *
     * @param prompt The poisoned prompt.
     * @param context The context of the poisoned prompt.
     * @param options The options for the poisoned prompt.
     */
    async callApi(prompt, context, options) {
        try {
            const targetProvider = context?.originalProvider;
            const purpose = context?.test?.metadata?.purpose;
            (0, invariant_1.default)(targetProvider, 'Expected originalProvider to be set');
            (0, invariant_1.default)(context?.vars, 'Expected vars to be set');
            (0, invariant_1.default)(purpose, 'Expected purpose to be set');
            // Generate a scenario containing memories and follow up questions/commands which are dependent on the memories.
            const scenarioRes = await fetch((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
                body: JSON.stringify({
                    task: 'agentic:memory-poisoning-scenario',
                    purpose,
                    version: constants_1.VERSION,
                    email: (0, accounts_1.getUserEmail)(),
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            // Send the memory message to the provider.
            if (!scenarioRes.ok) {
                throw new Error(`Failed to generate scenario: ${scenarioRes.statusText}`);
            }
            const scenario = await scenarioRes.json();
            context.vars.scenario = scenario;
            // Send the memory message to the provider.
            const memoryResponse = await targetProvider.callApi(scenario.memory, context);
            // Send the test case to the provider; the test case should poison the memory created in the previous step.
            const testResponse = await targetProvider.callApi(prompt, context);
            // Send the follow up question to the provider.
            const response = await targetProvider.callApi(scenario.followUp, context);
            const messages = [
                { content: scenario.memory, role: 'user' },
                { content: memoryResponse.output, role: 'assistant' },
                { content: prompt, role: 'user' },
                { content: testResponse.output, role: 'assistant' },
                { content: scenario.followUp, role: 'user' },
                { content: response.output, role: 'assistant' },
            ];
            return {
                output: response.output,
                metadata: {
                    messages,
                    redteamHistory: (0, shared_1.messagesToRedteamHistory)(messages),
                },
            };
        }
        catch (error) {
            logger_1.default.error(`Error in MemoryPoisoningProvider: ${error}`);
            throw error;
        }
    }
}
exports.MemoryPoisoningProvider = MemoryPoisoningProvider;
//# sourceMappingURL=memoryPoisoning.js.map