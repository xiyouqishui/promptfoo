"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovaSonicProvider = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const node_http_handler_1 = require("@smithy/node-http-handler");
const node_buffer_1 = require("node:buffer");
const node_crypto_1 = require("node:crypto");
const rxjs_1 = require("rxjs");
const rxjs_2 = require("rxjs");
const operators_1 = require("rxjs/operators");
const logger_1 = __importDefault(require("../../logger"));
const bedrock_1 = require("../bedrock");
const DEFAULT_CONFIG = {
    inference: {
        maxTokens: 1024,
        topP: 0.9,
        temperature: 0.7,
    },
    audio: {
        input: {
            audioType: 'SPEECH',
            encoding: 'base64',
            mediaType: 'audio/lpcm',
            sampleRateHertz: 8000,
            sampleSizeBits: 16,
            channelCount: 1,
        },
        output: {
            audioType: 'SPEECH',
            encoding: 'base64',
            mediaType: 'audio/lpcm',
            sampleRateHertz: 8000,
            sampleSizeBits: 16,
            channelCount: 1,
            voiceId: 'tiffany',
        },
    },
    text: {
        mediaType: 'text/plain',
    },
};
class NovaSonicProvider extends bedrock_1.AwsBedrockGenericProvider {
    constructor(modelName = 'amazon.nova-sonic-v1:0', options = {}) {
        super(modelName, options);
        this.sessions = new Map();
        this.config = options.config;
        this.bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({
            region: this.getRegion(),
            requestHandler: new node_http_handler_1.NodeHttp2Handler({
                requestTimeout: 300000,
                sessionTimeout: 300000,
                disableConcurrentStreams: false,
                maxConcurrentStreams: 20,
            }),
        });
    }
    createSession(sessionId = (0, node_crypto_1.randomUUID)()) {
        if (this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} already exists`);
        }
        const session = {
            queue: [],
            queueSignal: new rxjs_1.Subject(),
            closeSignal: new rxjs_1.Subject(),
            responseHandlers: new Map(),
            isActive: true,
            audioContentId: (0, node_crypto_1.randomUUID)(),
            promptName: (0, node_crypto_1.randomUUID)(),
        };
        this.sessions.set(sessionId, session);
        return session;
    }
    async sendEvent(sessionId, event) {
        if (Object.keys(event.event)[0] !== 'audioInput') {
            logger_1.default.debug('sendEvent: ' + Object.keys(event.event)[0]);
        }
        const session = this.sessions.get(sessionId);
        if (!session?.isActive) {
            logger_1.default.error(`Session ${sessionId} is not active`);
            return;
        }
        session.queue.push(event);
        session.queueSignal.next();
    }
    async endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        else if (!session.isActive) {
            logger_1.default.debug(`Session ${sessionId} is not active`);
            return;
        }
        // Wait a moment for any final events
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.sendEvent(sessionId, {
            event: {
                promptEnd: {
                    promptName: session.promptName,
                },
            },
        });
        // Wait for any final events after prompt end
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.sendEvent(sessionId, {
            event: {
                sessionEnd: {},
            },
        });
        session.isActive = false;
        logger_1.default.debug('Session closed');
    }
    async sendTextMessage(sessionId, role, prompt) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const textPromptID = (0, node_crypto_1.randomUUID)();
        logger_1.default.debug('sendTextMessage: ' + prompt);
        this.sendEvent(sessionId, {
            event: {
                contentStart: {
                    promptName: session.promptName,
                    contentName: textPromptID,
                    type: 'TEXT',
                    interactive: false,
                    role,
                    textInputConfiguration: this.config?.textInputConfiguration || DEFAULT_CONFIG.text,
                },
            },
        });
        // Text input content for system prompt
        this.sendEvent(sessionId, {
            event: {
                textInput: {
                    promptName: session.promptName,
                    contentName: textPromptID,
                    content: prompt,
                },
            },
        });
        // Text content end
        this.sendEvent(sessionId, {
            event: {
                contentEnd: {
                    promptName: session.promptName,
                    contentName: textPromptID,
                },
            },
        });
    }
    async sendSystemPrompt(sessionId, prompt) {
        return this.sendTextMessage(sessionId, 'SYSTEM', prompt);
    }
    async sendChatTextHistory(sessionId, role, prompt) {
        return this.sendTextMessage(sessionId, role, prompt);
    }
    async callApi(prompt, context) {
        const sessionId = (0, node_crypto_1.randomUUID)();
        const session = this.createSession(sessionId);
        let assistantTranscript = '';
        let userTranscript = '';
        let audioContent = '';
        let hasAudioContent = false;
        let functionCallOccurred = false;
        logger_1.default.debug('prompt: ' + prompt.slice(0, 1000));
        // Set up event handlers
        session.responseHandlers.set('textOutput', (data) => {
            logger_1.default.debug('textOutput: ' + JSON.stringify(data));
            if (data.role === 'USER') {
                userTranscript += data.content + '\n';
            }
            else if (data.role === 'ASSISTANT') {
                assistantTranscript += data.content + '\n';
            }
        });
        session.responseHandlers.set('contentEnd', async (data) => {
            logger_1.default.debug('contentEnd');
            if (data.stopReason === 'END_TURN') {
                await this.endSession(sessionId);
            }
        });
        session.responseHandlers.set('audioOutput', (data) => {
            hasAudioContent = true;
            logger_1.default.debug('audioOutput');
            audioContent += data.content;
        });
        session.responseHandlers.set('toolUse', async (data) => {
            logger_1.default.debug('toolUse');
            functionCallOccurred = true;
            // const result = await this.handleToolUse(data.toolName, data);
            const result = 'Tool result';
            const toolResultId = (0, node_crypto_1.randomUUID)();
            await this.sendEvent(sessionId, {
                event: {
                    contentStart: {
                        promptName: session.promptName,
                        contentName: toolResultId,
                        interactive: false,
                        type: 'TOOL',
                        role: 'TOOL',
                        toolResultInputConfiguration: {
                            toolUseId: data.toolUseId,
                            type: 'TEXT',
                            textInputConfiguration: {
                                mediaType: 'text/plain',
                            },
                        },
                    },
                },
            });
            await this.sendEvent(sessionId, {
                event: {
                    toolResult: {
                        promptName: session.promptName,
                        contentName: toolResultId,
                        content: JSON.stringify(result),
                    },
                },
            });
            await this.sendEvent(sessionId, {
                event: {
                    contentEnd: {
                        promptName: session.promptName,
                        contentName: toolResultId,
                    },
                },
            });
        });
        try {
            // Process response stream
            const request = this.bedrockClient.send(new client_bedrock_runtime_1.InvokeModelWithBidirectionalStreamCommand({
                modelId: this.modelName,
                body: this.createAsyncIterable(sessionId),
            }));
            logger_1.default.debug('Sending sessionStart');
            // Initialize session
            await this.sendEvent(sessionId, {
                event: {
                    sessionStart: {
                        inferenceConfiguration: this.config?.interfaceConfig || DEFAULT_CONFIG.inference,
                    },
                },
            });
            logger_1.default.debug('Sending promptStart');
            // Start prompt
            await this.sendEvent(sessionId, {
                event: {
                    promptStart: {
                        promptName: session.promptName,
                        textOutputConfiguration: this.config?.textOutputConfiguration || DEFAULT_CONFIG.text,
                        audioOutputConfiguration: this.config?.audioOutputConfiguration || DEFAULT_CONFIG.audio.output,
                        ...(this.config?.toolConfig && { toolConfiguration: this.config?.toolConfig }),
                    },
                },
            });
            logger_1.default.debug('Sending system prompt');
            await this.sendSystemPrompt(sessionId, context?.test?.metadata?.systemPrompt || '');
            logger_1.default.debug('Processing conversation history');
            let promptText = prompt;
            try {
                // Check if the prompt is a JSON string
                const parsedPrompt = JSON.parse(prompt);
                if (Array.isArray(parsedPrompt)) {
                    // Handle array of messages format
                    for (const [index, message] of parsedPrompt.entries()) {
                        if (message.role !== 'system' && index !== parsedPrompt.length - 1) {
                            await this.sendTextMessage(sessionId, message.role.toUpperCase(), message.content[0].text);
                        }
                    }
                    promptText = parsedPrompt[parsedPrompt.length - 1].content[0].text;
                }
            }
            catch (err) {
                logger_1.default.error(`Error processing conversation history: ${err}`);
            }
            logger_1.default.debug('Sending audioInput start');
            // Send prompt content
            await this.sendEvent(sessionId, {
                event: {
                    contentStart: {
                        promptName: session.promptName,
                        contentName: session.audioContentId,
                        type: 'AUDIO',
                        interactive: true,
                        role: 'USER',
                        audioInputConfiguration: this.config?.audioInputConfiguration || DEFAULT_CONFIG.audio.input,
                    },
                },
            });
            logger_1.default.debug('Sending audioInput chunks');
            // Send the actual prompt
            const chunks = promptText?.match(/.{1,1024}/g)?.map((chunk) => node_buffer_1.Buffer.from(chunk)) || [];
            logger_1.default.debug('audioInput in chunks: ' + chunks.length);
            for (const chunk of chunks) {
                await this.sendEvent(sessionId, {
                    event: {
                        audioInput: {
                            promptName: session.promptName,
                            contentName: session.audioContentId,
                            content: chunk.toString(),
                        },
                    },
                });
                await new Promise((resolve) => setTimeout(resolve, 30));
            }
            logger_1.default.debug('Sending audioInput end');
            // End content and prompt
            await this.sendEvent(sessionId, {
                event: {
                    contentEnd: {
                        promptName: session.promptName,
                        contentName: session.audioContentId,
                    },
                },
            });
            const response = await request;
            if (response.body) {
                for await (const event of response.body) {
                    if (!session.isActive) {
                        break;
                    }
                    if (event.chunk?.bytes) {
                        const data = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
                        const eventType = Object.keys(data.event || {})[0];
                        logger_1.default.debug('processing eventType: ' + eventType);
                        const handler = session.responseHandlers.get(eventType);
                        if (handler) {
                            await handler(data.event[eventType]);
                        }
                    }
                }
            }
            return {
                output: assistantTranscript || '[No response received from API]',
                // TODO: Add token usage
                tokenUsage: { total: 0, prompt: 0, completion: 0 },
                cached: false,
                metadata: {
                    ...(hasAudioContent && audioContent
                        ? {
                            audio: {
                                data: audioContent,
                                format: 'lpcm',
                                transcript: assistantTranscript,
                            },
                            userTranscript,
                        }
                        : {}),
                    functionCallOccurred,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in nova-sonic provider: ' + JSON.stringify(error));
            return {
                error: error instanceof Error ? error.message : String(error),
                metadata: {},
            };
        }
        finally {
            await this.endSession(sessionId);
            this.sessions.delete(sessionId);
        }
    }
    createAsyncIterable(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        return {
            [Symbol.asyncIterator]: () => ({
                async next() {
                    if (!session.isActive) {
                        return { done: true, value: undefined };
                    }
                    if (session.queue.length === 0) {
                        try {
                            await Promise.race([
                                (0, rxjs_2.firstValueFrom)(session.queueSignal.pipe((0, operators_1.take)(1))),
                                (0, rxjs_2.firstValueFrom)(session.closeSignal.pipe((0, operators_1.take)(1))),
                            ]);
                        }
                        catch {
                            return { done: true, value: undefined };
                        }
                    }
                    const nextEvent = session.queue.shift();
                    if (nextEvent) {
                        return {
                            value: {
                                chunk: {
                                    bytes: new TextEncoder().encode(JSON.stringify(nextEvent)),
                                },
                            },
                            done: false,
                        };
                    }
                    else {
                        return { done: true, value: undefined };
                    }
                },
            }),
        };
    }
}
exports.NovaSonicProvider = NovaSonicProvider;
//# sourceMappingURL=nova-sonic.js.map