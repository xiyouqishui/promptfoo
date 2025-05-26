"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpProvider = exports.HttpProviderConfigSchema = void 0;
exports.urlEncodeRawRequestPath = urlEncodeRawRequestPath;
exports.generateSignature = generateSignature;
exports.needsSignatureRefresh = needsSignatureRefresh;
exports.createSessionParser = createSessionParser;
exports.createTransformResponse = createTransformResponse;
exports.processJsonBody = processJsonBody;
exports.processTextBody = processTextBody;
exports.createTransformRequest = createTransformRequest;
exports.determineRequestBody = determineRequestBody;
exports.createValidateStatus = createValidateStatus;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const http_z_1 = __importDefault(require("http-z"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const cache_1 = require("../cache");
const cliState_1 = __importDefault(require("../cliState"));
const esm_1 = require("../esm");
const logger_1 = __importDefault(require("../logger"));
const util_1 = require("../util");
const file_1 = require("../util/file");
const fileExtensions_1 = require("../util/fileExtensions");
const invariant_1 = __importDefault(require("../util/invariant"));
const json_1 = require("../util/json");
const templates_1 = require("../util/templates");
const shared_1 = require("./shared");
// This function is used to encode the URL in the first line of a raw request
function urlEncodeRawRequestPath(rawRequest) {
    const firstLine = rawRequest.split('\n')[0];
    const firstSpace = firstLine.indexOf(' ');
    const method = firstLine.slice(0, firstSpace);
    if (!method || !http_1.default.METHODS.includes(method)) {
        logger_1.default.error(`[Http Provider] HTTP request method ${method} is not valid. From: ${firstLine}`);
        throw new Error(`[Http Provider] HTTP request method ${method} is not valid. From: ${firstLine}`);
    }
    const lastSpace = firstLine.lastIndexOf(' ');
    if (lastSpace === -1) {
        logger_1.default.error(`[Http Provider] HTTP request URL is not valid. Protocol is missing. From: ${firstLine}`);
        throw new Error(`[Http Provider] HTTP request URL is not valid. Protocol is missing. From: ${firstLine}`);
    }
    const url = firstLine.slice(firstSpace + 1, lastSpace);
    if (url.length === 0) {
        logger_1.default.error(`[Http Provider] HTTP request URL is not valid. From: ${firstLine}`);
        throw new Error(`[Http Provider] HTTP request URL is not valid. From: ${firstLine}`);
    }
    const protocol = lastSpace < firstLine.length ? firstLine.slice(lastSpace + 1) : '';
    if (!protocol.toLowerCase().startsWith('http')) {
        logger_1.default.error(`[Http Provider] HTTP request protocol is not valid. From: ${firstLine}`);
        throw new Error(`[Http Provider] HTTP request protocol is not valid. From: ${firstLine}`);
    }
    logger_1.default.debug(`[Http Provider] Encoding URL: ${url} from first line of raw request: ${firstLine}`);
    try {
        // Use the built-in URL class to parse and encode the URL
        const parsedUrl = new URL(url, 'http://placeholder-base.com');
        // Replace the original URL in the first line
        rawRequest = rawRequest.replace(firstLine, `${method} ${parsedUrl.pathname}${parsedUrl.search}${protocol ? ' ' + protocol : ''}`);
    }
    catch (err) {
        logger_1.default.error(`[Http Provider] Error parsing URL in HTTP request: ${String(err)}`);
        throw new Error(`[Http Provider] Error parsing URL in HTTP request: ${String(err)}`);
    }
    return rawRequest;
}
async function generateSignature(privateKeyPathOrKey, signatureTimestamp, signatureDataTemplate, signatureAlgorithm = 'SHA256', isPath = true) {
    try {
        const privateKey = isPath ? fs_1.default.readFileSync(privateKeyPathOrKey, 'utf8') : privateKeyPathOrKey;
        const data = (0, templates_1.getNunjucksEngine)()
            .renderString(signatureDataTemplate, {
            signatureTimestamp,
        })
            .replace(/\\n/g, '\n');
        const sign = crypto_1.default.createSign(signatureAlgorithm);
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey);
        return signature.toString('base64');
    }
    catch (err) {
        logger_1.default.error(`Error generating signature: ${String(err)}`);
        throw new Error(`Failed to generate signature: ${String(err)}`);
    }
}
function needsSignatureRefresh(timestamp, validityMs, bufferMs) {
    const now = Date.now();
    const timeElapsed = now - timestamp;
    const effectiveBufferMs = bufferMs ?? Math.floor(validityMs * 0.1); // Default to 10% of validity time
    return timeElapsed + effectiveBufferMs >= validityMs;
}
exports.HttpProviderConfigSchema = zod_1.z.object({
    body: zod_1.z.union([zod_1.z.record(zod_1.z.any()), zod_1.z.string(), zod_1.z.array(zod_1.z.any())]).optional(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    maxRetries: zod_1.z.number().min(0).optional(),
    method: zod_1.z.string().optional(),
    queryParams: zod_1.z.record(zod_1.z.string()).optional(),
    request: zod_1.z.string().optional(),
    useHttps: zod_1.z
        .boolean()
        .optional()
        .describe('Use HTTPS for the request. This only works with the raw request option'),
    sessionParser: zod_1.z.union([zod_1.z.string(), zod_1.z.function()]).optional(),
    transformRequest: zod_1.z.union([zod_1.z.string(), zod_1.z.function()]).optional(),
    transformResponse: zod_1.z.union([zod_1.z.string(), zod_1.z.function()]).optional(),
    url: zod_1.z.string().optional(),
    validateStatus: zod_1.z
        .union([zod_1.z.string(), zod_1.z.function().returns(zod_1.z.boolean()).args(zod_1.z.number())])
        .optional(),
    /**
     * @deprecated use transformResponse instead
     */
    responseParser: zod_1.z.union([zod_1.z.string(), zod_1.z.function()]).optional(),
    // Digital Signature Authentication
    signatureAuth: zod_1.z
        .object({
        privateKeyPath: zod_1.z.string().optional(),
        privateKey: zod_1.z.string().optional(),
        signatureValidityMs: zod_1.z.number().default(300000), // 5 minutes
        // Template for generating the data to sign
        signatureDataTemplate: zod_1.z.string().default('{{timestamp}}'),
        // Signature algorithm to use (defaults to SHA256)
        signatureAlgorithm: zod_1.z.string().default('SHA256'),
        // Buffer time in ms before expiry to refresh (defaults to 10% of validity time)
        signatureRefreshBufferMs: zod_1.z.number().optional(),
    })
        .refine((data) => data.privateKeyPath !== undefined || data.privateKey !== undefined, {
        message: 'Either privateKeyPath or privateKey must be provided',
    })
        .optional(),
});
function contentTypeIsJson(headers) {
    if (!headers) {
        return false;
    }
    return Object.keys(headers).some((key) => {
        if (key.toLowerCase().startsWith('content-type')) {
            return headers?.[key].includes('application/json');
        }
        return false;
    });
}
async function createSessionParser(parser) {
    if (!parser) {
        return () => '';
    }
    if (typeof parser === 'function') {
        return (response) => parser(response);
    }
    if (typeof parser === 'string' && parser.startsWith('file://')) {
        let filename = parser.slice('file://'.length);
        let functionName;
        if (filename.includes(':')) {
            const splits = filename.split(':');
            if (splits[0] && (0, fileExtensions_1.isJavascriptFile)(splits[0])) {
                [filename, functionName] = splits;
            }
        }
        const requiredModule = await (0, esm_1.importModule)(path_1.default.resolve(cliState_1.default.basePath || '', filename), functionName);
        if (typeof requiredModule === 'function') {
            return requiredModule;
        }
        throw new Error(`Response transform malformed: ${filename} must export a function or have a default export as a function`);
    }
    else if (typeof parser === 'string') {
        return (data) => {
            const trimmedParser = parser.trim();
            return new Function('data', `return (${trimmedParser});`)(data);
        };
    }
    throw new Error(`Unsupported response transform type: ${typeof parser}. Expected a function, a string starting with 'file://' pointing to a JavaScript file, or a string containing a JavaScript expression.`);
}
async function createTransformResponse(parser) {
    if (!parser) {
        return (data, text) => ({ output: data || text });
    }
    if (typeof parser === 'function') {
        return (data, text, context) => {
            try {
                const result = parser(data, text, context);
                if (typeof result === 'object') {
                    return result;
                }
                else {
                    return { output: result };
                }
            }
            catch (err) {
                logger_1.default.error(`[Http Provider] Error in response transform function: ${String(err)}. Data: ${(0, json_1.safeJsonStringify)(data)}. Text: ${text}. Context: ${(0, json_1.safeJsonStringify)(context)}.`);
                throw err;
            }
        };
    }
    if (typeof parser === 'string' && parser.startsWith('file://')) {
        let filename = parser.slice('file://'.length);
        let functionName;
        if (filename.includes(':')) {
            const splits = filename.split(':');
            if (splits[0] && (0, fileExtensions_1.isJavascriptFile)(splits[0])) {
                [filename, functionName] = splits;
            }
        }
        const requiredModule = await (0, esm_1.importModule)(path_1.default.resolve(cliState_1.default.basePath || '', filename), functionName);
        if (typeof requiredModule === 'function') {
            return requiredModule;
        }
        throw new Error(`Response transform malformed: ${filename} must export a function or have a default export as a function`);
    }
    else if (typeof parser === 'string') {
        return (data, text, context) => {
            try {
                const trimmedParser = parser.trim();
                // Check if it's a function expression (either arrow or regular)
                const isFunctionExpression = /^(\(.*?\)\s*=>|function\s*\(.*?\))/.test(trimmedParser);
                const transformFn = new Function('json', 'text', 'context', isFunctionExpression
                    ? `try { return (${trimmedParser})(json, text, context); } catch(e) { throw new Error('Transform failed: ' + e.message + ' : ' + text + ' : ' + JSON.stringify(json) + ' : ' + JSON.stringify(context)); }`
                    : `try { return (${trimmedParser}); } catch(e) { throw new Error('Transform failed: ' + e.message + ' : ' + text + ' : ' + JSON.stringify(json) + ' : ' + JSON.stringify(context)); }`);
                let resp;
                if (context) {
                    resp = transformFn(data || null, text, context);
                }
                else {
                    resp = transformFn(data || null, text);
                }
                if (typeof resp === 'string') {
                    return { output: resp };
                }
                return resp;
            }
            catch (err) {
                logger_1.default.error(`[Http Provider] Error in response transform: ${String(err)}. Data: ${(0, json_1.safeJsonStringify)(data)}. Text: ${text}. Context: ${(0, json_1.safeJsonStringify)(context)}.`);
                throw new Error(`Failed to transform response: ${String(err)}`);
            }
        };
    }
    throw new Error(`Unsupported response transform type: ${typeof parser}. Expected a function, a string starting with 'file://' pointing to a JavaScript file, or a string containing a JavaScript expression.`);
}
/**
 * Substitutes template variables in a JSON object or array.
 *
 * This function walks through all properties of the provided JSON structure
 * and replaces template expressions (like {{varName}}) with their actual values.
 * If a substituted string is valid JSON, it will be parsed into an object or array.
 *
 * Example:
 * Input: {"greeting": "Hello {{name}}!", "data": {"id": "{{userId}}"}}
 * Vars: {name: "World", userId: 123}
 * Output: {"greeting": "Hello World!", "data": {"id": 123}}
 *
 * @param body The JSON object or array containing template expressions
 * @param vars Dictionary of variable names and their values for substitution
 * @returns A new object or array with all template expressions replaced
 */
function processJsonBody(body, vars) {
    // First apply the standard variable rendering
    const rendered = (0, util_1.renderVarsInObject)(body, vars);
    // For objects and arrays, we need to check each string value to see if it can be parsed as JSON
    if (typeof rendered === 'object' && rendered !== null) {
        // Function to process nested values
        const processNestedValues = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(processNestedValues);
            }
            else if (typeof obj === 'object' && obj !== null) {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = processNestedValues(value);
                }
                return result;
            }
            else if (typeof obj === 'string') {
                try {
                    return JSON.parse(obj);
                }
                catch {
                    return obj;
                }
            }
            return obj;
        };
        return processNestedValues(rendered);
    }
    // If it's a string, attempt to parse as JSON
    if (typeof rendered === 'string') {
        try {
            return JSON.parse(rendered);
        }
        catch {
            return rendered;
        }
    }
    return rendered;
}
/**
 * Substitutes template variables in a text string.
 *
 * Replaces template expressions (like {{varName}}) in the string with their
 * actual values from the provided variables dictionary.
 *
 * Example:
 * Input: "Hello {{name}}! Your user ID is {{userId}}."
 * Vars: {name: "World", userId: 123}
 * Output: "Hello World! Your user ID is 123."
 *
 * @param body The string containing template expressions to substitute
 * @param vars Dictionary of variable names and their values for substitution
 * @returns A new string with all template expressions replaced
 * @throws Error if body is an object instead of a string
 */
