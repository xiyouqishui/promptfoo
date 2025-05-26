import type { TestCase } from '../../types';
export declare const DEFAULT_LANGUAGES: string[];
export declare const DEFAULT_BATCH_SIZE = 3;
/**
 * Helper function to get the concurrency limit from config or use default
 */
export declare function getConcurrencyLimit(config?: Record<string, any>): number;
export declare function generateMultilingual(testCases: TestCase[], injectVar: string, config: Record<string, any>): Promise<TestCase[]>;
/**
 * Translates a given text into multiple target languages.
 *
 * @param {string} text - The text to be translated, written in English.
 * @param {string[]} languages - An array of language codes (e.g., 'bn', 'sw') specifying the target languages.
 * @returns {Promise<Record<string, string>>} A promise that resolves to an object where keys are language codes and values are the translated text.
 * The function attempts several parsing strategies to extract translations from model responses.
 */
export declare function translateBatch(text: string, languages: string[]): Promise<Record<string, string>>;
export declare function translate(text: string, lang: string): Promise<string | null>;
export declare function addMultilingual(testCases: TestCase[], injectVar: string, config: Record<string, any>): Promise<TestCase[]>;
//# sourceMappingURL=multilingual.d.ts.map