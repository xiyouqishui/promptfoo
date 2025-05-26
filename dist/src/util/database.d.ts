import { type EvalWithMetadata, type EvaluateTable, type PromptWithMetadata, type ResultsFile, type TestCase, type TestCasesWithMetadata, type UnifiedConfig, type CompletedPrompt, type EvaluateSummaryV2 } from '../types';
export declare function writeResultsToDatabase(results: EvaluateSummaryV2, config: Partial<UnifiedConfig>, createdAt?: Date): Promise<string>;
export declare function readResult(id: string): Promise<{
    id: string;
    result: ResultsFile;
    createdAt: Date;
} | undefined>;
export declare function updateResult(id: string, newConfig?: Partial<UnifiedConfig>, newTable?: EvaluateTable): Promise<void>;
export declare function getLatestEval(filterDescription?: string): Promise<ResultsFile | undefined>;
export declare function getPromptsWithPredicate(predicate: (result: ResultsFile) => boolean, limit: number): Promise<PromptWithMetadata[]>;
export declare function getPromptsForTestCasesHash(testCasesSha256: string, limit?: number): Promise<PromptWithMetadata[]>;
export declare function getPromptsForTestCases(testCases: TestCase[]): Promise<PromptWithMetadata[]>;
export declare function getTestCasesWithPredicate(predicate: (result: ResultsFile) => boolean, limit: number): Promise<TestCasesWithMetadata[]>;
export declare function getPrompts(limit?: number): Promise<PromptWithMetadata[]>;
export declare function getTestCases(limit?: number): Promise<{
    id: string;
    prompts: {
        prompt: {
            provider: string;
            raw: string;
            label: string;
            function?: ((args_0: {
                vars: Record<string, any>;
                provider?: import("../types").ApiProvider | undefined;
            }, ...args: unknown[]) => Promise<any>) | undefined;
            id?: string | undefined;
            config?: any;
            display?: string | undefined;
            metrics?: {
                cost: number;
                tokenUsage: {
                    prompt?: number | undefined;
                    completion?: number | undefined;
                    cached?: number | undefined;
                    total?: number | undefined;
                    numRequests?: number | undefined;
                    completionDetails?: {
                        reasoning?: number | undefined;
                        acceptedPrediction?: number | undefined;
                        rejectedPrediction?: number | undefined;
                    } | undefined;
                    assertions?: {
                        prompt?: number | undefined;
                        completion?: number | undefined;
                        cached?: number | undefined;
                        total?: number | undefined;
                        numRequests?: number | undefined;
                        completionDetails?: {
                            reasoning?: number | undefined;
                            acceptedPrediction?: number | undefined;
                            rejectedPrediction?: number | undefined;
                        } | undefined;
                    } | undefined;
                };
                score: number;
                testPassCount: number;
                testFailCount: number;
                testErrorCount: number;
                assertPassCount: number;
                assertFailCount: number;
                totalLatencyMs: number;
                namedScores: Record<string, number>;
                namedScoresCount: Record<string, number>;
                redteam?: {
                    pluginPassCount: Record<string, number>;
                    pluginFailCount: Record<string, number>;
                    strategyPassCount: Record<string, number>;
                    strategyFailCount: Record<string, number>;
                } | undefined;
            } | undefined;
        };
        id: string;
        evalId: string;
    }[];
    recentEvalDate: Date;
    recentEvalId: string;
    count: number;
    testCases: string | (string | {
        options?: ({
            prefix?: string | undefined;
            suffix?: string | undefined;
        } & {
            transform?: string | undefined;
            postprocess?: string | undefined;
            transformVars?: string | undefined;
            storeOutputAs?: string | undefined;
        } & {
            provider?: any;
            rubricPrompt?: string | string[] | {
                role: string;
                content: string;
            }[] | undefined;
            factuality?: {
                subset?: number | undefined;
                superset?: number | undefined;
                agree?: number | undefined;
                disagree?: number | undefined;
                differButFactual?: number | undefined;
            } | undefined;
        } & {
            disableVarExpansion?: boolean | undefined;
            disableConversationVar?: boolean | undefined;
            runSerially?: boolean | undefined;
        }) | undefined;
        vars?: Record<string, string | number | boolean | any[] | Record<string, any> | (string | number | boolean)[]> | undefined;
        provider?: string | {
            id?: string | undefined;
            config?: any;
            label?: string | undefined;
            prompts?: string[] | undefined;
            transform?: string | undefined;
            delay?: number | undefined;
            env?: {
                AI21_API_BASE_URL?: string | undefined;
                AI21_API_KEY?: string | undefined;
                ANTHROPIC_API_KEY?: string | undefined;
                ANTHROPIC_BASE_URL?: string | undefined;
                AWS_BEDROCK_REGION?: string | undefined;
                AZURE_API_BASE_URL?: string | undefined;
                AZURE_API_HOST?: string | undefined;
                AZURE_API_KEY?: string | undefined;
                AZURE_AUTHORITY_HOST?: string | undefined;
                AZURE_CLIENT_ID?: string | undefined;
                AZURE_CLIENT_SECRET?: string | undefined;
                AZURE_DEPLOYMENT_NAME?: string | undefined;
                AZURE_EMBEDDING_DEPLOYMENT_NAME?: string | undefined;
                AZURE_OPENAI_API_BASE_URL?: string | undefined;
                AZURE_OPENAI_API_HOST?: string | undefined;
                AZURE_OPENAI_API_KEY?: string | undefined;
                AZURE_OPENAI_BASE_URL?: string | undefined;
                AZURE_OPENAI_DEPLOYMENT_NAME?: string | undefined;
                AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME?: string | undefined;
                AZURE_TENANT_ID?: string | undefined;
                AZURE_TOKEN_SCOPE?: string | undefined;
                BAM_API_HOST?: string | undefined;
                BAM_API_KEY?: string | undefined;
                CLOUDFLARE_ACCOUNT_ID?: string | undefined;
                CLOUDFLARE_API_KEY?: string | undefined;
                COHERE_API_KEY?: string | undefined;
                COHERE_CLIENT_NAME?: string | undefined;
                DATABRICKS_TOKEN?: string | undefined;
                DATABRICKS_WORKSPACE_URL?: string | undefined;
                FAL_KEY?: string | undefined;
                GOOGLE_API_HOST?: string | undefined;
                GOOGLE_API_KEY?: string | undefined;
                GROQ_API_KEY?: string | undefined;
                HELICONE_API_KEY?: string | undefined;
                HF_API_TOKEN?: string | undefined;
                HF_TOKEN?: string | undefined;
                HUGGING_FACE_HUB_TOKEN?: string | undefined;
                JFROG_API_KEY?: string | undefined;
                LAMBDA_API_KEY?: string | undefined;
                LANGFUSE_HOST?: string | undefined;
                LANGFUSE_PUBLIC_KEY?: string | undefined;
                LANGFUSE_SECRET_KEY?: string | undefined;
                LITELLM_API_BASE?: string | undefined;
                LLAMA_BASE_URL?: string | undefined;
                LOCALAI_BASE_URL?: string | undefined;
                MISTRAL_API_BASE_URL?: string | undefined;
                MISTRAL_API_HOST?: string | undefined;
                MISTRAL_API_KEY?: string | undefined;
                OLLAMA_API_KEY?: string | undefined;
                OLLAMA_BASE_URL?: string | undefined;
                OPENAI_API_BASE_URL?: string | undefined;
                OPENAI_API_HOST?: string | undefined;
                OPENAI_API_KEY?: string | undefined;
                OPENAI_BASE_URL?: string | undefined;
                OPENAI_ORGANIZATION?: string | undefined;
                PALM_API_HOST?: string | undefined;
                PALM_API_KEY?: string | undefined;
                PORTKEY_API_KEY?: string | undefined;
                PROMPTFOO_CA_CERT_PATH?: string | undefined;
                PROMPTFOO_INSECURE_SSL?: string | undefined;
                REPLICATE_API_KEY?: string | undefined;
                REPLICATE_API_TOKEN?: string | undefined;
                VERTEX_API_HOST?: string | undefined;
                VERTEX_API_KEY?: string | undefined;
                VERTEX_API_VERSION?: string | undefined;
                VERTEX_PROJECT_ID?: string | undefined;
                VERTEX_PUBLISHER?: string | undefined;
                VERTEX_REGION?: string | undefined;
                VOYAGE_API_BASE_URL?: string | undefined;
                VOYAGE_API_KEY?: string | undefined;
                WATSONX_AI_APIKEY?: string | undefined;
                WATSONX_AI_AUTH_TYPE?: string | undefined;
                WATSONX_AI_BEARER_TOKEN?: string | undefined;
                WATSONX_AI_PROJECT_ID?: string | undefined;
                AZURE_CONTENT_SAFETY_ENDPOINT?: string | undefined;
                AZURE_CONTENT_SAFETY_API_KEY?: string | undefined;
                AZURE_CONTENT_SAFETY_API_VERSION?: string | undefined;
                AWS_REGION?: string | undefined;
                AWS_DEFAULT_REGION?: string | undefined;
                AWS_SAGEMAKER_MAX_TOKENS?: string | undefined;
                AWS_SAGEMAKER_TEMPERATURE?: string | undefined;
                AWS_SAGEMAKER_TOP_P?: string | undefined;
                AWS_SAGEMAKER_MAX_RETRIES?: string | undefined;
                PROMPTFOO_EVAL_TIMEOUT_MS?: string | undefined;
            } | undefined;
        } | {
            callApi: import("../types").CallApiFunction;
            id: (...args: unknown[]) => string;
            config?: any;
            label?: string | undefined;
            transform?: string | undefined;
            delay?: number | undefined;
            callEmbeddingApi?: ((args_0: string, ...args: unknown[]) => Promise<import("../types").ProviderEmbeddingResponse>) | undefined;
            callClassificationApi?: ((args_0: string, ...args: unknown[]) => Promise<import("../types").ProviderClassificationResponse>) | undefined;
        } | undefined;
        metadata?: (Record<string, any> & {
            pluginConfig?: import("../types").PluginConfig | undefined;
            strategyConfig?: import("../types").RedteamObjectConfig | undefined;
        }) | undefined;
        description?: string | undefined;
        providerOutput?: string | {} | undefined;
        assert?: ({
            type: "moderation" | `promptfoo:redteam:${string}` | "cost" | "factuality" | "answer-relevance" | "bleu" | "classifier" | "contains" | "contains-all" | "contains-any" | "contains-json" | "contains-sql" | "contains-xml" | "context-faithfulness" | "context-recall" | "context-relevance" | "equals" | "g-eval" | "gleu" | "guardrails" | "icontains" | "icontains-all" | "icontains-any" | "is-json" | "is-refusal" | "is-sql" | "is-valid-function-call" | "is-valid-openai-function-call" | "is-valid-openai-tools-call" | "is-xml" | "javascript" | "latency" | "levenshtein" | "llm-rubric" | "pi" | "meteor" | "model-graded-closedqa" | "model-graded-factuality" | "perplexity" | "perplexity-score" | "python" | "regex" | "rouge-n" | "similar" | "starts-with" | "webhook" | "not-moderation" | "not-cost" | "not-factuality" | "not-answer-relevance" | "not-bleu" | "not-classifier" | "not-contains" | "not-contains-all" | "not-contains-any" | "not-contains-json" | "not-contains-sql" | "not-contains-xml" | "not-context-faithfulness" | "not-context-recall" | "not-context-relevance" | "not-equals" | "not-g-eval" | "not-gleu" | "not-guardrails" | "not-icontains" | "not-icontains-all" | "not-icontains-any" | "not-is-json" | "not-is-refusal" | "not-is-sql" | "not-is-valid-function-call" | "not-is-valid-openai-function-call" | "not-is-valid-openai-tools-call" | "not-is-xml" | "not-javascript" | "not-latency" | "not-levenshtein" | "not-llm-rubric" | "not-pi" | "not-meteor" | "not-model-graded-closedqa" | "not-model-graded-factuality" | "not-perplexity" | "not-perplexity-score" | "not-python" | "not-regex" | "not-rouge-n" | "not-similar" | "not-starts-with" | "not-webhook" | "select-best" | "human";
            value?: import("../types").AssertionValue | undefined;
            config?: Record<string, any> | undefined;
            provider?: any;
            transform?: string | undefined;
            rubricPrompt?: string | string[] | {
                role: string;
                content: string;
            }[] | undefined;
            threshold?: number | undefined;
            weight?: number | undefined;
            metric?: string | undefined;
        } | {
            type: "assert-set";
            assert: {
                type: "moderation" | `promptfoo:redteam:${string}` | "cost" | "factuality" | "answer-relevance" | "bleu" | "classifier" | "contains" | "contains-all" | "contains-any" | "contains-json" | "contains-sql" | "contains-xml" | "context-faithfulness" | "context-recall" | "context-relevance" | "equals" | "g-eval" | "gleu" | "guardrails" | "icontains" | "icontains-all" | "icontains-any" | "is-json" | "is-refusal" | "is-sql" | "is-valid-function-call" | "is-valid-openai-function-call" | "is-valid-openai-tools-call" | "is-xml" | "javascript" | "latency" | "levenshtein" | "llm-rubric" | "pi" | "meteor" | "model-graded-closedqa" | "model-graded-factuality" | "perplexity" | "perplexity-score" | "python" | "regex" | "rouge-n" | "similar" | "starts-with" | "webhook" | "not-moderation" | "not-cost" | "not-factuality" | "not-answer-relevance" | "not-bleu" | "not-classifier" | "not-contains" | "not-contains-all" | "not-contains-any" | "not-contains-json" | "not-contains-sql" | "not-contains-xml" | "not-context-faithfulness" | "not-context-recall" | "not-context-relevance" | "not-equals" | "not-g-eval" | "not-gleu" | "not-guardrails" | "not-icontains" | "not-icontains-all" | "not-icontains-any" | "not-is-json" | "not-is-refusal" | "not-is-sql" | "not-is-valid-function-call" | "not-is-valid-openai-function-call" | "not-is-valid-openai-tools-call" | "not-is-xml" | "not-javascript" | "not-latency" | "not-levenshtein" | "not-llm-rubric" | "not-pi" | "not-meteor" | "not-model-graded-closedqa" | "not-model-graded-factuality" | "not-perplexity" | "not-perplexity-score" | "not-python" | "not-regex" | "not-rouge-n" | "not-similar" | "not-starts-with" | "not-webhook" | "select-best" | "human";
                value?: import("../types").AssertionValue | undefined;
                config?: Record<string, any> | undefined;
                provider?: any;
                transform?: string | undefined;
                rubricPrompt?: string | string[] | {
                    role: string;
                    content: string;
                }[] | undefined;
                threshold?: number | undefined;
                weight?: number | undefined;
                metric?: string | undefined;
            }[];
            config?: Record<string, any> | undefined;
            threshold?: number | undefined;
            weight?: number | undefined;
            metric?: string | undefined;
        })[] | undefined;
        threshold?: number | undefined;
        assertScoringFunction?: string | import("../types").ScoringFunction | undefined;
    })[];
}[]>;
export declare function getPromptFromHash(hash: string): Promise<PromptWithMetadata | undefined>;
export declare function getDatasetFromHash(hash: string): Promise<{
    id: string;
    prompts: {
        prompt: {
            provider: string;
            raw: string;
            label: string;
            function?: ((args_0: {
                vars: Record<string, any>;
                provider?: import("../types").ApiProvider | undefined;
            }, ...args: unknown[]) => Promise<any>) | undefined;
            id?: string | undefined;
            config?: any;
            display?: string | undefined;
            metrics?: {
                cost: number;
                tokenUsage: {
                    prompt?: number | undefined;
                    completion?: number | undefined;
                    cached?: number | undefined;
                    total?: number | undefined;
                    numRequests?: number | undefined;
                    completionDetails?: {
                        reasoning?: number | undefined;
                        acceptedPrediction?: number | undefined;
                        rejectedPrediction?: number | undefined;
                    } | undefined;
                    assertions?: {
                        prompt?: number | undefined;
                        completion?: number | undefined;
                        cached?: number | undefined;
                        total?: number | undefined;
                        numRequests?: number | undefined;
                        completionDetails?: {
                            reasoning?: number | undefined;
                            acceptedPrediction?: number | undefined;
                            rejectedPrediction?: number | undefined;
                        } | undefined;
                    } | undefined;
                };
                score: number;
                testPassCount: number;
                testFailCount: number;
                testErrorCount: number;
                assertPassCount: number;
                assertFailCount: number;
                totalLatencyMs: number;
                namedScores: Record<string, number>;
                namedScoresCount: Record<string, number>;
                redteam?: {
                    pluginPassCount: Record<string, number>;
                    pluginFailCount: Record<string, number>;
                    strategyPassCount: Record<string, number>;
                    strategyFailCount: Record<string, number>;
                } | undefined;
            } | undefined;
        };
        id: string;
        evalId: string;
    }[];
    recentEvalDate: Date;
    recentEvalId: string;
    count: number;
    testCases: string | (string | {
        options?: ({
            prefix?: string | undefined;
            suffix?: string | undefined;
        } & {
            transform?: string | undefined;
            postprocess?: string | undefined;
            transformVars?: string | undefined;
            storeOutputAs?: string | undefined;
        } & {
            provider?: any;
            rubricPrompt?: string | string[] | {
                role: string;
                content: string;
            }[] | undefined;
            factuality?: {
                subset?: number | undefined;
                superset?: number | undefined;
                agree?: number | undefined;
                disagree?: number | undefined;
                differButFactual?: number | undefined;
            } | undefined;
        } & {
            disableVarExpansion?: boolean | undefined;
            disableConversationVar?: boolean | undefined;
            runSerially?: boolean | undefined;
        }) | undefined;
        vars?: Record<string, string | number | boolean | any[] | Record<string, any> | (string | number | boolean)[]> | undefined;
        provider?: string | {
            id?: string | undefined;
            config?: any;
            label?: string | undefined;
            prompts?: string[] | undefined;
            transform?: string | undefined;
            delay?: number | undefined;
            env?: {
                AI21_API_BASE_URL?: string | undefined;
                AI21_API_KEY?: string | undefined;
                ANTHROPIC_API_KEY?: string | undefined;
                ANTHROPIC_BASE_URL?: string | undefined;
                AWS_BEDROCK_REGION?: string | undefined;
                AZURE_API_BASE_URL?: string | undefined;
                AZURE_API_HOST?: string | undefined;
                AZURE_API_KEY?: string | undefined;
                AZURE_AUTHORITY_HOST?: string | undefined;
                AZURE_CLIENT_ID?: string | undefined;
                AZURE_CLIENT_SECRET?: string | undefined;
                AZURE_DEPLOYMENT_NAME?: string | undefined;
                AZURE_EMBEDDING_DEPLOYMENT_NAME?: string | undefined;
                AZURE_OPENAI_API_BASE_URL?: string | undefined;
                AZURE_OPENAI_API_HOST?: string | undefined;
                AZURE_OPENAI_API_KEY?: string | undefined;
                AZURE_OPENAI_BASE_URL?: string | undefined;
                AZURE_OPENAI_DEPLOYMENT_NAME?: string | undefined;
                AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME?: string | undefined;
                AZURE_TENANT_ID?: string | undefined;
                AZURE_TOKEN_SCOPE?: string | undefined;
                BAM_API_HOST?: string | undefined;
                BAM_API_KEY?: string | undefined;
                CLOUDFLARE_ACCOUNT_ID?: string | undefined;
                CLOUDFLARE_API_KEY?: string | undefined;
                COHERE_API_KEY?: string | undefined;
                COHERE_CLIENT_NAME?: string | undefined;
                DATABRICKS_TOKEN?: string | undefined;
                DATABRICKS_WORKSPACE_URL?: string | undefined;
                FAL_KEY?: string | undefined;
                GOOGLE_API_HOST?: string | undefined;
                GOOGLE_API_KEY?: string | undefined;
                GROQ_API_KEY?: string | undefined;
                HELICONE_API_KEY?: string | undefined;
                HF_API_TOKEN?: string | undefined;
                HF_TOKEN?: string | undefined;
                HUGGING_FACE_HUB_TOKEN?: string | undefined;
                JFROG_API_KEY?: string | undefined;
                LAMBDA_API_KEY?: string | undefined;
                LANGFUSE_HOST?: string | undefined;
                LANGFUSE_PUBLIC_KEY?: string | undefined;
                LANGFUSE_SECRET_KEY?: string | undefined;
                LITELLM_API_BASE?: string | undefined;
                LLAMA_BASE_URL?: string | undefined;
                LOCALAI_BASE_URL?: string | undefined;
                MISTRAL_API_BASE_URL?: string | undefined;
                MISTRAL_API_HOST?: string | undefined;
                MISTRAL_API_KEY?: string | undefined;
                OLLAMA_API_KEY?: string | undefined;
                OLLAMA_BASE_URL?: string | undefined;
                OPENAI_API_BASE_URL?: string | undefined;
                OPENAI_API_HOST?: string | undefined;
                OPENAI_API_KEY?: string | undefined;
                OPENAI_BASE_URL?: string | undefined;
                OPENAI_ORGANIZATION?: string | undefined;
                PALM_API_HOST?: string | undefined;
                PALM_API_KEY?: string | undefined;
                PORTKEY_API_KEY?: string | undefined;
                PROMPTFOO_CA_CERT_PATH?: string | undefined;
                PROMPTFOO_INSECURE_SSL?: string | undefined;
                REPLICATE_API_KEY?: string | undefined;
                REPLICATE_API_TOKEN?: string | undefined;
                VERTEX_API_HOST?: string | undefined;
                VERTEX_API_KEY?: string | undefined;
                VERTEX_API_VERSION?: string | undefined;
                VERTEX_PROJECT_ID?: string | undefined;
                VERTEX_PUBLISHER?: string | undefined;
                VERTEX_REGION?: string | undefined;
                VOYAGE_API_BASE_URL?: string | undefined;
                VOYAGE_API_KEY?: string | undefined;
                WATSONX_AI_APIKEY?: string | undefined;
                WATSONX_AI_AUTH_TYPE?: string | undefined;
                WATSONX_AI_BEARER_TOKEN?: string | undefined;
                WATSONX_AI_PROJECT_ID?: string | undefined;
                AZURE_CONTENT_SAFETY_ENDPOINT?: string | undefined;
                AZURE_CONTENT_SAFETY_API_KEY?: string | undefined;
                AZURE_CONTENT_SAFETY_API_VERSION?: string | undefined;
                AWS_REGION?: string | undefined;
                AWS_DEFAULT_REGION?: string | undefined;
                AWS_SAGEMAKER_MAX_TOKENS?: string | undefined;
                AWS_SAGEMAKER_TEMPERATURE?: string | undefined;
                AWS_SAGEMAKER_TOP_P?: string | undefined;
                AWS_SAGEMAKER_MAX_RETRIES?: string | undefined;
                PROMPTFOO_EVAL_TIMEOUT_MS?: string | undefined;
            } | undefined;
        } | {
            callApi: import("../types").CallApiFunction;
            id: (...args: unknown[]) => string;
            config?: any;
            label?: string | undefined;
            transform?: string | undefined;
            delay?: number | undefined;
            callEmbeddingApi?: ((args_0: string, ...args: unknown[]) => Promise<import("../types").ProviderEmbeddingResponse>) | undefined;
            callClassificationApi?: ((args_0: string, ...args: unknown[]) => Promise<import("../types").ProviderClassificationResponse>) | undefined;
        } | undefined;
        metadata?: (Record<string, any> & {
            pluginConfig?: import("../types").PluginConfig | undefined;
            strategyConfig?: import("../types").RedteamObjectConfig | undefined;
        }) | undefined;
        description?: string | undefined;
        providerOutput?: string | {} | undefined;
        assert?: ({
            type: "moderation" | `promptfoo:redteam:${string}` | "cost" | "factuality" | "answer-relevance" | "bleu" | "classifier" | "contains" | "contains-all" | "contains-any" | "contains-json" | "contains-sql" | "contains-xml" | "context-faithfulness" | "context-recall" | "context-relevance" | "equals" | "g-eval" | "gleu" | "guardrails" | "icontains" | "icontains-all" | "icontains-any" | "is-json" | "is-refusal" | "is-sql" | "is-valid-function-call" | "is-valid-openai-function-call" | "is-valid-openai-tools-call" | "is-xml" | "javascript" | "latency" | "levenshtein" | "llm-rubric" | "pi" | "meteor" | "model-graded-closedqa" | "model-graded-factuality" | "perplexity" | "perplexity-score" | "python" | "regex" | "rouge-n" | "similar" | "starts-with" | "webhook" | "not-moderation" | "not-cost" | "not-factuality" | "not-answer-relevance" | "not-bleu" | "not-classifier" | "not-contains" | "not-contains-all" | "not-contains-any" | "not-contains-json" | "not-contains-sql" | "not-contains-xml" | "not-context-faithfulness" | "not-context-recall" | "not-context-relevance" | "not-equals" | "not-g-eval" | "not-gleu" | "not-guardrails" | "not-icontains" | "not-icontains-all" | "not-icontains-any" | "not-is-json" | "not-is-refusal" | "not-is-sql" | "not-is-valid-function-call" | "not-is-valid-openai-function-call" | "not-is-valid-openai-tools-call" | "not-is-xml" | "not-javascript" | "not-latency" | "not-levenshtein" | "not-llm-rubric" | "not-pi" | "not-meteor" | "not-model-graded-closedqa" | "not-model-graded-factuality" | "not-perplexity" | "not-perplexity-score" | "not-python" | "not-regex" | "not-rouge-n" | "not-similar" | "not-starts-with" | "not-webhook" | "select-best" | "human";
            value?: import("../types").AssertionValue | undefined;
            config?: Record<string, any> | undefined;
            provider?: any;
            transform?: string | undefined;
            rubricPrompt?: string | string[] | {
                role: string;
                content: string;
            }[] | undefined;
            threshold?: number | undefined;
            weight?: number | undefined;
            metric?: string | undefined;
        } | {
            type: "assert-set";
            assert: {
                type: "moderation" | `promptfoo:redteam:${string}` | "cost" | "factuality" | "answer-relevance" | "bleu" | "classifier" | "contains" | "contains-all" | "contains-any" | "contains-json" | "contains-sql" | "contains-xml" | "context-faithfulness" | "context-recall" | "context-relevance" | "equals" | "g-eval" | "gleu" | "guardrails" | "icontains" | "icontains-all" | "icontains-any" | "is-json" | "is-refusal" | "is-sql" | "is-valid-function-call" | "is-valid-openai-function-call" | "is-valid-openai-tools-call" | "is-xml" | "javascript" | "latency" | "levenshtein" | "llm-rubric" | "pi" | "meteor" | "model-graded-closedqa" | "model-graded-factuality" | "perplexity" | "perplexity-score" | "python" | "regex" | "rouge-n" | "similar" | "starts-with" | "webhook" | "not-moderation" | "not-cost" | "not-factuality" | "not-answer-relevance" | "not-bleu" | "not-classifier" | "not-contains" | "not-contains-all" | "not-contains-any" | "not-contains-json" | "not-contains-sql" | "not-contains-xml" | "not-context-faithfulness" | "not-context-recall" | "not-context-relevance" | "not-equals" | "not-g-eval" | "not-gleu" | "not-guardrails" | "not-icontains" | "not-icontains-all" | "not-icontains-any" | "not-is-json" | "not-is-refusal" | "not-is-sql" | "not-is-valid-function-call" | "not-is-valid-openai-function-call" | "not-is-valid-openai-tools-call" | "not-is-xml" | "not-javascript" | "not-latency" | "not-levenshtein" | "not-llm-rubric" | "not-pi" | "not-meteor" | "not-model-graded-closedqa" | "not-model-graded-factuality" | "not-perplexity" | "not-perplexity-score" | "not-python" | "not-regex" | "not-rouge-n" | "not-similar" | "not-starts-with" | "not-webhook" | "select-best" | "human";
                value?: import("../types").AssertionValue | undefined;
                config?: Record<string, any> | undefined;
                provider?: any;
                transform?: string | undefined;
                rubricPrompt?: string | string[] | {
                    role: string;
                    content: string;
                }[] | undefined;
                threshold?: number | undefined;
                weight?: number | undefined;
                metric?: string | undefined;
            }[];
            config?: Record<string, any> | undefined;
            threshold?: number | undefined;
            weight?: number | undefined;
            metric?: string | undefined;
        })[] | undefined;
        threshold?: number | undefined;
        assertScoringFunction?: string | import("../types").ScoringFunction | undefined;
    })[];
} | undefined>;
export declare function getEvalsWithPredicate(predicate: (result: ResultsFile) => boolean, limit: number): Promise<EvalWithMetadata[]>;
export declare function getEvals(limit?: number): Promise<EvalWithMetadata[]>;
export declare function getEvalFromId(hash: string): Promise<EvalWithMetadata | undefined>;
export declare function deleteEval(evalId: string): Promise<void>;
/**
 * Deletes all evaluations and related records with foreign keys from the database.
 * @async
 * @returns {Promise<void>}
 */
export declare function deleteAllEvals(): Promise<void>;
export type StandaloneEval = CompletedPrompt & {
    evalId: string;
    description: string | null;
    datasetId: string | null;
    promptId: string | null;
    isRedteam: boolean;
    createdAt: number;
    pluginFailCount: Record<string, number>;
    pluginPassCount: Record<string, number>;
    uuid: string;
};
export declare function getStandaloneEvals({ limit, tag, description, }?: {
    limit?: number;
    tag?: {
        key: string;
        value: string;
    };
    description?: string;
}): Promise<StandaloneEval[]>;
//# sourceMappingURL=database.d.ts.map