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
exports.AzureGenericProvider = void 0;
const envars_1 = require("../../envars");
const logger_1 = __importDefault(require("../../logger"));
const util_1 = require("./util");
class AzureGenericProvider {
    constructor(deploymentName, options = {}) {
        this.initializationPromise = null;
        const { config, id, env } = options;
        this.env = env;
        this.deploymentName = deploymentName;
        this.apiHost =
            config?.apiHost ||
                // These and similar OPENAI envars: Backwards compatibility for Azure rename 2024-11-09 / 0.96.0
                env?.AZURE_API_HOST ||
                env?.AZURE_OPENAI_API_HOST ||
                (0, envars_1.getEnvString)('AZURE_API_HOST') ||
                (0, envars_1.getEnvString)('AZURE_OPENAI_API_HOST');
        this.apiBaseUrl =
            config?.apiBaseUrl ||
                env?.AZURE_API_BASE_URL ||
                env?.AZURE_OPENAI_API_BASE_URL ||
                env?.AZURE_OPENAI_BASE_URL ||
                (0, envars_1.getEnvString)('AZURE_API_BASE_URL') ||
                (0, envars_1.getEnvString)('AZURE_OPENAI_API_BASE_URL') ||
                (0, envars_1.getEnvString)('AZURE_OPENAI_BASE_URL');
        this.config = config || {};
        this.id = id ? () => id : this.id;
        this.initializationPromise = this.initialize();
    }
    async initialize() {
        this.authHeaders = await this.getAuthHeaders();
    }
    async ensureInitialized() {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
    }
    getApiKey() {
        return (this.config?.apiKey ||
            (this.config?.apiKeyEnvar
                ? (0, envars_1.getEnvString)(this.config.apiKeyEnvar) ||
                    this.env?.[this.config.apiKeyEnvar]
                : undefined) ||
            this.env?.AZURE_API_KEY ||
            (0, envars_1.getEnvString)('AZURE_API_KEY') ||
            this.env?.AZURE_OPENAI_API_KEY ||
            (0, envars_1.getEnvString)('AZURE_OPENAI_API_KEY'));
    }
    getApiKeyOrThrow() {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            (0, util_1.throwConfigurationError)('Azure API key must be set.');
        }
        return apiKey;
    }
    async getAzureTokenCredential() {
        const clientSecret = this.config?.azureClientSecret ||
            this.env?.AZURE_CLIENT_SECRET ||
            (0, envars_1.getEnvString)('AZURE_CLIENT_SECRET');
        const clientId = this.config?.azureClientId || this.env?.AZURE_CLIENT_ID || (0, envars_1.getEnvString)('AZURE_CLIENT_ID');
        const tenantId = this.config?.azureTenantId || this.env?.AZURE_TENANT_ID || (0, envars_1.getEnvString)('AZURE_TENANT_ID');
        const authorityHost = this.config?.azureAuthorityHost ||
            this.env?.AZURE_AUTHORITY_HOST ||
            (0, envars_1.getEnvString)('AZURE_AUTHORITY_HOST');
        const { ClientSecretCredential, AzureCliCredential } = await Promise.resolve().then(() => __importStar(require('@azure/identity')));
        if (clientSecret && clientId && tenantId) {
            const credential = new ClientSecretCredential(tenantId, clientId, clientSecret, {
                authorityHost: authorityHost || 'https://login.microsoftonline.com',
            });
            return credential;
        }
        // Fallback to Azure CLI
        const credential = new AzureCliCredential();
        return credential;
    }
    async getAccessToken() {
        const credential = await this.getAzureTokenCredential();
        const tokenScope = this.config?.azureTokenScope ||
            this.env?.AZURE_TOKEN_SCOPE ||
            (0, envars_1.getEnvString)('AZURE_TOKEN_SCOPE');
        const tokenResponse = await credential.getToken(tokenScope || 'https://cognitiveservices.azure.com/.default');
        if (!tokenResponse) {
            (0, util_1.throwConfigurationError)('Failed to retrieve access token.');
        }
        return tokenResponse.token;
    }
    async getAuthHeaders() {
        const apiKey = this.getApiKey();
        if (apiKey) {
            return { 'api-key': apiKey };
        }
        else {
            try {
                const token = await this.getAccessToken();
                return { Authorization: 'Bearer ' + token };
            }
            catch (err) {
                logger_1.default.info(`Azure Authentication failed. Please check your credentials: ${err}`);
                throw new Error(`Azure Authentication failed. 
Please choose one of the following options:
  1. Set an API key via the AZURE_API_KEY environment variable.
  2. Provide client credentials (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID).
  3. Authenticate with Azure CLI using az login.
    `);
            }
        }
    }
    getApiBaseUrl() {
        if (this.apiBaseUrl) {
            return this.apiBaseUrl.replace(/\/$/, '');
        }
        const host = this.apiHost?.replace(/^(https?:\/\/)/, '').replace(/\/$/, '');
        if (!host) {
            return undefined;
        }
        return `https://${host}`;
    }
    id() {
        return `azure:${this.deploymentName}`;
    }
    toString() {
        return `[Azure Provider ${this.deploymentName}]`;
    }
    // @ts-ignore: Params are not used in this implementation
    async callApi(prompt, context, callApiOptions) {
        throw new Error('Not implemented');
    }
}
exports.AzureGenericProvider = AzureGenericProvider;
//# sourceMappingURL=generic.js.map