function processTextBody(body, vars) {
    if (body == null) {
        return body;
    }
    (0, invariant_1.default)(typeof body !== 'object', 'Expected body to be a string when content type is not application/json');
    try {
        return (0, util_1.renderVarsInObject)(body, vars);
    }
    catch (err) {
        logger_1.default.warn(`Error rendering body template: ${err}`);
        return body;
    }
}
function parseRawRequest(input) {
    const adjusted = input.trim().replace(/\n/g, '\r\n') + '\r\n\r\n';
    // If the injectVar is in a query param, we need to encode the URL in the first line
    const encoded = urlEncodeRawRequestPath(adjusted);
    try {
        const messageModel = http_z_1.default.parse(encoded);
        return {
            method: messageModel.method,
            url: messageModel.target,
            headers: messageModel.headers.reduce((acc, header) => {
                acc[header.name.toLowerCase()] = header.value;
                return acc;
            }, {}),
            body: messageModel.body,
        };
    }
    catch (err) {
        throw new Error(`Error parsing raw HTTP request: ${String(err)}`);
    }
}
async function createTransformRequest(transform) {
    if (!transform) {
        return (prompt) => prompt;
    }
    if (typeof transform === 'function') {
        return async (prompt) => {
            try {
                return await transform(prompt);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                const wrappedError = new Error(`Error in request transform function: ${errorMessage}`);
                logger_1.default.error(wrappedError.message);
                throw wrappedError;
            }
        };
    }
    if (typeof transform === 'string') {
        if (transform.startsWith('file://')) {
            let filename = transform.slice('file://'.length);
            let functionName;
            if (filename.includes(':')) {
                const splits = filename.split(':');
                if (splits[0] && (0, fileExtensions_1.isJavascriptFile)(splits[0])) {
                    [filename, functionName] = splits;
                }
            }
            const requiredModule = await (0, esm_1.importModule)(path_1.default.resolve(cliState_1.default.basePath || '', filename), functionName);
            if (typeof requiredModule === 'function') {
                return async (prompt) => {
                    try {
                        return await requiredModule(prompt);
                    }
                    catch (err) {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        const wrappedError = new Error(`Error in request transform function from ${filename}: ${errorMessage}`);
                        logger_1.default.error(wrappedError.message);
                        throw wrappedError;
                    }
                };
            }
            throw new Error(`Request transform malformed: ${filename} must export a function or have a default export as a function`);
        }
        // Handle string template
        return async (prompt) => {
            try {
                const rendered = (0, templates_1.getNunjucksEngine)().renderString(transform, { prompt });
                return await new Function('prompt', `${rendered}`)(prompt);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                const wrappedError = new Error(`Error in request transform string template: ${errorMessage}`);
                logger_1.default.error(wrappedError.message);
                throw wrappedError;
            }
        };
    }
    throw new Error(`Unsupported request transform type: ${typeof transform}. Expected a function, a string starting with 'file://' pointing to a JavaScript file, or a string containing a JavaScript expression.`);
}
function determineRequestBody(contentType, parsedPrompt, configBody, vars) {
    if (contentType) {
        // For JSON content type
        if (typeof parsedPrompt === 'object' && parsedPrompt !== null) {
            // If parser returned an object, merge it with config body
            return Object.assign({}, configBody || {}, parsedPrompt);
        }
        // Otherwise process the config body with parsed prompt
        return processJsonBody(configBody, {
            ...vars,
            prompt: parsedPrompt,
        });
    }
    // For non-JSON content type, process as text
    return processTextBody(configBody, {
        ...vars,
        prompt: parsedPrompt,
    });
}
async function createValidateStatus(validator) {
    if (!validator) {
        return (status) => true;
    }
    if (typeof validator === 'function') {
        return validator;
    }
    if (typeof validator === 'string') {
        if (validator.startsWith('file://')) {
            let filename = validator.slice('file://'.length);
            let functionName;
            if (filename.includes(':')) {
                const splits = filename.split(':');
                if (splits[0] && (0, fileExtensions_1.isJavascriptFile)(splits[0])) {
                    [filename, functionName] = splits;
                }
            }
            try {
                const requiredModule = await (0, esm_1.importModule)(path_1.default.resolve(cliState_1.default.basePath || '', filename), functionName);
                if (typeof requiredModule === 'function') {
                    return requiredModule;
                }
                throw new Error('Exported value must be a function');
            }
            catch (err) {
                throw new Error(`Status validator malformed: ${filename} - ${err?.message || String(err)}`);
            }
        }
        // Handle string template - wrap in a function body
        try {
            const trimmedValidator = validator.trim();
            // Check if it's an arrow function or regular function
            if (trimmedValidator.includes('=>') || trimmedValidator.startsWith('function')) {
                // For arrow functions and regular functions, evaluate the whole function
                return new Function(`return ${trimmedValidator}`)();
            }
            // For expressions, wrap in a function body
            return new Function('status', `return ${trimmedValidator}`);
        }
        catch (err) {
            throw new Error(`Invalid status validator expression: ${err?.message || String(err)}`);
        }
    }
    throw new Error(`Unsupported status validator type: ${typeof validator}. Expected a function, a string starting with 'file://' pointing to a JavaScript file, or a string containing a JavaScript expression.`);
}
class HttpProvider {
    constructor(url, options) {
        this.config = exports.HttpProviderConfigSchema.parse(options.config);
        this.url = this.config.url || url;
        this.transformResponse = createTransformResponse(this.config.transformResponse || this.config.responseParser);
        this.sessionParser = createSessionParser(this.config.sessionParser);
        this.transformRequest = createTransformRequest(this.config.transformRequest);
        this.validateStatus = createValidateStatus(this.config.validateStatus);
        if (this.config.request) {
            this.config.request = (0, file_1.maybeLoadFromExternalFile)(this.config.request);
        }
        else {
            (0, invariant_1.default)(this.config.body || this.config.method === 'GET', `Expected HTTP provider ${this.url} to have a config containing {body}, but instead got ${(0, json_1.safeJsonStringify)(this.config)}`);
        }
    }
    id() {
        return this.url;
    }
    toString() {
        return `[HTTP Provider ${this.url}]`;
    }
    async refreshSignatureIfNeeded() {
        if (!this.config.signatureAuth) {
            logger_1.default.debug('[HTTP Provider Auth]: No signature auth configured');
            return;
        }
        const { privateKeyPath, privateKey, signatureValidityMs, signatureDataTemplate, signatureAlgorithm, signatureRefreshBufferMs, } = this.config.signatureAuth;
        if (!this.lastSignatureTimestamp ||
            !this.lastSignature ||
            needsSignatureRefresh(this.lastSignatureTimestamp, signatureValidityMs, signatureRefreshBufferMs)) {
            logger_1.default.debug('[HTTP Provider Auth]: Generating new signature');
            this.lastSignatureTimestamp = Date.now();
            this.lastSignature = await generateSignature(privateKeyPath || privateKey, this.lastSignatureTimestamp, signatureDataTemplate, signatureAlgorithm, privateKeyPath !== undefined);
            logger_1.default.debug('[HTTP Provider Auth]: Generated new signature successfully');
        }
        else {
            logger_1.default.debug('[HTTP Provider Auth]: Using cached signature');
        }
        (0, invariant_1.default)(this.lastSignature, 'Signature should be defined at this point');
        (0, invariant_1.default)(this.lastSignatureTimestamp, 'Timestamp should be defined at this point');
    }
    getDefaultHeaders(body) {
        if (this.config.method === 'GET') {
            return {};
        }
        if (typeof body === 'object' && body !== null) {
            return { 'content-type': 'application/json' };
        }
        else if (typeof body === 'string') {
            return { 'content-type': 'application/x-www-form-urlencoded' };
        }
        return {};
    }
    validateContentTypeAndBody(headers, body) {
        if (body != null) {
            if (typeof body == 'object' && !contentTypeIsJson(headers)) {
                throw new Error('Content-Type is not application/json, but body is an object or array. The body must be a string if the Content-Type is not application/json.');
            }
            if (typeof body === 'string' && contentTypeIsJson(headers)) {
                logger_1.default.warn(`[HTTP Provider] Content-Type is application/json, but body is a string. This is likely to cause unexpected results. It should be an object or array. Body: ${body} headers: ${(0, json_1.safeJsonStringify)(headers)}`);
            }
        }
    }
    async getHeaders(defaultHeaders, vars) {
        const configHeaders = this.config.headers || {};
        // Convert all keys in configHeaders to lowercase
        const headers = Object.fromEntries(Object.entries(configHeaders).map(([key, value]) => [key.toLowerCase(), value]));
        const nunjucks = (0, templates_1.getNunjucksEngine)();
        return Object.fromEntries(Object.entries({ ...defaultHeaders, ...headers }).map(([key, value]) => [
            key,
            nunjucks.renderString(value, vars),
        ]));
    }
    async callApi(prompt, context) {
        const vars = {
            ...(context?.vars || {}),
            prompt,
        };
        // Add signature values to vars if signature auth is enabled
        if (this.config.signatureAuth) {
            await this.refreshSignatureIfNeeded();
            (0, invariant_1.default)(this.lastSignature, 'Signature should be defined at this point');
            (0, invariant_1.default)(this.lastSignatureTimestamp, 'Timestamp should be defined at this point');
            if (vars.signature) {
                logger_1.default.warn('[HTTP Provider Auth]: `signature` is already defined in vars and will be overwritten');
            }
            if (vars.signatureTimestamp) {
                logger_1.default.warn('[HTTP Provider Auth]: `signatureTimestamp` is already defined in vars and will be overwritten');
            }
            vars.signature = this.lastSignature;
            vars.signatureTimestamp = this.lastSignatureTimestamp;
        }
        if (this.config.request) {
            return this.callApiWithRawRequest(vars, context);
        }
        const defaultHeaders = this.getDefaultHeaders(this.config.body);
        const headers = await this.getHeaders(defaultHeaders, vars);
        this.validateContentTypeAndBody(headers, this.config.body);
        // Transform prompt using request transform
        const transformedPrompt = await (await this.transformRequest)(prompt);
        logger_1.default.debug(`[HTTP Provider]: Transformed prompt: ${(0, json_1.safeJsonStringify)(transformedPrompt)}. Original prompt: ${(0, json_1.safeJsonStringify)(prompt)}`);
        const renderedConfig = {
            url: (0, templates_1.getNunjucksEngine)().renderString(this.url, vars),
            method: (0, templates_1.getNunjucksEngine)().renderString(this.config.method || 'GET', vars),
            headers,
            body: determineRequestBody(contentTypeIsJson(headers), transformedPrompt, this.config.body, vars),
            queryParams: this.config.queryParams
                ? Object.fromEntries(Object.entries(this.config.queryParams).map(([key, value]) => [
                    key,
                    (0, templates_1.getNunjucksEngine)().renderString(value, vars),
                ]))
                : undefined,
            transformResponse: this.config.transformResponse || this.config.responseParser,
        };
        const method = renderedConfig.method || 'POST';
        (0, invariant_1.default)(typeof method === 'string', 'Expected method to be a string');
        (0, invariant_1.default)(typeof headers === 'object', 'Expected headers to be an object');
        // Template the base URL first, then construct URL with query parameters
        let url = renderedConfig.url;
        if (renderedConfig.queryParams) {
            try {
                const urlObj = new URL(url);
                // Add each query parameter to the URL object
                Object.entries(renderedConfig.queryParams).forEach(([key, value]) => {
                    urlObj.searchParams.append(key, value);
                });
                url = urlObj.toString();
            }
            catch (err) {
                // Fallback for potentially malformed URLs
                logger_1.default.warn(`[HTTP Provider]: Failed to construct URL object: ${String(err)}`);
                const queryString = new URLSearchParams(renderedConfig.queryParams).toString();
                url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
            }
        }
        logger_1.default.debug(`[HTTP Provider]: Calling ${url} with config: ${(0, json_1.safeJsonStringify)(renderedConfig)}`);
        const response = await (0, cache_1.fetchWithCache)(url, {
            method: renderedConfig.method,
            headers: renderedConfig.headers,
            ...(method !== 'GET' && {
                body: contentTypeIsJson(headers)
                    ? JSON.stringify(renderedConfig.body)
                    : String(renderedConfig.body)?.trim(),
            }),
        }, shared_1.REQUEST_TIMEOUT_MS, 'text', context?.debug, this.config.maxRetries);
        logger_1.default.debug(`[HTTP Provider]: Response: ${(0, json_1.safeJsonStringify)(response.data)}`);
        if (!(await this.validateStatus)(response.status)) {
            throw new Error(`HTTP call failed with status ${response.status} ${response.statusText}: ${response.data}`);
        }
        logger_1.default.debug(`[HTTP Provider]: Response (HTTP ${response.status}): ${(0, json_1.safeJsonStringify)(response.data)}`);
        const ret = {};
        if (context?.debug) {
            ret.raw = response.data;
            ret.metadata = {
                headers: response.headers,
            };
        }
        const rawText = response.data;
        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        }
        catch {
            parsedData = null;
        }
        try {
            const sessionId = this.sessionParser == null
                ? undefined
                : (await this.sessionParser)({ headers: response.headers, body: parsedData ?? rawText });
            if (sessionId) {
                ret.sessionId = sessionId;
            }
        }
        catch (err) {
            logger_1.default.error(`Error parsing session ID: ${String(err)}. Got headers: ${(0, json_1.safeJsonStringify)(response.headers)} and parsed body: ${(0, json_1.safeJsonStringify)(parsedData)}`);
            throw err;
        }
        const parsedOutput = (await this.transformResponse)(parsedData, rawText, { response });
        if (parsedOutput?.output) {
            return {
                ...ret,
                ...parsedOutput,
            };
        }
        return {
            ...ret,
            output: parsedOutput,
        };
    }
    async callApiWithRawRequest(vars, context) {
        (0, invariant_1.default)(this.config.request, 'Expected request to be set in http provider config');
        // Transform prompt using request transform
        const prompt = vars.prompt;
        const transformFn = await this.transformRequest;
        const transformedPrompt = await transformFn(prompt);
        logger_1.default.debug(`[HTTP Provider]: Transformed prompt: ${(0, json_1.safeJsonStringify)(transformedPrompt)}. Original prompt: ${(0, json_1.safeJsonStringify)(prompt)}`);
        const renderedRequest = (0, templates_1.getNunjucksEngine)().renderString(this.config.request, {
            ...vars,
            prompt: transformedPrompt,
        });
        const parsedRequest = parseRawRequest(renderedRequest.trim());
        const protocol = this.url.startsWith('https') || this.config.useHttps ? 'https' : 'http';
        const url = new URL(parsedRequest.url, `${protocol}://${parsedRequest.headers['host']}`).toString();
        // Remove content-length header from raw request if the user added it, it will be added by fetch with the correct value
        delete parsedRequest.headers['content-length'];
        logger_1.default.debug(`[HTTP Provider]: Calling ${url} with raw request: ${parsedRequest.method}  ${(0, json_1.safeJsonStringify)(parsedRequest.body)} \n headers: ${(0, json_1.safeJsonStringify)(parsedRequest.headers)}`);
        const response = await (0, cache_1.fetchWithCache)(url, {
            method: parsedRequest.method,
            headers: parsedRequest.headers,
            ...(parsedRequest.body && { body: parsedRequest.body.text.trim() }),
        }, shared_1.REQUEST_TIMEOUT_MS, 'text', context?.debug, this.config.maxRetries);
        logger_1.default.debug(`[HTTP Provider]: Response: ${(0, json_1.safeJsonStringify)(response.data)}`);
        if (!(await this.validateStatus)(response.status)) {
            throw new Error(`HTTP call failed with status ${response.status} ${response.statusText}: ${response.data}`);
        }
        const rawText = response.data;
        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
        }
        catch {
            parsedData = null;
        }
        const ret = {};
        if (context?.debug) {
            ret.raw = response.data;
            ret.metadata = {
                headers: response.headers,
            };
        }
        const parsedOutput = (await this.transformResponse)(parsedData, rawText, { response });
        if (parsedOutput?.output) {
            return {
                ...ret,
                ...parsedOutput,
            };
        }
        return {
            ...ret,
            output: parsedOutput,
        };
    }
}
exports.HttpProvider = HttpProvider;
//# sourceMappingURL=http.js.map