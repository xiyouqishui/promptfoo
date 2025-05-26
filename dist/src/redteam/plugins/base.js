"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedteamGraderBase = exports.RedteamPluginBase = void 0;
exports.parseGeneratedPrompts = parseGeneratedPrompts;
const dedent_1 = __importDefault(require("dedent"));
const cliState_1 = __importDefault(require("../../cliState"));
const logger_1 = __importDefault(require("../../logger"));
const matchers_1 = require("../../matchers");
const util_1 = require("../../util");
const generation_1 = require("../../util/generation");
const invariant_1 = __importDefault(require("../../util/invariant"));
const templates_1 = require("../../util/templates");
const time_1 = require("../../util/time");
const shared_1 = require("../providers/shared");
const util_2 = require("../util");
const util_3 = require("../util");
/**
 * Parses the LLM response of generated prompts into an array of objects.
 *
 * @param generatedPrompts - The LLM response of generated prompts.
 * @returns An array of { prompt: string } objects. Each of these objects represents a test case.
 */
function parseGeneratedPrompts(generatedPrompts) {
    const parsePrompt = (line) => {
        if (!line.toLowerCase().includes('prompt:')) {
            return null;
        }
        let prompt = (0, util_2.removePrefix)(line, 'Prompt');
        // Handle numbered lists with various formats
        prompt = prompt.replace(/^\d+[\.\)\-]?\s*-?\s*/, '');
        // Handle quotes
        prompt = prompt.replace(/^["'](.*)["']$/, '$1');
        // Handle nested quotes
        prompt = prompt.replace(/^'([^']*(?:'{2}[^']*)*)'$/, (_, p1) => p1.replace(/''/g, "'"));
        prompt = prompt.replace(/^"([^"]*(?:"{2}[^"]*)*)"$/, (_, p1) => p1.replace(/""/g, '"'));
        // Strip leading and trailing asterisks
        prompt = prompt.replace(/^\*+/, '').replace(/\*$/, '');
        return prompt.trim();
    };
    // Split by newline or semicolon
    const promptLines = generatedPrompts.split(/[\n;]+/);
    return promptLines
        .map(parsePrompt)
        .filter((prompt) => prompt !== null)
        .map((prompt) => ({ prompt }));
}
/**
 * Abstract base class for creating plugins that generate test cases.
 */
class RedteamPluginBase {
    /**
     * Creates an instance of RedteamPluginBase.
     * @param provider - The API provider used for generating prompts.
     * @param purpose - The purpose of the plugin.
     * @param injectVar - The variable name to inject the generated prompt into.
     * @param config - An optional object of plugin configuration.
     */
    constructor(provider, purpose, injectVar, config = {}) {
        this.provider = provider;
        this.purpose = purpose;
        this.injectVar = injectVar;
        this.config = config;
        /**
         * Whether this plugin can be generated remotely if OpenAI is not available.
         * Defaults to true. Set to false for plugins that use static data sources
         * like datasets, CSVs, or JSON files that don't need remote generation.
         */
        this.canGenerateRemote = true;
        logger_1.default.debug(`RedteamPluginBase initialized with purpose: ${purpose}, injectVar: ${injectVar}`);
    }
    /**
     * Generates test cases based on the plugin's configuration.
     * @param n - The number of test cases to generate.
     * @param delayMs - The delay in milliseconds between plugin API calls.
     * @param templateGetter - A function that returns a promise of a template string.
     * @returns A promise that resolves to an array of TestCase objects.
     */
    async generateTests(n, delayMs = 0, templateGetter = this.getTemplate.bind(this)) {
        logger_1.default.debug(`Generating ${n} test cases`);
        const batchSize = 20;
        /**
         * Generates a batch of prompts using the API provider.
         * @param currentPrompts - The current list of prompts.
         * @returns A promise that resolves to an array of new prompts.
         */
        const generatePrompts = async (currentPrompts) => {
            const remainingCount = n - currentPrompts.length;
            const currentBatchSize = Math.min(remainingCount, batchSize);
            logger_1.default.debug(`Generating batch of ${currentBatchSize} prompts`);
            const nunjucks = (0, templates_1.getNunjucksEngine)();
            const renderedTemplate = nunjucks.renderString(await templateGetter(), {
                purpose: this.purpose,
                n: currentBatchSize,
                examples: this.config.examples,
            });
            const finalTemplate = this.appendModifiers(renderedTemplate);
            const { output: generatedPrompts, error } = await this.provider.callApi(finalTemplate);
            if (delayMs > 0) {
                logger_1.default.debug(`Delaying for ${delayMs}ms`);
                await (0, time_1.sleep)(delayMs);
            }
            if (error) {
                logger_1.default.error(`Error from API provider, skipping generation for ${this.constructor.name}: ${error}`);
                return [];
            }
            if (typeof generatedPrompts !== 'string') {
                logger_1.default.error(`Malformed response from API provider: Expected generatedPrompts to be a string, got ${typeof generatedPrompts}: ${JSON.stringify(generatedPrompts)}`);
                return [];
            }
            return parseGeneratedPrompts(generatedPrompts);
        };
        const allPrompts = await (0, generation_1.retryWithDeduplication)(generatePrompts, n);
        const prompts = (0, generation_1.sampleArray)(allPrompts, n);
        logger_1.default.debug(`${this.constructor.name} generated test cases from ${prompts.length} prompts`);
        if (prompts.length !== n) {
            logger_1.default.warn(`Expected ${n} prompts, got ${prompts.length} for ${this.constructor.name}`);
        }
        return this.promptsToTestCases(prompts);
    }
    /**
     * Converts an array of { prompt: string } objects into an array of test cases.
     * @param prompts - An array of { prompt: string } objects.
     * @returns An array of test cases.
     */
    promptsToTestCases(prompts) {
        return prompts.sort().map((prompt) => ({
            vars: {
                [this.injectVar]: prompt.prompt,
            },
            assert: this.getAssertions(prompt.prompt),
            metadata: {
                pluginId: (0, util_2.getShortPluginId)(this.id),
            },
        }));
    }
    /**
     * Appends modifiers to the template.
     * @param template - The template to append modifiers to.
     * @returns The modified template.
     */
    appendModifiers(template) {
        // Take everything under "modifiers" config key
        const modifiers = this.config.modifiers ?? {};
        // `language` is a special top-level config field
        if (this.config.language) {
            (0, invariant_1.default)(typeof this.config.language === 'string', 'language must be a string');
            modifiers.language = this.config.language;
        }
        // No modifiers
        if (Object.keys(modifiers).length === 0 ||
            Object.values(modifiers).every((value) => typeof value === 'undefined' || value === '')) {
            return template;
        }
        // Append all modifiers
        const modifierSection = Object.entries(modifiers)
            .filter(([key, value]) => typeof value !== 'undefined' && value !== '')
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        return (0, dedent_1.default) `
      ${template.trim()}

      CRITICAL: Ensure all generated prompts strictly follow these requirements:
      <Modifiers>
      ${modifierSection}
      </Modifiers>
      Rewrite ALL prompts to fully comply with the above modifiers.
    `.trim();
    }
}
exports.RedteamPluginBase = RedteamPluginBase;
/**
 * Base class for all redteam graders.
 *
 * Each grader should implement an id (e.g. `promptfoo:redteam:foo`) and a rubric (grading prompt).
 * By default, the rubric is passed to `llm-rubric` grader.
 *
 * But if you'd like, you can override the `getResult` method to use a different grading method.
 */
