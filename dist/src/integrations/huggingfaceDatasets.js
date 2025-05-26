"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDatasetPath = parseDatasetPath;
exports.fetchHuggingFaceDataset = fetchHuggingFaceDataset;
const dedent_1 = __importDefault(require("dedent"));
const envars_1 = require("../envars");
const fetch_1 = require("../fetch");
const logger_1 = __importDefault(require("../logger"));
function parseDatasetPath(path) {
    // Remove the huggingface://datasets/ prefix and split into path and query
    const [pathPart, queryPart] = path.replace('huggingface://datasets/', '').split('?');
    const [owner, repo] = pathPart.split('/');
    // Start with default parameters
    const defaultParams = new URLSearchParams({
        split: 'test',
        config: 'default',
    });
    // Parse user query parameters
    const userParams = new URLSearchParams(queryPart || '');
    // Merge user params into defaults (user params override defaults)
    const queryParams = new URLSearchParams();
    for (const [key, value] of defaultParams) {
        queryParams.set(key, value);
    }
    for (const [key, value] of userParams) {
        queryParams.set(key, value);
    }
    return { owner, repo, queryParams };
}
async function fetchHuggingFaceDataset(datasetPath, limit) {
    const baseUrl = 'https://datasets-server.huggingface.co/rows';
    const { owner, repo, queryParams } = parseDatasetPath(datasetPath);
    logger_1.default.info(`[Huggingface Dataset] Fetching dataset: ${owner}/${repo} ...`);
    const tests = [];
    let offset = 0;
    const pageSize = 100; // Number of rows per request
    const queryParamLimit = queryParams.get('limit');
    const userLimit = limit ?? (queryParamLimit ? Number.parseInt(queryParamLimit, 10) : undefined);
    while (true) {
        // Create a new URLSearchParams for this request
        const requestParams = new URLSearchParams(queryParams);
        requestParams.set('offset', offset.toString());
        requestParams.set('length', Math.min(pageSize, userLimit ? userLimit - offset : pageSize).toString());
        const url = `${baseUrl}?dataset=${encodeURIComponent(`${owner}/${repo}`)}&${requestParams.toString()}`;
        logger_1.default.debug(`[Huggingface Dataset] Fetching page from ${url}`);
        const hfToken = (0, envars_1.getEnvString)('HF_TOKEN') ||
            (0, envars_1.getEnvString)('HF_API_TOKEN') ||
            (0, envars_1.getEnvString)('HUGGING_FACE_HUB_TOKEN');
        const headers = {};
        if (hfToken) {
            logger_1.default.debug('[Huggingface Dataset] Using token for authentication');
            headers.Authorization = `Bearer ${hfToken}`;
        }
        const response = await (0, fetch_1.fetchWithProxy)(url, { headers });
        if (!response.ok) {
            const error = `[Huggingface Dataset] Failed to fetch dataset: ${response.statusText}.\nFetched ${url}`;
            logger_1.default.error(error);
            throw new Error(error);
        }
        const data = (await response.json());
        logger_1.default.debug(`[Huggingface Dataset] Received ${data.rows.length} rows (total: ${data.num_rows_total})`);
        if (offset === 0) {
            // Log schema information on first request
            logger_1.default.debug(`[Huggingface Dataset] Dataset features: ${JSON.stringify(data.features)}`);
            logger_1.default.debug((0, dedent_1.default) `[Huggingface Dataset] Using query parameters:
        ${Object.fromEntries(queryParams)}`);
        }
        // Convert HuggingFace rows to test cases
        for (const { row } of data.rows) {
            const test = {
                vars: {
                    ...row,
                },
                options: {
                    disableVarExpansion: true,
                },
            };
            tests.push(test);
        }
        logger_1.default.debug(`[Huggingface Dataset] Processed ${tests.length} total test cases so far`);
        // Check if we've reached user's limit or end of dataset
        if (userLimit && tests.length >= userLimit) {
            logger_1.default.debug(`[Huggingface Dataset] Reached user-specified limit of ${userLimit}`);
            break;
        }
        // Check if we've fetched all rows
        if (offset + data.rows.length >= data.num_rows_total) {
            logger_1.default.debug('[Huggingface Dataset] Finished fetching all rows');
            break;
        }
        offset += data.rows.length;
        logger_1.default.debug(`[Huggingface Dataset] Fetching next page starting at offset ${offset}`);
    }
    // If user specified a limit, ensure we don't return more than that
    const finalTests = userLimit ? tests.slice(0, userLimit) : tests;
    logger_1.default.debug(`[Huggingface Dataset] Successfully loaded ${finalTests.length} test cases`);
    return finalTests;
}
//# sourceMappingURL=huggingfaceDatasets.js.map