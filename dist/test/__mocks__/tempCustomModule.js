"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CustomApiProvider {
    id() {
        return 'custom-api-provider';
    }
    async callApi(prompt) {
        return {
            output: 'Custom output',
            tokenUsage: { total: 10, prompt: 5, completion: 5 },
        };
    }
}
exports.default = CustomApiProvider;
//# sourceMappingURL=tempCustomModule.js.map