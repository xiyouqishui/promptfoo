"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFfmpeg = importFfmpeg;
exports.createTempVideoEnvironment = createTempVideoEnvironment;
exports.getFallbackBase64 = getFallbackBase64;
exports.textToVideo = textToVideo;
exports.createProgressBar = createProgressBar;
exports.addVideoToBase64 = addVideoToBase64;
exports.writeVideoFile = writeVideoFile;
exports.main = main;
const cli_progress_1 = require("cli-progress");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const cliState_1 = __importDefault(require("../../cliState"));
const logger_1 = __importDefault(require("../../logger"));
const invariant_1 = __importDefault(require("../../util/invariant"));
const remoteGeneration_1 = require("../remoteGeneration");
let ffmpegCache = null;
function shouldShowProgressBar() {
    return !cliState_1.default.webUI && logger_1.default.level !== 'debug';
}
async function importFfmpeg() {
    if (ffmpegCache) {
        return ffmpegCache;
    }
    try {
        ffmpegCache = await Promise.resolve().then(() => __importStar(require('fluent-ffmpeg')));
        return ffmpegCache;
    }
    catch (error) {
        logger_1.default.warn(`fluent-ffmpeg library not available: ${error}`);
        throw new Error('To use the video strategy, please install fluent-ffmpeg: npm install fluent-ffmpeg\n' +
            'Also make sure you have FFmpeg installed on your system:\n' +
            '- macOS: brew install ffmpeg\n' +
            '- Ubuntu/Debian: apt-get install ffmpeg\n' +
            '- Windows: Download from ffmpeg.org');
    }
}
async function createTempVideoEnvironment(text) {
    const tempDir = path_1.default.join(os_1.default.tmpdir(), 'promptfoo-video');
    if (!fs_1.default.existsSync(tempDir)) {
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    }
    const textFilePath = path_1.default.join(tempDir, 'text.txt');
    const outputPath = path_1.default.join(tempDir, 'output-video.mp4');
    fs_1.default.writeFileSync(textFilePath, text);
    const cleanup = () => {
        try {
            if (fs_1.default.existsSync(textFilePath)) {
                fs_1.default.unlinkSync(textFilePath);
            }
            if (fs_1.default.existsSync(outputPath)) {
                fs_1.default.unlinkSync(outputPath);
            }
        }
        catch (error) {
            logger_1.default.warn(`Failed to clean up temporary files: ${error}`);
        }
    };
    return { tempDir, textFilePath, outputPath, cleanup };
}
function getFallbackBase64(text) {
    return Buffer.from(text).toString('base64');
}
async function textToVideo(text) {
    try {
        if ((0, remoteGeneration_1.neverGenerateRemote)()) {
            const ffmpegModule = await importFfmpeg();
            const { textFilePath, outputPath, cleanup } = await createTempVideoEnvironment(text);
            return new Promise((resolve, reject) => {
                ffmpegModule()
                    .input('color=white:s=640x480:d=5')
                    .inputFormat('lavfi')
                    .input(textFilePath)
                    .inputOptions(['-f', 'concat'])
                    .complexFilter([
                    `[0:v]drawtext=fontfile=/System/Library/Fonts/Helvetica.ttc:text='${text.replace(/'/g, "\\'")}':fontcolor=black:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2[v]`,
                ])
                    .outputOptions(['-map', '[v]'])
                    .save(outputPath)
                    .on('end', async () => {
                    try {
                        const videoData = fs_1.default.readFileSync(outputPath);
                        const base64Video = videoData.toString('base64');
                        cleanup();
                        resolve(base64Video);
                    }
                    catch (error) {
                        logger_1.default.error(`Error processing video output: ${error}`);
                        cleanup();
                        reject(error);
                    }
                })
                    .on('error', (err) => {
                    logger_1.default.error(`Error creating video: ${err}`);
                    cleanup();
                    reject(err);
                });
            });
        }
        else {
            throw new Error('Local video generation requires fluent-ffmpeg. Future versions may support remote generation.');
        }
    }
    catch (error) {
        logger_1.default.error(`Error generating video from text: ${error}`);
        return getFallbackBase64(text);
    }
}
function createProgressBar(total) {
    let progressBar;
    if (shouldShowProgressBar()) {
        try {
            progressBar = new cli_progress_1.SingleBar({
                format: 'Converting to Videos {bar} {percentage}% | ETA: {eta}s | {value}/{total}',
                hideCursor: true,
            }, cli_progress_1.Presets.shades_classic);
            try {
                progressBar.start(total, 0);
            }
            catch (error) {
                logger_1.default.warn(`Failed to start progress bar: ${error}`);
                progressBar = undefined;
            }
        }
        catch (error) {
            logger_1.default.warn(`Failed to create progress bar: ${error}`);
        }
    }
    return {
        increment: () => {
            if (progressBar) {
                try {
                    progressBar.increment(1);
                }
                catch (error) {
                    logger_1.default.warn(`Failed to increment progress bar: ${error}`);
                    progressBar = undefined;
                }
            }
        },
        stop: () => {
            if (progressBar) {
                try {
                    progressBar.stop();
                }
                catch (error) {
                    logger_1.default.warn(`Failed to stop progress bar: ${error}`);
                }
            }
        },
    };
}
async function addVideoToBase64(testCases, injectVar, videoGenerator = textToVideo) {
    const videoTestCases = [];
    const progress = createProgressBar(testCases.length);
    try {
        for (const testCase of testCases) {
            try {
                (0, invariant_1.default)(testCase.vars, `Video encoding: testCase.vars is required, but got ${JSON.stringify(testCase)}`);
                const originalText = String(testCase.vars[injectVar]);
                const base64Video = await videoGenerator(originalText);
                videoTestCases.push({
                    ...testCase,
                    assert: testCase.assert?.map((assertion) => ({
                        ...assertion,
                        metric: assertion.type?.startsWith('promptfoo:redteam:')
                            ? `${assertion.type?.split(':').pop() || assertion.metric}/Video-Encoded`
                            : assertion.metric,
                    })),
                    vars: {
                        ...testCase.vars,
                        [injectVar]: base64Video,
                        video_text: originalText,
                    },
                    metadata: {
                        ...testCase.metadata,
                        strategyId: 'video',
                    },
                });
            }
            catch (error) {
                logger_1.default.error(`Error processing test case: ${error}`);
                throw error;
            }
            finally {
                progress.increment();
                if (logger_1.default.level === 'debug') {
                    logger_1.default.debug(`Processed ${videoTestCases.length} of ${testCases.length}`);
                }
            }
        }
        return videoTestCases;
    }
    finally {
        progress.stop();
    }
}
async function writeVideoFile(base64Video, outputFilePath) {
    try {
        const videoBuffer = Buffer.from(base64Video, 'base64');
        fs_1.default.writeFileSync(outputFilePath, videoBuffer);
        logger_1.default.info(`Video file written to: ${outputFilePath}`);
    }
    catch (error) {
        logger_1.default.error(`Failed to write video file: ${error}`);
        throw error;
    }
}
async function main() {
    const textToConvert = process.argv[2] || 'This is a test of the video encoding strategy.';
    logger_1.default.info(`Converting text to video: "${textToConvert}"`);
    try {
        const base64Video = await textToVideo(textToConvert);
        logger_1.default.info(`Base64 video (first 100 chars): ${base64Video.substring(0, 100)}...`);
        logger_1.default.info(`Total base64 video length: ${base64Video.length} characters`);
        const testCase = {
            vars: {
                prompt: textToConvert,
            },
        };
        const processedTestCases = await addVideoToBase64([testCase], 'prompt');
        logger_1.default.info('Test case processed successfully.');
        logger_1.default.info(`Original prompt length: ${textToConvert.length} characters`);
        const processedPrompt = processedTestCases[0].vars?.prompt;
        logger_1.default.info(`Processed prompt length: ${processedPrompt.length} characters`);
        if (require.main === module) {
            await writeVideoFile(base64Video, 'test-video.mp4');
            logger_1.default.info(`You can open it with any video player to verify the conversion.`);
        }
    }
    catch (error) {
        logger_1.default.error(`Error generating video from text: ${error}`);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=simpleVideo.js.map