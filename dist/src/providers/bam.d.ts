import type { Client as GenAIClient, TextGenerationCreateOutput } from '@ibm-generative-ai/node-sdk';
import type { ApiProvider, ProviderResponse } from '../types';
import type { EnvOverrides } from '../types/env';
interface BAMGenerationParameters {
    apiKey?: string | null;
    apiKeyEnvar?: string | null;
    top_k?: number | null;
    top_p?: number | null;
    typical_p?: number | null;
    beam_width?: number | null;
    time_limit?: number | null;
    random_seed?: number | null;
    temperature?: number | null;
    length_penalty?: {
        start_index?: number | null;
        decay_factor?: number | null;
    } | null;
    max_new_tokens?: number | null;
    min_new_tokens?: number | null;
    return_options?: {
        input_text?: boolean | null;
        token_ranks?: boolean | null;
        input_tokens?: boolean | null;
        top_n_tokens?: number | null;
        token_logprobs?: boolean | null;
        generated_tokens?: boolean | null;
        input_parameters?: boolean | null;
    } | null;
    stop_sequences?: string[] | null;
    decoding_method?: 'greedy' | 'sample' | null;
    repetition_penalty?: number | null;
    include_stop_sequence?: boolean;
    truncate_input_tokens?: number | null;
}
interface BAMModerations {
    hap?: {
        input?: {
            enabled: boolean;
            threshold?: number;
            send_tokens?: boolean;
        };
        output?: {
            enabled: boolean;
            threshold?: number;
            send_tokens?: boolean;
        };
    };
    social_bias?: {
        input?: {
            enabled: boolean;
            threshold?: number;
            send_tokens?: boolean;
        };
        output?: {
            enabled: boolean;
            threshold?: number;
            send_tokens?: boolean;
        };
    };
}
export declare function convertResponse(response: TextGenerationCreateOutput): ProviderResponse;
export declare class BAMProvider implements ApiProvider {
    modelName: string;
    config?: BAMGenerationParameters;
    moderations?: BAMModerations;
    env?: EnvOverrides;
    apiKey?: string;
    client: GenAIClient | undefined;
    constructor(modelName: string, options?: {
        id?: string;
        config?: BAMGenerationParameters;
        env?: EnvOverrides;
        moderations?: BAMModerations;
    });
    id(): string;
    toString(): string;
    getApiKey(): string | undefined;
    getClient(): Promise<GenAIClient>;
    callApi(prompt: string): Promise<ProviderResponse>;
}
export {};
//# sourceMappingURL=bam.d.ts.map