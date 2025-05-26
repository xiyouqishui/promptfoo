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
exports.writeResultsToDatabase = writeResultsToDatabase;
exports.readResult = readResult;
exports.updateResult = updateResult;
exports.getLatestEval = getLatestEval;
exports.getPromptsWithPredicate = getPromptsWithPredicate;
exports.getPromptsForTestCasesHash = getPromptsForTestCasesHash;
exports.getPromptsForTestCases = getPromptsForTestCases;
exports.getTestCasesWithPredicate = getTestCasesWithPredicate;
exports.getPrompts = getPrompts;
exports.getTestCases = getTestCases;
exports.getPromptFromHash = getPromptFromHash;
exports.getDatasetFromHash = getDatasetFromHash;
exports.getEvalsWithPredicate = getEvalsWithPredicate;
exports.getEvals = getEvals;
exports.getEvalFromId = getEvalFromId;
exports.deleteEval = deleteEval;
exports.deleteAllEvals = deleteAllEvals;
exports.getStandaloneEvals = getStandaloneEvals;
const drizzle_orm_1 = require("drizzle-orm");
const node_cache_1 = __importDefault(require("node-cache"));
const database_1 = require("../database");
const tables_1 = require("../database/tables");
const accounts_1 = require("../globalConfig/accounts");
const logger_1 = __importDefault(require("../logger"));
const eval_1 = __importStar(require("../models/eval"));
const prompt_1 = require("../models/prompt");
const invariant_1 = __importDefault(require("../util/invariant"));
const createHash_1 = require("./createHash");
const DEFAULT_QUERY_LIMIT = 100;
async function writeResultsToDatabase(results, config, createdAt = new Date()) {
    createdAt = createdAt || (results.timestamp ? new Date(results.timestamp) : new Date());
    const evalId = (0, eval_1.createEvalId)(createdAt);
    const db = (0, database_1.getDb)();
    const promises = [];
    promises.push(db
        .insert(tables_1.evalsTable)
        .values({
        id: evalId,
        createdAt: createdAt.getTime(),
        author: (0, accounts_1.getAuthor)(),
        description: config.description,
        config,
        results,
    })
        .onConflictDoNothing()
        .run());
    logger_1.default.debug(`Inserting eval ${evalId}`);
    // Record prompt relation
    (0, invariant_1.default)(results.table, 'Table is required');
    for (const prompt of results.table.head.prompts) {
        const label = prompt.label || prompt.display || prompt.raw;
        const promptId = (0, prompt_1.generateIdFromPrompt)(prompt);
        promises.push(db
            .insert(tables_1.promptsTable)
            .values({
            id: promptId,
            prompt: label,
        })
            .onConflictDoNothing()
            .run());
        promises.push(db
            .insert(tables_1.evalsToPromptsTable)
            .values({
            evalId,
            promptId,
        })
            .onConflictDoNothing()
            .run());
        logger_1.default.debug(`Inserting prompt ${promptId}`);
    }
    // Record dataset relation
    const datasetId = (0, createHash_1.sha256)(JSON.stringify(config.tests || []));
    promises.push(db
        .insert(tables_1.datasetsTable)
        .values({
        id: datasetId,
        tests: config.tests,
    })
        .onConflictDoNothing()
        .run());
    promises.push(db
        .insert(tables_1.evalsToDatasetsTable)
        .values({
        evalId,
        datasetId,
    })
        .onConflictDoNothing()
        .run());
    logger_1.default.debug(`Inserting dataset ${datasetId}`);
    // Record tags
    if (config.tags) {
        for (const [tagKey, tagValue] of Object.entries(config.tags)) {
            const tagId = (0, createHash_1.sha256)(`${tagKey}:${tagValue}`);
            promises.push(db
                .insert(tables_1.tagsTable)
                .values({
                id: tagId,
                name: tagKey,
                value: tagValue,
            })
                .onConflictDoNothing()
                .run());
            promises.push(db
                .insert(tables_1.evalsToTagsTable)
                .values({
                evalId,
                tagId,
            })
                .onConflictDoNothing()
                .run());
            logger_1.default.debug(`Inserting tag ${tagId}`);
        }
    }
    logger_1.default.debug(`Awaiting ${promises.length} promises to database...`);
    await Promise.all(promises);
    return evalId;
}
async function readResult(id) {
    try {
        const eval_ = await eval_1.default.findById(id);
        (0, invariant_1.default)(eval_, `Eval with ID ${id} not found.`);
        return {
            id,
            result: await eval_.toResultsFile(),
            createdAt: new Date(eval_.createdAt),
        };
    }
    catch (err) {
        logger_1.default.error(`Failed to read result with ID ${id} from database:\n${err}`);
    }
}
async function updateResult(id, newConfig, newTable) {
    try {
        // Fetch the existing eval data from the database
        const existingEval = await eval_1.default.findById(id);
        if (!existingEval) {
            logger_1.default.error(`Eval with ID ${id} not found.`);
            return;
        }
        if (newConfig) {
            existingEval.config = newConfig;
        }
        if (newTable) {
            existingEval.setTable(newTable);
        }
        await existingEval.save();
        logger_1.default.info(`Updated eval with ID ${id}`);
    }
    catch (err) {
        logger_1.default.error(`Failed to update eval with ID ${id}:\n${err}`);
    }
}
async function getLatestEval(filterDescription) {
    const eval_ = await eval_1.default.latest();
    return await eval_?.toResultsFile();
}
async function getPromptsWithPredicate(predicate, limit) {
    // TODO(ian): Make this use a proper database query
    const evals_ = await eval_1.default.getMany(limit);
    const groupedPrompts = {};
    for (const eval_ of evals_) {
        const createdAt = new Date(eval_.createdAt).toISOString();
        const resultWrapper = await eval_.toResultsFile();
        if (predicate(resultWrapper)) {
            for (const prompt of eval_.getPrompts()) {
                const promptId = (0, createHash_1.sha256)(prompt.raw);
                const datasetId = resultWrapper.config.tests
                    ? (0, createHash_1.sha256)(JSON.stringify(resultWrapper.config.tests))
                    : '-';
                if (promptId in groupedPrompts) {
                    groupedPrompts[promptId].recentEvalDate = new Date(Math.max(groupedPrompts[promptId].recentEvalDate.getTime(), new Date(createdAt).getTime()));
                    groupedPrompts[promptId].count += 1;
                    groupedPrompts[promptId].evals.push({
                        id: eval_.id,
                        datasetId,
                        metrics: prompt.metrics,
                    });
                }
                else {
                    groupedPrompts[promptId] = {
                        count: 1,
                        id: promptId,
                        prompt,
                        recentEvalDate: new Date(createdAt),
                        recentEvalId: eval_.id,
                        evals: [
                            {
                                id: eval_.id,
                                datasetId,
                                metrics: prompt.metrics,
                            },
                        ],
                    };
                }
            }
        }
    }
    return Object.values(groupedPrompts);
}
function getPromptsForTestCasesHash(testCasesSha256, limit = DEFAULT_QUERY_LIMIT) {
    return getPromptsWithPredicate((result) => {
        const testsJson = JSON.stringify(result.config.tests);
        const hash = (0, createHash_1.sha256)(testsJson);
        return hash === testCasesSha256;
    }, limit);
}
function getPromptsForTestCases(testCases) {
    const testCasesJson = JSON.stringify(testCases);
    const testCasesSha256 = (0, createHash_1.sha256)(testCasesJson);
    return getPromptsForTestCasesHash(testCasesSha256);
}
async function getTestCasesWithPredicate(predicate, limit) {
    const evals_ = await eval_1.default.getMany(limit);
    const groupedTestCases = {};
    for (const eval_ of evals_) {
        const createdAt = new Date(eval_.createdAt).toISOString();
        const resultWrapper = await eval_.toResultsFile();
        const testCases = resultWrapper.config.tests;
        if (testCases && predicate(resultWrapper)) {
            const evalId = eval_.id;
            const datasetId = (0, createHash_1.sha256)(JSON.stringify(testCases));
            if (datasetId in groupedTestCases) {
                groupedTestCases[datasetId].recentEvalDate = new Date(Math.max(groupedTestCases[datasetId].recentEvalDate.getTime(), eval_.createdAt));
                groupedTestCases[datasetId].count += 1;
                const newPrompts = eval_.getPrompts().map((prompt) => ({
                    id: (0, createHash_1.sha256)(prompt.raw),
                    prompt,
                    evalId,
                }));
                const promptsById = {};
                for (const prompt of groupedTestCases[datasetId].prompts.concat(newPrompts)) {
                    if (!(prompt.id in promptsById)) {
                        promptsById[prompt.id] = prompt;
                    }
                }
                groupedTestCases[datasetId].prompts = Object.values(promptsById);
            }
            else {
                const newPrompts = eval_.getPrompts().map((prompt) => ({
                    id: (0, createHash_1.sha256)(prompt.raw),
                    prompt,
                    evalId,
                }));
                const promptsById = {};
                for (const prompt of newPrompts) {
                    if (!(prompt.id in promptsById)) {
                        promptsById[prompt.id] = prompt;
                    }
                }
                groupedTestCases[datasetId] = {
                    id: datasetId,
                    count: 1,
                    testCases,
                    recentEvalDate: new Date(createdAt),
                    recentEvalId: evalId,
                    prompts: Object.values(promptsById),
                };
            }
        }
    }
    return Object.values(groupedTestCases);
}
function getPrompts(limit = DEFAULT_QUERY_LIMIT) {
    return getPromptsWithPredicate(() => true, limit);
}
async function getTestCases(limit = DEFAULT_QUERY_LIMIT) {
    return getTestCasesWithPredicate(() => true, limit);
}
async function getPromptFromHash(hash) {
    const prompts = await getPrompts();
    for (const prompt of prompts) {
        if (prompt.id.startsWith(hash)) {
            return prompt;
        }
    }
    return undefined;
}
async function getDatasetFromHash(hash) {
    const datasets = await getTestCases();
    for (const dataset of datasets) {
        if (dataset.id.startsWith(hash)) {
            return dataset;
        }
    }
    return undefined;
}
async function getEvalsWithPredicate(predicate, limit) {
    const db = (0, database_1.getDb)();
    const evals_ = await db
        .select({
        id: tables_1.evalsTable.id,
        createdAt: tables_1.evalsTable.createdAt,
        author: tables_1.evalsTable.author,
        results: tables_1.evalsTable.results,
        config: tables_1.evalsTable.config,
        description: tables_1.evalsTable.description,
    })
        .from(tables_1.evalsTable)
        .orderBy((0, drizzle_orm_1.desc)(tables_1.evalsTable.createdAt))
        .limit(limit)
        .all();
    const ret = [];
    for (const eval_ of evals_) {
        const createdAt = new Date(eval_.createdAt).toISOString();
        const resultWrapper = {
            version: 3,
            createdAt,
            author: eval_.author,
            // @ts-ignore
            results: eval_.results,
            config: eval_.config,
        };
        if (predicate(resultWrapper)) {
            const evalId = eval_.id;
            ret.push({
                id: evalId,
                date: new Date(eval_.createdAt),
                config: eval_.config,
                // @ts-ignore
                results: eval_.results,
                description: eval_.description || undefined,
            });
        }
    }
    return ret;
}
async function getEvals(limit = DEFAULT_QUERY_LIMIT) {
    return getEvalsWithPredicate(() => true, limit);
}
async function getEvalFromId(hash) {
    const evals_ = await getEvals();
    for (const eval_ of evals_) {
        if (eval_.id.startsWith(hash)) {
            return eval_;
        }
    }
    return undefined;
}
async function deleteEval(evalId) {
    const db = (0, database_1.getDb)();
    db.transaction(() => {
        // We need to clean up foreign keys first. We don't have onDelete: 'cascade' set on all these relationships.
        db.delete(tables_1.evalsToPromptsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsToPromptsTable.evalId, evalId)).run();
        db.delete(tables_1.evalsToDatasetsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsToDatasetsTable.evalId, evalId)).run();
        db.delete(tables_1.evalsToTagsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsToTagsTable.evalId, evalId)).run();
        db.delete(tables_1.evalResultsTable).where((0, drizzle_orm_1.eq)(tables_1.evalResultsTable.evalId, evalId)).run();
        // Finally, delete the eval record
        const deletedIds = db.delete(tables_1.evalsTable).where((0, drizzle_orm_1.eq)(tables_1.evalsTable.id, evalId)).run();
        if (deletedIds.changes === 0) {
            throw new Error(`Eval with ID ${evalId} not found`);
        }
    });
}
/**
 * Deletes all evaluations and related records with foreign keys from the database.
 * @async
 * @returns {Promise<void>}
 */
