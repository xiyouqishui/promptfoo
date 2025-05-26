import type { ApiEmbeddingProvider, ApiProvider, CallApiContextParams, CallApiOptionsParams, ProviderEmbeddingResponse, ProviderResponse } from '../types';
import type { EnvOverrides } from '../types/env';
/**
 * Options for configuring SageMaker provider
 */
interface SageMakerOptions {
    accessKeyId?: string;
    profile?: string;
    region?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    endpoint?: string;
    contentType?: string;
    acceptType?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
    delay?: number;
    transform?: string;
    modelType?: 'openai' | 'anthropic' | 'llama' | 'huggingface' | 'jumpstart' | 'custom';
    responseFormat?: {
        type?: string;
        path?: string;
    };
}
/**
 * Base class for SageMaker providers with common functionality
 */
export declare abstract class SageMakerGenericProvider {
    env?: EnvOverrides;
    sagemakerRuntime?: any;
    config: SageMakerOptions;
    endpointName: string;
    delay?: number;
    transform?: string;
    private providerId?;
    constructor(endpointName: string, options?: {
        config?: SageMakerOptions;
        id?: string;
        env?: EnvOverrides;
        delay?: number;
        transform?: string;
    });
    id(): string;
    toString(): string;
    /**
     * Get AWS credentials from config or environment
     */
    getCredentials(): Promise<any>;
    /**
     * Initialize and return the SageMaker runtime client
     */
    getSageMakerRuntimeInstance(): Promise<any>;
    /**
     * Get AWS region from config or environment
     */
    getRegion(): string;
    /**
     * Get SageMaker endpoint name
     */
    getEndpointName(): string;
    /**
     * Get content type for request
     */
    getContentType(): string;
    /**
     * Get accept type for response
     */
    getAcceptType(): string;
    /**
     * Apply transformation to a prompt if a transform function is specified
     * @param prompt The original prompt to transform
     * @param context Optional context information for the transformation
     * @returns The transformed prompt, or the original if no transformation is applied
     */
    applyTransformation(prompt: string, context?: CallApiContextParams): Promise<string>;
    /**
     * Extracts data from a response using a path expression
     * Supports JavaScript expressions and file-based transforms
     */
    protected extractFromPath(responseJson: any, pathExpression: string | undefined): Promise<any>;
}
/**
 * Provider for text generation with SageMaker endpoints
 */
export declare class SageMakerCompletionProvider extends SageMakerGenericProvider implements ApiProvider {
    static SAGEMAKER_MODEL_TYPES: string[];
    /**
     * Format the request payload based on model type
     */
    formatPayload(prompt: string): string;
    /**
     * Parse the response from SageMaker endpoint
     */
    parseResponse(responseBody: string): Promise<any>;
    /**
     * Generate a consistent cache key for SageMaker requests
     * Uses crypto.createHash to generate a shorter, more efficient key
     */
    private getCacheKey;
    /**
     * Invoke SageMaker endpoint for text generation with caching, delay support, and transformations
     */
    callApi(prompt: string, context?: CallApiContextParams, options?: CallApiOptionsParams): Promise<ProviderResponse>;
}
/**
 * Provider for embeddings with SageMaker endpoints
 */
export declare class SageMakerEmbeddingProvider extends SageMakerGenericProvider implements ApiEmbeddingProvider {
    callApi(): Promise<ProviderResponse>;
    /**
     * Generate a consistent cache key for SageMaker embedding requests
     * Uses crypto.createHash to generate a shorter, more efficient key
     */
    private getCacheKey;
    /**
     * Invoke SageMaker endpoint for embeddings with caching, delay support, and transformations
     */
    callEmbeddingApi(text: string, context?: CallApiContextParams): Promise<ProviderEmbeddingResponse>;
    /**
     * Helper method to cache embedding results
     */
    private cacheEmbeddingResult;
}
export {};
//# sourceMappingURL=sagemaker.d.ts.map