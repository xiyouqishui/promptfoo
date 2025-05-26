"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelScanCommand = modelScanCommand;
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const child_process_2 = require("child_process");
const util_1 = require("util");
const logger_1 = __importDefault(require("../logger"));
const execAsync = (0, util_1.promisify)(child_process_2.exec);
async function checkModelAuditInstalled() {
    try {
        await execAsync('python -c "import modelaudit"');
        return true;
    }
    catch {
        return false;
    }
}
function modelScanCommand(program) {
    program
        .command('scan-model')
        .description('Scan ML models for security vulnerabilities')
        .argument('[paths...]', 'Paths to model files or directories to scan')
        .option('-b, --blacklist <pattern>', 'Additional blacklist patterns to check against model names', (val, acc) => [...acc, val], [])
        .option('-f, --format <format>', 'Output format (text or json)', 'text')
        .option('-o, --output <path>', 'Output file path (prints to stdout if not specified)')
        .option('-t, --timeout <seconds>', 'Scan timeout in seconds', (val) => Number.parseInt(val, 10), 300)
        .option('--max-file-size <bytes>', 'Maximum file size to scan in bytes')
        .action(async (paths, options) => {
        if (!paths || paths.length === 0) {
            logger_1.default.error('No paths specified. Please provide at least one model file or directory to scan.');
            process.exit(1);
        }
        // Check if modelaudit is installed
        const isModelAuditInstalled = await checkModelAuditInstalled();
        if (!isModelAuditInstalled) {
            logger_1.default.error('ModelAudit is not installed.');
            logger_1.default.info(`Please install it using: ${chalk_1.default.green('pip install modelaudit')}`);
            logger_1.default.info('For more information, visit: https://www.promptfoo.dev/docs/model-audit/');
            process.exit(1);
        }
        const args = ['-m', 'modelaudit'];
        // Add all paths
        args.push(...paths);
        // Add options
        if (options.blacklist && options.blacklist.length > 0) {
            options.blacklist.forEach((pattern) => {
                args.push('--blacklist', pattern);
            });
        }
        if (options.format) {
            args.push('--format', options.format);
        }
        if (options.output) {
            args.push('--output', options.output);
        }
        if (options.timeout) {
            args.push('--timeout', options.timeout);
        }
        if (options.maxFileSize) {
            args.push('--max-file-size', options.maxFileSize);
        }
        logger_1.default.info(`Running model scan on: ${paths.join(', ')}`);
        const modelAudit = (0, child_process_1.spawn)('python', args, { stdio: 'inherit' });
        modelAudit.on('error', (error) => {
            logger_1.default.error(`Failed to start modelaudit: ${error.message}`);
            logger_1.default.info('Make sure modelaudit is installed and available in your PATH.');
            logger_1.default.info('Install it using: pip install modelaudit');
            process.exit(1);
        });
        modelAudit.on('close', (code) => {
            if (code === 0) {
                logger_1.default.info('Model scan completed successfully.');
            }
            else {
                logger_1.default.error(`Model scan completed with issues. Exit code: ${code}`);
                process.exit(code || 1);
            }
        });
    });
}
//# sourceMappingURL=modelScan.js.map