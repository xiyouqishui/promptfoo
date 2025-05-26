"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = __importDefault(require("../package.json"));
const fetch_1 = require("../src/fetch");
const updates_1 = require("../src/updates");
jest.mock('../src/fetch', () => ({
    fetchWithTimeout: jest.fn(),
}));
jest.mock('../package.json', () => ({
    version: '0.11.0',
}));
describe('getLatestVersion', () => {
    it('should return the latest version of the package', async () => {
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ latestVersion: '1.1.0' }),
        });
        const latestVersion = await (0, updates_1.getLatestVersion)();
        expect(latestVersion).toBe('1.1.0');
    });
    it('should throw an error if the response is not ok', async () => {
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValueOnce({
            ok: false,
        });
        await expect((0, updates_1.getLatestVersion)()).rejects.toThrow('Failed to fetch package information for promptfoo');
    });
});
describe('checkForUpdates', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });
    afterEach(() => {
        jest.mocked(console.log).mockRestore();
    });
    it('should log an update message if a newer version is available - minor ver', async () => {
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ latestVersion: '1.1.0' }),
        });
        const result = await (0, updates_1.checkForUpdates)();
        expect(result).toBeTruthy();
    });
    it('should log an update message if a newer version is available - major ver', async () => {
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ latestVersion: '1.1.0' }),
        });
        const result = await (0, updates_1.checkForUpdates)();
        expect(result).toBeTruthy();
    });
    it('should not log an update message if the current version is up to date', async () => {
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ latestVersion: package_json_1.default.version }),
        });
        const result = await (0, updates_1.checkForUpdates)();
        expect(result).toBeFalsy();
    });
});
//# sourceMappingURL=updates.test.js.map