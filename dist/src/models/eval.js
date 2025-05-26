"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvalQueries = void 0;
exports.createEvalId = createEvalId;
exports.getEvalSummaries = getEvalSummaries;
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const constants_1 = require("../constants");
const database_1 = require("../database");
const tables_1 = require("../database/tables");
const envars_1 = require("../envars");
const accounts_1 = require("../globalConfig/accounts");
const logger_1 = __importDefault(require("../logger"));
const utils_1 = require("../prompts/utils");
const types_1 = require("../types");
const convertEvalResultsToTable_1 = require("../util/convertEvalResultsToTable");
const createHash_1 = require("../util/createHash");
const exportToFile_1 = require("../util/exportToFile");
const invariant_1 = __importDefault(require("../util/invariant"));
const time_1 = require("../util/time");
const evalResult_1 = __importDefault(require("./evalResult"));
function createEvalId(createdAt = new Date()) {
    return `eval-${(0, createHash_1.randomSequence)(3)}-${createdAt.toISOString().slice(0, 19)}`;
}
class EvalQueries {
    static async getVarsFromEvals(evals) {
        const db = (0, database_1.getDb)();
        const query = drizzle_orm_1.sql.raw(`SELECT DISTINCT j.key, eval_id from (SELECT eval_id, json_extract(eval_results.test_case, '$.vars') as vars
FROM eval_results where eval_id IN (${evals.map((e) => `'${e.id}'`).join(',')})) t, json_each(t.vars) j;`);
        // @ts-ignore
        const results = await db.all(query);
        const vars = results.reduce((acc, r) => {
            acc[r.eval_id] = acc[r.eval_id] || [];
            acc[r.eval_id].push(r.key);
            return acc;
        }, {});
        return vars;
    }
    static async getVarsFromEval(evalId) {
        const db = (0, database_1.getDb)();
        const query = drizzle_orm_1.sql.raw(`SELECT DISTINCT j.key from (SELECT json_extract(eval_results.test_case, '$.vars') as vars
    FROM eval_results where eval_results.eval_id = '${evalId}') t, json_each(t.vars) j;`);
        // @ts-ignore
        const results = await db.all(query);
        const vars = results.map((r) => r.key);
        return new Set(vars);
    }
    static async setVars(evalId, vars) {
        const db = (0, database_1.getDb)();
        try {
            await db
                .update(tables_1.evalsTable)
                .set({ vars: Array.from(vars) })
                .where((0, drizzle_orm_1.eq)(tables_1.evalsTable.id, evalId))
                .run();
        }
        catch (e) {
            logger_1.default.error(`Error setting vars: ${vars} for eval ${evalId}: ${e}`);
        }
    }
}
exports.EvalQueries = EvalQueries;
class Eval {
    static async latest() {
        const db = (0, database_1.getDb)();
        const db_results = await db
            .select({
            id: tables_1.evalsTable.id,
        })
            .from(tables_1.evalsTable)
            .orderBy((0, drizzle_orm_1.desc)(tables_1.evalsTable.createdAt))
            .limit(1);
        if (db_results.length === 0) {
            return undefined;
        }
        return await Eval.findById(db_results[0].id);
    }
    static async findById(id) {
        const db = (0, database_1.getDb)();
        const evalData = db.select().from(tables_1.evalsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsTable.id, id)).all();
        if (evalData.length === 0) {
            return undefined;
        }
        const datasetResults = db
            .select({
            datasetId: tables_1.evalsToDatasetsTable.datasetId,
        })
            .from(tables_1.evalsToDatasetsTable)
            .where((0, drizzle_orm_1.eq)(tables_1.evalsToDatasetsTable.evalId, id))
            .limit(1)
            .all();
        const eval_ = evalData[0];
        const datasetId = datasetResults[0]?.datasetId;
        const evalInstance = new Eval(eval_.config, {
            id: eval_.id,
            createdAt: new Date(eval_.createdAt),
            author: eval_.author || undefined,
            description: eval_.description || undefined,
            prompts: eval_.prompts || [],
            datasetId,
            persisted: true,
            vars: new Set(eval_.vars || []),
        });
        if (eval_.results && 'table' in eval_.results) {
            evalInstance.oldResults = eval_.results;
        }
        // backfill vars
        if (!eval_.vars) {
            const vars = await EvalQueries.getVarsFromEval(id);
            evalInstance.setVars(vars);
            await EvalQueries.setVars(id, vars);
        }
        return evalInstance;
    }
    static async getMany(limit = constants_1.DEFAULT_QUERY_LIMIT) {
        const db = (0, database_1.getDb)();
        const evals = await db
            .select()
            .from(tables_1.evalsTable)
            .limit(limit)
            .orderBy((0, drizzle_orm_1.desc)(tables_1.evalsTable.createdAt))
            .all();
        return evals.map((e) => new Eval(e.config, {
            id: e.id,
            createdAt: new Date(e.createdAt),
            author: e.author || undefined,
            description: e.description || undefined,
            prompts: e.prompts || [],
            persisted: true,
        }));
    }
    static async create(config, renderedPrompts, // The config doesn't contain the actual prompts, so we need to pass them in separately
    opts) {
        const createdAt = opts?.createdAt || new Date();
        const evalId = opts?.id || createEvalId(createdAt);
        const author = opts?.author || (0, accounts_1.getUserEmail)();
        const db = (0, database_1.getDb)();
        const datasetId = (0, createHash_1.sha256)(JSON.stringify(config.tests || []));
        db.transaction(() => {
            db.insert(tables_1.evalsTable)
                .values({
                id: evalId,
                createdAt: createdAt.getTime(),
                author,
                description: config.description,
                config,
                results: {},
            })
                .run();
            for (const prompt of renderedPrompts) {
                const label = prompt.label || prompt.display || prompt.raw;
                const promptId = (0, utils_1.hashPrompt)(prompt);
                db.insert(tables_1.promptsTable)
                    .values({
                    id: promptId,
                    prompt: label,
                })
                    .onConflictDoNothing()
                    .run();
                db.insert(tables_1.evalsToPromptsTable)
                    .values({
                    evalId,
                    promptId,
                })
                    .onConflictDoNothing()
                    .run();
                logger_1.default.debug(`Inserting prompt ${promptId}`);
            }
            if (opts?.results && opts.results.length > 0) {
                const res = db
                    .insert(tables_1.evalResultsTable)
                    .values(opts.results?.map((r) => ({ ...r, evalId, id: (0, crypto_1.randomUUID)() })))
                    .run();
                logger_1.default.debug(`Inserted ${res.changes} eval results`);
            }
            db.insert(tables_1.datasetsTable)
                .values({
                id: datasetId,
                tests: config.tests,
            })
                .onConflictDoNothing()
                .run();
            db.insert(tables_1.evalsToDatasetsTable)
                .values({
                evalId,
                datasetId,
            })
                .onConflictDoNothing()
                .run();
            logger_1.default.debug(`Inserting dataset ${datasetId}`);
            if (config.tags) {
                for (const [tagKey, tagValue] of Object.entries(config.tags)) {
                    const tagId = (0, createHash_1.sha256)(`${tagKey}:${tagValue}`);
                    db.insert(tables_1.tagsTable)
                        .values({
                        id: tagId,
                        name: tagKey,
                        value: tagValue,
                    })
                        .onConflictDoNothing()
                        .run();
                    db.insert(tables_1.evalsToTagsTable)
                        .values({
                        evalId,
                        tagId,
                    })
                        .onConflictDoNothing()
                        .run();
                    logger_1.default.debug(`Inserting tag ${tagId}`);
                }
            }
        });
        return new Eval(config, { id: evalId, author: opts?.author, createdAt, persisted: true });
    }
    constructor(config, opts) {
        this._resultsLoaded = false;
        const createdAt = opts?.createdAt || new Date();
        this.createdAt = createdAt.getTime();
        this.id = opts?.id || createEvalId(createdAt);
        this.author = opts?.author;
        this.config = config;
        this.results = [];
        this.prompts = opts?.prompts || [];
        this.datasetId = opts?.datasetId;
        this.persisted = opts?.persisted || false;
        this._resultsLoaded = false;
        this._vars = new Set(opts?.vars || []);
    }
    version() {
        /**
         * Version 3 is the denormalized version of where the table and results are stored on the eval object.
         * Version 4 is the normalized version where the results are stored in another databse table and the table for vizualization is generated by the app.
         */
        return this.oldResults && 'table' in this.oldResults ? 3 : 4;
    }
    useOldResults() {
        return this.version() < 4;
    }
    setTable(table) {
        (0, invariant_1.default)(this.version() < 4, 'Eval is not version 3');
        (0, invariant_1.default)(this.oldResults, 'Old results not found');
        this.oldResults.table = table;
    }
    async save() {
        const db = (0, database_1.getDb)();
        const updateObj = {
            config: this.config,
            prompts: this.prompts,
            description: this.config.description,
            author: this.author,
            updatedAt: (0, time_1.getCurrentTimestamp)(),
            vars: Array.from(this.vars),
        };
        if (this.useOldResults()) {
            (0, invariant_1.default)(this.oldResults, 'Old results not found');
            updateObj.results = this.oldResults;
        }
        await db.update(tables_1.evalsTable).set(updateObj).where((0, drizzle_orm_1.eq)(tables_1.evalsTable.id, this.id)).run();
        this.persisted = true;
    }
    setVars(vars) {
        this._vars = vars;
    }
    addVar(varName) {
        this.vars.add(varName);
    }
    get vars() {
        return this._vars;
    }
    getPrompts() {
        if (this.useOldResults()) {
            (0, invariant_1.default)(this.oldResults, 'Old results not found');
            return this.oldResults.table?.head.prompts || [];
        }
        return this.prompts;
    }
    async getTable() {
        if (this.useOldResults()) {
            return this.oldResults?.table || { head: { prompts: [], vars: [] }, body: [] };
        }
        return (0, convertEvalResultsToTable_1.convertResultsToTable)(await this.toResultsFile());
    }
    async addResult(result) {
        const newResult = await evalResult_1.default.createFromEvaluateResult(this.id, result, {
            persist: this.persisted,
        });
        if (!this.persisted) {
            // We're only going to keep results in memory if the eval isn't persisted in the database
            // This is to avoid memory issues when running large evaluations
            this.results.push(newResult);
        }
    }
    async *fetchResultsBatched(batchSize = 100) {
        for await (const batch of evalResult_1.default.findManyByEvalIdBatched(this.id, { batchSize })) {
            yield batch;
        }
    }
    async getResultsCount() {
        const db = (0, database_1.getDb)();
        const result = db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(tables_1.evalResultsTable)
            .where((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.evalId, this.id))
            .all();
        const count = result[0]?.count ?? 0;
        return Number(count);
    }
    async fetchResultsByTestIdx(testIdx) {
        return await evalResult_1.default.findManyByEvalId(this.id, { testIdx });
    }
    /**
     * Private helper method to build filter conditions and query for test indices
     */
    async queryTestIndices(opts) {
        const db = (0, database_1.getDb)();
        const offset = opts.offset ?? 0;
        const limit = opts.limit ?? 50;
        const filter = opts.filterMode ?? 'all';
        // Build filter conditions
        const conditions = [`eval_id = '${this.id}'`];
        if (filter === 'errors') {
            conditions.push(`failure_reason = ${types_1.ResultFailureReason.ERROR}`);
        }
        else if (filter === 'failures') {
            conditions.push(`success = 0 AND failure_reason != ${types_1.ResultFailureReason.ERROR}`);
        }
        else if (filter === 'passes') {
            conditions.push(`success = 1`);
        }
        // Add specific metric filter if provided
        if (opts.metricFilter && opts.metricFilter.trim() !== '') {
            const sanitizedMetric = opts.metricFilter.replace(/'/g, "''");
            conditions.push(`json_extract(named_scores, '$.${sanitizedMetric}') IS NOT NULL`);
        }
        // Add search condition if searchQuery is provided
        if (opts.searchQuery && opts.searchQuery.trim() !== '') {
            const sanitizedSearch = opts.searchQuery.replace(/'/g, "''");
            const searchConditions = [
                // Search in response text
                `response LIKE '%${sanitizedSearch}%'`,
                // Search in grading result reason
                `json_extract(grading_result, '$.reason') LIKE '%${sanitizedSearch}%'`,
                // Search in grading result comment
                `json_extract(grading_result, '$.comment') LIKE '%${sanitizedSearch}%'`,
                // Search in named scores
                `json_extract(named_scores, '$') LIKE '%${sanitizedSearch}%'`,
                // Search in metadata
                `json_extract(metadata, '$') LIKE '%${sanitizedSearch}%'`,
                // Search in test case vars
                `json_extract(test_case, '$.vars') LIKE '%${sanitizedSearch}%'`,
                // Search in test case metadata
                `json_extract(test_case, '$.metadata') LIKE '%${sanitizedSearch}%'`,
            ];
            conditions.push(`(${searchConditions.join(' OR ')})`);
        }
        const whereSql = conditions.join(' AND ');
        // Get filtered count
        const filteredCountQuery = drizzle_orm_1.sql.raw(`SELECT COUNT(DISTINCT test_idx) as count FROM eval_results WHERE ${whereSql}`);
        const countStart = Date.now();
        // @ts-ignore
        const countResult = await db.get(filteredCountQuery);
        const countEnd = Date.now();
        logger_1.default.debug(`Count query took ${countEnd - countStart}ms`);
        const filteredCount = countResult?.count || 0;
        // Query for test indices based on filters
        const idxQuery = drizzle_orm_1.sql.raw(`SELECT DISTINCT test_idx FROM eval_results WHERE ${whereSql} ORDER BY test_idx LIMIT ${limit} OFFSET ${offset}`);
        const idxStart = Date.now();
        // @ts-ignore
        const rows = await db.all(idxQuery);
        const idxEnd = Date.now();
        logger_1.default.debug(`Index query took ${idxEnd - idxStart}ms`);
        // Get all test indices from the rows
        const testIndices = rows.map((row) => row.test_idx);
        return { testIndices, filteredCount };
    }
    async getTablePage(opts) {
        // Get total count of tests for this eval
        const totalCount = await this.getResultsCount();
        // Determine test indices to use
        let testIndices;
        let filteredCount;
        if (opts.testIndices && opts.testIndices.length > 0) {
            // Use the provided test indices directly
            testIndices = opts.testIndices;
            filteredCount = testIndices.length;
        }
        else {
            // Query for test indices based on filters
            const queryResult = await this.queryTestIndices({
                offset: opts.offset,
                limit: opts.limit,
                filterMode: opts.filterMode,
                searchQuery: opts.searchQuery,
                metricFilter: opts.metricFilter,
            });
            testIndices = queryResult.testIndices;
            filteredCount = queryResult.filteredCount;
        }
        // Get vars for this eval
        const varsStart = Date.now();
        const vars = Array.from(this.vars);
        const varsEnd = Date.now();
        logger_1.default.debug(`Vars query took ${varsEnd - varsStart}ms`);
        // Initialize the body array that will hold table rows
        const body = [];
        const bodyStart = Date.now();
        // Early return if no test indices found
        if (testIndices.length === 0) {
            const bodyEnd = Date.now();
            logger_1.default.debug(`Body query took ${bodyEnd - bodyStart}ms`);
            return {
                head: { prompts: this.prompts, vars },
                body,
                totalCount,
                filteredCount,
                id: this.id,
            };
        }
        // Fetch all results for these test indices in a single query
        const allResults = await evalResult_1.default.findManyByEvalIdAndTestIndices(this.id, testIndices);
        // Group results by test index
        const resultsByTestIdx = new Map();
        for (const result of allResults) {
            if (!resultsByTestIdx.has(result.testIdx)) {
                resultsByTestIdx.set(result.testIdx, []);
            }
            resultsByTestIdx.get(result.testIdx).push(result);
        }
        // Create table rows in the same order as the original query
        for (const testIdx of testIndices) {
            const results = resultsByTestIdx.get(testIdx) || [];
            if (results.length > 0) {
                body.push((0, exportToFile_1.convertTestResultsToTableRow)(results, vars));
            }
        }
        const bodyEnd = Date.now();
        logger_1.default.debug(`Body query took ${bodyEnd - bodyStart}ms`);
        return { head: { prompts: this.prompts, vars }, body, totalCount, filteredCount, id: this.id };
    }
    async addPrompts(prompts) {
        this.prompts = prompts;
        if (this.persisted) {
            const db = (0, database_1.getDb)();
            await db.update(tables_1.evalsTable).set({ prompts }).where((0, drizzle_orm_1.eq)(tables_1.evalsTable.id, this.id)).run();
        }
    }
    async setResults(results) {
        this.results = results;
        if (this.persisted) {
            const db = (0, database_1.getDb)();
            await db.insert(tables_1.evalResultsTable).values(results.map((r) => ({ ...r, evalId: this.id })));
        }
        this._resultsLoaded = true;
    }
    async loadResults() {
        this.results = await evalResult_1.default.findManyByEvalId(this.id);
        this._resultsLoaded = true;
    }
    async getResults() {
        if (this.useOldResults()) {
            (0, invariant_1.default)(this.oldResults, 'Old results not found');
            return this.oldResults.results;
        }
        await this.loadResults();
        this._resultsLoaded = true;
        return this.results;
    }
    clearResults() {
        this.results = [];
        this._resultsLoaded = false;
    }
    getStats() {
        const stats = {
            successes: 0,
            failures: 0,
            errors: 0,
            tokenUsage: {
                cached: 0,
                completion: 0,
                prompt: 0,
                total: 0,
                numRequests: 0,
                completionDetails: {
                    reasoning: 0,
                    acceptedPrediction: 0,
                    rejectedPrediction: 0,
                },
                assertions: {
                    total: 0,
                    prompt: 0,
                    completion: 0,
                    cached: 0,
                },
            },
        };
        for (const prompt of this.prompts) {
            stats.successes += prompt.metrics?.testPassCount || 0;
            stats.failures += prompt.metrics?.testFailCount || 0;
            stats.errors += prompt.metrics?.testErrorCount || 0;
            stats.tokenUsage.prompt += prompt.metrics?.tokenUsage.prompt || 0;
            stats.tokenUsage.cached += prompt.metrics?.tokenUsage.cached || 0;
            stats.tokenUsage.completion += prompt.metrics?.tokenUsage.completion || 0;
            stats.tokenUsage.total += prompt.metrics?.tokenUsage.total || 0;
            stats.tokenUsage.numRequests += prompt.metrics?.tokenUsage.numRequests || 0;
            stats.tokenUsage.completionDetails.reasoning +=
                prompt.metrics?.tokenUsage.completionDetails?.reasoning || 0;
            stats.tokenUsage.completionDetails.acceptedPrediction +=
                prompt.metrics?.tokenUsage.completionDetails?.acceptedPrediction || 0;
            stats.tokenUsage.completionDetails.rejectedPrediction +=
                prompt.metrics?.tokenUsage.completionDetails?.rejectedPrediction || 0;
            // Add assertion token usage from prompt metrics
            if (prompt.metrics?.tokenUsage.assertions) {
                stats.tokenUsage.assertions.total += prompt.metrics.tokenUsage.assertions.total || 0;
                stats.tokenUsage.assertions.prompt += prompt.metrics.tokenUsage.assertions.prompt || 0;
                stats.tokenUsage.assertions.completion +=
                    prompt.metrics.tokenUsage.assertions.completion || 0;
                stats.tokenUsage.assertions.cached += prompt.metrics.tokenUsage.assertions.cached || 0;
            }
        }
        return stats;
    }
    async toEvaluateSummary() {
        if (this.useOldResults()) {
            (0, invariant_1.default)(this.oldResults, 'Old results not found');
            return {
                version: 2,
                timestamp: new Date(this.createdAt).toISOString(),
                results: this.oldResults.results,
                table: this.oldResults.table,
                stats: this.oldResults.stats,
            };
        }
        if (this.results.length === 0) {
            await this.loadResults();
        }
        const stats = await this.getStats();
        const shouldStripPromptText = (0, envars_1.getEnvBool)('PROMPTFOO_STRIP_PROMPT_TEXT', false);
        const prompts = shouldStripPromptText
            ? this.prompts.map((p) => ({
                ...p,
                raw: '[prompt stripped]',
            }))
            : this.prompts;
        return {
            version: 3,
            timestamp: new Date(this.createdAt).toISOString(),
            prompts,
            results: this.results.map((r) => r.toEvaluateResult()),
            stats,
        };
    }
    async toResultsFile() {
        const results = {
            version: this.version(),
            createdAt: new Date(this.createdAt).toISOString(),
            results: await this.toEvaluateSummary(),
            config: this.config,
            author: this.author || null,
            prompts: this.getPrompts(),
            datasetId: this.datasetId || null,
        };
        return results;
    }
    async delete() {
        const db = (0, database_1.getDb)();
        db.transaction(() => {
            db.delete(tables_1.evalsToDatasetsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsToDatasetsTable.evalId, this.id)).run();
            db.delete(tables_1.evalsToPromptsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsToPromptsTable.evalId, this.id)).run();
            db.delete(tables_1.evalsToTagsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsToTagsTable.evalId, this.id)).run();
            db.delete(tables_1.evalResultsTable).where((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.evalId, this.id)).run();
            db.delete(tables_1.evalsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsTable.id, this.id)).run();
        });
    }
}
exports.default = Eval;
/**
 * Queries summaries of all evals, optionally for a given dataset.
 *
 * @param datasetId - An optional dataset ID to filter by.
 * @returns A list of eval summaries.
 */
