import type { Prompt } from '../../types';
/**
 * Processes a JSON file to extract prompts.
 * This function reads a JSON file and converts it to a `Prompt` object.
 *
 * @param filePath - The path to the JSON file.
 * @param prompt - The raw prompt data, used for labeling.
 * @returns An array of one `Prompt` object.
 * @throws Will throw an error if the file cannot be read.
 */
export declare function processJsonFile(filePath: string, prompt: Partial<Prompt>): Prompt[];
//# sourceMappingURL=json.d.ts.map