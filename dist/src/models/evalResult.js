"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeProvider = sanitizeProvider;
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const database_1 = require("../database");
const tables_1 = require("../database/tables");
const envars_1 = require("../envars");
const utils_1 = require("../prompts/utils");
const providers_1 = require("../types/providers");
const json_1 = require("../util/json");
const time_1 = require("../util/time");
// Removes circular references from the provider object and ensures consistent format
function sanitizeProvider(provider) {
    try {
        if ((0, providers_1.isApiProvider)(provider)) {
            return {
                id: provider.id(),
                label: provider.label,
                ...(provider.config && {
                    config: JSON.parse((0, json_1.safeJsonStringify)(provider.config)),
                }),
            };
        }
        if ((0, providers_1.isProviderOptions)(provider)) {
            return {
                id: provider.id,
                label: provider.label,
                ...(provider.config && {
                    config: JSON.parse((0, json_1.safeJsonStringify)(provider.config)),
                }),
            };
        }
        if (typeof provider === 'object' && provider) {
            const providerObj = provider;
            return {
                id: typeof providerObj.id === 'function' ? providerObj.id() : providerObj.id,
                label: providerObj.label,
                ...(providerObj.config && {
                    config: JSON.parse((0, json_1.safeJsonStringify)(providerObj.config)),
                }),
            };
        }
    }
    catch { }
    return JSON.parse((0, json_1.safeJsonStringify)(provider));
}
class EvalResult {
    static async createFromEvaluateResult(evalId, result, opts) {
        const persist = opts?.persist == null ? true : opts.persist;
        const { prompt, error, score, latencyMs, success, provider, gradingResult, namedScores, cost, metadata, failureReason, testCase, } = result;
        const args = {
            id: (0, crypto_1.randomUUID)(),
            evalId,
            testCase: {
                ...testCase,
                ...(testCase.provider && {
                    provider: sanitizeProvider(testCase.provider),
                }),
            },
            promptIdx: result.promptIdx,
            testIdx: result.testIdx,
            prompt,
            promptId: (0, utils_1.hashPrompt)(prompt),
            error: error?.toString(),
            success,
            score: score == null ? 0 : score,
            response: result.response || null,
            gradingResult: gradingResult || null,
            namedScores,
            provider: sanitizeProvider(provider),
            latencyMs,
            cost,
            metadata,
            failureReason,
        };
        if (persist) {
            const db = (0, database_1.getDb)();
            const dbResult = await db.insert(tables_1.evalResultsTable).values(args).returning();
            return new EvalResult({ ...dbResult[0], persisted: true });
        }
        return new EvalResult(args);
    }
    static async createManyFromEvaluateResult(results, evalId) {
        const db = (0, database_1.getDb)();
        const returnResults = [];
        await db.transaction(async (tx) => {
            for (const result of results) {
                const dbResult = await tx
                    .insert(tables_1.evalResultsTable)
                    .values({ ...result, evalId, id: (0, crypto_1.randomUUID)() })
                    .returning();
                returnResults.push(new EvalResult({ ...dbResult[0], persisted: true }));
            }
        });
        return returnResults;
    }
    static async findById(id) {
        const db = (0, database_1.getDb)();
        const result = await db.select().from(tables_1.evalResultsTable).where((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.id, id));
        return result.length > 0 ? new EvalResult({ ...result[0], persisted: true }) : null;
    }
    static async findManyByEvalId(evalId, opts) {
        const db = (0, database_1.getDb)();
        const results = await db
            .select()
            .from(tables_1.evalResultsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.evalId, evalId), opts?.testIdx == null ? undefined : (0, drizzle_orm_1.eq)(tables_1.evalResultsTable.testIdx, opts.testIdx)));
        return results.map((result) => new EvalResult({ ...result, persisted: true }));
    }
    static async findManyByEvalIdAndTestIndices(evalId, testIndices) {
        if (!testIndices.length) {
            return [];
        }
        const db = (0, database_1.getDb)();
        const results = await db
            .select()
            .from(tables_1.evalResultsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.evalId, evalId), testIndices.length === 1
            ? (0, drizzle_orm_1.eq)(tables_1.evalResultsTable.testIdx, testIndices[0])
            : (0, drizzle_orm_1.inArray)(tables_1.evalResultsTable.testIdx, testIndices)));
        return results.map((result) => new EvalResult({ ...result, persisted: true }));
    }
    // This is a generator that yields batches of results from the database
    // These are batched by test Id, not just results to ensure we get all results for a given test
    static async *findManyByEvalIdBatched(evalId, opts) {
        const db = (0, database_1.getDb)();
        const batchSize = opts?.batchSize || 100;
        let offset = 0;
        while (true) {
            const results = await db
                .select()
                .from(tables_1.evalResultsTable)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.evalId, evalId), (0, drizzle_orm_1.gte)(tables_1.evalResultsTable.testIdx, offset), (0, drizzle_orm_1.lt)(tables_1.evalResultsTable.testIdx, offset + batchSize)))
                .all();
            if (results.length === 0) {
                break;
            }
            yield results.map((result) => new EvalResult({ ...result, persisted: true }));
            offset += batchSize;
        }
    }
    constructor(opts) {
        this.id = opts.id;
        this.evalId = opts.evalId;
        this.promptIdx = opts.promptIdx;
        this.testIdx = opts.testIdx;
        this.testCase = opts.testCase;
        this.prompt = opts.prompt;
        this.promptId = opts.promptId || (0, utils_1.hashPrompt)(opts.prompt);
        this.error = opts.error;
        this.score = opts.score;
        this.success = opts.success;
        this.response = opts.response || undefined;
        this.gradingResult = opts.gradingResult;
        this.namedScores = opts.namedScores || {};
        this.provider = opts.provider;
        this.latencyMs = opts.latencyMs || 0;
        this.cost = opts.cost || 0;
        this.metadata = opts.metadata || {};
        this.failureReason = opts.failureReason;
        this.persisted = opts.persisted || false;
    }
    async save() {
        const db = (0, database_1.getDb)();
        //check if this exists in the db
        if (this.persisted) {
            await db
                .update(tables_1.evalResultsTable)
                .set({ ...this, updatedAt: (0, time_1.getCurrentTimestamp)() })
                .where((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.id, this.id));
        }
        else {
            const result = await db.insert(tables_1.evalResultsTable).values(this).returning();
            this.id = result[0].id;
            this.persisted = true;
        }
    }
    toEvaluateResult() {
        const shouldStripPromptText = (0, envars_1.getEnvBool)('PROMPTFOO_STRIP_PROMPT_TEXT', false);
        const shouldStripResponseOutput = (0, envars_1.getEnvBool)('PROMPTFOO_STRIP_RESPONSE_OUTPUT', false);
        const shouldStripTestVars = (0, envars_1.getEnvBool)('PROMPTFOO_STRIP_TEST_VARS', false);
        const shouldStripGradingResult = (0, envars_1.getEnvBool)('PROMPTFOO_STRIP_GRADING_RESULT', false);
        const shouldStripMetadata = (0, envars_1.getEnvBool)('PROMPTFOO_STRIP_METADATA', false);
        const response = shouldStripResponseOutput && this.response
            ? {
                ...this.response,
                output: '[output stripped]',
            }
            : this.response;
        const prompt = shouldStripPromptText
            ? {
                ...this.prompt,
                raw: '[prompt stripped]',
            }
            : this.prompt;
        const testCase = shouldStripTestVars
            ? {
                ...this.testCase,
                vars: undefined,
            }
            : this.testCase;
        return {
            cost: this.cost,
            description: this.description || undefined,
            error: this.error || undefined,
            gradingResult: shouldStripGradingResult ? null : this.gradingResult,
            id: this.id,
            latencyMs: this.latencyMs,
            namedScores: this.namedScores,
            prompt,
            promptId: this.promptId,
            promptIdx: this.promptIdx,
            provider: { id: this.provider.id, label: this.provider.label },
            response,
            score: this.score,
            success: this.success,
            testCase,
            testIdx: this.testIdx,
            vars: shouldStripTestVars ? {} : this.testCase.vars || {},
            metadata: shouldStripMetadata ? {} : this.metadata,
            failureReason: this.failureReason,
        };
    }
}
exports.default = EvalResult;
//# sourceMappingURL=evalResult.js.map