async function getEvalSummaries(datasetId) {
    const db = (0, database_1.getDb)();
    const results = db
        .select({
        evalId: tables_1.evalsTable.id,
        createdAt: tables_1.evalsTable.createdAt,
        description: tables_1.evalsTable.description,
        datasetId: tables_1.evalsToDatasetsTable.datasetId,
        isRedteam: (0, drizzle_orm_1.sql) `json_type(${tables_1.evalsTable.config}, '$.redteam') IS NOT NULL`,
        prompts: tables_1.evalsTable.prompts,
    })
        .from(tables_1.evalsTable)
        .leftJoin(tables_1.evalsToDatasetsTable, (0, drizzle_orm_1.eq)(tables_1.evalsTable.id, tables_1.evalsToDatasetsTable.evalId))
        .where(datasetId ? (0, drizzle_orm_1.eq)(tables_1.evalsToDatasetsTable.datasetId, datasetId) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(tables_1.evalsTable.createdAt))
        .all();
    /**
     * Deserialize the evals. A few things to note:
     *
     * - Test statistics are derived from the prompt metrics as this is the only reliable source of truth
     * that's written to the evals table.
     */
    return results.map((result) => {
        const passCount = result.prompts?.reduce((memo, prompt) => {
            // TODO(will): Verify whether prompt.metrics *should* be required.
            (0, invariant_1.default)(!!prompt.metrics, 'Prompt metrics are required');
            return memo + prompt.metrics.testPassCount;
        }, 0) ?? 0;
        // All prompts should have the same number of test cases:
        const testCounts = result.prompts?.map((p) => {
            return ((p.metrics?.testPassCount ?? 0) +
                (p.metrics?.testFailCount ?? 0) +
                (p.metrics?.testErrorCount ?? 0));
        }) ?? [0];
        (0, invariant_1.default)(testCounts.every((t) => t === testCounts[0]), 'All prompts must have the same number of test cases');
        // Derive the number of tests from the first prompt.
        const testCount = testCounts.length > 0 ? testCounts[0] : 0;
        // Test count * prompt count
        const testRunCount = testCount * (result.prompts?.length ?? 0);
        return {
            evalId: result.evalId,
            createdAt: result.createdAt,
            description: result.description,
            numTests: testCount,
            datasetId: result.datasetId,
            isRedteam: result.isRedteam,
            passRate: testRunCount > 0 ? (passCount / testRunCount) * 100 : 0,
            label: result.description ? `${result.description} (${result.evalId})` : result.evalId,
        };
    });
}
//# sourceMappingURL=eval.js.map