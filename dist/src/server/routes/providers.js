"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providersRouter = void 0;
const dedent_1 = __importDefault(require("dedent"));
const express_1 = require("express");
const zod_validation_error_1 = require("zod-validation-error");
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const providers_1 = require("../../providers");
const invariant_1 = __importDefault(require("../../util/invariant"));
const providers_2 = require("../../validators/providers");
exports.providersRouter = (0, express_1.Router)();
exports.providersRouter.post('/test', async (req, res) => {
    const body = req.body;
    let providerOptions;
    try {
        providerOptions = providers_2.ProviderOptionsSchema.parse(body);
    }
    catch (e) {
        res.status(400).json({ error: (0, zod_validation_error_1.fromZodError)(e).toString() });
        return;
    }
    (0, invariant_1.default)(providerOptions.id, 'id is required');
    const loadedProvider = await (0, providers_1.loadApiProvider)(providerOptions.id, { options: providerOptions });
    // Call the provider with the test prompt
    let result;
    try {
        result = await loadedProvider.callApi('Hello, world!', {
            debug: true,
            prompt: { raw: 'Hello, world!', label: 'Hello, world!' },
            vars: {},
        });
        logger_1.default.debug((0, dedent_1.default) `[POST /providers/test] result from API provider
        result: ${JSON.stringify(result)}
        providerOptions: ${JSON.stringify(providerOptions)}`);
    }
    catch (error) {
        logger_1.default.error((0, dedent_1.default) `[POST /providers/test] Error calling provider API
        error: ${error instanceof Error ? error.message : String(error)}
        providerOptions: ${JSON.stringify(providerOptions)}`);
        res.status(500).json({ error: 'Failed to call provider API' });
        return;
    }
    const HOST = (0, envars_1.getEnvString)('PROMPTFOO_CLOUD_API_URL', 'https://api.promptfoo.app');
    try {
        // Call the the agent helper to evaluate the results of the provider
        const testAnalyzerResponse = await fetch(`${HOST}/providers/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: providerOptions,
                providerResponse: result.raw,
                parsedResponse: result.output,
                error: result.error,
                headers: result.metadata?.headers,
            }),
        });
        if (!testAnalyzerResponse.ok) {
            res.status(200).json({
                testResult: {
                    error: 'Error evaluating the results of your configuration. Manually review the provider results below.',
                },
                providerResponse: result,
            });
            return;
        }
        const testAnalyzerResponseObj = await testAnalyzerResponse.json();
        res
            .json({
            testResult: testAnalyzerResponseObj,
            providerResponse: result,
        })
            .status(200);
    }
    catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger_1.default.error((0, dedent_1.default) `[POST /providers/test] Error calling agent helper
        error: ${errorMessage}
        providerOptions: ${JSON.stringify(providerOptions)}`);
        res.status(200).json({
            test_result: {
                error: 'Error evaluating the results of your configuration. Manually review the provider results below.',
            },
            provider_response: result,
        });
        return;
    }
});
//# sourceMappingURL=providers.js.map