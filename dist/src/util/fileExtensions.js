"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JAVASCRIPT_EXTENSIONS = void 0;
exports.isJavascriptFile = isJavascriptFile;
exports.isImageFile = isImageFile;
exports.isVideoFile = isVideoFile;
exports.isAudioFile = isAudioFile;
/**
 * Array of supported JavaScript and TypeScript file extensions
 */
exports.JAVASCRIPT_EXTENSIONS = ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'];
/**
 * Checks if a file is a JavaScript or TypeScript file based on its extension.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has a JavaScript or TypeScript extension, false otherwise.
 */
function isJavascriptFile(filePath) {
    return new RegExp(`\\.(${exports.JAVASCRIPT_EXTENSIONS.join('|')})$`).test(filePath);
}
/**
 * Checks if a file is an image file based on its extension. Non-exhaustive list.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has an image extension, false otherwise.
 */
function isImageFile(filePath) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    return imageExtensions.includes(fileExtension);
}
/**
 * Checks if a file is a video file based on its extension. Non-exhaustive list.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has a video extension, false otherwise.
 */
function isVideoFile(filePath) {
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'mkv', 'm4v'];
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    return videoExtensions.includes(fileExtension);
}
/**
 * Checks if a file is an audio file based on its extension. Non-exhaustive list.
 *
 * @param filePath - The path of the file to check.
 * @returns True if the file has an audio extension, false otherwise.
 */
function isAudioFile(filePath) {
    const audioExtensions = ['wav', 'mp3', 'ogg', 'aac', 'm4a', 'flac', 'wma', 'aiff', 'opus'];
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    return audioExtensions.includes(fileExtension);
}
//# sourceMappingURL=fileExtensions.js.map