class RedteamGraderBase {
    renderRubric(vars) {
        const nunjucks = (0, templates_1.getNunjucksEngine)(undefined, true /* throwOnUndefined */);
        try {
            return nunjucks.renderString(this.rubric, vars);
        }
        catch (error) {
            const extractedVars = (0, templates_1.extractVariablesFromTemplate)(this.rubric);
            const missingVars = extractedVars.filter((v) => !(v in vars));
            const availableVars = extractedVars.filter((v) => v in vars);
            const nullOrUndefinedVars = extractedVars.filter((v) => vars[v] === null || vars[v] === undefined);
            logger_1.default.debug((0, dedent_1.default) `
        Template variables analysis:
        Required variables: ${extractedVars.join(', ')}
        Available variables: ${availableVars.join(', ')}
        Missing variables: ${missingVars.join(', ')}
        Null/undefined variables: ${nullOrUndefinedVars.join(', ')}
      `);
            const err = error;
            throw new Error((0, dedent_1.default) `
        Error rendering rubric template: ${err.message}

        Required variables: ${extractedVars.join(', ')}
        Missing variables: ${missingVars.length > 0 ? missingVars.join(', ') : 'none'}
        Available variables: ${availableVars.join(', ')}
        Null/undefined variables: ${nullOrUndefinedVars.join(', ')}

        Template: ${this.rubric}

        Provided variables:
        ${JSON.stringify(vars, null, 2)}
      `);
        }
    }
    getSuggestions({ test, rawPrompt, renderedValue, }) {
        return [];
    }
    async getResult(prompt, llmOutput, test, provider, renderedValue) {
        (0, invariant_1.default)(test.metadata?.purpose, 'Test is missing purpose metadata');
        const vars = {
            ...test.metadata,
            prompt,
            entities: test.metadata?.entities ?? [],
            tools: provider?.config?.tools
                ? (0, util_1.maybeLoadToolsFromExternalFile)(provider.config.tools)
                : undefined,
            value: renderedValue,
            testVars: test.vars ?? {},
        };
        // Grader examples are appended to all rubrics if present.
        const graderExamples = test.metadata?.pluginConfig?.graderExamples;
        let graderExamplesString = '';
        if (graderExamples && graderExamples.length > 0) {
            graderExamplesString =
                '\n\n' +
                    graderExamples.map((example) => `EXAMPLE OUTPUT: ${JSON.stringify(example)}`).join('\n');
        }
        const finalRubric = this.renderRubric(vars) + graderExamplesString;
        if ((0, util_3.isEmptyResponse)(llmOutput) || (0, util_3.isBasicRefusal)(llmOutput)) {
            return {
                grade: { pass: true, score: 1, reason: 'Model refused the request' },
                rubric: finalRubric,
            };
        }
        const grade = await (0, matchers_1.matchesLlmRubric)(finalRubric, llmOutput, {
            ...test.options,
            provider: await shared_1.redteamProviderManager.getProvider({
                provider: 
                // First try loading the provider from defaultTest, otherwise fall back to the default red team provider.
                cliState_1.default.config?.defaultTest?.provider ||
                    cliState_1.default.config?.defaultTest?.options?.provider?.text ||
                    cliState_1.default.config?.defaultTest?.options?.provider,
                jsonOnly: true,
            }),
        });
        logger_1.default.debug(`Redteam grading result for ${this.id}: - ${JSON.stringify(grade)}`);
        let suggestions;
        if (!grade.pass) {
            // TODO(ian): Need to pass in the user input only
            suggestions = this.getSuggestions({ test, rawPrompt: prompt, renderedValue });
        }
        return { grade, rubric: finalRubric, suggestions };
    }
}
exports.RedteamGraderBase = RedteamGraderBase;
//# sourceMappingURL=base.js.map