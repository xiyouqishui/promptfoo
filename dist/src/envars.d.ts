import 'dotenv/config';
import type { EnvOverrides } from './types/env';
export type EnvVars = {
    LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
    NODE_ENV?: string;
    npm_execpath?: string;
    npm_lifecycle_script?: string;
    PROMPTFOO_CACHE_ENABLED?: boolean;
    PROMPTFOO_DISABLE_AJV_STRICT_MODE?: boolean;
    PROMPTFOO_DISABLE_CONVERSATION_VAR?: boolean;
    PROMPTFOO_DISABLE_ERROR_LOG?: boolean;
    PROMPTFOO_DISABLE_JSON_AUTOESCAPE?: boolean;
    PROMPTFOO_DISABLE_MULTIMEDIA_AS_BASE64?: boolean;
    PROMPTFOO_DISABLE_PDF_AS_TEXT?: boolean;
    PROMPTFOO_DISABLE_REDTEAM_MODERATION?: boolean;
    PROMPTFOO_DISABLE_REDTEAM_PURPOSE_DISCOVERY_AGENT?: boolean;
    PROMPTFOO_DISABLE_REDTEAM_REMOTE_GENERATION?: boolean;
    PROMPTFOO_DISABLE_REF_PARSER?: boolean;
    PROMPTFOO_DISABLE_SHARE_EMAIL_REQUEST?: boolean;
    PROMPTFOO_DISABLE_SHARE_WARNING?: boolean;
    PROMPTFOO_DISABLE_SHARING?: boolean;
    PROMPTFOO_DISABLE_TELEMETRY?: boolean;
    PROMPTFOO_DISABLE_TEMPLATE_ENV_VARS?: boolean;
    PROMPTFOO_DISABLE_TEMPLATING?: boolean;
    PROMPTFOO_DISABLE_UPDATE?: boolean;
    PROMPTFOO_DISABLE_VAR_EXPANSION?: boolean;
    PROMPTFOO_ENABLE_DATABASE_LOGS?: boolean;
    PROMPTFOO_EVAL_TIMEOUT_MS?: number;
    PROMPTFOO_EXPERIMENTAL?: boolean;
    PROMPTFOO_NO_TESTCASE_ASSERT_WARNING?: boolean;
    PROMPTFOO_RETRY_5XX?: boolean;
    PROMPTFOO_SELF_HOSTED?: boolean;
    PROMPTFOO_SHORT_CIRCUIT_TEST_FAILURES?: boolean;
    PROMPTFOO_STRICT_FILES?: boolean;
    PROMPTFOO_STRIP_GRADING_RESULT?: boolean;
    PROMPTFOO_STRIP_METADATA?: boolean;
    PROMPTFOO_STRIP_PROMPT_TEXT?: boolean;
    PROMPTFOO_STRIP_RESPONSE_OUTPUT?: boolean;
    PROMPTFOO_STRIP_TEST_VARS?: boolean;
    PROMPTFOO_TELEMETRY_DEBUG?: boolean;
    PROMPTFOO_ASSERTIONS_MAX_CONCURRENCY?: number;
    PROMPTFOO_AUTHOR?: string;
    PROMPTFOO_CACHE_MAX_FILE_COUNT?: number;
    PROMPTFOO_CACHE_MAX_SIZE?: number;
    PROMPTFOO_CACHE_PATH?: string;
    PROMPTFOO_CACHE_TTL?: number;
    PROMPTFOO_CACHE_TYPE?: 'memory' | 'disk';
    PROMPTFOO_CLOUD_API_URL?: string;
    PROMPTFOO_CONFIG_DIR?: string;
    PROMPTFOO_CSV_DELIMITER?: string;
    PROMPTFOO_CSV_STRICT?: boolean;
    PROMPTFOO_DELAY_MS?: number;
    PROMPTFOO_FAILED_TEST_EXIT_CODE?: number;
    PROMPTFOO_INSECURE_SSL?: boolean | string;
    PROMPTFOO_JAILBREAK_TEMPERATURE?: string;
    PROMPTFOO_LOG_DIR?: string;
    PROMPTFOO_MAX_HARMFUL_TESTS_PER_REQUEST?: number;
    PROMPTFOO_NUM_JAILBREAK_ITERATIONS?: string;
    PROMPTFOO_PASS_RATE_THRESHOLD?: number;
    PROMPTFOO_PROMPT_SEPARATOR?: string;
    PROMPTFOO_PYTHON?: string;
    PROMPTFOO_REMOTE_API_BASE_URL?: string;
    PROMPTFOO_REMOTE_APP_BASE_URL?: string;
    PROMPTFOO_REMOTE_GENERATION_URL?: string;
    PROMPTFOO_REQUEST_BACKOFF_MS?: number;
    PROMPTFOO_REQUIRE_JSON_PROMPTS?: boolean;
    PROMPTFOO_SHARING_APP_BASE_URL?: string;
    PROMPTFOO_SHARE_CHUNK_SIZE?: number;
    PROMPTFOO_UNALIGNED_INFERENCE_ENDPOINT?: string;
    PROMPTFOO_CA_CERT_PATH?: string;
    ALL_PROXY?: string;
    all_proxy?: string;
    HTTP_PROXY?: string;
    http_proxy?: string;
    HTTPS_PROXY?: string;
    https_proxy?: string;
    NO_PROXY?: string;
    no_proxy?: string;
    API_HOST?: string;
    API_PORT?: string | number;
    DISPLAY?: string;
    IS_TESTING?: string | boolean;
    JEST_WORKER_ID?: string;
    NODE_EXTRA_CA_CERTS?: string;
    NODE_TLS_REJECT_UNAUTHORIZED?: string;
    REQUEST_TIMEOUT_MS?: number;
    RESULT_HISTORY_LENGTH?: number;
    WEBHOOK_TIMEOUT?: number;
    PROMPTFOO_POSTHOG_KEY?: string;
    PROMPTFOO_POSTHOG_HOST?: string;
    /**
     * @deprecated Use PROMPTFOO_REMOTE_APP_BASE_URL instead
     */
    NEXT_PUBLIC_PROMPTFOO_BASE_URL?: string;
    /**
     * @deprecated Use PROMPTFOO_REMOTE_API_BASE_URL instead
     */
    NEXT_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL?: string;
    VITE_PUBLIC_BASENAME?: string;
    VITE_PUBLIC_PROMPTFOO_APP_SHARE_URL?: string;
    VITE_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL?: string;
    VITE_PUBLIC_PROMPTFOO_SHARE_API_URL?: string;
    APPVEYOR?: boolean;
    BITBUCKET_COMMIT?: boolean;
    BUDDY?: boolean;
    BUILDKITE?: boolean;
    CI?: boolean;
    CIRCLECI?: boolean;
    CODEBUILD_BUILD_ID?: boolean;
    GITHUB_ACTIONS?: boolean;
    GITLAB_CI?: boolean;
    JENKINS?: boolean;
    TEAMCITY_VERSION?: boolean;
    TF_BUILD?: boolean;
    TRAVIS?: boolean;
    AI21_API_BASE_URL?: string;
    AI21_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_MAX_TOKENS?: number;
    ANTHROPIC_STOP?: string;
    ANTHROPIC_TEMPERATURE?: number;
    AWS_BEDROCK_FREQUENCY_PENALTY?: string;
    AWS_BEDROCK_MAX_GEN_LEN?: number;
    AWS_BEDROCK_MAX_NEW_TOKENS?: number;
    AWS_BEDROCK_MAX_RETRIES?: string;
    AWS_BEDROCK_MAX_TOKENS?: string;
    AWS_BEDROCK_PRESENCE_PENALTY?: string;
    AWS_BEDROCK_REGION?: string;
    AWS_BEDROCK_STOP?: string;
    AWS_BEDROCK_TEMPERATURE?: number;
    AWS_BEDROCK_TOP_P?: string;
    CEREBRAS_API_KEY?: string;
    AZURE_AUTHORITY_HOST?: string;
    AZURE_CLIENT_ID?: string;
    AZURE_CLIENT_SECRET?: string;
    AZURE_DEPLOYMENT_NAME?: string;
    AZURE_EMBEDDING_DEPLOYMENT_NAME?: string;
    AZURE_OPENAI_DEPLOYMENT_NAME?: string;
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME?: string;
    AZURE_TENANT_ID?: string;
    AZURE_TOKEN_SCOPE?: string;
    AZURE_CONTENT_SAFETY_API_KEY?: string;
    AZURE_CONTENT_SAFETY_API_VERSION?: string;
    AZURE_CONTENT_SAFETY_ENDPOINT?: string;
    COHERE_CLIENT_NAME?: string;
    COHERE_K?: string;
    COHERE_MAX_TOKENS?: string;
    COHERE_P?: string;
    COHERE_TEMPERATURE?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_KEY?: string;
    CDP_DOMAIN?: string;
    FAL_KEY?: string;
    GROQ_API_KEY?: string;
    HELICONE_API_KEY?: string;
    /** @deprecated Use HF_TOKEN instead */
    HF_API_TOKEN?: string;
    HF_TOKEN?: string;
    LANGFUSE_HOST?: string;
    LANGFUSE_PUBLIC_KEY?: string;
    LANGFUSE_SECRET_KEY?: string;
    LLAMA_BASE_URL?: string;
    LOCALAI_BASE_URL?: string;
    LOCALAI_TEMPERATURE?: number;
    MISTRAL_MAX_TOKENS?: string;
    MISTRAL_TEMPERATURE?: string;
    MISTRAL_TOP_K?: string;
    MISTRAL_TOP_P?: string;
    OLLAMA_API_KEY?: string;
    OLLAMA_BASE_URL?: string;
    OPENAI_API_KEY?: string;
    OPENAI_BEST_OF?: number;
    OPENAI_FREQUENCY_PENALTY?: number;
    OPENAI_MAX_COMPLETION_TOKENS?: number;
    OPENAI_MAX_TOKENS?: number;
    OPENAI_PRESENCE_PENALTY?: number;
    OPENAI_STOP?: string;
    OPENAI_TEMPERATURE?: number;
    OPENAI_TOP_P?: number;
    OPENROUTER_API_KEY?: string;
    PORTKEY_API_BASE_URL?: string;
    PORTKEY_API_KEY?: string;
    REPLICATE_MAX_LENGTH?: number;
    REPLICATE_MAX_NEW_TOKENS?: number;
    REPLICATE_REPETITION_PENALTY?: number;
    REPLICATE_SEED?: number;
    REPLICATE_STOP_SEQUENCES?: string;
    REPLICATE_SYSTEM_PROMPT?: string;
    REPLICATE_TEMPERATURE?: number;
    REPLICATE_TOP_K?: number;
    REPLICATE_TOP_P?: number;
    TOGETHER_API_KEY?: string;
    VERTEX_API_VERSION?: string;
    VOYAGE_API_BASE_URL?: string;
    VOYAGE_API_KEY?: string;
    WATSONX_AI_APIKEY?: string;
    WATSONX_AI_AUTH_TYPE?: string;
    WATSONX_AI_BEARER_TOKEN?: string;
    WATSONX_AI_PROJECT_ID?: string;
    WITHPI_API_KEY?: string;
} & EnvOverrides;
export type EnvVarKey = keyof EnvVars;
/**
 * Get an environment variable.
 * @param key The name of the environment variable.
 * @param defaultValue Optional default value if the environment variable is not set.
 * @returns The value of the environment variable, or the default value if provided.
 */
