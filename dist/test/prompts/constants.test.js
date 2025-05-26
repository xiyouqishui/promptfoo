"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../src/prompts/constants");
describe('VALID_FILE_EXTENSIONS', () => {
    it('should include .j2 extension', () => {
        expect(constants_1.VALID_FILE_EXTENSIONS).toContain('.j2');
    });
    it('should include common file extensions', () => {
        expect(constants_1.VALID_FILE_EXTENSIONS).toContain('.js');
        expect(constants_1.VALID_FILE_EXTENSIONS).toContain('.json');
        expect(constants_1.VALID_FILE_EXTENSIONS).toContain('.md');
        expect(constants_1.VALID_FILE_EXTENSIONS).toContain('.txt');
        expect(constants_1.VALID_FILE_EXTENSIONS).toContain('.yaml');
        expect(constants_1.VALID_FILE_EXTENSIONS).toContain('.yml');
    });
});
//# sourceMappingURL=constants.test.js.map