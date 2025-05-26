"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradingProvider = getGradingProvider;
exports.getAndCheckProvider = getAndCheckProvider;
exports.matchesSimilarity = matchesSimilarity;
exports.matchesClassification = matchesClassification;
exports.renderLlmRubricPrompt = renderLlmRubricPrompt;
exports.matchesLlmRubric = matchesLlmRubric;
exports.matchesPiScore = matchesPiScore;
exports.matchesFactuality = matchesFactuality;
exports.matchesClosedQa = matchesClosedQa;
exports.matchesGEval = matchesGEval;
exports.matchesAnswerRelevance = matchesAnswerRelevance;
exports.matchesContextRecall = matchesContextRecall;
exports.matchesContextRelevance = matchesContextRelevance;
exports.matchesContextFaithfulness = matchesContextFaithfulness;
exports.matchesSelectBest = matchesSelectBest;
exports.matchesModeration = matchesModeration;
const path_1 = __importDefault(require("path"));
const utils_1 = require("./assertions/utils");
const cliState_1 = __importDefault(require("./cliState"));
const envars_1 = require("./envars");
const logger_1 = __importDefault(require("./logger"));
const prompts_1 = require("./prompts");
const providers_1 = require("./providers");
const defaults_1 = require("./providers/defaults");
const constants_1 = require("./redteam/constants");
const remoteGeneration_1 = require("./redteam/remoteGeneration");
const remoteGrading_1 = require("./remoteGrading");
const remoteScoring_1 = require("./remoteScoring");
const file_1 = require("./util/file");
const fileExtensions_1 = require("./util/fileExtensions");
const invariant_1 = __importDefault(require("./util/invariant"));
const json_1 = require("./util/json");
const templates_1 = require("./util/templates");
class LlmRubricProviderError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LlmRubricProviderError';
    }
}
const nunjucks = (0, templates_1.getNunjucksEngine)(undefined, false, true);
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must be of equal length');
    }
    const dotProduct = vecA.reduce((acc, val, idx) => acc + val * vecB[idx], 0);
    const vecAMagnitude = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const vecBMagnitude = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (vecAMagnitude * vecBMagnitude);
}
async function loadFromProviderOptions(provider) {
    (0, invariant_1.default)(typeof provider === 'object', `Provider must be an object, but received a ${typeof provider}: ${provider}`);
    (0, invariant_1.default)(!Array.isArray(provider), `Provider must be an object, but received an array: ${JSON.stringify(provider)}`);
    (0, invariant_1.default)(provider.id, 'Provider supplied to assertion must have an id');
    // TODO(ian): set basepath if invoked from filesystem config
    return (0, providers_1.loadApiProvider)(provider.id, { options: provider });
}
async function getGradingProvider(type, provider, defaultProvider) {
    let finalProvider;
    if (typeof provider === 'string') {
        // Defined as a string
        finalProvider = await (0, providers_1.loadApiProvider)(provider);
    }
    else if (typeof provider === 'object' && typeof provider.id === 'function') {
        // Defined as an ApiProvider interface
        finalProvider = provider;
    }
    else if (typeof provider === 'object') {
        const typeValue = provider[type];
        if (typeValue) {
            // Defined as embedding, classification, or text record
            finalProvider = await getGradingProvider(type, typeValue, defaultProvider);
        }
        else if (provider.id) {
            // Defined as ProviderOptions
            finalProvider = await loadFromProviderOptions(provider);
        }
        else if (Array.isArray(provider)) {
            throw new Error(`Provider must be an object or string, but received an array.\n\nCheck that the provider ${JSON.stringify(provider[0], null, 2)} is not nested in an array.`);
        }
        else {
            throw new Error(`Invalid provider definition for output type '${type}': ${JSON.stringify(provider, null, 2)}`);
        }
    }
    else {
        finalProvider = defaultProvider;
    }
    return finalProvider;
}
async function getAndCheckProvider(type, provider, defaultProvider, checkName) {
    const matchedProvider = await getGradingProvider(type, provider, defaultProvider);
    if (!matchedProvider) {
        if (defaultProvider) {
            logger_1.default.warn(`No provider of type ${type} found for '${checkName}', falling back to default`);
            return defaultProvider;
        }
        else {
            throw new Error(`No provider of type ${type} found for '${checkName}'`);
        }
    }
    let isValidProviderType = true;
    if (type === 'embedding') {
        isValidProviderType =
            'callEmbeddingApi' in matchedProvider || 'callSimilarityApi' in matchedProvider;
    }
    else if (type === 'classification') {
        isValidProviderType = 'callClassificationApi' in matchedProvider;
    }
    else if (type === 'moderation') {
        isValidProviderType = 'callModerationApi' in matchedProvider;
    }
    if (!isValidProviderType) {
        if (defaultProvider) {
            logger_1.default.warn(`Provider ${matchedProvider.id()} is not a valid ${type} provider for '${checkName}', falling back to default`);
            return defaultProvider;
        }
        else {
            throw new Error(`Provider ${matchedProvider.id()} is not a valid ${type} provider for '${checkName}'`);
        }
    }
    return matchedProvider;
}
function fail(reason, tokensUsed) {
    return {
        pass: false,
        score: 0,
        reason,
        tokensUsed: {
            total: tokensUsed?.total || 0,
            prompt: tokensUsed?.prompt || 0,
            completion: tokensUsed?.completion || 0,
            cached: tokensUsed?.cached || 0,
            completionDetails: tokensUsed?.completionDetails,
        },
    };
}
async function matchesSimilarity(expected, output, threshold, inverse = false, grading) {
    if (cliState_1.default.config?.redteam && (0, remoteGeneration_1.shouldGenerateRemote)()) {
        try {
            return (0, remoteGrading_1.doRemoteGrading)({
                task: 'similar',
                expected,
                output,
                threshold,
                inverse,
            });
        }
        catch (error) {
            return fail(`Could not perform remote grading: ${error}`);
        }
    }
    const finalProvider = (await getAndCheckProvider('embedding', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).embeddingProvider, 'similarity check'));
    let similarity;
    let tokensUsed = {
        total: 0,
        prompt: 0,
        completion: 0,
        cached: 0,
        completionDetails: {
            reasoning: 0,
            acceptedPrediction: 0,
            rejectedPrediction: 0,
        },
    };
    if ('callSimilarityApi' in finalProvider) {
        const similarityResp = await finalProvider.callSimilarityApi(expected, output);
        tokensUsed = {
            ...tokensUsed,
            ...similarityResp.tokenUsage,
        };
        if (similarityResp.error) {
            return fail(similarityResp.error, tokensUsed);
        }
        if (similarityResp.similarity == null) {
            return fail('Unknown error fetching similarity', tokensUsed);
        }
        similarity = similarityResp.similarity;
    }
    else if ('callEmbeddingApi' in finalProvider) {
        const expectedEmbedding = await finalProvider.callEmbeddingApi(expected);
        const outputEmbedding = await finalProvider.callEmbeddingApi(output);
        tokensUsed = {
            total: (expectedEmbedding.tokenUsage?.total || 0) + (outputEmbedding.tokenUsage?.total || 0),
            prompt: (expectedEmbedding.tokenUsage?.prompt || 0) + (outputEmbedding.tokenUsage?.prompt || 0),
            completion: (expectedEmbedding.tokenUsage?.completion || 0) +
                (outputEmbedding.tokenUsage?.completion || 0),
            cached: (expectedEmbedding.tokenUsage?.cached || 0) + (outputEmbedding.tokenUsage?.cached || 0),
            completionDetails: {
                reasoning: (expectedEmbedding.tokenUsage?.completionDetails?.reasoning || 0) +
                    (outputEmbedding.tokenUsage?.completionDetails?.reasoning || 0),
                acceptedPrediction: (expectedEmbedding.tokenUsage?.completionDetails?.acceptedPrediction || 0) +
                    (outputEmbedding.tokenUsage?.completionDetails?.acceptedPrediction || 0),
                rejectedPrediction: (expectedEmbedding.tokenUsage?.completionDetails?.rejectedPrediction || 0) +
                    (outputEmbedding.tokenUsage?.completionDetails?.rejectedPrediction || 0),
            },
        };
        if (expectedEmbedding.error || outputEmbedding.error) {
            return fail(expectedEmbedding.error || outputEmbedding.error || 'Unknown error fetching embeddings', tokensUsed);
        }
        if (!expectedEmbedding.embedding || !outputEmbedding.embedding) {
            return fail('Embedding not found', tokensUsed);
        }
        similarity = cosineSimilarity(expectedEmbedding.embedding, outputEmbedding.embedding);
    }
    else {
        throw new Error('Provider must implement callSimilarityApi or callEmbeddingApi');
    }
    const pass = inverse
        ? similarity <= threshold + Number.EPSILON
        : similarity >= threshold - Number.EPSILON;
    const greaterThanReason = `Similarity ${similarity.toFixed(2)} is greater than threshold ${threshold}`;
    const lessThanReason = `Similarity ${similarity.toFixed(2)} is less than threshold ${threshold}`;
    if (pass) {
        return {
            pass: true,
            score: inverse ? 1 - similarity : similarity,
            reason: inverse ? lessThanReason : greaterThanReason,
            tokensUsed,
        };
    }
    return {
        pass: false,
        score: inverse ? 1 - similarity : similarity,
        reason: inverse ? greaterThanReason : lessThanReason,
        tokensUsed,
    };
}
/**
 *
 * @param expected Expected classification. If undefined, matches any classification.
 * @param output Text to classify.
 * @param threshold Value between 0 and 1. If the expected classification is undefined, the threshold is the minimum score for any classification. If the expected classification is defined, the threshold is the minimum score for that classification.
 * @param grading
 * @returns Pass if the output matches the classification with a score greater than or equal to the threshold.
 */
