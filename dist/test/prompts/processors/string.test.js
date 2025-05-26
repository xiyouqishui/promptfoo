"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const string_1 = require("../../../src/prompts/processors/string");
describe('processString', () => {
    it('should process a valid string prompt without a label', () => {
        const prompt = { raw: 'This is a prompt' };
        expect((0, string_1.processString)(prompt)).toEqual([
            {
                raw: 'This is a prompt',
                label: 'This is a prompt',
            },
        ]);
    });
    it('should process a valid string prompt with a label', () => {
        const prompt = { raw: 'This is a prompt', label: 'Label' };
        expect((0, string_1.processString)(prompt)).toEqual([
            {
                raw: 'This is a prompt',
                label: 'Label',
            },
        ]);
    });
});
//# sourceMappingURL=string.test.js.map