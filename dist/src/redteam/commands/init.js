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
exports.renderRedteamConfig = renderRedteamConfig;
exports.redteamInit = redteamInit;
exports.initCommand = initCommand;
const checkbox_1 = __importDefault(require("@inquirer/checkbox"));
const checkbox_2 = require("@inquirer/checkbox");
const confirm_1 = __importDefault(require("@inquirer/confirm"));
const core_1 = require("@inquirer/core");
const editor_1 = __importDefault(require("@inquirer/editor"));
const input_1 = __importDefault(require("@inquirer/input"));
const select_1 = __importDefault(require("@inquirer/select"));
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const fs_1 = __importDefault(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("../../constants");
const envars_1 = require("../../envars");
const accounts_1 = require("../../globalConfig/accounts");
const globalConfig_1 = require("../../globalConfig/globalConfig");
const logger_1 = __importDefault(require("../../logger"));
const server_1 = require("../../server/server");
const telemetry_1 = __importDefault(require("../../telemetry"));
const util_1 = require("../../util");
const server_2 = require("../../util/server");
const server_3 = require("../../util/server");
const templates_1 = require("../../util/templates");
const constants_2 = require("../constants");
const generate_1 = require("./generate");
const REDTEAM_CONFIG_TEMPLATE = `# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json

# Red teaming configuration

# Docs: https://promptfoo.dev/docs/red-team/configuration
description: "My first red team"

{% if prompts.length > 0 -%}
prompts:
  {% for prompt in prompts -%}
  - {{ prompt | dump }}
  {% endfor -%}
  {% if prompts.length > 0 and not prompts[0].startsWith('file://') -%}
  # You can also reference external prompts, e.g.
  # - file:///path/to/prompt.json
  # Learn more: https://promptfoo.dev/docs/configuration/parameters/#prompts
  {% endif %}
{% endif -%}

targets:
  # Red team targets. To talk directly to your application, use a custom provider.
  # See https://promptfoo.dev/docs/red-team/configuration/#providers
  {% for provider in providers -%}
  {% if provider is string -%}
  - {{ provider }}
  {% else -%}
  - id: {{ provider.id }}
    label: {{ provider.label }}
    config:
      {% for k, v in provider.config -%}
      {{ k }}: {{ v | dump }}
      {% endfor -%}
  {% endif -%}
  {% endfor %}

# Other redteam settings
redteam:
  {% if purpose is defined -%}
  purpose: {{ purpose | dump }}
  {% endif %}
  # Default number of inputs to generate for each plugin.
  # The total number of tests will be (numTests * plugins.length * (1 + strategies.length) * languages.length)
  # Languages.length is 1 by default, but is added when the multilingual strategy is used.
  numTests: {{numTests}}

  {% if plugins.length > 0 -%}
  # Each plugin generates {{numTests}} adversarial inputs.
  # To control the number of tests for each plugin, use:
  # - id: plugin-name
  #   numTests: 10
  plugins:
    {% for plugin in plugins -%}
    {% if plugin is string -%}
    - {{plugin}}  # {{descriptions[plugin]}}
    {% else -%}
    - id: {{plugin.id}}  # {{descriptions[plugin.id]}}
      {% if plugin.numTests is defined -%}
      numTests: {{plugin.numTests}}
      {% endif -%}
      {%- if plugin.config is defined -%}
      config:
        {%- for k, v in plugin.config %}
        {{k}}: {{v | dump}}
        {%- endfor -%}
      {%- endif %}
    {% endif -%}
    {%- endfor %}
  {% endif -%}

  {% if strategies.length > 0 -%}
  # Attack methods for applying adversarial inputs
  strategies:
    {% for strategy in strategies -%}
    - {{strategy}} # {{descriptions[strategy]}}
    {% endfor %}
  {% endif -%}
`;
const CUSTOM_PROVIDER_TEMPLATE = `# Custom provider for red teaming
# Docs: https://promptfoo.dev/docs/red-team/configuration/#providers

import http.client
import urllib.parse
import json

def call_api(prompt, options, context):
    parsed_url = urllib.parse.urlparse('https://example.com/api/chat)
    conn = http.client.HTTPSConnection(parsed_url.netloc)

    headers = {'Content-Type': 'application/json'}
    payload = json.dumps({'user_chat': prompt})

    conn.request("POST", parsed_url.path or "/", body=payload, headers=headers)
    response = conn.getresponse()

    return {
      "output": response.read().decode()
    }
`;
function recordOnboardingStep(step, properties = {}) {
    telemetry_1.default.recordAndSend('funnel', {
        type: 'redteam onboarding',
        step,
        ...properties,
    });
}
async function getSystemPrompt(numVariablesRequired = 1) {
    const NOTE = 'NOTE: your prompt must include one or more injectable variables like {{prompt}} or {{name}} as a placeholder for user input (REMOVE THIS LINE)';
    let prompt = (0, dedent_1.default) `You are a helpful and concise assistant.

  User query: {{prompt}}

  ${NOTE}`;
    prompt = await (0, editor_1.default)({
        message: 'Enter the prompt you want to test against:',
        default: prompt,
    });
    prompt = prompt.replace(NOTE, '');
    const variables = (0, templates_1.extractVariablesFromTemplate)(prompt);
    if (variables.length < numVariablesRequired) {
        // Give the user another chance to edit their prompt
        logger_1.default.info(chalk_1.default.red(`Your prompt must include ${numVariablesRequired} ${numVariablesRequired === 1 ? 'variable' : 'variables'} like "{{prompt}}" as a placeholder for user input.`));
        prompt = await (0, editor_1.default)({
            message: 'Enter the prompt you want to test against:',
            default: prompt,
        });
    }
    return prompt;
}
function renderRedteamConfig({ descriptions, numTests, plugins, prompts, providers, purpose, strategies, }) {
    const nunjucks = (0, templates_1.getNunjucksEngine)();
    return nunjucks.renderString(REDTEAM_CONFIG_TEMPLATE, {
        descriptions,
        numTests,
        plugins,
        prompts,
        providers,
        purpose,
        strategies,
    });
}
async function redteamInit(directory) {
    telemetry_1.default.record('command_used', { name: 'redteam init - started' });
    recordOnboardingStep('start');
    const projectDir = directory || '.';
    if (projectDir !== '.' && !fs_1.default.existsSync(projectDir)) {
        fs_1.default.mkdirSync(projectDir, { recursive: true });
    }
    const configPath = path.join(projectDir, 'promptfooconfig.yaml');
    console.clear();
    logger_1.default.info(chalk_1.default.bold('Red Team Configuration\n'));
    const label = await (0, input_1.default)({
        message: "What's the name of the target you want to red team? (e.g. 'helpdesk-agent', 'customer-service-chatbot')\n",
    });
    const redTeamChoice = await (0, select_1.default)({
        message: 'What would you like to do?',
        choices: [
            { name: 'Not sure yet', value: 'not_sure' },
            { name: 'Red team an HTTP endpoint', value: 'http_endpoint' },
            { name: 'Red team a model + prompt', value: 'prompt_model_chatbot' },
            { name: 'Red team a RAG', value: 'rag' },
            { name: 'Red team an Agent', value: 'agent' },
        ],
        pageSize: process.stdout.rows - 6,
    });
    recordOnboardingStep('choose app type', { value: redTeamChoice });
    const prompts = [];
    let purpose;
    const useCustomProvider = redTeamChoice === 'rag' ||
        redTeamChoice === 'agent' ||
        redTeamChoice === 'http_endpoint' ||
        redTeamChoice === 'not_sure';
    let deferGeneration = useCustomProvider;
    const defaultPrompt = 'You are a travel agent specialized in budget trips to Europe\n\nUser query: {{prompt}}';
    const defaultPurpose = 'Travel agent specializing in budget trips to Europe. The user is anonymous and should not be able to access any information about the system or other users.';
    if (useCustomProvider) {
        purpose =
            (await (0, input_1.default)({
                message: (0, dedent_1.default) `What is the purpose of your application? This is used to tailor the attacks. Be as specific as possible. Include information about who the user of the system is and what information and actions they should be able to access.
        (e.g. "${defaultPurpose}")\n`,
            })) || defaultPurpose;
        recordOnboardingStep('choose purpose', { value: purpose });
    }
    else if (redTeamChoice === 'prompt_model_chatbot') {
        const promptChoice = await (0, select_1.default)({
            message: 'Do you want to enter a prompt now or later?',
            choices: [
                { name: 'Enter prompt now', value: 'now' },
                { name: 'Enter prompt later', value: 'later' },
            ],
        });
        recordOnboardingStep('choose prompt', { value: promptChoice });
        let prompt;
        if (promptChoice === 'now') {
            prompt = await getSystemPrompt();
        }
        else {
            prompt = defaultPrompt;
            deferGeneration = true;
        }
        prompts.push(prompt);
    }
    else {
        prompts.push('You are a travel agent specialized in budget trips to Europe\n\nUser query: {{prompt}}');
    }
    let providers;
    let writeChatPy = false;
    if (useCustomProvider) {
        if (redTeamChoice === 'http_endpoint' || redTeamChoice === 'not_sure') {
            providers = [
                {
                    id: 'https',
                    label,
                    config: {
                        url: 'https://example.com/generate',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: {
                            myPrompt: '{{prompt}}',
                        },
                    },
                },
            ];
        }
        else {
            providers = ['file://chat.py'];
            writeChatPy = true;
        }
    }
    else {
        const providerChoices = [
            { name: `I'll choose later`, value: 'Other' },
            { name: 'openai:gpt-4o-mini', value: 'openai:gpt-4o-mini' },
            { name: 'openai:gpt-4o', value: 'openai:gpt-4o' },
            {
                name: 'anthropic:claude-3-7-sonnet-20250219',
                value: 'anthropic:messages:claude-3-7-sonnet-20250219',
            },
            {
                name: 'anthropic:claude-3-5-sonnet-20241022',
                value: 'anthropic:messages:claude-3-5-sonnet-20241022',
            },
            { name: 'vertex:gemini-pro', value: 'vertex:gemini-pro' },
        ];
        const selectedProvider = await (0, select_1.default)({
            message: 'Choose a model to target:',
            choices: providerChoices,
            pageSize: process.stdout.rows - 6,
        });
        recordOnboardingStep('choose provider', { value: selectedProvider });
        if (selectedProvider === 'Other') {
            providers = [{ id: 'openai:gpt-4o-mini', label }];
        }
        else {
            providers = [{ id: selectedProvider, label }];
        }
    }
    console.clear();
    recordOnboardingStep('begin plugin & strategy selection');
    logger_1.default.info(chalk_1.default.bold('Plugin Configuration'));
    logger_1.default.info('Plugins generate adversarial inputs.\n');
    const pluginConfigChoice = await (0, select_1.default)({
        message: 'How would you like to configure plugins?',
        choices: [
            { name: 'Use the defaults (configure later)', value: 'default' },
            { name: 'Manually select', value: 'manual' },
        ],
    });
    recordOnboardingStep('choose plugin config method', { value: pluginConfigChoice });
    let plugins;
    if (pluginConfigChoice === 'default') {
        if (redTeamChoice === 'rag') {
            plugins = Array.from(constants_2.DEFAULT_PLUGINS);
        }
        else if (redTeamChoice === 'agent') {
            plugins = [...constants_2.DEFAULT_PLUGINS, 'rbac', 'bola', 'bfla', 'ssrf'];
        }
        else {
            plugins = Array.from(constants_2.DEFAULT_PLUGINS);
        }
    }
    else {
        const pluginChoices = Array.from(constants_2.ALL_PLUGINS)
            .sort()
            .map((plugin) => ({
            name: `${plugin} - ${constants_2.subCategoryDescriptions[plugin] || 'No description'}`,
            value: plugin,
            checked: constants_2.DEFAULT_PLUGINS.has(plugin),
        }));
        plugins = await (0, checkbox_1.default)({
            message: `Select the plugins you want to use. Don't worry, you can change this later:`,
            choices: pluginChoices,
            pageSize: process.stdout.rows - 6,
            loop: false,
            validate: (answer) => answer.length > 0 || 'You must select at least one plugin.',
        });
        recordOnboardingStep('choose plugins', {
            value: plugins.map((p) => (typeof p === 'string' ? p : p.id)),
        });
    }
    // Plugins that require additional configuration
    if (plugins.includes('policy')) {
        const policyIndex = plugins.indexOf('policy');
        if (policyIndex !== -1) {
            plugins.splice(policyIndex, 1);
        }
        recordOnboardingStep('collect policy');
        const policyDescription = await (0, input_1.default)({
            message: 'You selected the `policy` plugin. Please enter your custom policy description, or leave empty to skip.\n(e.g. "Never talk about the weather")',
        });
        recordOnboardingStep('choose policy', { value: policyDescription.length });
        if (policyDescription.trim() !== '') {
            plugins.push({
                id: 'policy',
                config: { policy: policyDescription.trim() },
            });
        }
    }
    if (plugins.includes('intent')) {
        const intentIndex = plugins.indexOf('intent');
        if (intentIndex !== -1) {
            plugins.splice(intentIndex, 1);
        }
        recordOnboardingStep('collect intent');
        const intentDescription = await (0, input_1.default)({
            message: (0, dedent_1.default) `You selected the 'intent' plugin. Please enter the behavior you want to test for, or leave empty to skip.
      (e.g. "express hatred towards a specific group" or "provide instructions for illegal activities")\n`,
        });
        recordOnboardingStep('choose intent', { value: intentDescription.length });
        if (intentDescription.trim() !== '') {
            plugins.push({
                id: 'intent',
                config: { intent: intentDescription.trim() },
            });
        }
    }
    if (plugins.includes('prompt-extraction')) {
        plugins = plugins.filter((p) => p !== 'prompt-extraction');
        plugins.push({
            id: 'prompt-extraction',
            config: { systemPrompt: prompts[0] },
        });
    }
    if (plugins.includes('indirect-prompt-injection')) {
        recordOnboardingStep('choose indirect prompt injection variable');
        logger_1.default.info(chalk_1.default.bold('Indirect Prompt Injection Configuration\n'));
        if (prompts.length === 0) {
            plugins = plugins.filter((p) => p !== 'indirect-prompt-injection');
            recordOnboardingStep('skip indirect prompt injection');
            logger_1.default.warn((0, dedent_1.default) `${chalk_1.default.bold('Warning:')} Skipping indirect prompt injection plugin because no prompt is specified.
        You can re-add this plugin after adding a prompt in your redteam config.

        Learn more: https://www.promptfoo.dev/docs/red-team/plugins/indirect-prompt-injection`);
        }
        else {
            const variables = (0, templates_1.extractVariablesFromTemplate)(prompts[0]);
            if (variables.length > 1) {
                const indirectInjectionVar = await (0, select_1.default)({
                    message: 'Which variable would you like to test for indirect prompt injection?',
                    choices: variables.sort().map((variable) => ({
                        name: variable,
                        value: variable,
                    })),
                });
                recordOnboardingStep('chose indirect prompt injection variable');
                plugins = plugins.filter((p) => p !== 'indirect-prompt-injection');
                plugins.push({
                    id: 'indirect-prompt-injection',
                    config: {
                        indirectInjectionVar,
                    },
                });
            }
            else {
                plugins = plugins.filter((p) => p !== 'indirect-prompt-injection');
                recordOnboardingStep('skip indirect prompt injection');
                logger_1.default.warn((0, dedent_1.default) `${chalk_1.default.bold('Warning:')} Skipping indirect prompt injection plugin because it requires at least two {{variables}} in the prompt.

          Learn more: https://www.promptfoo.dev/docs/red-team/plugins/indirect-prompt-injection`);
            }
        }
    }
    console.clear();
    logger_1.default.info((0, dedent_1.default) `
    ${chalk_1.default.bold('Strategy Configuration')}
    Strategies are attack methods.
  `);
    const strategyConfigChoice = await (0, select_1.default)({
        message: 'How would you like to configure strategies?',
        choices: [
            { name: 'Use the defaults (configure later)', value: 'default' },
            { name: 'Manually select', value: 'manual' },
        ],
    });
    recordOnboardingStep('choose strategy config method', { value: strategyConfigChoice });
    let strategies;
    if (strategyConfigChoice === 'default') {
        // TODO(ian): Differentiate strategies
        if (redTeamChoice === 'rag') {
            strategies = Array.from(constants_2.DEFAULT_STRATEGIES);
        }
        else if (redTeamChoice === 'agent') {
            strategies = Array.from(constants_2.DEFAULT_STRATEGIES);
        }
        else {
            strategies = Array.from(constants_2.DEFAULT_STRATEGIES);
        }
    }
    else {
        const strategyChoices = [
            ...Array.from(constants_2.DEFAULT_STRATEGIES).sort(),
            new checkbox_2.Separator(),
            ...Array.from(constants_2.ADDITIONAL_STRATEGIES).sort(),
        ].map((strategy) => typeof strategy === 'string'
            ? {
                name: `${strategy} - ${constants_2.subCategoryDescriptions[strategy] || 'No description'}`,
                value: strategy,
                checked: constants_2.DEFAULT_STRATEGIES.includes(strategy),
            }
            : strategy);
        strategies = await (0, checkbox_1.default)({
            message: `Select the ones you want to use. Don't worry, you can change this later:`,
            choices: strategyChoices,
            pageSize: process.stdout.rows - 6,
            loop: false,
        });
    }
    recordOnboardingStep('choose strategies', {
        value: strategies,
    });
    const hasHarmfulPlugin = plugins.some((plugin) => typeof plugin === 'string' && plugin.startsWith('harmful'));
    if (hasHarmfulPlugin) {
        recordOnboardingStep('collect email');
        const { hasHarmfulRedteamConsent } = (0, globalConfig_1.readGlobalConfig)();
        if (!hasHarmfulRedteamConsent) {
            const existingEmail = (0, accounts_1.getUserEmail)();
            let email = existingEmail;
            if (!existingEmail) {
                logger_1.default.info('You have selected one or more plugins that generate potentially harmful content.');
                logger_1.default.info('This content is intended solely for adversarial testing and evaluation purposes.');
                email = await (0, input_1.default)({
                    message: `${chalk_1.default.bold('Please enter your work email address')} to confirm your agreement:`,
                    validate: (value) => {
                        return value.includes('@') || 'Please enter a valid email address';
                    },
                });
                (0, accounts_1.setUserEmail)(email);
            }
            if (email) {
                try {
                    await telemetry_1.default.saveConsent(email, {
                        source: 'redteam init',
                    });
                    (0, globalConfig_1.writeGlobalConfigPartial)({ hasHarmfulRedteamConsent: true });
                }
                catch (err) {
                    logger_1.default.debug(`Failed to save consent: ${err.message}`);
                }
            }
        }
    }
    // Remove harmful plugin collection if all harmful plugins are already selected
    if (plugins
        .map((plugin) => (typeof plugin === 'string' ? plugin : plugin.id))
        .includes('harmful') &&
        Object.keys(constants_2.HARM_PLUGINS).every((plugin) => plugins.map((plugin) => (typeof plugin === 'string' ? plugin : plugin.id)).includes(plugin))) {
        plugins = plugins.filter((plugin) => typeof plugin === 'string' ? plugin !== 'harmful' : plugin.id !== 'harmful');
    }
    const numTests = 5;
    const redteamConfig = renderRedteamConfig({
        purpose,
        numTests,
        plugins,
        strategies,
        prompts,
        providers,
        descriptions: constants_2.subCategoryDescriptions,
    });
    fs_1.default.writeFileSync(configPath, redteamConfig, 'utf8');
    if (writeChatPy) {
        fs_1.default.writeFileSync(path.join(projectDir, 'chat.py'), CUSTOM_PROVIDER_TEMPLATE, 'utf8');
    }
    console.clear();
    logger_1.default.info(chalk_1.default.green(`\nCreated red teaming configuration file at ${chalk_1.default.bold(configPath)}\n`));
    telemetry_1.default.record('command_used', { name: 'redteam init' });
    await recordOnboardingStep('finish');
    if (deferGeneration) {
        logger_1.default.info('\n' +
            chalk_1.default.green((0, dedent_1.default) `
          To generate test cases and run your red team, use the command:

              ${chalk_1.default.bold(`${(0, util_1.isRunningUnderNpx)() ? 'npx promptfoo' : 'promptfoo'} redteam run`)}
        `));
        return;
    }
    else {
        recordOnboardingStep('offer generate');
        const readyToGenerate = await (0, confirm_1.default)({
            message: 'Are you ready to generate adversarial test cases?',
            default: true,
        });
        recordOnboardingStep('choose generate', { value: readyToGenerate });
        if (readyToGenerate) {
            await (0, generate_1.doGenerateRedteam)({
                purpose,
                plugins: plugins.map((plugin) => (typeof plugin === 'string' ? { id: plugin } : plugin)),
                cache: false,
                write: false,
                output: 'redteam.yaml',
                defaultConfig: {},
                defaultConfigPath: configPath,
                numTests,
            });
        }
        else {
            logger_1.default.info('\n' +
                chalk_1.default.blue('To generate test cases and run your red team later, use the command: ' +
                    chalk_1.default.bold(`${(0, util_1.isRunningUnderNpx)() ? 'npx promptfoo' : 'promptfoo'} redteam run`)));
        }
    }
}
function initCommand(program) {
    program
        .command('init [directory]')
        .description('Initialize red teaming project')
        .option('--env-file, --env-path <path>', 'Path to .env file')
        .option('--no-gui', 'Do not open the browser UI')
        .action(async (directory, opts) => {
        (0, util_1.setupEnv)(opts.envPath);
        try {
            // Check if we're in a non-GUI environment
            const isGUI = (0, envars_1.getEnvString)('DISPLAY') ||
                process.platform === 'win32' ||
                process.platform === 'darwin';
            const useGui = opts.gui && isGUI;
            if (useGui) {
                const isRunning = await (0, server_3.checkServerRunning)();
                if (isRunning) {
                    await (0, server_3.openBrowser)(server_2.BrowserBehavior.OPEN_TO_REDTEAM_CREATE);
                }
                else {
                    await (0, server_1.startServer)((0, constants_1.getDefaultPort)(), server_2.BrowserBehavior.OPEN_TO_REDTEAM_CREATE);
                }
            }
            else {
                await redteamInit(directory);
            }
        }
        catch (err) {
            if (err instanceof core_1.ExitPromptError) {
                logger_1.default.info('\n' +
                    chalk_1.default.blue('Red team initialization paused. To continue setup later, use the command: ') +
                    chalk_1.default.bold(`${(0, util_1.isRunningUnderNpx)() ? 'npx promptfoo' : 'promptfoo'} redteam init`));
                logger_1.default.info(chalk_1.default.blue('For help or feedback, visit ') +
                    chalk_1.default.green('https://www.promptfoo.dev/contact/'));
                await recordOnboardingStep('early exit');
                process.exit(130);
            }
            else {
                throw err;
            }
        }
    });
}
//# sourceMappingURL=init.js.map