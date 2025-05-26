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
const dedent_1 = __importDefault(require("dedent"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const eval_1 = require("../../../src/commands/eval");
const evaluatorModule = __importStar(require("../../../src/evaluator"));
jest.mock('../../../src/evaluator', () => ({
    evaluate: jest.fn().mockResolvedValue({ results: [], summary: {} }),
}));
jest.mock('../../../src/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getLogLevel: jest.fn().mockReturnValue('info'),
}));
jest.mock('../../../src/migrate', () => ({
    runDbMigrations: jest.fn(),
}));
jest.mock('../../../src/telemetry', () => ({
    record: jest.fn(),
    recordAndSendOnce: jest.fn(),
    send: jest.fn().mockResolvedValue(undefined),
}));
const evaluateMock = jest.mocked(evaluatorModule.evaluate);
describe('evaluateOptions behavior', () => {
    let tempDir;
    let configPath;
    const originalExit = process.exit;
    beforeAll(() => {
        process.exit = jest.fn();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'promptfoo-test-'));
        configPath = path_1.default.join(tempDir, 'promptfooconfig.yaml');
        const configContent = (0, dedent_1.default) `
      evaluateOptions:
        maxConcurrency: 3

      providers:
        - id: openai:gpt-4o-mini

      prompts:
        - 'test prompt'

      tests:
        - vars:
            input: 'test input'
    `;
        fs_1.default.writeFileSync(configPath, configContent);
    });
    afterEach(() => {
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    });
    afterAll(() => {
        process.exit = originalExit;
    });
    it('should handle evaluateOptions from config files in external directories', async () => {
        const cmdObj = {
            config: [configPath],
        };
        await (0, eval_1.doEval)(cmdObj, {}, undefined, {});
        expect(evaluateMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), expect.any(Object));
        const options = evaluateMock.mock.calls[0][2];
        expect(options.maxConcurrency).toBeUndefined();
    });
    it('should prioritize command line options over config file options', async () => {
        const cmdObj = {
            config: [configPath],
            maxConcurrency: 5,
        };
        await (0, eval_1.doEval)(cmdObj, {}, undefined, {});
        expect(evaluateMock).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), expect.any(Object));
        const options = evaluateMock.mock.calls[0][2];
        expect(options.maxConcurrency).toBe(5);
    });
    it('should correctly merge evaluateOptions from multiple sources', () => {
        const config = {
            evaluateOptions: {
                maxConcurrency: 3,
                showProgressBar: false,
            },
            providers: [],
            prompts: [],
        };
        const initialOptions = {
            showProgressBar: true,
        };
        const mergedOptions = config.evaluateOptions
            ? { ...initialOptions, ...config.evaluateOptions }
            : initialOptions;
        expect(mergedOptions.maxConcurrency).toBe(3);
        expect(mergedOptions.showProgressBar).toBe(false);
    });
});
//# sourceMappingURL=evaluateOptions.test.js.map