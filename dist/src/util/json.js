"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAjv = resetAjv;
exports.getAjv = getAjv;
exports.isValidJson = isValidJson;
exports.safeJsonStringify = safeJsonStringify;
exports.convertSlashCommentsToHash = convertSlashCommentsToHash;
exports.extractJsonObjects = extractJsonObjects;
exports.extractFirstJsonObject = extractFirstJsonObject;
exports.orderKeys = orderKeys;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const envars_1 = require("../envars");
const invariant_1 = __importDefault(require("../util/invariant"));
let ajvInstance = null;
function resetAjv() {
    if ((0, envars_1.getEnvString)('NODE_ENV') !== 'test') {
        throw new Error('resetAjv can only be called in test environment');
    }
    ajvInstance = null;
}
function getAjv() {
    if (!ajvInstance) {
        const ajvOptions = {
            strictSchema: !(0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_AJV_STRICT_MODE'),
        };
        ajvInstance = new ajv_1.default(ajvOptions);
        (0, ajv_formats_1.default)(ajvInstance);
    }
    return ajvInstance;
}
function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch {
        return false;
    }
}
function safeJsonStringify(value, prettyPrint = false) {
    // Prevent circular references
    const cache = new Set();
    const space = prettyPrint ? 2 : undefined;
    return (JSON.stringify(value, (key, val) => {
        if (typeof val === 'object' && val !== null) {
            if (cache.has(val)) {
                return;
            }
            cache.add(val);
        }
        return val;
    }, space) || undefined);
}
function convertSlashCommentsToHash(str) {
    // Split into lines, process each line, then join back
    return str
        .split('\n')
        .map((line) => {
        let state = 'normal'; // 'normal' | 'singleQuote' | 'doubleQuote'
        let result = '';
        let i = 0;
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            const prevChar = i > 0 ? line[i - 1] : '';
            switch (state) {
                case 'normal':
                    // Check for string start, but ignore apostrophes in words
                    if (char === "'" && !/[a-zA-Z]/.test(prevChar)) {
                        state = 'singleQuote';
                        result += char;
                    }
                    else if (char === '"') {
                        state = 'doubleQuote';
                        result += char;
                    }
                    else if (char === '/' && nextChar === '/') {
                        // Count consecutive slashes
                        let slashCount = 2;
                        while (i + slashCount < line.length && line[i + slashCount] === '/') {
                            slashCount++;
                        }
                        // Convert to equivalent number of #s
                        const hashes = '#'.repeat(Math.floor(slashCount / 2));
                        return result + hashes + line.slice(i + slashCount);
                    }
                    else {
                        result += char;
                    }
                    break;
                case 'singleQuote':
                    result += char;
                    // Check for string end, but ignore apostrophes in words
                    if (char === "'" && prevChar !== '\\' && !/[a-zA-Z]/.test(nextChar)) {
                        state = 'normal';
                    }
                    break;
                case 'doubleQuote':
                    result += char;
                    if (char === '"' && prevChar !== '\\') {
                        state = 'normal';
                    }
                    break;
            }
            i++;
        }
        return result;
    })
        .join('\n');
}
function extractJsonObjects(str) {
    const jsonObjects = [];
    const maxJsonLength = 100000; // Prevent processing extremely large invalid JSON
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') {
            let openBraces = 1;
            let closeBraces = 0;
            let j = i + 1;
            // Track braces as we go to detect potential JSON objects
            while (j < Math.min(i + maxJsonLength, str.length) && openBraces > closeBraces) {
                if (str[j] === '{') {
                    openBraces++;
                }
                if (str[j] === '}') {
                    closeBraces++;
                }
                j++;
                // When we have a potential complete object OR we've reached the end
                if (openBraces === closeBraces || j === str.length || j === i + maxJsonLength) {
                    try {
                        // If we're at the end but braces don't match, add missing closing braces
                        let potentialJson = str.slice(i, j);
                        if (openBraces > closeBraces) {
                            potentialJson += '}'.repeat(openBraces - closeBraces);
                        }
                        const processedJson = convertSlashCommentsToHash(potentialJson);
                        const parsedObj = js_yaml_1.default.load(processedJson, { json: true });
                        if (typeof parsedObj === 'object' && parsedObj !== null) {
                            jsonObjects.push(parsedObj);
                            i = j - 1; // Move i to the end of the valid JSON object
                            break;
                        }
                    }
                    catch {
                        // If not valid yet, continue only if braces haven't balanced
                        if (openBraces === closeBraces) {
                            break;
                        }
                    }
                }
            }
        }
    }
    return jsonObjects;
}
function extractFirstJsonObject(str) {
    const jsonObjects = extractJsonObjects(str);
    (0, invariant_1.default)(jsonObjects.length >= 1, `Expected a JSON object, but got ${JSON.stringify(str)}`);
    return jsonObjects[0];
}
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
function orderKeys(obj, order) {
    const result = {};
    // Add ordered keys (excluding undefined values)
    for (const key of order) {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    // Add remaining keys (excluding undefined values)
    for (const key in obj) {
        if (!(key in result) && obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    // Add symbol keys (excluding undefined values)
    const symbolKeys = Object.getOwnPropertySymbols(obj);
    for (const sym of symbolKeys) {
        if (obj[sym] !== undefined) {
            result[sym] = obj[sym];
        }
    }
    return result;
}
//# sourceMappingURL=json.js.map