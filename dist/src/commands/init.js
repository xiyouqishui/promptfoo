"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = downloadFile;
exports.downloadDirectory = downloadDirectory;
exports.downloadExample = downloadExample;
exports.getExamplesList = getExamplesList;
exports.selectExample = selectExample;
exports.initCommand = initCommand;
const confirm_1 = __importDefault(require("@inquirer/confirm"));
const select_1 = __importDefault(require("@inquirer/select"));
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../constants");
const logger_1 = __importDefault(require("../logger"));
const onboarding_1 = require("../onboarding");
const telemetry_1 = __importDefault(require("../telemetry"));
const util_1 = require("../util");
const GITHUB_API_BASE = 'https://api.github.com';
async function downloadFile(url, filePath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const content = await response.text();
    await promises_1.default.writeFile(filePath, content);
}
async function downloadDirectory(dirPath, targetDir) {
    // First try with VERSION
    const url = `${GITHUB_API_BASE}/repos/promptfoo/promptfoo/contents/examples/${dirPath}?ref=${constants_1.VERSION}`;
    let response = await fetch(url, {
        headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'promptfoo-cli',
        },
    });
    // If VERSION fails, try with 'main'
    if (!response.ok) {
        const mainUrl = `${GITHUB_API_BASE}/repos/promptfoo/promptfoo/contents/examples/${dirPath}?ref=main`;
        response = await fetch(mainUrl, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'promptfoo-cli',
            },
        });
        // If both attempts fail, throw an error
        if (!response.ok) {
            throw new Error(`Failed to fetch directory contents: ${response.statusText}`);
        }
    }
    const contents = await response.json();
    for (const item of contents) {
        const itemPath = path_1.default.join(targetDir, item.name);
        if (item.type === 'file') {
            await downloadFile(item.download_url, itemPath);
        }
        else if (item.type === 'dir') {
            await promises_1.default.mkdir(itemPath, { recursive: true });
            await downloadDirectory(`${dirPath}/${item.name}`, itemPath);
        }
    }
}
async function downloadExample(exampleName, targetDir) {
    try {
        await promises_1.default.mkdir(targetDir, { recursive: true });
        await downloadDirectory(exampleName, targetDir);
    }
    catch (error) {
        throw new Error(`Failed to download example: ${error instanceof Error ? error.message : error}`);
    }
}
async function getExamplesList() {
    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/promptfoo/promptfoo/contents/examples?ref=${constants_1.VERSION}`, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'promptfoo-cli',
            },
        });
        if (!response.ok) {
            throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json());
        // Filter for directories only
        return data.filter((item) => item.type === 'dir').map((item) => item.name);
    }
    catch (error) {
        logger_1.default.error(`Failed to fetch examples list: ${error instanceof Error ? error.message : error}`);
        return []; // Return an empty array if fetching fails
    }
}
async function selectExample() {
    const examples = await getExamplesList();
    const choices = [
        { name: 'None (initialize with dummy files)', value: '' },
        ...examples.map((ex) => ({ name: ex, value: ex })),
    ];
    const selectedExample = await (0, select_1.default)({
        message: 'Choose an example to download:',
        choices,
    });
    return selectedExample;
}
async function handleExampleDownload(directory, example) {
    let exampleName;
    if (example === true) {
        exampleName = await selectExample();
    }
    else if (typeof example === 'string') {
        exampleName = example;
    }
    let attemptDownload = true;
    while (attemptDownload && exampleName) {
        const targetDir = path_1.default.join(directory || '.', exampleName);
        try {
            await downloadExample(exampleName, targetDir);
            logger_1.default.info(chalk_1.default.green(`✅ Example project '${exampleName}' written to: ${targetDir}`));
            attemptDownload = false;
        }
        catch (error) {
            logger_1.default.error(`Failed to download example: ${error instanceof Error ? error.message : error}`);
            attemptDownload = await (0, confirm_1.default)({
                message: 'Would you like to try downloading a different example?',
                default: true,
            });
            if (attemptDownload) {
                exampleName = await selectExample();
            }
        }
    }
    const runCommand = (0, util_1.isRunningUnderNpx)() ? 'npx promptfoo eval' : 'promptfoo eval';
    if (!exampleName) {
        return;
    }
    const basePath = directory && directory !== '.' ? `${directory}/` : '';
    const readmePath = path_1.default.join(basePath, exampleName, 'README.md');
    const cdCommand = `cd ${path_1.default.join(basePath, exampleName)}`;
    if (exampleName.includes('redteam')) {
        logger_1.default.info((0, dedent_1.default) `

      View the README file at ${chalk_1.default.bold(readmePath)} to get started!
      `);
    }
    else {
        logger_1.default.info((0, dedent_1.default) `

      View the README at ${chalk_1.default.bold(readmePath)} or run:

      \`${chalk_1.default.bold(`${cdCommand} && ${runCommand}`)}\`

      to get started!
      `);
    }
    return exampleName;
}
function initCommand(program) {
    program
        .command('init [directory]')
        .description('Initialize project with dummy files or download an example')
        .option('--no-interactive', 'Do not run in interactive mode')
        .option('--example [name]', 'Download an example from the promptfoo repo')
        .action(async (directory, cmdObj) => {
        telemetry_1.default.record('command_used', {
            name: 'init - started',
        });
        if (directory === 'redteam' && cmdObj.interactive) {
            const useRedteam = await (0, confirm_1.default)({
                message: 'You specified "redteam" as the directory. Did you mean to write "promptfoo redteam init" instead?',
                default: false,
            });
            if (useRedteam) {
                logger_1.default.warn('Please use "promptfoo redteam init" to initialize a red teaming project.');
                return;
            }
        }
        const exampleName = await handleExampleDownload(directory, cmdObj.example);
        if (exampleName) {
            telemetry_1.default.record('command_used', {
                example: exampleName,
                name: 'init',
            });
        }
        else {
            const details = await (0, onboarding_1.initializeProject)(directory, cmdObj.interactive);
            telemetry_1.default.record('command_used', {
                ...details,
                name: 'init',
            });
        }
        await telemetry_1.default.send();
    });
}
//# sourceMappingURL=init.js.map