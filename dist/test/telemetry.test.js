"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = __importDefault(require("../package.json"));
const cliState_1 = __importDefault(require("../src/cliState"));
const fetch_1 = require("../src/fetch");
const telemetry_1 = require("../src/telemetry");
jest.mock('../src/fetch', () => ({
    fetchWithTimeout: jest.fn(),
}));
jest.mock('../package.json', () => ({
    version: '1.0.0',
}));
jest.mock('../src/cliState', () => ({
    __esModule: true,
    default: {
        config: undefined,
    },
}));
jest.mock('../src/envars', () => ({
    ...jest.requireActual('../src/envars'),
    getEnvBool: jest.fn().mockImplementation((key) => {
        if (key === 'PROMPTFOO_DISABLE_TELEMETRY') {
            return process.env.PROMPTFOO_DISABLE_TELEMETRY === '1';
        }
        if (key === 'IS_TESTING') {
            return false;
        }
        return false;
    }),
    getEnvString: jest.fn().mockImplementation((key) => {
        if (key === 'PROMPTFOO_POSTHOG_KEY') {
            return process.env.PROMPTFOO_POSTHOG_KEY || 'test-key';
        }
        if (key === 'PROMPTFOO_POSTHOG_HOST') {
            return process.env.PROMPTFOO_POSTHOG_HOST || undefined;
        }
        if (key === 'NODE_ENV') {
            return process.env.NODE_ENV || undefined;
        }
        return undefined;
    }),
    isCI: jest.fn().mockReturnValue(false),
}));
describe('Telemetry', () => {
    let originalEnv;
    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
        jest.mocked(fetch_1.fetchWithTimeout).mockClear();
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    it('should record only the "telemetry disabled" event when telemetry is disabled', () => {
        process.env.PROMPTFOO_DISABLE_TELEMETRY = '1';
        const telemetry = new telemetry_1.Telemetry();
        telemetry.record('eval_ran', { foo: 'bar' });
        expect(telemetry['events']).toHaveLength(1);
        expect(telemetry['events'][0]).toEqual({
            event: 'feature_used',
            packageVersion: package_json_1.default.version,
            properties: { feature: 'telemetry disabled' },
        });
    });
    it('should record events when telemetry is enabled', () => {
        delete process.env.PROMPTFOO_DISABLE_TELEMETRY;
        const telemetry = new telemetry_1.Telemetry();
        telemetry.record('eval_ran', { foo: 'bar' });
        expect(telemetry['events']).toHaveLength(1);
        expect(telemetry['events'][0]).toEqual({
            event: 'eval_ran',
            packageVersion: package_json_1.default.version,
            properties: { foo: 'bar', isRunningInCi: false, isRedteam: false },
        });
    });
    it('should send events and clear events array when telemetry is enabled and send is called', async () => {
        delete process.env.PROMPTFOO_DISABLE_TELEMETRY;
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue({ ok: true });
        const telemetry = new telemetry_1.Telemetry();
        telemetry.record('eval_ran', { foo: 'bar' });
        await telemetry.send();
        expect(fetch_1.fetchWithTimeout).toHaveBeenCalledWith('https://api.promptfoo.dev/telemetry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    event: 'eval_ran',
                    packageVersion: '1.0.0',
                    properties: { foo: 'bar', isRedteam: false, isRunningInCi: false },
                },
            ]),
        }, 1000);
        expect(telemetry['events']).toHaveLength(0);
    });
    it('should send only the "telemetry disabled" event when telemetry is disabled and send is called', async () => {
        process.env.PROMPTFOO_DISABLE_TELEMETRY = '1';
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue({ ok: true });
        const telemetry = new telemetry_1.Telemetry();
        telemetry.record('eval_ran', { foo: 'bar' });
        await telemetry.send();
        expect(fetch_1.fetchWithTimeout).toHaveBeenCalledWith('https://api.promptfoo.dev/telemetry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    event: 'feature_used',
                    packageVersion: '1.0.0',
                    properties: { feature: 'telemetry disabled' },
                },
            ]),
        }, 1000);
        expect(telemetry['events']).toHaveLength(0);
    });
    it('should send telemetry disabled event only once', async () => {
        process.env.PROMPTFOO_DISABLE_TELEMETRY = '1';
        jest.mocked(fetch_1.fetchWithTimeout).mockResolvedValue({ ok: true });
        const telemetry = new telemetry_1.Telemetry();
        telemetry.record('eval_ran', { foo: 'bar' });
        await telemetry.send();
        expect(fetch_1.fetchWithTimeout).toHaveBeenCalledTimes(1);
        expect(fetch_1.fetchWithTimeout).toHaveBeenCalledWith('https://api.promptfoo.dev/telemetry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    event: 'feature_used',
                    packageVersion: '1.0.0',
                    properties: { feature: 'telemetry disabled' },
                },
            ]),
        }, 1000);
        // Record another event and send again
        telemetry.record('command_used', { command: 'test' });
        await telemetry.send();
        // Ensure fetchWithTimeout was not called again
        expect(fetch_1.fetchWithTimeout).toHaveBeenCalledTimes(1);
    });
    it('should include isRedteam: true when redteam configuration is present', () => {
        delete process.env.PROMPTFOO_DISABLE_TELEMETRY;
        // Mock cliState with redteam configuration
        cliState_1.default.config = { redteam: {} };
        const telemetry = new telemetry_1.Telemetry();
        telemetry.record('eval_ran', { foo: 'bar' });
        expect(telemetry['events']).toHaveLength(1);
        expect(telemetry['events'][0]).toEqual({
            event: 'eval_ran',
            packageVersion: package_json_1.default.version,
            properties: { foo: 'bar', isRunningInCi: false, isRedteam: true },
        });
        // Clean up
        cliState_1.default.config = undefined;
    });
});
//# sourceMappingURL=telemetry.test.js.map