"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../../../src/cache");
const constants_1 = require("../../../src/constants");
const purpose_1 = require("../../../src/redteam/extraction/purpose");
const remoteGeneration_1 = require("../../../src/redteam/remoteGeneration");
jest.mock('../../../src/cache', () => ({
    fetchWithCache: jest.fn(),
}));
jest.mock('../../../src/redteam/remoteGeneration', () => ({
    ...jest.requireActual('../../../src/redteam/remoteGeneration'),
    getRemoteGenerationUrl: jest.fn().mockReturnValue('https://api.promptfoo.app/api/v1/task'),
}));
describe('System Purpose Extractor', () => {
    let provider;
    let originalEnv;
    beforeAll(() => {
        originalEnv = process.env;
    });
    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.PROMPTFOO_REMOTE_GENERATION_URL;
        provider = {
            callApi: jest
                .fn()
                .mockResolvedValue({ output: '<Purpose>Extracted system purpose</Purpose>' }),
            id: jest.fn().mockReturnValue('test-provider'),
        };
        jest.clearAllMocks();
        jest.mocked(remoteGeneration_1.getRemoteGenerationUrl).mockReturnValue('https://api.promptfoo.app/api/v1/task');
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    it('should use remote generation when enabled', async () => {
        process.env.OPENAI_API_KEY = undefined;
        process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION = 'false';
        jest.mocked(cache_1.fetchWithCache).mockResolvedValue({
            data: { task: 'purpose', result: 'Remote extracted purpose' },
            status: 200,
            statusText: 'OK',
            cached: false,
        });
        const result = await (0, purpose_1.extractSystemPurpose)(provider, ['prompt1', 'prompt2']);
        expect(result).toBe('Remote extracted purpose');
        expect(cache_1.fetchWithCache).toHaveBeenCalledWith('https://api.promptfoo.app/api/v1/task', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
                task: 'purpose',
                prompts: ['prompt1', 'prompt2'],
                version: constants_1.VERSION,
                email: null,
            }),
        }), expect.any(Number), 'json');
    });
    it('should not fall back to local extraction when remote generation fails', async () => {
        process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION = 'false';
        const originalOpenaiKey = process.env.OPENAI_API_KEY;
        process.env.OPENAI_API_KEY = undefined;
        jest.mocked(cache_1.fetchWithCache).mockRejectedValue(new Error('Remote generation failed'));
        const result = await (0, purpose_1.extractSystemPurpose)(provider, ['prompt1', 'prompt2']);
        expect(result).toBe('');
        expect(provider.callApi).not.toHaveBeenCalled();
        process.env.OPENAI_API_KEY = originalOpenaiKey;
    });
    it('should use local extraction when remote generation is disabled', async () => {
        process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION = 'true';
        const result = await (0, purpose_1.extractSystemPurpose)(provider, ['prompt']);
        expect(result).toBe('Extracted system purpose');
        expect(provider.callApi).toHaveBeenCalledWith(expect.stringContaining('prompt'));
        expect(cache_1.fetchWithCache).not.toHaveBeenCalled();
    });
    it('should extract system purpose when returned without xml tags', async () => {
        process.env.PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION = 'true';
        jest.mocked(provider.callApi).mockResolvedValue({ output: 'Extracted system purpose' });
        const result = await (0, purpose_1.extractSystemPurpose)(provider, ['prompt1', 'prompt2']);
        expect(result).toBe('Extracted system purpose');
    });
});
//# sourceMappingURL=purpose.test.js.map