async function matchesClassification(expected, output, threshold, grading) {
    const finalProvider = (await getAndCheckProvider('classification', grading?.provider, null, 'classification check'));
    const resp = await finalProvider.callClassificationApi(output);
    if (!resp.classification) {
        return fail(resp.error || 'Unknown error fetching classification');
    }
    let score;
    if (expected === undefined) {
        score = Math.max(...Object.values(resp.classification));
    }
    else {
        score = resp.classification[expected] || 0;
    }
    if (score >= threshold - Number.EPSILON) {
        const reason = expected === undefined
            ? `Maximum classification score ${score.toFixed(2)} >= ${threshold}`
            : `Classification ${expected} has score ${score.toFixed(2)} >= ${threshold}`;
        return {
            pass: true,
            score,
            reason,
        };
    }
    return {
        pass: false,
        score,
        reason: `Classification ${expected} has score ${score.toFixed(2)} < ${threshold}`,
    };
}
async function loadRubricPrompt(rubricPrompt, defaultPrompt) {
    if (!rubricPrompt ||
        (typeof rubricPrompt === 'object' && Object.keys(rubricPrompt ?? {}).length === 0)) {
        return defaultPrompt;
    }
    if (typeof rubricPrompt === 'string' &&
        rubricPrompt.startsWith('file://') &&
        (0, fileExtensions_1.isJavascriptFile)(rubricPrompt)) {
        const basePath = cliState_1.default.basePath || '';
        let filePath = rubricPrompt.slice('file://'.length);
        const [pathPart, functionName] = filePath.split(':');
        filePath = path_1.default.resolve(basePath, pathPart);
        rubricPrompt = await (0, utils_1.loadFromJavaScriptFile)(filePath, functionName, []);
    }
    else {
        // Load from external file if needed
        rubricPrompt = (0, file_1.maybeLoadFromExternalFile)(rubricPrompt);
    }
    if (typeof rubricPrompt === 'object') {
        rubricPrompt = JSON.stringify(rubricPrompt);
    }
    (0, invariant_1.default)(typeof rubricPrompt === 'string', 'rubricPrompt must be a string');
    return rubricPrompt;
}
function tryParse(content) {
    if (typeof content === 'object') {
        return content;
    }
    try {
        return JSON.parse(content);
    }
    catch { }
    return content;
}
function splitIntoSentences(text) {
    return text.split('\n').filter((sentence) => sentence.trim() !== '');
}
async function renderLlmRubricPrompt(rubricPrompt, context) {
    // Process the context to ensure objects are properly stringified for nunjucks
    const processedContext = Object.fromEntries(Object.entries(context).map(([key, value]) => {
        if (value && typeof value === 'object') {
            // For arrays, stringify individual elements
            if (Array.isArray(value)) {
                return [
                    key,
                    value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item)),
                ];
            }
            // For objects, stringify the entire object
            return [key, JSON.stringify(value)];
        }
        return [key, value];
    }));
    try {
        // Render every string scalar within the JSON
        // Does not render object keys (only values)
        const parsed = JSON.parse(rubricPrompt, (k, v) => typeof v === 'string' ? nunjucks.renderString(v, processedContext) : v);
        return JSON.stringify(parsed);
    }
    catch {
        // not valid JSON...
        // output a warning?
    }
    // Legacy rendering for non-JSON prompts
    return nunjucks.renderString(rubricPrompt, processedContext);
}
async function matchesLlmRubric(rubric, llmOutput, grading, vars, assertion, options) {
    if (!grading) {
        throw new Error('Cannot grade output without grading config. Specify --grader option or grading config.');
    }
    if (!grading.rubricPrompt && cliState_1.default.config?.redteam && (0, remoteGeneration_1.shouldGenerateRemote)()) {
        return {
            ...(await (0, remoteGrading_1.doRemoteGrading)({
                task: 'llm-rubric',
                rubric,
                output: llmOutput,
                vars: vars || {},
            })),
            assertion,
        };
    }
    const rubricPrompt = await loadRubricPrompt(grading?.rubricPrompt, prompts_1.DEFAULT_GRADING_PROMPT);
    const prompt = await renderLlmRubricPrompt(rubricPrompt, {
        output: tryParse(llmOutput),
        rubric,
        ...(vars || {}),
    });
    const defaultProviders = await (0, defaults_1.getDefaultProviders)();
    const defaultProvider = defaultProviders.llmRubricProvider || defaultProviders.gradingJsonProvider;
    const finalProvider = await getAndCheckProvider('text', grading.provider, defaultProvider, 'llm-rubric check');
    const resp = await finalProvider.callApi(prompt);
    if (resp.error || !resp.output) {
        if (options?.throwOnError) {
            throw new LlmRubricProviderError(resp.error || 'No output');
        }
        return fail(resp.error || 'No output', resp.tokenUsage);
    }
    let jsonObjects = [];
    if (typeof resp.output === 'string') {
        try {
            jsonObjects = (0, json_1.extractJsonObjects)(resp.output);
            if (jsonObjects.length === 0) {
                return fail('Could not extract JSON from llm-rubric response', resp.tokenUsage);
            }
        }
        catch (err) {
            return fail(`llm-rubric produced malformed response: ${err}\n\n${resp.output}`, resp.tokenUsage);
        }
    }
    else if (typeof resp.output === 'object') {
        jsonObjects = [resp.output];
    }
    else {
        return fail('llm-rubric produced malformed response - output must be string or object', resp.tokenUsage);
    }
    // expects properties pass, score, and reason
    const parsed = jsonObjects[0];
    let pass = parsed.pass ?? true;
    if (typeof pass !== 'boolean') {
        pass = /^(true|yes|pass|y)$/i.test(String(pass));
    }
    let score = parsed.score;
    if (typeof score !== 'number') {
        score = Number.isFinite(Number(score)) ? Number(score) : Number(pass);
    }
    const threshold = typeof assertion?.threshold === 'string' ? Number(assertion.threshold) : assertion?.threshold;
    if (typeof threshold === 'number' && Number.isFinite(threshold)) {
        pass = pass && score >= threshold;
    }
    const reason = parsed.reason || (pass ? 'Grading passed' : `Score ${score} below threshold ${threshold}`);
    return {
        assertion,
        pass,
        score,
        reason,
        tokensUsed: {
            total: resp.tokenUsage?.total || 0,
            prompt: resp.tokenUsage?.prompt || 0,
            completion: resp.tokenUsage?.completion || 0,
            cached: resp.tokenUsage?.cached || 0,
            completionDetails: parsed.tokensUsed?.completionDetails || {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
            },
        },
    };
}
async function matchesPiScore(renderedValue, llmInput, llmOutput, assertion) {
    return {
        ...(await (0, remoteScoring_1.doRemoteScoringWithPi)({
            llm_input: llmInput,
            llm_output: llmOutput,
            scoring_spec: [
                {
                    question: renderedValue,
                },
            ],
        }, assertion?.threshold)),
        assertion,
    };
}
async function matchesFactuality(input, expected, output, grading, vars) {
    if (!grading) {
        throw new Error('Cannot grade output without grading config. Specify --grader option or grading config.');
    }
    const rubricPrompt = await loadRubricPrompt(grading?.rubricPrompt, prompts_1.PROMPTFOO_FACTUALITY_PROMPT);
    const prompt = await renderLlmRubricPrompt(rubricPrompt, {
        input,
        ideal: expected,
        completion: tryParse(output),
        ...(vars || {}),
    });
    // Get the appropriate provider
    const finalProvider = await getAndCheckProvider('text', grading.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'factuality check');
    const resp = await finalProvider.callApi(prompt);
    if (resp.error || !resp.output) {
        return fail(resp.error || 'No output', resp.tokenUsage);
    }
    (0, invariant_1.default)(typeof resp.output === 'string', 'factuality produced malformed response');
    // Copied from standard factuality grading prompt
    const categoryDescriptions = {
        A: 'The submitted answer is a subset of the expert answer and is fully consistent with it.',
        B: 'The submitted answer is a superset of the expert answer and is fully consistent with it.',
        C: 'The submitted answer contains all the same details as the expert answer.',
        D: 'There is a disagreement between the submitted answer and the expert answer.',
        E: "The answers differ, but these differences don't matter from the perspective of factuality.",
    };
    // Try to parse as JSON first
    let jsonData = null;
    let jsonError = null;
    try {
        jsonData = (0, json_1.extractFirstJsonObject)(resp.output);
    }
    catch (err) {
        jsonError = err;
        logger_1.default.debug(`JSON parsing failed: ${jsonError.message}`);
    }
    // If JSON parsing succeeded and provided a valid category
    if (jsonData && jsonData.category && typeof jsonData.category === 'string') {
        const option = jsonData.category.trim().toUpperCase();
        if (!/^[A-E]$/.test(option)) {
            return fail(`Invalid category value: ${option}`, resp.tokenUsage);
        }
        const scoreLookup = {
            A: grading.factuality?.subset ?? 1,
            B: grading.factuality?.superset ?? 1,
            C: grading.factuality?.agree ?? 1,
            D: grading.factuality?.disagree ?? 0,
            E: grading.factuality?.differButFactual ?? 1,
        };
        // Determine if this option passes or fails
        const passing = Object.keys(scoreLookup).filter((key) => scoreLookup[key] > 0);
        const failing = Object.keys(scoreLookup).filter((key) => scoreLookup[key] === 0);
        const pass = passing.includes(option) && !failing.includes(option);
        // Use the model's reason if available, otherwise fall back to the category description
        const modelReason = jsonData.reason?.trim();
        const reason = modelReason || `Category ${option}: ${categoryDescriptions[option]}`;
        const score = scoreLookup[option] ?? (pass ? 1 : 0);
        return {
            pass,
            score,
            reason,
            tokensUsed: resp.tokenUsage || {
                total: 0,
                prompt: 0,
                completion: 0,
                cached: 0,
                completionDetails: {
                    reasoning: 0,
                    acceptedPrediction: 0,
                    rejectedPrediction: 0,
                },
            },
        };
    }
    // Fallback to old pattern matching format
    logger_1.default.info('Falling back to legacy pattern matching for factuality check');
    const responseText = resp.output;
    // The preferred output starts like "(A)...", but we also support leading whitespace, lowercase letters, and omitting the first parenthesis.
    const answerMatch = responseText.match(/\s*\(?([a-eA-E])\)/);
    if (!answerMatch) {
        return fail(`Factuality checker output did not match expected format: ${responseText}`, resp.tokenUsage);
    }
    const option = answerMatch[1].toUpperCase();
    let modelReason = responseText;
    const reasonMatch = responseText.match(/\)\s*(.*)/s);
    if (reasonMatch && reasonMatch[1]) {
        modelReason = reasonMatch[1].trim();
    }
    const scoreLookup = {
        A: grading.factuality?.subset ?? 1,
        B: grading.factuality?.superset ?? 1,
        C: grading.factuality?.agree ?? 1,
        D: grading.factuality?.disagree ?? 0,
        E: grading.factuality?.differButFactual ?? 1,
    };
    const passing = Object.keys(scoreLookup).filter((key) => scoreLookup[key] > 0);
    const failing = Object.keys(scoreLookup).filter((key) => scoreLookup[key] === 0);
    const pass = passing.includes(option) && !failing.includes(option);
    const score = scoreLookup[option] ?? (pass ? 1 : 0);
    return {
        pass,
        score,
        reason: modelReason,
        tokensUsed: {
            total: resp.tokenUsage?.total || 0,
            prompt: resp.tokenUsage?.prompt || 0,
            completion: resp.tokenUsage?.completion || 0,
            cached: resp.tokenUsage?.cached || 0,
            completionDetails: resp.tokenUsage?.completionDetails || {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
            },
        },
    };
}
async function matchesClosedQa(input, expected, output, grading, vars) {
    if (!grading) {
        throw new Error('Cannot grade output without grading config. Specify --grader option or grading config.');
    }
    const rubricPrompt = await loadRubricPrompt(grading?.rubricPrompt, prompts_1.OPENAI_CLOSED_QA_PROMPT);
    const prompt = await renderLlmRubricPrompt(rubricPrompt, {
        input,
        criteria: expected,
        completion: tryParse(output),
        ...(vars || {}),
    });
    const finalProvider = await getAndCheckProvider('text', grading.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'model-graded-closedqa check');
    const resp = await finalProvider.callApi(prompt);
    if (resp.error || !resp.output) {
        return fail(resp.error || 'No output', resp.tokenUsage);
    }
    (0, invariant_1.default)(typeof resp.output === 'string', 'model-graded-closedqa produced malformed response');
    try {
        const pass = resp.output.trimEnd().endsWith('Y');
        let reason;
        if (pass) {
            reason = 'The submission meets the criterion';
        }
        else if (resp.output.trimEnd().endsWith('N')) {
            reason = `The submission does not meet the criterion:\n${resp.output}`;
        }
        else {
            reason = `Model grader produced a malformed response:\n${resp.output}`;
        }
        return {
            pass,
            score: pass ? 1 : 0,
            reason,
            tokensUsed: {
                total: resp.tokenUsage?.total || 0,
                prompt: resp.tokenUsage?.prompt || 0,
                completion: resp.tokenUsage?.completion || 0,
                cached: resp.tokenUsage?.cached || 0,
                completionDetails: resp.tokenUsage?.completionDetails || {
                    reasoning: 0,
                    acceptedPrediction: 0,
                    rejectedPrediction: 0,
                },
            },
        };
    }
    catch (err) {
        return fail(`Error parsing output: ${err.message}`, resp.tokenUsage);
    }
}
async function matchesGEval(criteria, input, output, threshold, grading) {
    if (!input) {
        throw Error('No source text to estimate reply');
    }
    const maxScore = 10;
    const textProvider = await getAndCheckProvider('text', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'reply geval check');
    // Step 1: Get evaluation steps using renderLlmRubricPrompt
    const stepsRubricPrompt = typeof grading?.rubricPrompt === 'object' && !Array.isArray(grading?.rubricPrompt)
        ? grading?.rubricPrompt?.['steps']
        : undefined;
    const stepsPrompt = await loadRubricPrompt(stepsRubricPrompt, prompts_1.GEVAL_PROMPT_STEPS);
    const promptSteps = await renderLlmRubricPrompt(stepsPrompt, { criteria });
    const respSteps = await textProvider.callApi(promptSteps);
    let steps;
    try {
        // NOTE: use regexp for reliable, because sometimes LLM wraps response to markdown format ```json...```
        steps = JSON.parse(respSteps.output.match(/\{"steps".+\}/g)[0]).steps;
        if (!steps.length) {
            return fail('LLM does not propose any evaluation step');
        }
    }
    catch {
        return fail(`LLM-proposed evaluation steps are not in JSON format: ${respSteps.output}`);
    }
    // Step 2: Use steps to evaluate using renderLlmRubricPrompt
    const evalRubricPrompt = typeof grading?.rubricPrompt === 'object' && !Array.isArray(grading?.rubricPrompt)
        ? grading?.rubricPrompt?.['evaluate']
        : undefined;
    const evalPrompt = await loadRubricPrompt(evalRubricPrompt, prompts_1.GEVAL_PROMPT_EVALUATE);
    const promptText = await renderLlmRubricPrompt(evalPrompt, {
        criteria,
        steps: steps.join('\n- '),
        maxScore: maxScore.toString(),
        input: tryParse(input),
        output: tryParse(output),
    });
    const resp = await textProvider.callApi(promptText);
    let result;
    try {
        result = JSON.parse(resp.output.match(/\{.+\}/g)[0]);
    }
    catch {
        return fail(`LLM-proposed evaluation result is not in JSON format: ${resp.output}`);
    }
    return {
        pass: result.score / maxScore >= threshold,
        score: result.score / maxScore,
        reason: result.reason,
    };
}
async function matchesAnswerRelevance(input, output, threshold, grading) {
    const embeddingProvider = await getAndCheckProvider('embedding', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).embeddingProvider, 'answer relevancy check');
    const textProvider = await getAndCheckProvider('text', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'answer relevancy check');
    const tokensUsed = {
        total: 0,
        prompt: 0,
        completion: 0,
        cached: 0,
        completionDetails: {
            reasoning: 0,
            acceptedPrediction: 0,
            rejectedPrediction: 0,
        },
    };
    const candidateQuestions = [];
    for (let i = 0; i < 3; i++) {
        // TODO(ian): Parallelize
        const rubricPrompt = await loadRubricPrompt(grading?.rubricPrompt, prompts_1.ANSWER_RELEVANCY_GENERATE);
        const promptText = await renderLlmRubricPrompt(rubricPrompt, { answer: tryParse(output) });
        const resp = await textProvider.callApi(promptText);
        if (resp.error || !resp.output) {
            tokensUsed.total += resp.tokenUsage?.total || 0;
            tokensUsed.prompt += resp.tokenUsage?.prompt || 0;
            tokensUsed.completion += resp.tokenUsage?.completion || 0;
            tokensUsed.cached += resp.tokenUsage?.cached || 0;
            tokensUsed.completionDetails = {
                reasoning: (tokensUsed.completionDetails?.reasoning || 0) +
                    (resp.tokenUsage?.completionDetails?.reasoning || 0),
                acceptedPrediction: (tokensUsed.completionDetails?.acceptedPrediction || 0) +
                    (resp.tokenUsage?.completionDetails?.acceptedPrediction || 0),
                rejectedPrediction: (tokensUsed.completionDetails?.rejectedPrediction || 0) +
                    (resp.tokenUsage?.completionDetails?.rejectedPrediction || 0),
            };
            return fail(resp.error || 'No output', tokensUsed);
        }
        (0, invariant_1.default)(typeof resp.output === 'string', 'answer relevancy check produced malformed response');
        candidateQuestions.push(resp.output);
    }
    (0, invariant_1.default)(typeof embeddingProvider.callEmbeddingApi === 'function', `Provider ${embeddingProvider.id} must implement callEmbeddingApi for similarity check`);
    const inputEmbeddingResp = await embeddingProvider.callEmbeddingApi(input);
    if (inputEmbeddingResp.error || !inputEmbeddingResp.embedding) {
        tokensUsed.total += inputEmbeddingResp.tokenUsage?.total || 0;
        tokensUsed.prompt += inputEmbeddingResp.tokenUsage?.prompt || 0;
        tokensUsed.completion += inputEmbeddingResp.tokenUsage?.completion || 0;
        tokensUsed.cached += inputEmbeddingResp.tokenUsage?.cached || 0;
        tokensUsed.completionDetails = {
            reasoning: (tokensUsed.completionDetails?.reasoning || 0) +
                (inputEmbeddingResp.tokenUsage?.completionDetails?.reasoning || 0),
            acceptedPrediction: (tokensUsed.completionDetails?.acceptedPrediction || 0) +
                (inputEmbeddingResp.tokenUsage?.completionDetails?.acceptedPrediction || 0),
            rejectedPrediction: (tokensUsed.completionDetails?.rejectedPrediction || 0) +
                (inputEmbeddingResp.tokenUsage?.completionDetails?.rejectedPrediction || 0),
        };
        return fail(inputEmbeddingResp.error || 'No embedding', tokensUsed);
    }
    const inputEmbedding = inputEmbeddingResp.embedding;
    const similarities = [];
    for (const question of candidateQuestions) {
        const resp = await embeddingProvider.callEmbeddingApi(question);
        tokensUsed.total += resp.tokenUsage?.total || 0;
        tokensUsed.prompt += resp.tokenUsage?.prompt || 0;
        tokensUsed.completion += resp.tokenUsage?.completion || 0;
        tokensUsed.cached += resp.tokenUsage?.cached || 0;
        tokensUsed.completionDetails = {
            reasoning: (tokensUsed.completionDetails?.reasoning || 0) +
                (resp.tokenUsage?.completionDetails?.reasoning || 0),
            acceptedPrediction: (tokensUsed.completionDetails?.acceptedPrediction || 0) +
                (resp.tokenUsage?.completionDetails?.acceptedPrediction || 0),
            rejectedPrediction: (tokensUsed.completionDetails?.rejectedPrediction || 0) +
                (resp.tokenUsage?.completionDetails?.rejectedPrediction || 0),
        };
        if (resp.error || !resp.embedding) {
            return fail(resp.error || 'No embedding', tokensUsed);
        }
        similarities.push(cosineSimilarity(inputEmbedding, resp.embedding));
    }
    const similarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const pass = similarity >= threshold - Number.EPSILON;
    const greaterThanReason = `Relevance ${similarity.toFixed(2)} is greater than threshold ${threshold}`;
    const lessThanReason = `Relevance ${similarity.toFixed(2)} is less than threshold ${threshold}`;
    if (pass) {
        return {
            pass: true,
            score: similarity,
            reason: greaterThanReason,
            tokensUsed,
        };
    }
    return {
        pass: false,
        score: similarity,
        reason: lessThanReason,
        tokensUsed,
    };
}
async function matchesContextRecall(context, groundTruth, threshold, grading, vars) {
    const textProvider = await getAndCheckProvider('text', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'context recall check');
    const rubricPrompt = await loadRubricPrompt(grading?.rubricPrompt, prompts_1.CONTEXT_RECALL);
    const promptText = await renderLlmRubricPrompt(rubricPrompt, {
        context,
        groundTruth,
        ...(vars || {}),
    });
    const resp = await textProvider.callApi(promptText);
    if (resp.error || !resp.output) {
        return fail(resp.error || 'No output', resp.tokenUsage);
    }
    (0, invariant_1.default)(typeof resp.output === 'string', 'context-recall produced malformed response');
    const sentences = splitIntoSentences(resp.output);
    const numerator = sentences.reduce((acc, sentence) => acc + (sentence.includes(prompts_1.CONTEXT_RECALL_ATTRIBUTED_TOKEN) ? 1 : 0), 0);
    const score = numerator / sentences.length;
    const pass = score >= threshold - Number.EPSILON;
    return {
        pass,
        score,
        reason: pass
            ? `Recall ${score.toFixed(2)} is >= ${threshold}`
            : `Recall ${score.toFixed(2)} is < ${threshold}`,
        tokensUsed: {
            total: resp.tokenUsage?.total || 0,
            prompt: resp.tokenUsage?.prompt || 0,
            completion: resp.tokenUsage?.completion || 0,
            cached: resp.tokenUsage?.cached || 0,
            completionDetails: resp.tokenUsage?.completionDetails || {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
            },
        },
    };
}
async function matchesContextRelevance(question, context, threshold, grading) {
    const textProvider = await getAndCheckProvider('text', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'context relevance check');
    const rubricPrompt = await loadRubricPrompt(grading?.rubricPrompt, prompts_1.CONTEXT_RELEVANCE);
    const promptText = await renderLlmRubricPrompt(rubricPrompt, {
        context,
        query: question,
    });
    const resp = await textProvider.callApi(promptText);
    if (resp.error || !resp.output) {
        return fail(resp.error || 'No output', resp.tokenUsage);
    }
    (0, invariant_1.default)(typeof resp.output === 'string', 'context-relevance produced malformed response');
    const sentences = splitIntoSentences(resp.output);
    const numerator = sentences.reduce((acc, sentence) => acc + (sentence.includes(prompts_1.CONTEXT_RELEVANCE_BAD) ? 0 : 1), 0);
    const score = numerator / sentences.length;
    const pass = score >= threshold - Number.EPSILON;
    return {
        pass,
        score,
        reason: pass
            ? `Relevance ${score.toFixed(2)} is >= ${threshold}`
            : `Relevance ${score.toFixed(2)} is < ${threshold}`,
        tokensUsed: {
            total: resp.tokenUsage?.total || 0,
            prompt: resp.tokenUsage?.prompt || 0,
            completion: resp.tokenUsage?.completion || 0,
            cached: resp.tokenUsage?.cached || 0,
            completionDetails: resp.tokenUsage?.completionDetails || {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
            },
        },
    };
}
async function matchesContextFaithfulness(query, output, context, threshold, grading, vars) {
    const textProvider = await getAndCheckProvider('text', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'faithfulness check');
    if (grading?.rubricPrompt) {
        (0, invariant_1.default)(Array.isArray(grading.rubricPrompt), 'rubricPrompt must be an array');
    }
    const longformPrompt = (typeof grading?.rubricPrompt?.[0] === 'string'
        ? grading?.rubricPrompt?.[0]
        : grading?.rubricPrompt?.[0].content) || prompts_1.CONTEXT_FAITHFULNESS_LONGFORM;
    const nliPrompt = (typeof grading?.rubricPrompt?.[1] === 'string'
        ? grading?.rubricPrompt?.[1]
        : grading?.rubricPrompt?.[1].content) || prompts_1.CONTEXT_FAITHFULNESS_NLI_STATEMENTS;
    let promptText = await renderLlmRubricPrompt(longformPrompt, {
        question: query,
        answer: tryParse(output),
        ...(vars || {}),
    });
    let resp = await textProvider.callApi(promptText);
    if (resp.error || !resp.output) {
        return fail(resp.error || 'No output', resp.tokenUsage);
    }
    (0, invariant_1.default)(typeof resp.output === 'string', 'context-faithfulness produced malformed response');
    const statements = splitIntoSentences(resp.output);
    promptText = await renderLlmRubricPrompt(nliPrompt, {
        context,
        statements,
        ...(vars || {}),
    });
    resp = await textProvider.callApi(promptText);
    if (resp.error || !resp.output) {
        return fail(resp.error || 'No output', resp.tokenUsage);
    }
    (0, invariant_1.default)(typeof resp.output === 'string', 'context-faithfulness produced malformed response');
    let finalAnswer = 'Final verdict for each statement in order:';
    finalAnswer = finalAnswer.toLowerCase();
    let verdicts = resp.output.toLowerCase().trim();
    let score;
    if (verdicts.includes(finalAnswer)) {
        verdicts = verdicts.slice(verdicts.indexOf(finalAnswer) + finalAnswer.length);
        score =
            verdicts.split('.').filter((answer) => answer.trim() !== '' && !answer.includes('yes'))
                .length / statements.length;
    }
    else {
        score = (verdicts.split('verdict: no').length - 1) / statements.length;
    }
    score = 1 - score;
    const pass = score >= threshold - Number.EPSILON;
    return {
        pass,
        score,
        reason: pass
            ? `Faithfulness ${score.toFixed(2)} is >= ${threshold}`
            : `Faithfulness ${score.toFixed(2)} is < ${threshold}`,
        tokensUsed: {
            total: resp.tokenUsage?.total || 0,
            prompt: resp.tokenUsage?.prompt || 0,
            completion: resp.tokenUsage?.completion || 0,
            cached: resp.tokenUsage?.cached || 0,
            completionDetails: resp.tokenUsage?.completionDetails || {
                reasoning: 0,
                acceptedPrediction: 0,
                rejectedPrediction: 0,
            },
        },
    };
}
async function matchesSelectBest(criteria, outputs, grading, vars) {
    (0, invariant_1.default)(outputs.length >= 2, 'select-best assertion must have at least two outputs to compare between');
    const textProvider = await getAndCheckProvider('text', grading?.provider, (await (0, defaults_1.getDefaultProviders)()).gradingProvider, 'select-best check');
    const rubricPrompt = await loadRubricPrompt(grading?.rubricPrompt, prompts_1.SELECT_BEST_PROMPT);
    const promptText = await renderLlmRubricPrompt(rubricPrompt, {
        criteria,
        outputs: outputs.map((o) => tryParse(o)),
        ...(vars || {}),
    });
    const resp = await textProvider.callApi(promptText);
    if (resp.error || !resp.output) {
        return new Array(outputs.length).fill(fail(resp.error || 'No output', resp.tokenUsage));
    }
    (0, invariant_1.default)(typeof resp.output === 'string', 'select-best produced malformed response');
    const firstDigitMatch = resp.output.trim().match(/\d/);
    const verdict = firstDigitMatch ? Number.parseInt(firstDigitMatch[0], 10) : Number.NaN;
    if (Number.isNaN(verdict) || verdict < 0 || verdict >= outputs.length) {
        return new Array(outputs.length).fill(fail(`Invalid select-best verdict: ${verdict}`));
    }
    const tokensUsed = {
        total: resp.tokenUsage?.total || 0,
        prompt: resp.tokenUsage?.prompt || 0,
        completion: resp.tokenUsage?.completion || 0,
        cached: resp.tokenUsage?.cached || 0,
        completionDetails: resp.tokenUsage?.completionDetails || {
            reasoning: 0,
            acceptedPrediction: 0,
            rejectedPrediction: 0,
        },
    };
    return outputs.map((output, index) => {
        if (index === verdict) {
            return {
                pass: true,
                score: 1,
                reason: `Output selected as the best: ${criteria}`,
                tokensUsed,
            };
        }
        else {
            return {
                pass: false,
                score: 0,
                reason: `Output not selected: ${criteria}`,
                tokensUsed,
            };
        }
    });
}
async function matchesModeration({ userPrompt, assistantResponse, categories = [] }, grading) {
    if (!assistantResponse) {
        return {
            pass: true,
            score: 1,
            reason: 'No output to moderate',
        };
    }
    // Get default providers
    const defaultProviders = await (0, defaults_1.getDefaultProviders)();
    // Only try to use Replicate if OpenAI is not available
    const hasOpenAiKey = (0, envars_1.getEnvString)('OPENAI_API_KEY');
    const hasReplicateKey = !hasOpenAiKey && ((0, envars_1.getEnvString)('REPLICATE_API_KEY') || (0, envars_1.getEnvString)('REPLICATE_API_TOKEN'));
    const defaultModerationProvider = hasReplicateKey
        ? await (0, providers_1.loadApiProvider)(constants_1.LLAMA_GUARD_REPLICATE_PROVIDER)
        : defaultProviders.moderationProvider;
    const moderationProvider = (await getAndCheckProvider('moderation', grading?.provider, defaultModerationProvider, 'moderation check'));
    (0, invariant_1.default)(moderationProvider, 'Moderation provider must be defined');
    const resp = await moderationProvider.callModerationApi(userPrompt, assistantResponse);
    if (resp.error) {
        return {
            pass: false,
            score: 0,
            reason: `Moderation API error: ${resp.error}`,
        };
    }
    const { flags } = resp;
    if (!flags || flags.length === 0) {
        return {
            pass: true,
            score: 1,
            reason: 'No moderation flags detected',
        };
    }
    const filteredFlags = categories.length === 0 ? flags : flags.filter((flag) => categories.includes(flag.code));
    if (filteredFlags.length > 0) {
        return {
            pass: false,
            score: 0,
            reason: `Moderation flags detected: ${filteredFlags
                .map((flag) => flag.description)
                .join(', ')}`,
        };
    }
    return {
        pass: true,
        score: 1,
        reason: 'No relevant moderation flags detected',
    };
}
//# sourceMappingURL=matchers.js.map