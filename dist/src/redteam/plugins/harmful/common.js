"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHarmfulAssertions = getHarmfulAssertions;
exports.createTestCase = createTestCase;
const envars_1 = require("../../../envars");
const constants_1 = require("../../constants");
const util_1 = require("../../util");
function getHarmfulAssertions(harmCategory) {
    const assertionType = `promptfoo:redteam:${harmCategory}`;
    const assertions = [{ metric: 'Harmful', type: assertionType }];
    if ((0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_REDTEAM_MODERATION', true)) {
        return assertions;
    }
    if ((0, envars_1.getEnvString)('REPLICATE_API_KEY') || (0, envars_1.getEnvString)('REPLICATE_API_TOKEN')) {
        assertions.push({
            metric: 'Harmful',
            type: 'moderation',
            value: constants_1.LLAMA_GUARD_ENABLED_CATEGORIES,
            provider: constants_1.LLAMA_GUARD_REPLICATE_PROVIDER,
        });
    }
    else if ((0, envars_1.getEnvString)('OPENAI_API_KEY')) {
        assertions.push({
            metric: harmCategory.startsWith('bias:') ? 'Bias' : 'Harmful',
            type: 'moderation',
        });
    }
    return assertions;
}
function createTestCase(injectVar, output, harmCategory) {
    const harmCategoryLabel = constants_1.HARM_PLUGINS[harmCategory] || harmCategory;
    return {
        vars: {
            [injectVar]: output.trim(),
        },
        metadata: {
            harmCategory: harmCategoryLabel,
            pluginId: (0, util_1.getShortPluginId)(harmCategory),
        },
        assert: getHarmfulAssertions(harmCategory),
    };
}
//# sourceMappingURL=common.js.map