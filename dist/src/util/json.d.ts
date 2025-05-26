import Ajv from 'ajv';
export declare function resetAjv(): void;
export declare function getAjv(): Ajv;
export declare function isValidJson(str: string): boolean;
export declare function safeJsonStringify<T>(value: T, prettyPrint?: boolean): string | undefined;
export declare function convertSlashCommentsToHash(str: string): string;
export declare function extractJsonObjects(str: string): object[];
export declare function extractFirstJsonObject<T>(str: string): T;
/**
 * Reorders the keys of an object based on a specified order, preserving any unspecified keys.
 * Symbol keys are preserved and added at the end.
 *
 * @param obj - The object whose keys need to be reordered.
 * @param order - An array specifying the desired order of keys.
 * @returns A new object with keys reordered according to the specified order.
 *
 * @example
 * const obj = { c: 3, a: 1, b: 2 };
 * const orderedObj = orderKeys(obj, ['a', 'b']);
 * // Result: { a: 1, b: 2, c: 3 }
 */
export declare function orderKeys<T extends object>(obj: T, order: (keyof T)[]): T;
//# sourceMappingURL=json.d.ts.map