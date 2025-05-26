"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyberSecEvalPlugin = exports.PLUGIN_ID = void 0;
const fetch_1 = require("../../fetch");
const logger_1 = __importDefault(require("../../logger"));
const shared_1 = require("../../providers/shared");
const base_1 = require("./base");
exports.PLUGIN_ID = 'promptfoo:redteam:cyberseceval';
const DATASET_URL = 'https://raw.githubusercontent.com/promptfoo/promptfoo/refs/heads/main/examples/cyberseceval/prompt_injection.json';
const DATASET_URL_MULTILINGUAL = 'https://raw.githubusercontent.com/promptfoo/promptfoo/refs/heads/main/examples/cyberseceval/prompt_injection_multilingual.json';
async function fetchDataset(limit, isMultilingual) {
    try {
        const url = isMultilingual ? DATASET_URL_MULTILINGUAL : DATASET_URL;
        const response = await (0, fetch_1.fetchWithTimeout)(url, {}, shared_1.REQUEST_TIMEOUT_MS);
        if (!response.ok) {
            throw new Error(`[CyberSecEval] HTTP status: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json());
        logger_1.default.debug(`[CyberSecEval] Got response from ${DATASET_URL}: ${JSON.stringify(data)}`);
        if (!data || !Array.isArray(data)) {
            throw new Error(`[CyberSecEval] Invalid response from ${DATASET_URL}`);
        }
        // Convert the raw data to test cases and shuffle them
        const testCases = data
            .map((input) => ({
            vars: {
                test_case_prompt: input.test_case_prompt,
                user_input: input.user_input,
                judge_question: input.judge_question,
            },
        }))
            .sort(() => Math.random() - 0.5) // Shuffle the array
            .slice(0, limit); // Take the first n items after shuffling
        logger_1.default.debug(`[CyberSecEval] Generated ${testCases.length} test cases`);
        if (testCases.length === 0) {
            throw new Error(`[CyberSecEval] No test cases generated`);
        }
        return testCases;
    }
    catch (error) {
        logger_1.default.error(`[CyberSecEval] Error fetching dataset: ${error}`);
        return [];
    }
}
class CyberSecEvalPlugin extends base_1.RedteamPluginBase {
    constructor() {
        super(...arguments);
        this.id = exports.PLUGIN_ID;
    }
    async getTemplate() {
        throw new Error('Not implemented');
    }
    getAssertions(prompt) {
        return [
            {
                metric: 'CyberSecEval',
                type: 'llm-rubric',
                value: `${prompt}. If yes, fail. Otherwise, pass.`,
            },
        ];
    }
    async generateTests(n, _delayMs) {
        const testCases = await fetchDataset(n, this.config.multilingual);
        return testCases.map((test) => ({
            vars: {
                [this.injectVar]: JSON.stringify([
                    {
                        role: 'system',
                        content: test.vars.test_case_prompt,
                    },
                    {
                        role: 'user',
                        content: test.vars.user_input,
                    },
                ]),
            },
            assert: [
                {
                    metric: 'CyberSecEval',
                    type: 'llm-rubric',
                    value: `${test.vars.judge_question}. If yes, fail. Otherwise, pass.`,
                },
            ],
        }));
    }
}
exports.CyberSecEvalPlugin = CyberSecEvalPlugin;
CyberSecEvalPlugin.canGenerateRemote = false;
//# sourceMappingURL=cyberseceval.js.map