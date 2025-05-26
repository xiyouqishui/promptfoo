"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadApiProvider = loadApiProvider;
exports.loadApiProviders = loadApiProviders;
const chalk_1 = __importDefault(require("chalk"));
const dedent_1 = __importDefault(require("dedent"));
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
const cliState_1 = __importDefault(require("../cliState"));
const constants_1 = require("../constants");
const logger_1 = __importDefault(require("../logger"));
const cloud_1 = require("../util/cloud");
const invariant_1 = __importDefault(require("../util/invariant"));
const templates_1 = require("../util/templates");
const registry_1 = require("./registry");
// FIXME(ian): Make loadApiProvider handle all the different provider types (string, ProviderOptions, ApiProvider, etc), rather than the callers.
async function loadApiProvider(providerPath, context = {}) {
    const { options = {}, basePath, env } = context;
    const providerOptions = {
        id: options.id,
        config: {
            ...options.config,
            basePath,
        },
        env,
    };
    const renderedProviderPath = (0, templates_1.getNunjucksEngine)().renderString(providerPath, {});
    if (renderedProviderPath.startsWith(constants_1.CLOUD_PROVIDER_PREFIX)) {
        const cloudDatabaseId = renderedProviderPath.slice(constants_1.CLOUD_PROVIDER_PREFIX.length);
        const provider = await (0, cloud_1.getProviderFromCloud)(cloudDatabaseId);
        if (provider.id.startsWith(constants_1.CLOUD_PROVIDER_PREFIX)) {
            throw new Error(`This cloud provider ${cloudDatabaseId} points to another cloud provider: ${provider.id}. This is not allowed. A cloud provider should point to a specific provider, not another cloud provider.`);
        }
        return loadApiProvider(provider.id, { ...context, options: provider });
    }
    if (renderedProviderPath.startsWith('file://') &&
        (renderedProviderPath.endsWith('.yaml') ||
            renderedProviderPath.endsWith('.yml') ||
            renderedProviderPath.endsWith('.json'))) {
        const filePath = renderedProviderPath.slice('file://'.length);
        const modulePath = path_1.default.isAbsolute(filePath)
            ? filePath
            : path_1.default.join(basePath || process.cwd(), filePath);
        const fileContent = js_yaml_1.default.load(fs_1.default.readFileSync(modulePath, 'utf8'));
        (0, invariant_1.default)(fileContent, `Provider config ${filePath} is undefined`);
        // If fileContent is an array, it contains multiple providers
        if (Array.isArray(fileContent)) {
            // This is handled by loadApiProviders, so we'll throw an error here
            throw new Error(`Multiple providers found in ${filePath}. Use loadApiProviders instead of loadApiProvider.`);
        }
        (0, invariant_1.default)(fileContent.id, `Provider config ${filePath} must have an id`);
        logger_1.default.info(`Loaded provider ${fileContent.id} from ${filePath}`);
        return loadApiProvider(fileContent.id, { ...context, options: fileContent });
    }
    for (const factory of registry_1.providerMap) {
        if (factory.test(renderedProviderPath)) {
            const ret = await factory.create(renderedProviderPath, providerOptions, context);
            ret.transform = options.transform;
            ret.delay = options.delay;
            ret.label || (ret.label = (0, templates_1.getNunjucksEngine)().renderString(String(options.label || ''), {}));
            return ret;
        }
    }
    const errorMessage = (0, dedent_1.default) `
    Could not identify provider: ${chalk_1.default.bold(providerPath)}.

    ${chalk_1.default.white((0, dedent_1.default) `
      Please check your configuration and ensure the provider is correctly specified.

      For more information on supported providers, visit: `)} ${chalk_1.default.cyan('https://promptfoo.dev/docs/providers/')}
  `;
    logger_1.default.error(errorMessage);
    throw new Error(errorMessage);
}
/**
 * Helper function to load providers from a file path.
 * This can handle both single provider and multiple providers in a file.
 */
async function loadProvidersFromFile(filePath, options = {}) {
    const { basePath, env } = options;
    const relativePath = filePath.slice('file://'.length);
    const modulePath = path_1.default.isAbsolute(relativePath)
        ? relativePath
        : path_1.default.join(basePath || process.cwd(), relativePath);
    const fileContent = js_yaml_1.default.load(fs_1.default.readFileSync(modulePath, 'utf8'));
    (0, invariant_1.default)(fileContent, `Provider config ${relativePath} is undefined`);
    const configs = [fileContent].flat();
    return Promise.all(configs.map((config) => {
        (0, invariant_1.default)(config.id, `Provider config in ${relativePath} must have an id`);
        return loadApiProvider(config.id, { options: config, basePath, env });
    }));
}
async function loadApiProviders(providerPaths, options = {}) {
    const { basePath } = options;
    const env = {
        ...cliState_1.default.config?.env,
        ...options.env,
    };
    if (typeof providerPaths === 'string') {
        // Check if the string path points to a file
        if (providerPaths.startsWith('file://') &&
            (providerPaths.endsWith('.yaml') ||
                providerPaths.endsWith('.yml') ||
                providerPaths.endsWith('.json'))) {
            return loadProvidersFromFile(providerPaths, { basePath, env });
        }
        return [await loadApiProvider(providerPaths, { basePath, env })];
    }
    else if (typeof providerPaths === 'function') {
        return [
            {
                id: () => 'custom-function',
                callApi: providerPaths,
            },
        ];
    }
    else if (Array.isArray(providerPaths)) {
        const providersArrays = await Promise.all(providerPaths.map(async (provider, idx) => {
            if (typeof provider === 'string') {
                if (provider.startsWith('file://') &&
                    (provider.endsWith('.yaml') || provider.endsWith('.yml') || provider.endsWith('.json'))) {
                    return loadProvidersFromFile(provider, { basePath, env });
                }
                return [await loadApiProvider(provider, { basePath, env })];
            }
            if (typeof provider === 'function') {
                return [
                    {
                        id: provider.label ? () => provider.label : () => `custom-function-${idx}`,
                        callApi: provider,
                    },
                ];
            }
            if (provider.id) {
                // List of ProviderConfig objects
                return [
                    await loadApiProvider(provider.id, {
                        options: provider,
                        basePath,
                        env,
                    }),
                ];
            }
            // List of { id: string, config: ProviderConfig } objects
            const id = Object.keys(provider)[0];
            const providerObject = provider[id];
            const context = { ...providerObject, id: providerObject.id || id };
            return [await loadApiProvider(id, { options: context, basePath, env })];
        }));
        return providersArrays.flat();
    }
    throw new Error('Invalid providers list');
}
//# sourceMappingURL=index.js.map