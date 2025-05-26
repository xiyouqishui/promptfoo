"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIsJson = handleIsJson;
exports.handleContainsJson = handleContainsJson;
const js_yaml_1 = __importDefault(require("js-yaml"));
const invariant_1 = __importDefault(require("../util/invariant"));
const json_1 = require("../util/json");
function handleIsJson({ outputString, renderedValue, inverse, valueFromScript, assertion, }) {
    let parsedJson;
    let pass;
    try {
        parsedJson = JSON.parse(outputString);
        pass = !inverse;
    }
    catch {
        pass = inverse;
    }
    if (pass && renderedValue) {
        let validate;
        if (typeof renderedValue === 'string') {
            if (renderedValue.startsWith('file://')) {
                // Reference the JSON schema from external file
                const schema = valueFromScript;
                (0, invariant_1.default)(schema, 'is-json references a file that does not export a JSON schema');
                validate = (0, json_1.getAjv)().compile(schema);
            }
            else {
                const scheme = js_yaml_1.default.load(renderedValue);
                validate = (0, json_1.getAjv)().compile(scheme);
            }
        }
        else if (typeof renderedValue === 'object') {
            validate = (0, json_1.getAjv)().compile(renderedValue);
        }
        else {
            throw new Error('is-json assertion must have a string or object value');
        }
        pass = validate(parsedJson);
        if (!pass) {
            return {
                pass,
                score: 0,
                reason: `JSON does not conform to the provided schema. Errors: ${(0, json_1.getAjv)().errorsText(validate.errors)}`,
                assertion,
            };
        }
    }
    return {
        pass,
        score: pass ? 1 : 0,
        reason: pass ? 'Assertion passed' : 'Expected output to be valid JSON',
        assertion,
    };
}
function handleContainsJson({ assertion, renderedValue, outputString, inverse, valueFromScript, }) {
    let errorMessage = 'Expected output to contain valid JSON';
    const jsonObjects = (0, json_1.extractJsonObjects)(outputString);
    let pass = inverse ? jsonObjects.length === 0 : jsonObjects.length > 0;
    for (const jsonObject of jsonObjects) {
        if (renderedValue) {
            let validate;
            if (typeof renderedValue === 'string') {
                if (renderedValue.startsWith('file://')) {
                    // Reference the JSON schema from external file
                    const schema = valueFromScript;
                    (0, invariant_1.default)(schema, 'contains-json references a file that does not export a JSON schema');
                    validate = (0, json_1.getAjv)().compile(schema);
                }
                else {
                    const scheme = js_yaml_1.default.load(renderedValue);
                    validate = (0, json_1.getAjv)().compile(scheme);
                }
            }
            else if (typeof renderedValue === 'object') {
                validate = (0, json_1.getAjv)().compile(renderedValue);
            }
            else {
                throw new Error('contains-json assertion must have a string or object value');
            }
            pass = validate(jsonObject);
            if (pass) {
                break;
            }
            else {
                errorMessage = `JSON does not conform to the provided schema. Errors: ${(0, json_1.getAjv)().errorsText(validate.errors)}`;
            }
        }
    }
    return {
        pass,
        score: pass ? 1 : 0,
        reason: pass ? 'Assertion passed' : errorMessage,
        assertion,
    };
}
//# sourceMappingURL=json.js.map