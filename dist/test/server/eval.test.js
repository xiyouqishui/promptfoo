"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const migrate_1 = require("../../src/migrate");
const eval_1 = __importDefault(require("../../src/models/eval"));
const evalResult_1 = __importDefault(require("../../src/models/evalResult"));
const server_1 = require("../../src/server/server");
const invariant_1 = __importDefault(require("../../src/util/invariant"));
const evalFactory_1 = __importDefault(require("../factories/evalFactory"));
describe('eval routes', () => {
    const app = (0, server_1.createApp)();
    beforeAll(async () => {
        await (0, migrate_1.runDbMigrations)();
    });
    function createManualRatingPayload(originalResult, pass) {
        const payload = { ...originalResult.gradingResult };
        const score = pass ? 1 : 0;
        payload.componentResults?.push({
            pass,
            score,
            reason: 'Manual result (overrides all other grading results)',
            assertion: { type: 'human' },
        });
        payload.reason = 'Manual result (overrides all other grading results)';
        payload.pass = pass;
        payload.score = score;
        return payload;
    }
    describe('post("/:evalId/results/:id/rating")', () => {
        it('Passing test and the user marked it as passing (no change)', async () => {
            const eval_ = await evalFactory_1.default.create();
            const results = await eval_.getResults();
            const result = results[0];
            expect(eval_.prompts[result.promptIdx].metrics?.assertPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.assertFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.score).toBe(1);
            expect(result.gradingResult?.pass).toBe(true);
            expect(result.gradingResult?.score).toBe(1);
            const ratingPayload = createManualRatingPayload(result, true);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/eval/${eval_.id}/results/${result.id}/rating`)
                .send(ratingPayload);
            expect(res.status).toBe(200);
            (0, invariant_1.default)(result.id, 'Result ID is required');
            const updatedResult = await evalResult_1.default.findById(result.id);
            expect(updatedResult?.gradingResult?.pass).toBe(true);
            expect(updatedResult?.gradingResult?.score).toBe(1);
            expect(updatedResult?.gradingResult?.componentResults).toHaveLength(2);
            expect(updatedResult?.gradingResult?.reason).toBe('Manual result (overrides all other grading results)');
            const updatedEval = await eval_1.default.findById(eval_.id);
            (0, invariant_1.default)(updatedEval, 'Eval is required');
            expect(updatedEval.prompts[result.promptIdx].metrics?.score).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertPassCount).toBe(2);
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertFailCount).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testPassCount).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testFailCount).toBe(1);
        });
        it('Passing test and the user changed it to failing', async () => {
            const eval_ = await evalFactory_1.default.create();
            const results = await eval_.getResults();
            const result = results[0];
            expect(eval_.prompts[result.promptIdx].metrics?.assertPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.assertFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.score).toBe(1);
            expect(result.gradingResult?.pass).toBe(true);
            expect(result.gradingResult?.score).toBe(1);
            const ratingPayload = createManualRatingPayload(result, false);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/eval/${eval_.id}/results/${result.id}/rating`)
                .send(ratingPayload);
            expect(res.status).toBe(200);
            (0, invariant_1.default)(result.id, 'Result ID is required');
            const updatedResult = await evalResult_1.default.findById(result.id);
            expect(updatedResult?.gradingResult?.pass).toBe(false);
            expect(updatedResult?.gradingResult?.score).toBe(0);
            expect(updatedResult?.gradingResult?.componentResults).toHaveLength(2);
            expect(updatedResult?.gradingResult?.reason).toBe('Manual result (overrides all other grading results)');
            const updatedEval = await eval_1.default.findById(eval_.id);
            (0, invariant_1.default)(updatedEval, 'Eval is required');
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertPassCount).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertFailCount).toBe(2);
            expect(updatedEval.prompts[result.promptIdx].metrics?.score).toBe(0);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testPassCount).toBe(0);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testFailCount).toBe(2);
        });
        it('Failing test and the user changed it to passing', async () => {
            const eval_ = await evalFactory_1.default.create();
            const results = await eval_.getResults();
            const result = results[1];
            expect(eval_.prompts[result.promptIdx].metrics?.assertPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.assertFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.score).toBe(1);
            expect(result.gradingResult?.pass).toBe(false);
            expect(result.gradingResult?.score).toBe(0);
            const ratingPayload = createManualRatingPayload(result, true);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/eval/${eval_.id}/results/${result.id}/rating`)
                .send(ratingPayload);
            expect(res.status).toBe(200);
            (0, invariant_1.default)(result.id, 'Result ID is required');
            const updatedResult = await evalResult_1.default.findById(result.id);
            expect(updatedResult?.gradingResult?.pass).toBe(true);
            expect(updatedResult?.gradingResult?.score).toBe(1);
            expect(updatedResult?.gradingResult?.componentResults).toHaveLength(2);
            expect(updatedResult?.gradingResult?.reason).toBe('Manual result (overrides all other grading results)');
            const updatedEval = await eval_1.default.findById(eval_.id);
            (0, invariant_1.default)(updatedEval, 'Eval is required');
            expect(updatedEval.prompts[result.promptIdx].metrics?.score).toBe(2);
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertPassCount).toBe(2);
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertFailCount).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testPassCount).toBe(2);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testFailCount).toBe(0);
        });
        it('Failing test and the user marked it as failing (no change)', async () => {
            const eval_ = await evalFactory_1.default.create();
            const results = await eval_.getResults();
            const result = results[1];
            expect(eval_.prompts[result.promptIdx].metrics?.assertPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.assertFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testPassCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.testFailCount).toBe(1);
            expect(eval_.prompts[result.promptIdx].metrics?.score).toBe(1);
            expect(result.gradingResult?.pass).toBe(false);
            expect(result.gradingResult?.score).toBe(0);
            const ratingPayload = createManualRatingPayload(result, false);
            const res = await (0, supertest_1.default)(app)
                .post(`/api/eval/${eval_.id}/results/${result.id}/rating`)
                .send(ratingPayload);
            expect(res.status).toBe(200);
            (0, invariant_1.default)(result.id, 'Result ID is required');
            const updatedResult = await evalResult_1.default.findById(result.id);
            expect(updatedResult?.gradingResult?.pass).toBe(false);
            expect(updatedResult?.gradingResult?.score).toBe(0);
            expect(updatedResult?.gradingResult?.componentResults).toHaveLength(2);
            expect(updatedResult?.gradingResult?.reason).toBe('Manual result (overrides all other grading results)');
            const updatedEval = await eval_1.default.findById(eval_.id);
            (0, invariant_1.default)(updatedEval, 'Eval is required');
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertPassCount).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.assertFailCount).toBe(2);
            expect(updatedEval.prompts[result.promptIdx].metrics?.score).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testPassCount).toBe(1);
            expect(updatedEval.prompts[result.promptIdx].metrics?.testFailCount).toBe(1);
        });
    });
});
//# sourceMappingURL=eval.test.js.map