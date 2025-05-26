"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objectUtils_1 = require("../../src/util/objectUtils");
describe('objectUtils', () => {
    describe('removeEmpty', () => {
        it('removes empty arrays from the top level', () => {
            const input = {
                name: 'test',
                emptyArray: [],
                nonEmptyArray: [1, 2, 3],
            };
            const result = (0, objectUtils_1.removeEmpty)(input);
            expect(result).toEqual({
                name: 'test',
                nonEmptyArray: [1, 2, 3],
            });
            expect(result.emptyArray).toBeUndefined();
        });
        it('removes empty objects from the top level', () => {
            const input = {
                name: 'test',
                emptyObj: {},
                nonEmptyObj: { key: 'value' },
            };
            const result = (0, objectUtils_1.removeEmpty)(input);
            expect(result).toEqual({
                name: 'test',
                nonEmptyObj: { key: 'value' },
            });
            expect(result.emptyObj).toBeUndefined();
        });
        it('does not remove empty arrays or objects in nested objects', () => {
            const input = {
                level1: {
                    emptyArr: [],
                    emptyObj: {},
                    validKey: 'value',
                },
            };
            const result = (0, objectUtils_1.removeEmpty)(input);
            expect(result).toEqual({
                level1: {
                    emptyArr: [],
                    emptyObj: {},
                    validKey: 'value',
                },
            });
        });
        it('does not modify the original object', () => {
            const original = {
                name: 'test',
                emptyArray: [],
                nested: { empty: {} },
            };
            const originalCopy = JSON.parse(JSON.stringify(original));
            (0, objectUtils_1.removeEmpty)(original);
            expect(original).toEqual(originalCopy);
        });
    });
});
//# sourceMappingURL=objectUtils.test.js.map