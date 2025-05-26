"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Telemetry = exports.TelemetryEventSchema = void 0;
const zod_1 = require("zod");
const cliState_1 = __importDefault(require("./cliState"));
const constants_1 = require("./constants");
const envars_1 = require("./envars");
const fetch_1 = require("./fetch");
const logger_1 = __importDefault(require("./logger"));
exports.TelemetryEventSchema = zod_1.z.object({
    event: zod_1.z.enum([
        'assertion_used',
        'command_used',
        'eval_ran',
        'feature_used',
        'funnel',
        'webui_api',
        'webui_page_view',
    ]),
    packageVersion: zod_1.z.string().optional().default(constants_1.VERSION),
    properties: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())])),
});
const TELEMETRY_ENDPOINT = 'https://api.promptfoo.dev/telemetry';
const CONSENT_ENDPOINT = 'https://api.promptfoo.dev/consent';
const TELEMETRY_TIMEOUT_MS = 1000;
class Telemetry {
    constructor() {
        this.events = [];
        this.telemetryDisabledRecorded = false;
        this.recordedEvents = new Set();
    }
    get disabled() {
        return (0, envars_1.getEnvBool)('PROMPTFOO_DISABLE_TELEMETRY');
    }
    recordTelemetryDisabled() {
        if (!this.telemetryDisabledRecorded) {
            this.events.push({
                event: 'feature_used',
                packageVersion: constants_1.VERSION,
                properties: { feature: 'telemetry disabled' },
            });
            this.telemetryDisabledRecorded = true;
        }
    }
    record(eventName, properties) {
        if (this.disabled) {
            this.recordTelemetryDisabled();
        }
        else {
            const event = {
                event: eventName,
                packageVersion: constants_1.VERSION,
                properties: {
                    ...properties,
                    isRedteam: Boolean(cliState_1.default.config?.redteam),
                    isRunningInCi: (0, envars_1.isCI)(),
                },
            };
            const result = exports.TelemetryEventSchema.safeParse(event);
            if (result.success) {
                this.events.push(result.data);
            }
            else {
                logger_1.default.debug(`Invalid telemetry event: got ${JSON.stringify(event)}, error: ${result.error}`);
            }
        }
    }
    /**
     * Record an event once, unique by event name and properties.
     *
     * @param eventName - The name of the event to record.
     * @param properties - The properties of the event to record.
     */
    recordOnce(eventName, properties) {
        if (this.disabled) {
            this.recordTelemetryDisabled();
        }
        else {
            const eventKey = JSON.stringify({ eventName, properties });
            if (!this.recordedEvents.has(eventKey)) {
                this.record(eventName, properties);
                this.recordedEvents.add(eventKey);
            }
        }
    }
    async recordAndSend(eventName, properties) {
        this.record(eventName, properties);
        await this.send();
    }
    async recordAndSendOnce(eventName, properties) {
        if (this.disabled) {
            this.recordTelemetryDisabled();
        }
        else {
            this.recordOnce(eventName, properties);
        }
        await this.send();
    }
    async send() {
        if (this.events.length > 0) {
            if ((0, envars_1.getEnvBool)('PROMPTFOO_TELEMETRY_DEBUG')) {
                logger_1.default.debug(`Sending ${this.events.length} telemetry events to ${TELEMETRY_ENDPOINT}: ${JSON.stringify(this.events)}`);
            }
            try {
                const response = await (0, fetch_1.fetchWithTimeout)(TELEMETRY_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(this.events),
                }, TELEMETRY_TIMEOUT_MS);
                if (response.ok) {
                    this.events = [];
                }
            }
            catch {
                // ignore
            }
        }
    }
    /**
     * This is a separate endpoint to save consent used only for redteam data synthesis for "harmful" plugins.
     */
    async saveConsent(email, metadata) {
        try {
            const response = await (0, fetch_1.fetchWithTimeout)(CONSENT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, metadata }),
            }, TELEMETRY_TIMEOUT_MS);
            if (!response.ok) {
                throw new Error(`Failed to save consent: ${response.statusText}`);
            }
        }
        catch (err) {
            logger_1.default.debug(`Failed to save consent: ${err.message}`);
        }
    }
}
exports.Telemetry = Telemetry;
const telemetry = new Telemetry();
exports.default = telemetry;
//# sourceMappingURL=telemetry.js.map