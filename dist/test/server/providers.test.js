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
const supertest_1 = __importDefault(require("supertest"));
const httpProvider = __importStar(require("../../src/providers/http"));
const server_1 = require("../../src/server/server");
const utils_1 = require("../util/utils");
describe('providersRouter', () => {
    const app = (0, server_1.createApp)();
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });
    it('should parse and load the provider with JSON body', async () => {
        const mockCallApi = jest.fn().mockResolvedValue({ output: 'Mocked response' });
        jest.spyOn(httpProvider.HttpProvider.prototype, 'callApi').mockImplementation(mockCallApi);
        jest.mocked(fetch).mockResolvedValue((0, utils_1.createMockResponse)({
            json: jest.fn().mockResolvedValue({
                changes_needed: true,
                changes_needed_reason: 'Test reason',
                changes_needed_suggestions: ['Test suggestion 1', 'Test suggestion 2'],
            }),
        }));
        const testProvider = {
            id: 'http://example.com/api',
            config: {
                url: 'http://example.com/api',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { key: '{{ prompt }}' },
            },
        };
        const res = await (0, supertest_1.default)(app).post('/api/providers/test').send(testProvider);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            providerResponse: {
                output: 'Mocked response',
            },
            testResult: {
                changes_needed: true,
                changes_needed_reason: 'Test reason',
                changes_needed_suggestions: ['Test suggestion 1', 'Test suggestion 2'],
            },
        });
    });
    it('should parse and load the provider with YAML body', async () => {
        const mockCallApi = jest.fn().mockResolvedValue({ output: 'Mocked response' });
        jest.spyOn(httpProvider.HttpProvider.prototype, 'callApi').mockImplementation(mockCallApi);
        jest.mocked(fetch).mockResolvedValue((0, utils_1.createMockResponse)({
            json: jest.fn().mockResolvedValue({
                changes_needed: false,
            }),
        }));
        const testProvider = {
            id: 'http://example.com/api',
            config: {
                url: 'http://example.com/api',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: `
          messages:
            - role: user
              content: "{{ prompt }}"
        `,
            },
        };
        const res = await (0, supertest_1.default)(app).post('/api/providers/test').send(testProvider);
        expect(res.status).toBe(200);
        expect(res.body.providerResponse.output).toBe('Mocked response');
        expect(mockCallApi).toHaveBeenCalledWith('Hello, world!', expect.any(Object));
    });
    it('should handle non-JSON content types correctly', async () => {
        const mockCallApi = jest.fn().mockResolvedValue({ output: 'Mocked response' });
        jest.spyOn(httpProvider.HttpProvider.prototype, 'callApi').mockImplementation(mockCallApi);
        jest.mocked(fetch).mockResolvedValue((0, utils_1.createMockResponse)({
            json: jest.fn().mockResolvedValue({
                changes_needed: false,
            }),
        }));
        const testProvider = {
            id: 'http://example.com/api',
            config: {
                url: 'http://example.com/api',
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: 'Raw text body with {{ prompt }}',
            },
        };
        const res = await (0, supertest_1.default)(app).post('/api/providers/test').send(testProvider);
        expect(res.status).toBe(200);
        expect(res.body.providerResponse.output).toBe('Mocked response');
    });
});
//# sourceMappingURL=providers.test.js.map