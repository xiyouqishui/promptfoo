"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSharingEnabled = isSharingEnabled;
exports.determineShareDomain = determineShareDomain;
exports.stripAuthFromUrl = stripAuthFromUrl;
exports.getShareableUrl = getShareableUrl;
exports.createShareableUrl = createShareableUrl;
exports.hasEvalBeenShared = hasEvalBeenShared;
const input_1 = __importDefault(require("@inquirer/input"));
const chalk_1 = __importDefault(require("chalk"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const url_1 = require("url");
const constants_1 = require("./constants");
const envars_1 = require("./envars");
const fetch_1 = require("./fetch");
const accounts_1 = require("./globalConfig/accounts");
const cloud_1 = require("./globalConfig/cloud");
const logger_1 = __importDefault(require("./logger"));
const cloud_2 = require("./util/cloud");
function isSharingEnabled(evalRecord) {
    const sharingConfigOnEval = typeof evalRecord.config.sharing === 'object' ? evalRecord.config.sharing.apiBaseUrl : null;
    const sharingEnvUrl = (0, constants_1.getShareApiBaseUrl)();
    const cloudSharingUrl = cloud_1.cloudConfig.isEnabled() ? cloud_1.cloudConfig.getApiHost() : null;
    if (sharingConfigOnEval) {
        return true;
    }
    if (sharingEnvUrl && !sharingEnvUrl.includes('api.promptfoo.app')) {
        return true;
    }
    if (cloudSharingUrl) {
        return true;
    }
    return false;
}
function determineShareDomain(eval_) {
    const sharing = eval_.config.sharing;
    logger_1.default.debug(`Share config: isCloudEnabled=${cloud_1.cloudConfig.isEnabled()}, sharing=${JSON.stringify(sharing)}, evalId=${eval_.id}`);
    const isPublicShare = !cloud_1.cloudConfig.isEnabled() && (!sharing || sharing === true || !('appBaseUrl' in sharing));
    const envAppBaseUrl = (0, envars_1.getEnvString)('PROMPTFOO_REMOTE_APP_BASE_URL');
    const domain = isPublicShare
        ? envAppBaseUrl || (0, constants_1.getDefaultShareViewBaseUrl)()
        : cloud_1.cloudConfig.isEnabled()
            ? cloud_1.cloudConfig.getAppUrl()
            : typeof sharing === 'object' && sharing.appBaseUrl
                ? sharing.appBaseUrl
                : envAppBaseUrl || (0, constants_1.getDefaultShareViewBaseUrl)();
    logger_1.default.debug(`Share domain determined: domain=${domain}, isPublic=${isPublicShare}`);
    return { domain, isPublicShare };
}
// Helper functions
function getResultSize(result) {
    return Buffer.byteLength(JSON.stringify(result), 'utf8');
}
function findLargestResultSize(results, sampleSize = 1000) {
    // Get the result size of the first sampleSize results
    const sampleSizes = results.slice(0, Math.min(sampleSize, results.length)).map(getResultSize);
    // find the largest result size
    const maxSize = Math.max(...sampleSizes);
    // return the largest result size
    return maxSize;
}
// This sends the eval record to the remote server
async function sendEvalRecord(evalRecord, url, headers) {
    const evalDataWithoutResults = { ...evalRecord, results: [] };
    logger_1.default.debug(`Sending initial eval data to ${url}`);
    const response = await (0, fetch_1.fetchWithProxy)(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(evalDataWithoutResults),
    });
    if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`Failed to send initial eval data to ${url}: ${response.statusText}, body: ${responseBody}`);
    }
    const responseJson = await response.json();
    if (!responseJson.id) {
        throw new Error(`Failed to send initial eval data to ${url}: ${response.statusText}`);
    }
    return responseJson.id;
}
async function sendChunkOfResults(chunk, url, evalId, headers) {
    const targetUrl = `${url}/${evalId}/results`;
    logger_1.default.debug(`Sending chunk of ${chunk.length} results to ${targetUrl}`);
    const stringifiedChunk = JSON.stringify(chunk);
    const response = await (0, fetch_1.fetchWithProxy)(targetUrl, {
        method: 'POST',
        headers,
        body: stringifiedChunk,
    });
    if (!response.ok) {
        const responseBody = await response.text();
        logger_1.default.error(`Failed to send results chunk to ${targetUrl}: status code: ${response.status}, status text: ${response.statusText}, body: ${responseBody}`);
        if (response.status === 413) {
            throw new Error(`Results chunk too large. It contained ${stringifiedChunk.length} bytes. Please reduce the number of results per chunk using the environment variable PROMPTFOO_SHARE_CHUNK_SIZE. Example: PROMPTFOO_SHARE_CHUNK_SIZE=100 promptfoo share`);
        }
        throw new Error(`Failed to send results chunk`);
    }
}
async function rollbackEval(url, evalId, headers) {
    const targetUrl = `${url}/${evalId}`;
    logger_1.default.debug(`Attempting to roll back eval ${evalId} at ${targetUrl}`);
    try {
        const response = await (0, fetch_1.fetchWithProxy)(targetUrl, { method: 'DELETE', headers });
        if (response.ok) {
            logger_1.default.debug(`Successfully rolled back eval ${evalId}`);
        }
        else {
            logger_1.default.warn(`Rollback request returned non-OK status: ${response.statusText}`);
        }
    }
    catch (e) {
        logger_1.default.warn(`Failed to roll back eval ${evalId}: ${e}. You may need to manually delete this eval.`);
    }
}
async function sendChunkedResults(evalRecord, url) {
    const sampleResults = (await evalRecord.fetchResultsBatched(100).next()).value ?? [];
    if (sampleResults.length === 0) {
        logger_1.default.debug(`No results found`);
        return null;
    }
    logger_1.default.debug(`Loaded ${sampleResults.length} sample results to determine chunk size`);
    // Calculate chunk sizes based on sample
    const largestSize = findLargestResultSize(sampleResults);
    logger_1.default.debug(`Largest result size from sample: ${largestSize} bytes`);
    // Determine how many results per chunk
    const TARGET_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    const estimatedResultsPerChunk = (0, envars_1.getEnvInt)('PROMPTFOO_SHARE_CHUNK_SIZE') ??
        Math.max(1, Math.floor(TARGET_CHUNK_SIZE / largestSize));
    logger_1.default.debug(`Estimated results per chunk: ${estimatedResultsPerChunk}`);
    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
    };
    if (cloud_1.cloudConfig.isEnabled()) {
        headers['Authorization'] = `Bearer ${cloud_1.cloudConfig.getApiKey()}`;
    }
    const totalResults = await evalRecord.getResultsCount();
    // Setup progress bar
    const progressBar = new cli_progress_1.default.SingleBar({
        format: 'Sharing | {bar} | {percentage}% | {value}/{total} results',
    }, cli_progress_1.default.Presets.shades_classic);
    progressBar.start(totalResults, 0);
    let evalId;
    try {
        // Send initial data and get eval ID
        evalId = await sendEvalRecord(evalRecord, url, headers);
        logger_1.default.debug(`Initial eval data sent successfully - ${evalId}`);
        // Send chunks using batched cursor
        let currentChunk = [];
        for await (const batch of evalRecord.fetchResultsBatched(estimatedResultsPerChunk)) {
            for (const result of batch) {
                currentChunk.push(result);
                if (currentChunk.length >= estimatedResultsPerChunk) {
                    await sendChunkOfResults(currentChunk, url, evalId, headers);
                    progressBar.increment(currentChunk.length);
                    currentChunk = [];
                }
            }
        }
        // Send final chunk
        if (currentChunk.length > 0) {
            await sendChunkOfResults(currentChunk, url, evalId, headers);
            progressBar.increment(currentChunk.length);
        }
        return evalId;
    }
    catch (e) {
        logger_1.default.error(`Upload failed: ${e}`);
        if (evalId) {
            logger_1.default.info(`Upload failed, rolling back...`);
            await rollbackEval(url, evalId, headers);
        }
        return null;
    }
    finally {
        progressBar.stop();
    }
}
/**
 * Removes authentication information (username and password) from a URL.
 *
 * This function addresses a security concern raised in GitHub issue #1184,
 * where sensitive authentication information was being displayed in the CLI output.
 * By default, we now strip this information to prevent accidental exposure of credentials.
 *
 * @param urlString - The URL string that may contain authentication information.
 * @returns A new URL string with username and password removed, if present.
 *          If URL parsing fails, it returns the original string.
 */
