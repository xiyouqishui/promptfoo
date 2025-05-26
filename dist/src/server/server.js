"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.startServer = startServer;
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const node_http_1 = __importDefault(require("node:http"));
const node_path_1 = __importDefault(require("node:path"));
const socket_io_1 = require("socket.io");
const zod_validation_error_1 = require("zod-validation-error");
const constants_1 = require("../constants");
const signal_1 = require("../database/signal");
const esm_1 = require("../esm");
const cloud_1 = require("../globalConfig/cloud");
const logger_1 = __importDefault(require("../logger"));
const migrate_1 = require("../migrate");
const eval_1 = __importStar(require("../models/eval"));
const remoteGeneration_1 = require("../redteam/remoteGeneration");
const share_1 = require("../share");
const telemetry_1 = __importStar(require("../telemetry"));
const synthesis_1 = require("../testCase/synthesis");
const apiHealth_1 = require("../util/apiHealth");
const database_1 = require("../util/database");
const invariant_1 = __importDefault(require("../util/invariant"));
const server_1 = require("../util/server");
const configs_1 = require("./routes/configs");
const eval_2 = require("./routes/eval");
const providers_1 = require("./routes/providers");
const redteam_1 = require("./routes/redteam");
const user_1 = require("./routes/user");
// Prompts cache
let allPrompts = null;
function createApp() {
    const app = (0, express_1.default)();
    const staticDir = node_path_1.default.join((0, esm_1.getDirectory)(), 'app');
    app.use((0, cors_1.default)());
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '100mb' }));
    app.use(express_1.default.urlencoded({ limit: '100mb', extended: true }));
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'OK', version: constants_1.VERSION });
    });
    app.get('/api/remote-health', async (req, res) => {
        const apiUrl = (0, remoteGeneration_1.getRemoteHealthUrl)();
        if (apiUrl === null) {
            res.json({
                status: 'DISABLED',
                message: 'remote generation and grading are disabled',
            });
            return;
        }
        const result = await (0, apiHealth_1.checkRemoteHealth)(apiUrl);
        res.json(result);
    });
    /**
     * Fetches summaries of all evals, optionally for a given dataset.
     */
    app.get('/api/results', async (
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    req, res) => {
        const previousResults = await (0, eval_1.getEvalSummaries)(req.query.datasetId);
        res.json({ data: previousResults });
    });
    app.get('/api/results/:id', async (req, res) => {
        const { id } = req.params;
        const file = await (0, database_1.readResult)(id);
        if (!file) {
            res.status(404).send('Result not found');
            return;
        }
        res.json({ data: file.result });
    });
    app.get('/api/prompts', async (req, res) => {
        if (allPrompts == null) {
            allPrompts = await (0, database_1.getPrompts)();
        }
        res.json({ data: allPrompts });
    });
    app.get('/api/history', async (req, res) => {
        const { tagName, tagValue, description } = req.query;
        const tag = tagName && tagValue ? { key: tagName, value: tagValue } : undefined;
        const results = await (0, database_1.getStandaloneEvals)({
            tag,
            description: description,
        });
        res.json({
            data: results,
        });
    });
    app.get('/api/prompts/:sha256hash', async (req, res) => {
        const sha256hash = req.params.sha256hash;
        const prompts = await (0, database_1.getPromptsForTestCasesHash)(sha256hash);
        res.json({ data: prompts });
    });
    app.get('/api/datasets', async (req, res) => {
        res.json({ data: await (0, database_1.getTestCases)() });
    });
    app.get('/api/results/share/check-domain', async (req, res) => {
        const id = String(req.query.id);
        if (!id) {
            res.status(400).json({ error: 'Missing id parameter' });
            return;
        }
        const eval_ = await eval_1.default.findById(id);
        if (!eval_) {
            logger_1.default.warn(`Eval not found for id: ${id}`);
            res.status(404).json({ error: 'Eval not found' });
            return;
        }
        const { domain } = (0, share_1.determineShareDomain)(eval_);
        const isCloudEnabled = cloud_1.cloudConfig.isEnabled();
        res.json({ domain, isCloudEnabled });
    });
    app.post('/api/results/share', async (req, res) => {
        logger_1.default.debug(`Share request body: ${JSON.stringify(req.body)}`);
        const { id } = req.body;
        const result = await (0, database_1.readResult)(id);
        if (!result) {
            logger_1.default.warn(`Result not found for id: ${id}`);
            res.status(404).json({ error: 'Eval not found' });
            return;
        }
        const eval_ = await eval_1.default.findById(id);
        (0, invariant_1.default)(eval_, 'Eval not found');
        try {
            const url = await (0, share_1.createShareableUrl)(eval_, true);
            logger_1.default.debug(`Generated share URL: ${url}`);
            res.json({ url });
        }
        catch (error) {
            logger_1.default.error(`Failed to generate share URL: ${error}`);
            res.status(500).json({ error: 'Failed to generate share URL' });
        }
    });
    app.post('/api/dataset/generate', async (req, res) => {
        const testSuite = {
            prompts: req.body.prompts,
            tests: req.body.tests,
            providers: [],
        };
        const results = await (0, synthesis_1.synthesizeFromTestSuite)(testSuite, {});
        res.json({ results });
    });
    app.use('/api/eval', eval_2.evalRouter);
    app.use('/api/providers', providers_1.providersRouter);
    app.use('/api/redteam', redteam_1.redteamRouter);
    app.use('/api/user', user_1.userRouter);
    app.use('/api/configs', configs_1.configsRouter);
    app.post('/api/telemetry', async (req, res) => {
        try {
            const result = telemetry_1.TelemetryEventSchema.safeParse(req.body);
            if (!result.success) {
                res
                    .status(400)
                    .json({ error: 'Invalid request body', details: (0, zod_validation_error_1.fromError)(result.error).toString() });
                return;
            }
            const { event, properties } = result.data;
            await telemetry_1.default.recordAndSend(event, properties);
            res.status(200).json({ success: true });
        }
        catch (error) {
            logger_1.default.error(`Error processing telemetry request: ${error}`);
            res.status(500).json({ error: 'Failed to process telemetry request' });
        }
    });
    // Must come after the above routes (particularly /api/config) so it doesn't
    // overwrite dynamic routes.
    // Configure proper MIME types for JavaScript files
    // This is necessary because some browsers (especially Arc) enforce strict MIME type checking
    // and will refuse to execute scripts with incorrect MIME types for security reasons
    express_1.default.static.mime.define({
        'application/javascript': ['js', 'mjs', 'cjs'],
        'text/javascript': ['js', 'mjs', 'cjs'],
    });
    app.use(express_1.default.static(staticDir));
    // Handle client routing, return all requests to the app
    app.get('*', (req, res) => {
        res.sendFile(node_path_1.default.join(staticDir, 'index.html'));
    });
    return app;
}
async function startServer(port = (0, constants_1.getDefaultPort)(), browserBehavior = server_1.BrowserBehavior.ASK, filterDescription) {
    const app = createApp();
    const httpServer = node_http_1.default.createServer(app);
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
        },
    });
    await (0, migrate_1.runDbMigrations)();
    (0, signal_1.setupSignalWatcher)(async () => {
        const latestEval = await (0, database_1.getLatestEval)(filterDescription);
        if ((latestEval?.results.results.length || 0) > 0) {
            logger_1.default.info(`Emitting update with eval ID: ${latestEval?.config?.description || 'unknown'}`);
            io.emit('update', latestEval);
            allPrompts = null;
        }
    });
    io.on('connection', async (socket) => {
        socket.emit('init', await (0, database_1.getLatestEval)(filterDescription));
    });
    httpServer
        .listen(port, () => {
        const url = `http://localhost:${port}`;
        logger_1.default.info(`Server running at ${url} and monitoring for new evals.`);
        (0, server_1.openBrowser)(browserBehavior, port).catch((err) => {
            logger_1.default.error(`Failed to handle browser behavior: ${err}`);
        });
    })
        .on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            logger_1.default.error(`Port ${port} is already in use. Do you have another Promptfoo instance running?`);
            process.exit(1);
        }
        else {
            logger_1.default.error(`Failed to start server: ${error.message}`);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=server.js.map