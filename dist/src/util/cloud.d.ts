import type { UnifiedConfig } from '../types';
import type { ProviderOptions } from '../types/providers';
export declare function makeRequest(path: string, method: string, body?: any): Promise<Response>;
export declare function targetApiBuildDate(): Promise<Date | null>;
export declare function getProviderFromCloud(id: string): Promise<ProviderOptions & {
    id: string;
}>;
export declare function getConfigFromCloud(id: string, providerId?: string): Promise<UnifiedConfig>;
export declare function cloudCanAcceptChunkedResults(): Promise<boolean>;
//# sourceMappingURL=cloud.d.ts.map