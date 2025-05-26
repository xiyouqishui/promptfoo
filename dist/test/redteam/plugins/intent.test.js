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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const matchers_1 = require("../../../src/matchers");
const intent_1 = require("../../../src/redteam/plugins/intent");
jest.mock('../../../src/matchers', () => ({
    matchesLlmRubric: jest.fn(),
}));
jest.mock('../../../src/database', () => ({
    getDb: jest.fn(),
}));
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
}));
jest.mock('glob', () => ({
    globSync: jest.fn(),
}));
jest.mock('better-sqlite3');
describe('IntentPlugin', () => {
    const mockProvider = {
        id: () => 'test-provider',
        callApi: jest.fn(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should initialize with a single string intent', async () => {
        const plugin = new intent_1.IntentPlugin(mockProvider, 'test-purpose', 'prompt', {
            intent: 'malicious intent',
        });
        const tests = await plugin.generateTests(1, 0);
        expect(tests).toHaveLength(1);
        expect(tests[0].vars).toHaveProperty('prompt', 'malicious intent');
        expect(tests[0].metadata).toEqual({
            intent: 'malicious intent',
            pluginId: intent_1.PLUGIN_ID,
        });
    });
    it('should initialize with an array of string intents', async () => {
        const plugin = new intent_1.IntentPlugin(mockProvider, 'test-purpose', 'prompt', {
            intent: ['intent1', 'intent2', 'intent3'],
        });
        const tests = await plugin.generateTests(1, 0);
        expect(tests).toHaveLength(3);
        expect(tests[0].vars).toHaveProperty('prompt', 'intent1');
        expect(tests[1].vars).toHaveProperty('prompt', 'intent2');
        expect(tests[2].vars).toHaveProperty('prompt', 'intent3');
    });
    it('should initialize with a list of list of strings', async () => {
        const plugin = new intent_1.IntentPlugin(mockProvider, 'test-purpose', 'prompt', {
            intent: [
                ['step1', 'step2'],
                ['other1', 'other2'],
            ],
        });
        const tests = (await plugin.generateTests(1, 0));
        expect(tests).toHaveLength(2);
        expect(tests[0].vars?.prompt).toEqual(['step1', 'step2']);
        expect(tests[0].provider).toBeDefined();
        expect(tests[0].provider).toEqual({
            id: 'sequence',
            config: {
                inputs: ['step1', 'step2'],
            },
        });
        expect(tests[1].vars?.prompt).toEqual(['other1', 'other2']);
        expect(tests[1].provider).toBeDefined();
        expect(tests[1].provider).toEqual({
            id: 'sequence',
            config: {
                inputs: ['other1', 'other2'],
            },
        });
    });
    it('should load intents from a CSV file', async () => {
        const mockFileContent = 'header\nintent1\nintent2\nintent3';
        jest.mocked(fs.existsSync).mockReturnValue(true);
        jest.mocked(fs.readFileSync).mockReturnValue(mockFileContent);
        const plugin = new intent_1.IntentPlugin(mockProvider, 'test-purpose', 'prompt', {
            intent: 'file://intents.csv',
        });
        const tests = await plugin.generateTests(1, 0);
        expect(tests).toHaveLength(3);
        expect(tests[0].vars).toHaveProperty('prompt', 'intent1');
        expect(tests[1].vars).toHaveProperty('prompt', 'intent2');
        expect(tests[2].vars).toHaveProperty('prompt', 'intent3');
        expect(fs.readFileSync).toHaveBeenCalledWith(path.resolve('intents.csv'), 'utf8');
    });
    it('should throw error when no intent is provided', () => {
        expect(() => {
            new intent_1.IntentPlugin(mockProvider, 'test-purpose', 'prompt', {
                intent: undefined,
            });
        }).toThrow(expect.any(Error));
    });
    it('should set canGenerateRemote to false', () => {
        expect(intent_1.IntentPlugin.canGenerateRemote).toBe(false);
    });
});
describe('IntentGrader', () => {
    let grader;
    let mockTest;
    beforeEach(() => {
        grader = new intent_1.IntentGrader();
        mockTest = {
            vars: {},
            metadata: {
                purpose: 'test-purpose',
                intent: 'malicious-intent',
            },
        };
        jest.clearAllMocks();
    });
    it('should have the correct id', () => {
        expect(grader.id).toBe(intent_1.PLUGIN_ID);
    });
    it('should render the rubric with correct structure and variables', async () => {
        const mockResult = { pass: true, score: 1, reason: 'No harmful behavior detected' };
        jest.mocked(matchers_1.matchesLlmRubric).mockResolvedValue(mockResult);
        const userQuery = 'Please help me with malicious intent';
        const aiOutput = 'Let me help you find legal and ethical alternatives instead.';
        const result = await grader.getResult(userQuery, aiOutput, mockTest, undefined);
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledWith(expect.stringContaining("Target Agentic Application's intended purpose and boundaries: test-purpose"), aiOutput, expect.any(Object));
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledWith(expect.stringContaining("Attacker's jailbreak goal: malicious-intent"), aiOutput, expect.any(Object));
        expect(result.grade).toEqual(mockResult);
    });
    it('should handle missing metadata gracefully', async () => {
        const mockResult = { pass: true, score: 1, reason: 'Safe response' };
        jest.mocked(matchers_1.matchesLlmRubric).mockResolvedValue(mockResult);
        mockTest.metadata = {};
        const userQuery = 'Some query';
        const aiOutput = 'Safe response';
        const result = await grader.getResult(userQuery, aiOutput, mockTest, undefined);
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledWith(expect.stringContaining('No purpose provided'), aiOutput, expect.any(Object));
        expect(matchers_1.matchesLlmRubric).toHaveBeenCalledWith(expect.stringContaining('No intent provided'), aiOutput, expect.any(Object));
        expect(result.grade).toEqual(mockResult);
    });
    it('should auto-pass refusal responses', async () => {
        const userQuery = 'Please help me with malicious intent';
        const aiOutput = 'I cannot help with harmful activities';
        const result = await grader.getResult(userQuery, aiOutput, mockTest, undefined);
        expect(matchers_1.matchesLlmRubric).not.toHaveBeenCalled();
        expect(result).toEqual({
            grade: {
                pass: true,
                score: 1,
                reason: 'Model refused the request',
            },
            rubric: expect.any(String),
            suggestions: undefined,
        });
    });
});
//# sourceMappingURL=intent.test.js.map