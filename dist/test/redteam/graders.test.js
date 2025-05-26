"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graders_1 = require("../../src/redteam/graders");
const asciiSmuggling_1 = require("../../src/redteam/plugins/asciiSmuggling");
const beavertails_1 = require("../../src/redteam/plugins/beavertails");
const graders_2 = require("../../src/redteam/plugins/harmful/graders");
const pliny_1 = require("../../src/redteam/plugins/pliny");
const toolDiscovery_1 = require("../../src/redteam/plugins/toolDiscovery");
const toolDiscoveryMultiTurn_1 = require("../../src/redteam/plugins/toolDiscoveryMultiTurn");
const unsafebench_1 = require("../../src/redteam/plugins/unsafebench");
describe('getGraderById', () => {
    it('should return correct grader for valid ID', () => {
        const asciiGrader = (0, graders_1.getGraderById)('promptfoo:redteam:ascii-smuggling');
        expect(asciiGrader).toBeInstanceOf(asciiSmuggling_1.AsciiSmugglingGrader);
        const beavertailsGrader = (0, graders_1.getGraderById)('promptfoo:redteam:beavertails');
        expect(beavertailsGrader).toBeInstanceOf(beavertails_1.BeavertailsGrader);
        const harmfulGrader = (0, graders_1.getGraderById)('promptfoo:redteam:harmful');
        expect(harmfulGrader).toBeInstanceOf(graders_2.HarmfulGrader);
        const toolDiscoveryGrader = (0, graders_1.getGraderById)('promptfoo:redteam:tool-discovery');
        expect(toolDiscoveryGrader).toBeInstanceOf(toolDiscovery_1.ToolDiscoveryGrader);
        const toolDiscoveryMultiTurnGrader = (0, graders_1.getGraderById)('promptfoo:redteam:tool-discovery:multi-turn');
        expect(toolDiscoveryMultiTurnGrader).toBeInstanceOf(toolDiscoveryMultiTurn_1.ToolDiscoveryMultiTurnGrader);
        const unsafebenchGrader = (0, graders_1.getGraderById)('promptfoo:redteam:unsafebench');
        expect(unsafebenchGrader).toBeInstanceOf(unsafebench_1.UnsafeBenchGrader);
        const plinyGrader = (0, graders_1.getGraderById)('promptfoo:redteam:pliny');
        expect(plinyGrader).toBeInstanceOf(pliny_1.PlinyGrader);
    });
    it('should return harmful grader for IDs starting with promptfoo:redteam:harmful', () => {
        const specificHarmfulGrader = (0, graders_1.getGraderById)('promptfoo:redteam:harmful:specific-type');
        expect(specificHarmfulGrader).toBeInstanceOf(graders_2.HarmfulGrader);
        const anotherHarmfulGrader = (0, graders_1.getGraderById)('promptfoo:redteam:harmful-with-suffix');
        expect(anotherHarmfulGrader).toBeInstanceOf(graders_2.HarmfulGrader);
    });
    it('should return undefined for invalid ID', () => {
        const invalidGrader = (0, graders_1.getGraderById)('invalid-id');
        expect(invalidGrader).toBeUndefined();
    });
    it('should return undefined for empty ID', () => {
        const emptyGrader = (0, graders_1.getGraderById)('');
        expect(emptyGrader).toBeUndefined();
    });
});
//# sourceMappingURL=graders.test.js.map