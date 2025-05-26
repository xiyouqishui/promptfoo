"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configsTable = exports.evalsToDatasetsRelations = exports.evalsToPromptsRelations = exports.evalsRelations = exports.datasetsRelations = exports.evalsToDatasetsTable = exports.datasetsTable = exports.evalsToTagsRelations = exports.tagsRelations = exports.evalsToTagsTable = exports.promptsRelations = exports.evalsToPromptsTable = exports.evalResultsTable = exports.evalsTable = exports.tagsTable = exports.promptsTable = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const types_1 = require("../types");
// ------------ Prompts ------------
exports.promptsTable = (0, sqlite_core_1.sqliteTable)('prompts', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    createdAt: (0, sqlite_core_1.integer)('created_at')
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    prompt: (0, sqlite_core_1.text)('prompt').notNull(),
}, (table) => ({
    createdAtIdx: (0, sqlite_core_1.index)('prompts_created_at_idx').on(table.createdAt),
}));
// ------------ Tags ------------
exports.tagsTable = (0, sqlite_core_1.sqliteTable)('tags', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    value: (0, sqlite_core_1.text)('value').notNull(),
}, (table) => ({
    nameIdx: (0, sqlite_core_1.index)('tags_name_idx').on(table.name),
    uniqueNameValue: (0, sqlite_core_1.uniqueIndex)('tags_name_value_unique').on(table.name, table.value),
}));
// ------------ Evals ------------
exports.evalsTable = (0, sqlite_core_1.sqliteTable)('evals', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    createdAt: (0, sqlite_core_1.integer)('created_at')
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    author: (0, sqlite_core_1.text)('author'),
    description: (0, sqlite_core_1.text)('description'),
    results: (0, sqlite_core_1.text)('results', { mode: 'json' }).$type().notNull(),
    config: (0, sqlite_core_1.text)('config', { mode: 'json' }).$type().notNull(),
    prompts: (0, sqlite_core_1.text)('prompts', { mode: 'json' }).$type(),
    vars: (0, sqlite_core_1.text)('vars', { mode: 'json' }).$type(),
}, (table) => ({
    createdAtIdx: (0, sqlite_core_1.index)('evals_created_at_idx').on(table.createdAt),
    authorIdx: (0, sqlite_core_1.index)('evals_author_idx').on(table.author),
}));
exports.evalResultsTable = (0, sqlite_core_1.sqliteTable)('eval_results', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    createdAt: (0, sqlite_core_1.integer)('created_at')
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at')
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    evalId: (0, sqlite_core_1.text)('eval_id')
        .notNull()
        .references(() => exports.evalsTable.id),
    promptIdx: (0, sqlite_core_1.integer)('prompt_idx').notNull(),
    testIdx: (0, sqlite_core_1.integer)('test_idx').notNull(),
    testCase: (0, sqlite_core_1.text)('test_case', { mode: 'json' }).$type().notNull(),
    prompt: (0, sqlite_core_1.text)('prompt', { mode: 'json' }).$type().notNull(),
    promptId: (0, sqlite_core_1.text)('prompt_id').references(() => exports.promptsTable.id),
    // Provider-related fields
    provider: (0, sqlite_core_1.text)('provider', { mode: 'json' }).$type().notNull(),
    latencyMs: (0, sqlite_core_1.integer)('latency_ms'),
    cost: (0, sqlite_core_1.real)('cost'),
    // Output-related fields
    response: (0, sqlite_core_1.text)('response', { mode: 'json' }).$type(),
    error: (0, sqlite_core_1.text)('error'),
    failureReason: (0, sqlite_core_1.integer)('failure_reason').default(types_1.ResultFailureReason.NONE).notNull(),
    // Result-related fields
    success: (0, sqlite_core_1.integer)('success', { mode: 'boolean' }).notNull(),
    score: (0, sqlite_core_1.real)('score').notNull(),
    gradingResult: (0, sqlite_core_1.text)('grading_result', { mode: 'json' }).$type(),
    namedScores: (0, sqlite_core_1.text)('named_scores', { mode: 'json' }).$type(),
    // Metadata fields
    metadata: (0, sqlite_core_1.text)('metadata', { mode: 'json' }).$type(),
}, (table) => ({
    evalIdIdx: (0, sqlite_core_1.index)('eval_result_eval_id_idx').on(table.evalId),
    testIdxIdx: (0, sqlite_core_1.index)('eval_result_test_idx').on(table.testIdx),
    responseIdx: (0, sqlite_core_1.index)('eval_result_response_idx').on(table.response),
    gradingResultReasonIdx: (0, sqlite_core_1.index)('eval_result_grading_result_reason_idx').on((0, drizzle_orm_1.sql) `json_extract(${table.gradingResult}, '$.reason')`),
    gradingResultCommentIdx: (0, sqlite_core_1.index)('eval_result_grading_result_comment_idx').on((0, drizzle_orm_1.sql) `json_extract(${table.gradingResult}, '$.comment')`),
    testCaseVarsIdx: (0, sqlite_core_1.index)('eval_result_test_case_vars_idx').on((0, drizzle_orm_1.sql) `json_extract(${table.testCase}, '$.vars')`),
    testCaseMetadataIdx: (0, sqlite_core_1.index)('eval_result_test_case_metadata_idx').on((0, drizzle_orm_1.sql) `json_extract(${table.metadata}, '$')`),
    namedScoresIdx: (0, sqlite_core_1.index)('eval_result_named_scores_idx').on((0, drizzle_orm_1.sql) `json_extract(${table.namedScores}, '$')`),
    metadataIdx: (0, sqlite_core_1.index)('eval_result_metadata_idx').on((0, drizzle_orm_1.sql) `json_extract(${table.metadata}, '$')`),
}));
exports.evalsToPromptsTable = (0, sqlite_core_1.sqliteTable)('evals_to_prompts', {
    evalId: (0, sqlite_core_1.text)('eval_id')
        .notNull()
        .references(() => exports.evalsTable.id, { onDelete: 'cascade' }),
    promptId: (0, sqlite_core_1.text)('prompt_id')
        .notNull()
        .references(() => exports.promptsTable.id),
}, (t) => ({
    pk: (0, sqlite_core_1.primaryKey)({ columns: [t.evalId, t.promptId] }),
    evalIdIdx: (0, sqlite_core_1.index)('evals_to_prompts_eval_id_idx').on(t.evalId),
    promptIdIdx: (0, sqlite_core_1.index)('evals_to_prompts_prompt_id_idx').on(t.promptId),
}));
exports.promptsRelations = (0, drizzle_orm_1.relations)(exports.promptsTable, ({ many }) => ({
    evalsToPrompts: many(exports.evalsToPromptsTable),
}));
exports.evalsToTagsTable = (0, sqlite_core_1.sqliteTable)('evals_to_tags', {
    evalId: (0, sqlite_core_1.text)('eval_id')
        .notNull()
        .references(() => exports.evalsTable.id),
    tagId: (0, sqlite_core_1.text)('tag_id')
        .notNull()
        .references(() => exports.tagsTable.id),
}, (t) => ({
    pk: (0, sqlite_core_1.primaryKey)({ columns: [t.evalId, t.tagId] }),
    evalIdIdx: (0, sqlite_core_1.index)('evals_to_tags_eval_id_idx').on(t.evalId),
    tagIdIdx: (0, sqlite_core_1.index)('evals_to_tags_tag_id_idx').on(t.tagId),
}));
exports.tagsRelations = (0, drizzle_orm_1.relations)(exports.tagsTable, ({ many }) => ({
    evalsToTags: many(exports.evalsToTagsTable),
}));
exports.evalsToTagsRelations = (0, drizzle_orm_1.relations)(exports.evalsToTagsTable, ({ one }) => ({
    eval: one(exports.evalsTable, {
        fields: [exports.evalsToTagsTable.evalId],
        references: [exports.evalsTable.id],
    }),
    tag: one(exports.tagsTable, {
        fields: [exports.evalsToTagsTable.tagId],
        references: [exports.tagsTable.id],
    }),
}));
// ------------ Datasets ------------
exports.datasetsTable = (0, sqlite_core_1.sqliteTable)('datasets', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    tests: (0, sqlite_core_1.text)('tests', { mode: 'json' }).$type(),
    createdAt: (0, sqlite_core_1.integer)('created_at')
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
}, (table) => ({
    createdAtIdx: (0, sqlite_core_1.index)('datasets_created_at_idx').on(table.createdAt),
}));
exports.evalsToDatasetsTable = (0, sqlite_core_1.sqliteTable)('evals_to_datasets', {
    evalId: (0, sqlite_core_1.text)('eval_id')
        .notNull()
        .references(() => exports.evalsTable.id),
    // Drizzle doesn't support this migration for sqlite, so we remove foreign keys manually.
    //.references(() => evals.id, { onDelete: 'cascade' }),
    datasetId: (0, sqlite_core_1.text)('dataset_id')
        .notNull()
        .references(() => exports.datasetsTable.id),
}, (t) => ({
    pk: (0, sqlite_core_1.primaryKey)({ columns: [t.evalId, t.datasetId] }),
    evalIdIdx: (0, sqlite_core_1.index)('evals_to_datasets_eval_id_idx').on(t.evalId),
    datasetIdIdx: (0, sqlite_core_1.index)('evals_to_datasets_dataset_id_idx').on(t.datasetId),
}));
exports.datasetsRelations = (0, drizzle_orm_1.relations)(exports.datasetsTable, ({ many }) => ({
    evalsToDatasets: many(exports.evalsToDatasetsTable),
}));
// ------------ Evals ------------
exports.evalsRelations = (0, drizzle_orm_1.relations)(exports.evalsTable, ({ many }) => ({
    evalsToPrompts: many(exports.evalsToPromptsTable),
    evalsToDatasets: many(exports.evalsToDatasetsTable),
    evalsToTags: many(exports.evalsToTagsTable),
}));
exports.evalsToPromptsRelations = (0, drizzle_orm_1.relations)(exports.evalsToPromptsTable, ({ one }) => ({
    eval: one(exports.evalsTable, {
        fields: [exports.evalsToPromptsTable.evalId],
        references: [exports.evalsTable.id],
    }),
    prompt: one(exports.promptsTable, {
        fields: [exports.evalsToPromptsTable.promptId],
        references: [exports.promptsTable.id],
    }),
}));
exports.evalsToDatasetsRelations = (0, drizzle_orm_1.relations)(exports.evalsToDatasetsTable, ({ one }) => ({
    eval: one(exports.evalsTable, {
        fields: [exports.evalsToDatasetsTable.evalId],
        references: [exports.evalsTable.id],
    }),
    dataset: one(exports.datasetsTable, {
        fields: [exports.evalsToDatasetsTable.datasetId],
        references: [exports.datasetsTable.id],
    }),
}));
// ------------ Configs ------------
exports.configsTable = (0, sqlite_core_1.sqliteTable)('configs', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    createdAt: (0, sqlite_core_1.integer)('created_at')
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at')
        .notNull()
        .default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    name: (0, sqlite_core_1.text)('name').notNull(),
    type: (0, sqlite_core_1.text)('type').notNull(), // e.g. 'redteam', 'eval', etc.
    config: (0, sqlite_core_1.text)('config', { mode: 'json' }).notNull(),
}, (table) => ({
    createdAtIdx: (0, sqlite_core_1.index)('configs_created_at_idx').on(table.createdAt),
    typeIdx: (0, sqlite_core_1.index)('configs_type_idx').on(table.type),
}));
// ------------ Outputs ------------
// We're just recording these on eval.results for now...
/*
export const llmOutputs = sqliteTable(
  'llm_outputs',
  {
    id: text('id')
      .notNull()
      .unique(),
    createdAt: integer('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    evalId: text('eval_id')
      .notNull()
      .references(() => evals.id),
    promptId: text('prompt_id')
      .notNull()
      .references(() => prompts.id),
    providerId: text('provider_id').notNull(),
    vars: text('vars', {mode: 'json'}),
    response: text('response', {mode: 'json'}),
    error: text('error'),
    latencyMs: integer('latency_ms'),
    gradingResult: text('grading_result', {mode: 'json'}),
    namedScores: text('named_scores', {mode: 'json'}),
    cost: real('cost'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id] }),
  }),
);

export const llmOutputsRelations = relations(llmOutputs, ({ one }) => ({
  eval: one(evals, {
    fields: [llmOutputs.evalId],
    references: [evals.id],
  }),
  prompt: one(prompts, {
    fields: [llmOutputs.promptId],
    references: [prompts.id],
  }),
}));
*/
//# sourceMappingURL=tables.js.map