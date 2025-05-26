"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGrader = void 0;
exports.createMockResponse = createMockResponse;
class TestGrader {
    async callApi() {
        return {
            output: JSON.stringify({ pass: true, reason: 'Test grading output' }),
            tokenUsage: { total: 10, prompt: 5, completion: 5 },
        };
    }
    id() {
        return 'TestGradingProvider';
    }
}
exports.TestGrader = TestGrader;
function createMockResponse(options = { ok: true }) {
    const isOk = options.ok ?? (options.status ? options.status < 400 : true);
    const mockResponse = {
        ok: isOk,
        status: options.status || (isOk ? 200 : 400),
        statusText: options.statusText || (isOk ? 'OK' : 'Bad Request'),
        headers: options.headers || new Headers(),
        redirected: false,
        type: 'basic',
        url: 'https://example.com',
        json: options.json || (() => Promise.resolve(options.body || {})),
        text: options.text || (() => Promise.resolve('')),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        formData: () => Promise.resolve(new FormData()),
        bodyUsed: false,
        body: null,
        clone() {
            return createMockResponse(options);
        },
    };
    return mockResponse;
}
//# sourceMappingURL=utils.js.map