export declare function getEnvString(key: EnvVarKey): string | undefined;
export declare function getEnvString(key: EnvVarKey, defaultValue: string): string;
/**
 * Get a boolean environment variable.
 * @param key The name of the environment variable.
 * @param defaultValue Optional default value if the environment variable is not set.
 * @returns The boolean value of the environment variable, or the default value if provided.
 */
export declare function getEnvBool(key: EnvVarKey, defaultValue?: boolean): boolean;
/**
 * Get an integer environment variable.
 * @param key The name of the environment variable.
 * @param defaultValue Optional default value if the environment variable is not set.
 * @returns The integer value of the environment variable, or the default value if provided.
 */
export declare function getEnvInt(key: EnvVarKey): number | undefined;
export declare function getEnvInt(key: EnvVarKey, defaultValue: number): number;
/**
 * Get a float environment variable.
 * @param key The name of the environment variable.
 * @param defaultValue Optional default value if the environment variable is not set.
 * @returns The float value of the environment variable, or the default value if provided.
 */
export declare function getEnvFloat(key: EnvVarKey): number | undefined;
export declare function getEnvFloat(key: EnvVarKey, defaultValue: number): number;
/**
 * Get the evaluation timeout in milliseconds.
 * @param defaultValue Optional default value if the environment variable is not set. Defaults to 0 (no timeout).
 * @returns The timeout value in milliseconds, or the default value if not set.
 */
export declare function getEvalTimeoutMs(defaultValue?: number): number;
/**
 * Check if the application is running in a CI environment.
 * @returns True if running in a CI environment, false otherwise.
 */
export declare function isCI(): boolean;
//# sourceMappingURL=envars.d.ts.map