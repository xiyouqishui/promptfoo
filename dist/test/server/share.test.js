"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const migrate_1 = require("../../src/migrate");
const eval_1 = __importDefault(require("../../src/models/eval"));
const server_1 = require("../../src/server/server");
const database_1 = require("../../src/util/database");
const v3evalToShare_json_1 = __importDefault(require("./v3evalToShare.json"));
const v4evalToShare_json_1 = __importDefault(require("./v4evalToShare.json"));
describe('share', () => {
    let app;
    beforeAll(async () => {
        await (0, migrate_1.runDbMigrations)();
    });
    beforeEach(async () => {
        app = (0, server_1.createApp)();
        await (0, database_1.deleteAllEvals)();
    });
    it('should accept a version 3 results file', async () => {
        const res = await (0, supertest_1.default)(app).post('/api/eval').send(v3evalToShare_json_1.default).timeout(5000);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        const eval_ = await eval_1.default.findById(res.body.id);
        expect(eval_).not.toBeNull();
        expect(eval_?.version()).toBe(3);
        const results = await eval_?.getResults();
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results).toHaveLength(8);
    });
    it('should accept a new eval', async () => {
        const res = await (0, supertest_1.default)(app).post('/api/eval').send(v4evalToShare_json_1.default).timeout(5000);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        const eval_ = await eval_1.default.findById(res.body.id);
        expect(eval_).not.toBeNull();
        expect(eval_?.version()).toBe(4);
        const results = await eval_?.getResults();
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
        expect(results).toHaveLength(8);
    });
    describe('error handling', () => {
        it('should handle empty request body', async () => {
            const res = await (0, supertest_1.default)(app).post('/api/eval').send({}).timeout(5000);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('Failed to write eval to database');
        });
        it('should handle invalid v3 eval data', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/eval')
                .send({
                data: {
                    results: null,
                    config: null,
                },
            })
                .timeout(5000);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('Failed to write eval to database');
        });
        it('should handle database errors', async () => {
            const res = await (0, supertest_1.default)(app)
                .post('/api/eval')
                .send({
                config: {},
                results: [],
            })
                .timeout(5000);
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toBe('Failed to write eval to database');
        });
    });
});
//# sourceMappingURL=share.test.js.map