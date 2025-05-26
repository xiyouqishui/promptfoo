"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliState_1 = __importDefault(require("../../src/cliState"));
const envars_1 = require("../../src/envars");
const globalConfig_1 = require("../../src/globalConfig/globalConfig");
const remoteGeneration_1 = require("../../src/redteam/remoteGeneration");
jest.mock('../../src/envars');
jest.mock('../../src/envars');
jest.mock('../../src/cliState', () => ({
    remote: undefined,
}));
describe('shouldGenerateRemote', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        cliState_1.default.remote = undefined;
    });
    it('should return true when remote generation is not disabled and no OpenAI key exists', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(false);
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        expect((0, remoteGeneration_1.shouldGenerateRemote)()).toBe(true);
    });
    it('should return false when remote generation is disabled via env var', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(true);
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        expect((0, remoteGeneration_1.shouldGenerateRemote)()).toBe(false);
    });
    it('should return false when OpenAI key exists', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(false);
        jest.mocked(envars_1.getEnvString).mockReturnValue('sk-123');
        expect((0, remoteGeneration_1.shouldGenerateRemote)()).toBe(false);
    });
    it('should return false when remote generation is disabled via env var and OpenAI key exists', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(true);
        jest.mocked(envars_1.getEnvString).mockReturnValue('sk-123');
        expect((0, remoteGeneration_1.shouldGenerateRemote)()).toBe(false);
    });
    it('should return true when cliState.remote is true regardless of other conditions', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(true);
        jest.mocked(envars_1.getEnvString).mockReturnValue('sk-123');
        cliState_1.default.remote = true;
        expect((0, remoteGeneration_1.shouldGenerateRemote)()).toBe(true);
    });
});
describe('neverGenerateRemote', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should return true when PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION is set to true', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(true);
        expect((0, remoteGeneration_1.neverGenerateRemote)()).toBe(true);
    });
    it('should return false when PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION is set to false', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(false);
        expect((0, remoteGeneration_1.neverGenerateRemote)()).toBe(false);
    });
});
describe('getRemoteGenerationUrl', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should return env URL + /task when PROMPTFOO_REMOTE_GENERATION_URL is set', () => {
        jest.mocked(envars_1.getEnvString).mockReturnValue('https://custom.api.com/task');
        expect((0, remoteGeneration_1.getRemoteGenerationUrl)()).toBe('https://custom.api.com/task');
    });
    it('should return cloud API host + /task when cloud is enabled and no env URL is set', () => {
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
            cloud: {
                apiKey: 'some-api-key',
                apiHost: 'https://cloud.api.com',
            },
        });
        expect((0, remoteGeneration_1.getRemoteGenerationUrl)()).toBe('https://cloud.api.com/api/v1/task');
    });
    it('should return default URL when cloud is disabled and no env URL is set', () => {
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
            cloud: {
                apiKey: undefined,
                apiHost: 'https://cloud.api.com',
            },
        });
        expect((0, remoteGeneration_1.getRemoteGenerationUrl)()).toBe('https://api.promptfoo.app/api/v1/task');
    });
});
describe('getRemoteHealthUrl', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should return null when remote generation is disabled', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(true); // neverGenerateRemote = true
        expect((0, remoteGeneration_1.getRemoteHealthUrl)()).toBeNull();
    });
    it('should return modified env URL with /health path when PROMPTFOO_REMOTE_GENERATION_URL is set', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(false);
        jest.mocked(envars_1.getEnvString).mockReturnValue('https://custom.api.com/task');
        expect((0, remoteGeneration_1.getRemoteHealthUrl)()).toBe('https://custom.api.com/health');
    });
    it('should return default health URL when env URL is invalid', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(false);
        jest.mocked(envars_1.getEnvString).mockReturnValue('invalid-url');
        expect((0, remoteGeneration_1.getRemoteHealthUrl)()).toBe('https://api.promptfoo.app/health');
    });
    it('should return cloud API health URL when cloud is enabled', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(false);
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
            cloud: {
                apiKey: 'some-api-key',
                apiHost: 'https://cloud.api.com',
            },
        });
        expect((0, remoteGeneration_1.getRemoteHealthUrl)()).toBe('https://cloud.api.com/health');
    });
    it('should return default health URL when cloud is disabled', () => {
        jest.mocked(envars_1.getEnvBool).mockReturnValue(false);
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
            cloud: {
                apiKey: undefined,
                apiHost: 'https://cloud.api.com',
            },
        });
        expect((0, remoteGeneration_1.getRemoteHealthUrl)()).toBe('https://api.promptfoo.app/health');
    });
});
describe('getRemoteGenerationUrlForUnaligned', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('should return env URL when PROMPTFOO_UNALIGNED_INFERENCE_ENDPOINT is set', () => {
        jest.mocked(envars_1.getEnvString).mockReturnValue('https://custom.api.com/harmful');
        expect((0, remoteGeneration_1.getRemoteGenerationUrlForUnaligned)()).toBe('https://custom.api.com/harmful');
    });
    it('should return cloud API harmful URL when cloud is enabled', () => {
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
            cloud: {
                apiKey: 'some-api-key',
                apiHost: 'https://cloud.api.com',
            },
        });
        expect((0, remoteGeneration_1.getRemoteGenerationUrlForUnaligned)()).toBe('https://cloud.api.com/api/v1/task/harmful');
    });
    it('should return default harmful URL when cloud is disabled', () => {
        jest.mocked(envars_1.getEnvString).mockReturnValue('');
        jest.mocked(globalConfig_1.readGlobalConfig).mockReturnValue({
            cloud: {
                apiKey: undefined,
                apiHost: 'https://cloud.api.com',
            },
        });
        expect((0, remoteGeneration_1.getRemoteGenerationUrlForUnaligned)()).toBe('https://api.promptfoo.app/api/v1/task/harmful');
    });
});
//# sourceMappingURL=remoteGeneration.test.js.map