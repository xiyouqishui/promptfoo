"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plugins = void 0;
const cache_1 = require("../../cache");
const constants_1 = require("../../constants");
const envars_1 = require("../../envars");
const accounts_1 = require("../../globalConfig/accounts");
const logger_1 = __importDefault(require("../../logger"));
const shared_1 = require("../../providers/shared");
const invariant_1 = __importDefault(require("../../util/invariant"));
const constants_2 = require("../constants");
const remoteGeneration_1 = require("../remoteGeneration");
const util_1 = require("../util");
const constants_3 = require("./agentic/constants");
const beavertails_1 = require("./beavertails");
const contracts_1 = require("./contracts");
const crossSessionLeak_1 = require("./crossSessionLeak");
const cyberseceval_1 = require("./cyberseceval");
const debugAccess_1 = require("./debugAccess");
const divergentRepetition_1 = require("./divergentRepetition");
const donotanswer_1 = require("./donotanswer");
const excessiveAgency_1 = require("./excessiveAgency");
const hallucination_1 = require("./hallucination");
const harmbench_1 = require("./harmbench");
const aligned_1 = require("./harmful/aligned");
const common_1 = require("./harmful/common");
const unaligned_1 = require("./harmful/unaligned");
const imitation_1 = require("./imitation");
const intent_1 = require("./intent");
const overreliance_1 = require("./overreliance");
const pii_1 = require("./pii");
const pliny_1 = require("./pliny");
const policy_1 = require("./policy");
const politics_1 = require("./politics");
const promptExtraction_1 = require("./promptExtraction");
const rbac_1 = require("./rbac");
const shellInjection_1 = require("./shellInjection");
const sqlInjection_1 = require("./sqlInjection");
const toolDiscovery_1 = require("./toolDiscovery");
const toolDiscoveryMultiTurn_1 = require("./toolDiscoveryMultiTurn");
const unsafebench_1 = require("./unsafebench");
const xstest_1 = require("./xstest");
async function fetchRemoteTestCases(key, purpose, injectVar, n, config) {
    (0, invariant_1.default)(!(0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION'), 'fetchRemoteTestCases should never be called when remote generation is disabled');
    const body = JSON.stringify({
        config,
        injectVar,
        n,
        purpose,
        task: key,
        version: constants_1.VERSION,
        email: (0, accounts_1.getUserEmail)(),
    });
    try {
        const { data, status, statusText } = await (0, cache_1.fetchWithCache)((0, remoteGeneration_1.getRemoteGenerationUrl)(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
        }, shared_1.REQUEST_TIMEOUT_MS);
        if (status !== 200 || !data || !data.result || !Array.isArray(data.result)) {
            logger_1.default.error(`Error generating test cases for ${key}: ${statusText} ${JSON.stringify(data)}`);
            return [];
        }
        const ret = data.result;
        logger_1.default.debug(`Received remote generation for ${key}:\n${JSON.stringify(ret)}`);
        return ret;
    }
    catch (err) {
        logger_1.default.error(`Error generating test cases for ${key}: ${err}`);
        return [];
    }
}
function createPluginFactory(PluginClass, key, validate) {
    return {
        key,
        validate: validate,
        action: async ({ provider, purpose, injectVar, n, delayMs, config }) => {
            if (PluginClass.canGenerateRemote === false || !(0, remoteGeneration_1.shouldGenerateRemote)()) {
                logger_1.default.debug(`Using local redteam generation for ${key}`);
                return new PluginClass(provider, purpose, injectVar, config).generateTests(n, delayMs);
            }
            const testCases = await fetchRemoteTestCases(key, purpose, injectVar, n, config);
            return testCases.map((testCase) => ({
                ...testCase,
                metadata: {
                    ...testCase.metadata,
                    pluginId: (0, util_1.getShortPluginId)(key),
                },
            }));
        },
    };
}
const alignedHarmCategories = Object.keys(constants_2.REDTEAM_PROVIDER_HARM_PLUGINS);
const unalignedHarmCategories = Object.keys(constants_2.UNALIGNED_PROVIDER_HARM_PLUGINS);
const pluginFactories = [
    createPluginFactory(beavertails_1.BeavertailsPlugin, 'beavertails'),
    ...alignedHarmCategories.map((category) => createPluginFactory(class extends aligned_1.AlignedHarmfulPlugin {
        get id() {
            return category;
        }
        constructor(provider, purpose, injectVar, config) {
            super(provider, purpose, injectVar, category, config);
        }
    }, category)),
    createPluginFactory(contracts_1.ContractPlugin, 'contracts'),
    createPluginFactory(crossSessionLeak_1.CrossSessionLeakPlugin, 'cross-session-leak'),
    createPluginFactory(cyberseceval_1.CyberSecEvalPlugin, 'cyberseceval'),
    createPluginFactory(debugAccess_1.DebugAccessPlugin, 'debug-access'),
    createPluginFactory(divergentRepetition_1.DivergentRepetitionPlugin, 'divergent-repetition'),
    createPluginFactory(donotanswer_1.DoNotAnswerPlugin, 'donotanswer'),
    createPluginFactory(excessiveAgency_1.ExcessiveAgencyPlugin, 'excessive-agency'),
    createPluginFactory(xstest_1.XSTestPlugin, 'xstest'),
    createPluginFactory(toolDiscovery_1.ToolDiscoveryPlugin, 'tool-discovery'),
    createPluginFactory(toolDiscoveryMultiTurn_1.ToolDiscoveryMultiTurnPlugin, 'tool-discovery:multi-turn'),
    createPluginFactory(harmbench_1.HarmbenchPlugin, 'harmbench'),
    createPluginFactory(hallucination_1.HallucinationPlugin, 'hallucination'),
    createPluginFactory(imitation_1.ImitationPlugin, 'imitation'),
    createPluginFactory(intent_1.IntentPlugin, 'intent', (config) => (0, invariant_1.default)(config.intent, 'Intent plugin requires `config.intent` to be set')),
    createPluginFactory(overreliance_1.OverreliancePlugin, 'overreliance'),
    createPluginFactory(pliny_1.PlinyPlugin, 'pliny'),
    createPluginFactory(policy_1.PolicyPlugin, 'policy', (config) => (0, invariant_1.default)(config.policy, 'Policy plugin requires `config.policy` to be set')),
    createPluginFactory(politics_1.PoliticsPlugin, 'politics'),
    createPluginFactory(promptExtraction_1.PromptExtractionPlugin, 'prompt-extraction'),
    createPluginFactory(rbac_1.RbacPlugin, 'rbac'),
    createPluginFactory(shellInjection_1.ShellInjectionPlugin, 'shell-injection'),
    createPluginFactory(sqlInjection_1.SqlInjectionPlugin, 'sql-injection'),
    createPluginFactory(unsafebench_1.UnsafeBenchPlugin, 'unsafebench'),
    ...unalignedHarmCategories.map((category) => ({
        key: category,
        action: async (params) => {
            if ((0, remoteGeneration_1.neverGenerateRemote)()) {
                throw new Error(`${category} plugin requires remote generation to be enabled`);
            }
            const testCases = await (0, unaligned_1.getHarmfulTests)(params, category);
            return testCases.map((testCase) => ({
                ...testCase,
                metadata: {
                    ...testCase.metadata,
                    pluginId: (0, util_1.getShortPluginId)(category),
                },
            }));
        },
    })),
];
const piiPlugins = constants_2.PII_PLUGINS.map((category) => ({
    key: category,
    action: async (params) => {
        if ((0, remoteGeneration_1.shouldGenerateRemote)()) {
            const testCases = await fetchRemoteTestCases(category, params.purpose, params.injectVar, params.n);
            return testCases.map((testCase) => ({
                ...testCase,
                metadata: {
                    ...testCase.metadata,
                    pluginId: (0, util_1.getShortPluginId)(category),
                },
            }));
        }
        logger_1.default.debug(`Using local redteam generation for ${category}`);
        const testCases = await (0, pii_1.getPiiLeakTestsForCategory)(params, category);
        return testCases.map((testCase) => ({
            ...testCase,
            metadata: {
                ...testCase.metadata,
                pluginId: (0, util_1.getShortPluginId)(category),
            },
        }));
    },
}));
function createRemotePlugin(key, validate) {
    return {
        key,
        validate: validate,
        action: async ({ purpose, injectVar, n, config }) => {
            if ((0, remoteGeneration_1.neverGenerateRemote)()) {
                throw new Error(`${key} plugin requires remote generation to be enabled`);
            }
            const testCases = await fetchRemoteTestCases(key, purpose, injectVar, n, config);
            const testsWithMetadata = testCases.map((testCase) => ({
                ...testCase,
                metadata: {
                    ...testCase.metadata,
                    pluginId: (0, util_1.getShortPluginId)(key),
                },
            }));
            if (key.startsWith('harmful:') || key.startsWith('bias:')) {
                return testsWithMetadata.map((testCase) => ({
                    ...testCase,
                    assert: (0, common_1.getHarmfulAssertions)(key),
                }));
            }
            return testsWithMetadata;
        },
    };
}
const remotePlugins = [
    constants_3.MEMORY_POISONING_PLUGIN_ID,
    'ascii-smuggling',
    'bfla',
    'bola',
    'cca',
    'competitors',
    'harmful:misinformation-disinformation',
    'harmful:specialized-advice',
    'hijacking',
    'rag-document-exfiltration',
    'rag-poisoning',
    'reasoning-dos',
    'religion',
    'ssrf',
    'system-prompt-override',
    'mcp',
].map((key) => createRemotePlugin(key));
remotePlugins.push(createRemotePlugin('indirect-prompt-injection', (config) => (0, invariant_1.default)(config.indirectInjectionVar, 'Indirect prompt injection plugin requires `config.indirectInjectionVar` to be set. If using this plugin in a plugin collection, configure this plugin separately.')));
exports.Plugins = [...pluginFactories, ...piiPlugins, ...remotePlugins];
//# sourceMappingURL=index.js.map