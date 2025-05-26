"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUrl = sanitizeUrl;
exports.fetchWithProxy = fetchWithProxy;
exports.fetchWithTimeout = fetchWithTimeout;
exports.isRateLimited = isRateLimited;
exports.handleRateLimit = handleRateLimit;
exports.fetchWithRetries = fetchWithRetries;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const proxy_from_env_1 = require("proxy-from-env");
const undici_1 = require("undici");
const cliState_1 = __importDefault(require("./cliState"));
const constants_1 = require("./constants");
const envars_1 = require("./envars");
const logger_1 = __importDefault(require("./logger"));
const invariant_1 = __importDefault(require("./util/invariant"));
const time_1 = require("./util/time");
function sanitizeUrl(url) {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.username || parsedUrl.password) {
            parsedUrl.username = '***';
            parsedUrl.password = '***';
        }
        return parsedUrl.toString();
    }
    catch {
        return url;
    }
}
async function fetchWithProxy(url, options = {}) {
    let finalUrl = url;
    let finalUrlString;
    if (typeof url === 'string') {
        finalUrlString = url;
    }
    else if (url instanceof URL) {
        finalUrlString = url.toString();
    }
    else if (url instanceof Request) {
        finalUrlString = url.url;
    }
    const finalOptions = {
        ...options,
        headers: {
            ...options.headers,
            'x-promptfoo-version': constants_1.VERSION,
        },
    };
    if (typeof url === 'string') {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.username || parsedUrl.password) {
                if (finalOptions.headers &&
                    'Authorization' in finalOptions.headers) {
                    logger_1.default.warn('Both URL credentials and Authorization header present - URL credentials will be ignored');
                }
                else {
                    // Move credentials to Authorization header
                    const username = parsedUrl.username || '';
                    const password = parsedUrl.password || '';
                    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
                    finalOptions.headers = {
                        ...finalOptions.headers,
                        Authorization: `Basic ${credentials}`,
                    };
                }
                parsedUrl.username = '';
                parsedUrl.password = '';
                finalUrl = parsedUrl.toString();
                finalUrlString = finalUrl.toString();
            }
        }
        catch (e) {
            logger_1.default.debug(`URL parsing failed in fetchWithProxy: ${e}`);
        }
    }
    const tlsOptions = {
        rejectUnauthorized: !(0, envars_1.getEnvBool)('PROMPTFOO_INSECURE_SSL', true),
    };
    // Support custom CA certificates
    const caCertPath = (0, envars_1.getEnvString)('PROMPTFOO_CA_CERT_PATH');
    if (caCertPath) {
        try {
            const resolvedPath = path_1.default.resolve(cliState_1.default.basePath || '', caCertPath);
            const ca = fs_1.default.readFileSync(resolvedPath, 'utf8');
            tlsOptions.ca = ca;
            logger_1.default.debug(`Using custom CA certificate from ${resolvedPath}`);
        }
        catch (e) {
            logger_1.default.warn(`Failed to read CA certificate from ${caCertPath}: ${e}`);
        }
    }
    const proxyUrl = finalUrlString ? (0, proxy_from_env_1.getProxyForUrl)(finalUrlString) : '';
    if (proxyUrl) {
        logger_1.default.debug(`Using proxy: ${sanitizeUrl(proxyUrl)}`);
        const agent = new undici_1.ProxyAgent({
            uri: proxyUrl,
            proxyTls: tlsOptions,
            requestTls: tlsOptions,
        });
        (0, undici_1.setGlobalDispatcher)(agent);
    }
    else {
        const agent = new undici_1.Agent();
        (0, undici_1.setGlobalDispatcher)(agent);
    }
    return fetch(finalUrl, finalOptions);
}
function fetchWithTimeout(url, options = {}, timeout) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const { signal } = controller;
        const timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error(`Request timed out after ${timeout} ms`));
        }, timeout);
        fetchWithProxy(url, {
            ...options,
            signal,
        })
            .then((response) => {
            clearTimeout(timeoutId);
            resolve(response);
        })
            .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
        });
    });
}
/**
 * Check if a response indicates rate limiting
 */
function isRateLimited(response) {
    // These checks helps make sure we set up tests correctly.
    (0, invariant_1.default)(response.headers, 'Response headers are missing');
    (0, invariant_1.default)(response.status, 'Response status is missing');
    // Check for OpenAI specific rate limit headers and status codes
    return (response.headers.get('X-RateLimit-Remaining') === '0' ||
        response.status === 429 ||
        // OpenAI specific error codes
        response.headers.get('x-ratelimit-remaining-requests') === '0' ||
        response.headers.get('x-ratelimit-remaining-tokens') === '0');
}
/**
 * Handle rate limiting by waiting the appropriate amount of time
 */
async function handleRateLimit(response) {
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');
    const retryAfter = response.headers.get('Retry-After');
    // OpenAI specific headers
    const openaiReset = response.headers.get('x-ratelimit-reset-requests') ||
        response.headers.get('x-ratelimit-reset-tokens');
    let waitTime = 60000; // Default wait time of 60 seconds
    if (openaiReset) {
        waitTime = Math.max(Number.parseInt(openaiReset) * 1000, 0);
    }
    else if (rateLimitReset) {
        const resetTime = new Date(Number.parseInt(rateLimitReset) * 1000);
        const now = new Date();
        waitTime = Math.max(resetTime.getTime() - now.getTime() + 1000, 0);
    }
    else if (retryAfter) {
        waitTime = Number.parseInt(retryAfter) * 1000;
    }
    logger_1.default.debug(`Rate limited, waiting ${waitTime}ms before retry`);
    await (0, time_1.sleep)(waitTime);
}
/**
 * Fetch with automatic retries and rate limit handling
 */
async function fetchWithRetries(url, options = {}, timeout, retries = 4) {
    const maxRetries = Math.max(0, retries);
    let lastErrorMessage;
    const backoff = (0, envars_1.getEnvInt)('PROMPTFOO_REQUEST_BACKOFF_MS', 5000);
    for (let i = 0; i <= maxRetries; i++) {
        let response;
        try {
            response = await fetchWithTimeout(url, options, timeout);
            if ((0, envars_1.getEnvBool)('PROMPTFOO_RETRY_5XX') && response.status >= 500 && response.status < 600) {
                throw new Error(`Internal Server Error: ${response.status} ${response.statusText}`);
            }
            if (response && isRateLimited(response)) {
                logger_1.default.debug(`Rate limited on URL ${url}: ${response.status} ${response.statusText}, waiting before retry ${i + 1}/${maxRetries}`);
                await handleRateLimit(response);
                continue;
            }
            return response;
        }
        catch (error) {
            let errorMessage;
            if (error instanceof Error) {
                // Extract as much detail as possible from the error
                const typedError = error;
                errorMessage = `${typedError.name}: ${typedError.message}`;
                if (typedError.cause) {
                    errorMessage += ` (Cause: ${typedError.cause})`;
                }
                if (typedError.code) {
                    // Node.js system errors often have error codes
                    errorMessage += ` (Code: ${typedError.code})`;
                }
            }
            else {
                errorMessage = String(error);
            }
            logger_1.default.debug(`Request to ${url} failed (attempt #${i + 1}), retrying: ${errorMessage}`);
            if (i < maxRetries) {
                const waitTime = Math.pow(2, i) * (backoff + 1000 * Math.random());
                await (0, time_1.sleep)(waitTime);
            }
            lastErrorMessage = errorMessage;
        }
    }
    throw new Error(`Request failed after ${maxRetries} retries: ${lastErrorMessage}`);
}
//# sourceMappingURL=fetch.js.map