/**
 * Array of supported JavaScript and TypeScript file extensions
 */
export declare const JAVASCRIPT_EXTENSIONS: string[];
/**
 * Checks if a file is a JavaScript or TypeScript file based on its extension.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has a JavaScript or TypeScript extension, false otherwise.
 */
export declare function isJavascriptFile(filePath: string): boolean;
/**
 * Checks if a file is an image file based on its extension. Non-exhaustive list.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has an image extension, false otherwise.
 */
export declare function isImageFile(filePath: string): boolean;
/**
 * Checks if a file is a video file based on its extension. Non-exhaustive list.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has a video extension, false otherwise.
 */
export declare function isVideoFile(filePath: string): boolean;
/**
 * Checks if a file is an audio file based on its extension. Non-exhaustive list.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has an audio extension, false otherwise.
 */
export declare function isAudioFile(filePath: string): boolean;
//# sourceMappingURL=fileExtensions.d.ts.map