async function deleteAllEvals() {
    const db = (0, database_1.getDb)();
    db.transaction(() => {
        db.delete(tables_1.evalResultsTable).run();
        db.delete(tables_1.evalsToPromptsTable).run();
        db.delete(tables_1.evalsToDatasetsTable).run();
        db.delete(tables_1.evalsToTagsTable).run();
        db.delete(tables_1.evalsTable).run();
    });
}
const standaloneEvalCache = new node_cache_1.default({ stdTTL: 60 * 60 * 2 }); // Cache for 2 hours
async function getStandaloneEvals({ limit = DEFAULT_QUERY_LIMIT, tag, description, } = {}) {
    const cacheKey = `standalone_evals_${limit}_${tag?.key}_${tag?.value}`;
    const cachedResult = standaloneEvalCache.get(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    const db = (0, database_1.getDb)();
    const results = db
        .select({
        evalId: tables_1.evalsTable.id,
        description: tables_1.evalsTable.description,
        results: tables_1.evalsTable.results,
        createdAt: tables_1.evalsTable.createdAt,
        promptId: tables_1.evalsToPromptsTable.promptId,
        datasetId: tables_1.evalsToDatasetsTable.datasetId,
        tagName: tables_1.tagsTable.name,
        tagValue: tables_1.tagsTable.value,
        isRedteam: (0, drizzle_orm_1.sql) `json_extract(evals.config, '$.redteam') IS NOT NULL`.as('isRedteam'),
    })
        .from(tables_1.evalsTable)
        .leftJoin(tables_1.evalsToPromptsTable, (0, drizzle_orm_1.eq)(tables_1.evalsTable.id, tables_1.evalsToPromptsTable.evalId))
        .leftJoin(tables_1.evalsToDatasetsTable, (0, drizzle_orm_1.eq)(tables_1.evalsTable.id, tables_1.evalsToDatasetsTable.evalId))
        .leftJoin(tables_1.evalsToTagsTable, (0, drizzle_orm_1.eq)(tables_1.evalsTable.id, tables_1.evalsToTagsTable.evalId))
        .leftJoin(tables_1.tagsTable, (0, drizzle_orm_1.eq)(tables_1.evalsToTagsTable.tagId, tables_1.tagsTable.id))
        .where((0, drizzle_orm_1.and)(tag ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(tables_1.tagsTable.name, tag.key), (0, drizzle_orm_1.eq)(tables_1.tagsTable.value, tag.value)) : undefined, description ? (0, drizzle_orm_1.eq)(tables_1.evalsTable.description, description) : undefined))
        .orderBy((0, drizzle_orm_1.desc)(tables_1.evalsTable.createdAt))
        .limit(limit)
        .all();
    // TODO(Performance): Load all necessary data in one go rather than re-requesting each eval!
    const standaloneEvals = (await Promise.all(results.map(async (result) => {
        const { description, createdAt, evalId, promptId, datasetId, 
        // @ts-ignore
        isRedteam, } = result;
        const eval_ = await eval_1.default.findById(evalId);
        (0, invariant_1.default)(eval_, `Eval with ID ${evalId} not found`);
        const table = (await eval_.getTable()) || { body: [] };
        // @ts-ignore
        return eval_.getPrompts().map((col, index) => {
            // Compute some stats
            const pluginCounts = table.body.reduce(
            // @ts-ignore
            (acc, row) => {
                const pluginId = row.test.metadata?.pluginId;
                if (pluginId) {
                    const isPass = row.outputs[index].pass;
                    acc.pluginPassCount[pluginId] =
                        (acc.pluginPassCount[pluginId] || 0) + (isPass ? 1 : 0);
                    acc.pluginFailCount[pluginId] =
                        (acc.pluginFailCount[pluginId] || 0) + (isPass ? 0 : 1);
                }
                return acc;
            }, { pluginPassCount: {}, pluginFailCount: {} });
            return {
                evalId,
                description,
                promptId,
                datasetId,
                createdAt,
                isRedteam: isRedteam,
                ...pluginCounts,
                ...col,
            };
        });
    }))).flat();
    // Ensure each row has a UUID as the `id` and `evalId` properties are not unique!
    const withUUIDs = standaloneEvals.map((eval_) => ({
        ...eval_,
        uuid: crypto.randomUUID(),
    }));
    standaloneEvalCache.set(cacheKey, withUUIDs);
    return withUUIDs;
}
//# sourceMappingURL=database.js.map