"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Strategies = void 0;
exports.validateStrategies = validateStrategies;
exports.loadStrategy = loadStrategy;
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const path_1 = __importDefault(require("path"));
const cliState_1 = __importDefault(require("../../cliState"));
const esm_1 = require("../../esm");
const logger_1 = __importDefault(require("../../logger"));
const fileExtensions_1 = require("../../util/fileExtensions");
const base64_1 = require("./base64");
const bestOfN_1 = require("./bestOfN");
const citation_1 = require("./citation");
const crescendo_1 = require("./crescendo");
const gcg_1 = require("./gcg");
const goat_1 = require("./goat");
const hex_1 = require("./hex");
const homoglyph_1 = require("./homoglyph");
const iterative_1 = require("./iterative");
const leetspeak_1 = require("./leetspeak");
const likert_1 = require("./likert");
const mathPrompt_1 = require("./mathPrompt");
const multilingual_1 = require("./multilingual");
const otherEncodings_1 = require("./otherEncodings");
const pandamonium_1 = require("./pandamonium");
const promptInjections_1 = require("./promptInjections");
const retry_1 = require("./retry");
const rot13_1 = require("./rot13");
const simpleAudio_1 = require("./simpleAudio");
const simpleImage_1 = require("./simpleImage");
const simpleVideo_1 = require("./simpleVideo");
const singleTurnComposite_1 = require("./singleTurnComposite");
exports.Strategies = [
    {
        id: 'base64',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding Base64 encoding to ${testCases.length} test cases`);
            const newTestCases = (0, base64_1.addBase64Encoding)(testCases, injectVar);
            logger_1.default.debug(`Added ${newTestCases.length} Base64 encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'homoglyph',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding Homoglyph encoding to ${testCases.length} test cases`);
            const newTestCases = (0, homoglyph_1.addHomoglyphs)(testCases, injectVar);
            logger_1.default.debug(`Added ${newTestCases.length} Homoglyph encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'basic',
        action: async (testCases, injectVar, config) => {
            // Basic strategy doesn't modify test cases, it just controls whether they're included
            // The actual filtering happens in synthesize()
            return [];
        },
    },
    {
        id: 'best-of-n',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding Best-of-N to ${testCases.length} test cases`);
            const newTestCases = await (0, bestOfN_1.addBestOfNTestCases)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} Best-of-N test cases`);
            return newTestCases;
        },
    },
    {
        id: 'citation',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding Citation to ${testCases.length} test cases`);
            const newTestCases = await (0, citation_1.addCitationTestCases)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} Citation test cases`);
            return newTestCases;
        },
    },
    {
        id: 'crescendo',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding Crescendo to ${testCases.length} test cases`);
            const newTestCases = (0, crescendo_1.addCrescendo)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} Crescendo test cases`);
            return newTestCases;
        },
    },
    {
        id: 'gcg',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding GCG test cases to ${testCases.length} test cases`);
            const newTestCases = await (0, gcg_1.addGcgTestCases)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} GCG test cases`);
            return newTestCases;
        },
    },
    {
        id: 'goat',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding GOAT to ${testCases.length} test cases`);
            const newTestCases = await (0, goat_1.addGoatTestCases)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} GOAT test cases`);
            return newTestCases;
        },
    },
    {
        id: 'hex',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding Hex encoding to ${testCases.length} test cases`);
            const newTestCases = (0, hex_1.addHexEncoding)(testCases, injectVar);
            logger_1.default.debug(`Added ${newTestCases.length} Hex encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'jailbreak',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding experimental jailbreaks to ${testCases.length} test cases`);
            const newTestCases = (0, iterative_1.addIterativeJailbreaks)(testCases, injectVar, 'iterative', config);
            logger_1.default.debug(`Added ${newTestCases.length} experimental jailbreak test cases`);
            return newTestCases;
        },
    },
    {
        id: 'jailbreak:composite',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding composite jailbreak test cases to ${testCases.length} test cases`);
            const newTestCases = await (0, singleTurnComposite_1.addCompositeTestCases)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} composite jailbreak test cases`);
            return newTestCases;
        },
    },
    {
        id: 'jailbreak:likert',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding Likert scale jailbreaks to ${testCases.length} test cases`);
            const newTestCases = await (0, likert_1.addLikertTestCases)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} Likert scale jailbreak test cases`);
            return newTestCases;
        },
    },
    {
        id: 'jailbreak:tree',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding experimental tree jailbreaks to ${testCases.length} test cases`);
            const newTestCases = (0, iterative_1.addIterativeJailbreaks)(testCases, injectVar, 'iterative:tree', config);
            logger_1.default.debug(`Added ${newTestCases.length} experimental tree jailbreak test cases`);
            return newTestCases;
        },
    },
    {
        id: 'image',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding image encoding to ${testCases.length} test cases`);
            const newTestCases = await (0, simpleImage_1.addImageToBase64)(testCases, injectVar);
            logger_1.default.debug(`Added ${newTestCases.length} image encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'audio',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding audio encoding to ${testCases.length} test cases`);
            const newTestCases = await (0, simpleAudio_1.addAudioToBase64)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} audio encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'video',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding video encoding to ${testCases.length} test cases`);
            const newTestCases = await (0, simpleVideo_1.addVideoToBase64)(testCases, injectVar);
            logger_1.default.debug(`Added ${newTestCases.length} video encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'leetspeak',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding leetspeak encoding to ${testCases.length} test cases`);
            const newTestCases = (0, leetspeak_1.addLeetspeak)(testCases, injectVar);
            logger_1.default.debug(`Added ${newTestCases.length} leetspeak encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'math-prompt',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding MathPrompt encoding to ${testCases.length} test cases`);
            const newTestCases = await (0, mathPrompt_1.addMathPrompt)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} MathPrompt encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'multilingual',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding multilingual test cases to ${testCases.length} test cases`);
            const newTestCases = await (0, multilingual_1.addMultilingual)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} multilingual test cases`);
            return newTestCases;
        },
    },
    {
        id: 'pandamonium',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding pandamonium runs to ${testCases.length} test cases`);
            const newTestCases = await (0, pandamonium_1.addPandamonium)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} Pandamonium test cases`);
            return newTestCases;
        },
    },
    {
        id: 'prompt-injection',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding prompt injections to ${testCases.length} test cases`);
            const newTestCases = await (0, promptInjections_1.addInjections)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} prompt injection test cases`);
            return newTestCases;
        },
    },
    {
        id: 'retry',
        action: async (testCases, injectVar, config) => {
            logger_1.default.debug(`Adding retry test cases to ${testCases.length} test cases`);
            const newTestCases = await (0, retry_1.addRetryTestCases)(testCases, injectVar, config);
            logger_1.default.debug(`Added ${newTestCases.length} retry test cases`);
            return newTestCases;
        },
    },
    {
        id: 'rot13',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding ROT13 encoding to ${testCases.length} test cases`);
            const newTestCases = (0, rot13_1.addRot13)(testCases, injectVar);
            logger_1.default.debug(`Added ${newTestCases.length} ROT13 encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'morse',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding Morse code encoding to ${testCases.length} test cases`);
            const newTestCases = (0, otherEncodings_1.addOtherEncodings)(testCases, injectVar, otherEncodings_1.EncodingType.MORSE);
            logger_1.default.debug(`Added ${newTestCases.length} Morse code encoded test cases`);
            return newTestCases;
        },
    },
    {
        id: 'piglatin',
        action: async (testCases, injectVar) => {
            logger_1.default.debug(`Adding Pig Latin encoding to ${testCases.length} test cases`);
            const newTestCases = (0, otherEncodings_1.addOtherEncodings)(testCases, injectVar, otherEncodings_1.EncodingType.PIG_LATIN);
            logger_1.default.debug(`Added ${newTestCases.length} Pig Latin encoded test cases`);
            return newTestCases;
        },
    },
];
async function validateStrategies(strategies) {
    const invalidStrategies = [];
    for (const strategy of strategies) {
        // Skip validation for file:// strategies since they're loaded dynamically
        if (strategy.id.startsWith('file://')) {
            continue;
        }
        if (!exports.Strategies.map((s) => s.id).includes(strategy.id)) {
            invalidStrategies.push(strategy);
        }
        if (strategy.id === 'basic') {
            if (strategy.config?.enabled !== undefined && typeof strategy.config.enabled !== 'boolean') {
                throw new Error('Basic strategy enabled config must be a boolean');
            }
            continue;
        }
    }
    if (invalidStrategies.length > 0) {
        const validStrategiesString = exports.Strategies.map((s) => s.id).join(', ');
        const invalidStrategiesString = invalidStrategies.map((s) => s.id).join(', ');
        logger_1.default.error((0, dedent_1.default) `Invalid strategy(s): ${invalidStrategiesString}.

        ${chalk_1.default.green(`Valid strategies are: ${validStrategiesString}`)}`);
        process.exit(1);
    }
}
async function loadStrategy(strategyPath) {
    if (strategyPath.startsWith('file://')) {
        const filePath = strategyPath.slice('file://'.length);
        if (!(0, fileExtensions_1.isJavascriptFile)(filePath)) {
            throw new Error(`Custom strategy file must be a JavaScript file: ${filePath}`);
        }
        const basePath = cliState_1.default.basePath || process.cwd();
        const modulePath = path_1.default.isAbsolute(filePath) ? filePath : path_1.default.join(basePath, filePath);
        const CustomStrategy = (await (0, esm_1.importModule)(modulePath));
        // Validate that the custom strategy implements the Strategy interface
        if (!CustomStrategy.id || typeof CustomStrategy.action !== 'function') {
            throw new Error(`Custom strategy in ${filePath} must export an object with 'key' and 'action' properties`);
        }
        return CustomStrategy;
    }
    const strategy = exports.Strategies.find((s) => s.id === strategyPath);
    if (!strategy) {
        throw new Error(`Strategy not found: ${strategyPath}`);
    }
    return strategy;
}
//# sourceMappingURL=index.js.map