/**
 * Extended options for fetch requests with promptfoo-specific headers
 */
interface PromptfooRequestInit extends RequestInit {
    headers?: HeadersInit;
}
export declare function sanitizeUrl(url: string): string;
export declare function fetchWithProxy(url: RequestInfo, options?: PromptfooRequestInit): Promise<Response>;
export declare function fetchWithTimeout(url: RequestInfo, options: PromptfooRequestInit | undefined, timeout: number): Promise<Response>;
/**
 * Check if a response indicates rate limiting
 */
export declare function isRateLimited(response: Response): boolean;
/**
 * Handle rate limiting by waiting the appropriate amount of time
 */
export declare function handleRateLimit(response: Response): Promise<void>;
/**
 * Fetch with automatic retries and rate limit handling
 */
export declare function fetchWithRetries(url: RequestInfo, options: PromptfooRequestInit | undefined, timeout: number, retries?: number): Promise<Response>;
export {};
//# sourceMappingURL=fetch.d.ts.map