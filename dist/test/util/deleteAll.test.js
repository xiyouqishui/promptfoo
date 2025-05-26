"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migrate_1 = require("../../src/migrate");
const eval_1 = __importDefault(require("../../src/models/eval"));
const database_1 = require("../../src/util/database");
const evalFactory_1 = __importDefault(require("../factories/evalFactory"));
describe('delete all evals', () => {
    beforeAll(async () => {
        await (0, migrate_1.runDbMigrations)();
    });
    it('should delete all evals', async () => {
        await evalFactory_1.default.create();
        await evalFactory_1.default.create();
        await evalFactory_1.default.create();
        const evals = await eval_1.default.getMany();
        expect(evals).toHaveLength(3);
        await (0, database_1.deleteAllEvals)();
        const evals2 = await eval_1.default.getMany();
        expect(evals2).toHaveLength(0);
    });
});
//# sourceMappingURL=deleteAll.test.js.map