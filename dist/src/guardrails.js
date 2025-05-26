"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("./cache");
const constants_1 = require("./constants");
const logger_1 = __importDefault(require("./logger"));
const API_BASE_URL = `${(0, constants_1.getShareApiBaseUrl)()}/v1`;
async function makeRequest(endpoint, input) {
    try {
        const response = await (0, cache_1.fetchWithCache)(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input }),
        }, undefined, 'json');
        if (!response.data) {
            throw new Error('No data returned from API');
        }
        return response.data;
    }
    catch (error) {
        logger_1.default.error(`Guardrails API error: ${error}`);
        throw error;
    }
}
async function makeAdaptiveRequest(request) {
    try {
        const response = await (0, cache_1.fetchWithCache)(`${API_BASE_URL}/adaptive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: request.prompt,
                policies: request.policies || [],
            }),
        }, undefined, 'json');
        if (!response.data) {
            throw new Error('No data returned from API');
        }
        return response.data;
    }
    catch (error) {
        logger_1.default.error(`Guardrails API error: ${error}`);
        throw error;
    }
}
const guardrails = {
    async guard(input) {
        return makeRequest('/guard', input);
    },
    async pii(input) {
        return makeRequest('/pii', input);
    },
    async harm(input) {
        return makeRequest('/harm', input);
    },
    async adaptive(request) {
        return makeAdaptiveRequest(request);
    },
};
exports.default = guardrails;
//# sourceMappingURL=guardrails.js.map