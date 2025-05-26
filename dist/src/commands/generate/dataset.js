"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doGenerateDataset = doGenerateDataset;
exports.generateDatasetCommand = generateDatasetCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const cache_1 = require("../../cache");
const csv_1 = require("../../csv");
const logger_1 = __importDefault(require("../../logger"));
const telemetry_1 = __importDefault(require("../../telemetry"));
const synthesis_1 = require("../../testCase/synthesis");
const util_1 = require("../../util");
const load_1 = require("../../util/config/load");
async function doGenerateDataset(options) {
    (0, util_1.setupEnv)(options.envFile);
    if (!options.cache) {
        logger_1.default.info('Cache is disabled.');
        (0, cache_1.disableCache)();
    }
    let testSuite;
    const configPath = options.config || options.defaultConfigPath;
    if (configPath) {
        const resolved = await (0, load_1.resolveConfigs)({
            config: [configPath],
        }, options.defaultConfig, 'DatasetGeneration');
        testSuite = resolved.testSuite;
    }
    else {
        throw new Error('Could not find config file. Please use `--config`');
    }
    const startTime = Date.now();
    telemetry_1.default.record('command_used', {
        name: 'generate_dataset - started',
        numPrompts: testSuite.prompts.length,
        numTestsExisting: (testSuite.tests || []).length,
    });
    await telemetry_1.default.send();
    const results = await (0, synthesis_1.synthesizeFromTestSuite)(testSuite, {
        instructions: options.instructions,
        numPersonas: Number.parseInt(options.numPersonas, 10),
        numTestCasesPerPersona: Number.parseInt(options.numTestCasesPerPersona, 10),
        provider: options.provider,
    });
    const configAddition = { tests: results.map((result) => ({ vars: result })) };
    const yamlString = js_yaml_1.default.dump(configAddition);
    if (options.output) {
        // Should the output be written as a YAML or CSV?
        if (options.output.endsWith('.csv')) {
            fs.writeFileSync(options.output, (0, csv_1.serializeObjectArrayAsCSV)(results));
        }
        else if (options.output.endsWith('.yaml')) {
            fs.writeFileSync(options.output, yamlString);
        }
        else {
            throw new Error(`Unsupported output file type: ${options.output}`);
        }
        (0, util_1.printBorder)();
        logger_1.default.info(`Wrote ${results.length} new test cases to ${options.output}`);
        (0, util_1.printBorder)();
    }
    else {
        (0, util_1.printBorder)();
        logger_1.default.info('New test Cases');
        (0, util_1.printBorder)();
        logger_1.default.info(yamlString);
    }
    (0, util_1.printBorder)();
    if (options.write && configPath) {
        const existingConfig = js_yaml_1.default.load(fs.readFileSync(configPath, 'utf8'));
        existingConfig.tests = [...(existingConfig.tests || []), ...configAddition.tests];
        fs.writeFileSync(configPath, js_yaml_1.default.dump(existingConfig));
        logger_1.default.info(`Wrote ${results.length} new test cases to ${configPath}`);
        const runCommand = (0, util_1.isRunningUnderNpx)() ? 'npx promptfoo eval' : 'promptfoo eval';
        logger_1.default.info(chalk_1.default.green(`Run ${chalk_1.default.bold(runCommand)} to run the generated tests`));
    }
    else {
        logger_1.default.info(`Copy the above test cases or run ${chalk_1.default.greenBright('promptfoo generate dataset --write')} to write directly to the config`);
    }
    telemetry_1.default.record('command_used', {
        duration: Math.round((Date.now() - startTime) / 1000),
        name: 'generate_dataset',
        numPrompts: testSuite.prompts.length,
        numTestsExisting: (testSuite.tests || []).length,
        numTestsGenerated: results.length,
        provider: options.provider || 'default',
    });
    await telemetry_1.default.send();
}
function generateDatasetCommand(program, defaultConfig, defaultConfigPath) {
    program
        .command('dataset')
        .description('Generate test cases')
        .option('-i, --instructions [instructions]', 'Additional instructions to follow while generating test cases')
        .option('-c, --config [path]', 'Path to configuration file. Defaults to promptfooconfig.yaml')
        .option('-o, --output [path]', 'Path to output file. Supports CSV and YAML output.')
        .option('-w, --write', 'Write results to promptfoo configuration file')
        .option('--provider <provider>', `Provider to use for generating adversarial tests. Defaults to the default grading provider.`)
        .option('--numPersonas <number>', 'Number of personas to generate', '5')
        .option('--numTestCasesPerPersona <number>', 'Number of test cases per persona', '3')
        .option('--no-cache', 'Do not read or write results to disk cache', false)
        .option('--env-file, --env-path <path>', 'Path to .env file')
        .action((opts) => doGenerateDataset({ ...opts, defaultConfig, defaultConfigPath }));
}
//# sourceMappingURL=dataset.js.map