function stripAuthFromUrl(urlString) {
    try {
        const url = new url_1.URL(urlString);
        url.username = '';
        url.password = '';
        return url.toString();
    }
    catch {
        logger_1.default.warn('Failed to parse URL, returning original');
        return urlString;
    }
}
async function handleEmailCollection(evalRecord) {
    if (!process.stdout.isTTY || (0, envars_1.isCI)() || (0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_SHARE_EMAIL_REQUEST')) {
        return;
    }
    let email = (0, accounts_1.getUserEmail)();
    if (!email) {
        email = await (0, input_1.default)({
            message: `${chalk_1.default.bold('Please enter your work email address')} (for managing shared URLs):`,
            validate: (value) => value.includes('@') || 'Please enter a valid email address',
        });
        (0, accounts_1.setUserEmail)(email);
    }
    evalRecord.author = email;
    await evalRecord.save();
}
async function getApiConfig(evalRecord) {
    if (cloud_1.cloudConfig.isEnabled()) {
        const apiBaseUrl = cloud_1.cloudConfig.getApiHost();
        return {
            url: `${apiBaseUrl}/results`,
        };
    }
    const apiBaseUrl = typeof evalRecord.config.sharing === 'object'
        ? evalRecord.config.sharing.apiBaseUrl || (0, constants_1.getShareApiBaseUrl)()
        : (0, constants_1.getShareApiBaseUrl)();
    return {
        url: `${apiBaseUrl}/api/eval`,
    };
}
/**
 * Constructs the shareable URL for an eval.
 * @param eval_ The eval to get the shareable URL for.
 * @param showAuth Whether to show the authentication information in the URL.
 * @returns The shareable URL for the eval.
 */
async function getShareableUrl(eval_, showAuth = false) {
    const { domain } = determineShareDomain(eval_);
    // For custom self-hosted setups, ensure we're using the same domain as the API
    const customDomain = (0, envars_1.getEnvString)('PROMPTFOO_REMOTE_APP_BASE_URL');
    const finalDomain = customDomain || domain;
    const fullUrl = cloud_1.cloudConfig.isEnabled()
        ? `${finalDomain}/eval/${eval_.id}`
        : (0, constants_1.getShareViewBaseUrl)() === (0, constants_1.getDefaultShareViewBaseUrl)() && !customDomain
            ? `${finalDomain}/eval/${eval_.id}`
            : `${finalDomain}/eval/?evalId=${eval_.id}`;
    return showAuth ? fullUrl : stripAuthFromUrl(fullUrl);
}
/**
 * Shares an eval and returns the shareable URL.
 * @param evalRecord The eval to share.
 * @param showAuth Whether to show the authentication information in the URL.
 * @returns The shareable URL for the eval.
 */
async function createShareableUrl(evalRecord, showAuth = false) {
    // 1. Handle email collection
    await handleEmailCollection(evalRecord);
    // 2. Get API configuration
    const { url } = await getApiConfig(evalRecord);
    // 3. Determine if we can use new results format
    const canUseNewResults = cloud_1.cloudConfig.isEnabled();
    logger_1.default.debug(`Sharing with ${url} canUseNewResults: ${canUseNewResults} Use old results: ${evalRecord.useOldResults()}`);
    const evalId = await sendChunkedResults(evalRecord, url);
    if (!evalId) {
        return null;
    }
    logger_1.default.debug(`New eval ID on remote instance: ${evalId}`);
    // Note: Eval ID will differ on self-hosted instance because self-hosted doesn't implement
    // sharing idempotency.
    if (evalId !== evalRecord.id) {
        evalRecord.id = evalId;
    }
    return getShareableUrl(evalRecord, showAuth);
}
/**
 * Checks whether an eval has been shared.
 * @param eval_ The eval to check.
 * @returns True if the eval has been shared, false otherwise.
 */
async function hasEvalBeenShared(eval_) {
    try {
        // GET /api/results/:id
        const res = await (0, cloud_2.makeRequest)(`results/${eval_.id}`, 'GET');
        switch (res.status) {
            // 200: Eval already exists i.e. it has been shared before.
            case 200:
                return true;
            // 404: Eval not found i.e. it has not been shared before.
            case 404:
                return false;
            default:
                throw new Error(`[hasEvalBeenShared]: unexpected API error: ${res.status}\n${res.statusText}`);
        }
    }
    catch (e) {
        logger_1.default.error(`[hasEvalBeenShared]: error checking if eval has been shared: ${e}`);
        return false;
    }
}
//# sourceMappingURL=share.js.map