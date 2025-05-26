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
exports.BrowserProvider = void 0;
const logger_1 = __importDefault(require("../logger"));
const file_1 = require("../util/file");
const invariant_1 = __importDefault(require("../util/invariant"));
const json_1 = require("../util/json");
const templates_1 = require("../util/templates");
const nunjucks = (0, templates_1.getNunjucksEngine)();
function createTransformResponse(parser) {
    if (typeof parser === 'function') {
        return parser;
    }
    if (typeof parser === 'string') {
        return new Function('extracted', 'finalHtml', `return ${parser}`);
    }
    return ({ extracted, finalHtml }) => ({ output: finalHtml });
}
class BrowserProvider {
    constructor(_, options) {
        this.config = options.config;
        this.transformResponse = createTransformResponse(this.config.transformResponse || this.config.responseParser);
        (0, invariant_1.default)(Array.isArray(this.config.steps), `Expected Headless provider to have a config containing {steps}, but got ${(0, json_1.safeJsonStringify)(this.config)}`);
        this.defaultTimeout = this.config.timeoutMs || 30000; // Default 30 seconds timeout
        this.headless = this.config.headless ?? true;
    }
    id() {
        return 'browser-provider';
    }
    toString() {
        return '[Browser Provider]';
    }
    async callApi(prompt, context) {
        const vars = {
            ...(context?.vars || {}),
            prompt,
        };
        let chromium, stealth;
        try {
            ({ chromium } = await Promise.resolve().then(() => __importStar(require('playwright-extra'))));
            ({ default: stealth } = await Promise.resolve().then(() => __importStar(require('puppeteer-extra-plugin-stealth'))));
        }
        catch (error) {
            return {
                error: `Failed to import required modules. Please ensure the following packages are installed:\n\tplaywright @playwright/browser-chromium playwright-extra puppeteer-extra-plugin-stealth\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
        chromium.use(stealth());
        const browser = await chromium.launch({
            headless: this.headless,
            args: ['--ignore-certificate-errors'],
        });
        const browserContext = await browser.newContext({
            ignoreHTTPSErrors: true,
        });
        if (this.config.cookies) {
            await this.setCookies(browserContext);
        }
        const page = await browserContext.newPage();
        const extracted = {};
        try {
            // Execute all actions
            for (const step of this.config.steps) {
                await this.executeAction(page, step, vars, extracted);
            }
        }
        catch (error) {
            await browser.close();
            return { error: `Headless execution error: ${error}` };
        }
        const finalHtml = await page.content();
        await browser.close();
        logger_1.default.debug(`Browser results: ${(0, json_1.safeJsonStringify)(extracted)}`);
        const ret = this.transformResponse(extracted, finalHtml);
        logger_1.default.debug(`Browser response transform output: ${ret}`);
        return { output: ret };
    }
    async setCookies(browserContext) {
        if (typeof this.config.cookies === 'string') {
            // Handle big blob string of cookies
            const cookieString = (0, file_1.maybeLoadFromExternalFile)(this.config.cookies);
            const cookiePairs = cookieString.split(';').map((pair) => pair.trim());
            const cookies = cookiePairs.map((pair) => {
                const [name, value] = pair.split('=');
                return { name, value };
            });
            await browserContext.addCookies(cookies);
        }
        else if (Array.isArray(this.config.cookies)) {
            // Handle array of cookie objects
            await browserContext.addCookies(this.config.cookies);
        }
    }
    async executeAction(page, action, vars, extracted) {
        const { action: actionType, args = {}, name } = action;
        const renderedArgs = this.renderArgs(args, vars);
        logger_1.default.debug(`Executing headless action: ${actionType}`);
        switch (actionType) {
            case 'navigate':
                (0, invariant_1.default)(renderedArgs.url, `Expected headless action to have a url when using 'navigate'`);
                logger_1.default.debug(`Navigating to ${renderedArgs.url}`);
                await page.goto(renderedArgs.url);
                break;
            case 'click':
                (0, invariant_1.default)(renderedArgs.selector, `Expected headless action to have a selector when using 'click'`);
                logger_1.default.debug(`Waiting for and clicking on ${renderedArgs.selector}`);
                const element = await this.waitForSelector(page, renderedArgs.selector);
                if (element) {
                    await page.click(renderedArgs.selector);
                }
                else if (renderedArgs.optional) {
                    logger_1.default.debug(`Optional element ${renderedArgs.selector} not found, continuing`);
                }
                else {
                    throw new Error(`Element not found: ${renderedArgs.selector}`);
                }
                break;
            case 'type':
                (0, invariant_1.default)(renderedArgs.text, `Expected headless action to have a text when using 'type'`);
                (0, invariant_1.default)(renderedArgs.selector, `Expected headless action to have a selector when using 'type'`);
                logger_1.default.debug(`Waiting for and typing into ${renderedArgs.selector}: ${renderedArgs.text}`);
                await this.waitForSelector(page, renderedArgs.selector);
                if (typeof renderedArgs.text === 'string') {
                    // Handle special characters
                    const specialKeys = {
                        '<enter>': 'Enter',
                        '<tab>': 'Tab',
                        '<escape>': 'Escape',
                    };
                    for (const [placeholder, key] of Object.entries(specialKeys)) {
                        const lowerText = renderedArgs.text.toLowerCase();
                        if (lowerText.includes(placeholder)) {
                            const parts = lowerText.split(placeholder);
                            for (let i = 0; i < parts.length; i++) {
                                if (parts[i]) {
                                    await page.fill(renderedArgs.selector, parts[i]);
                                }
                                if (i < parts.length - 1) {
                                    await page.press(renderedArgs.selector, key);
                                }
                            }
                            return;
                        }
                    }
                }
                // If no special characters, use the original fill method
                await page.fill(renderedArgs.selector, renderedArgs.text);
                break;
            case 'screenshot':
                (0, invariant_1.default)(renderedArgs.path, `Expected headless action to have a path when using 'screenshot'`);
                logger_1.default.debug(`Taking screenshot of ${renderedArgs.selector} and saving to ${renderedArgs.path}`);
                await page.screenshot({
                    fullPage: renderedArgs.fullPage,
                    path: renderedArgs.path,
                });
                break;
            case 'extract':
                (0, invariant_1.default)(renderedArgs.selector, `Expected headless action to have a selector when using 'extract'`);
                (0, invariant_1.default)(name, `Expected headless action to have a name when using 'extract'`);
                logger_1.default.debug(`Waiting for and extracting content from ${renderedArgs.selector}`);
                await this.waitForSelector(page, renderedArgs.selector);
                const extractedContent = await page.$eval(renderedArgs.selector, (el) => el.textContent);
                logger_1.default.debug(`Extracted content from ${renderedArgs.selector}: ${extractedContent}`);
                if (name) {
                    extracted[name] = extractedContent;
                }
                else {
                    throw new Error('Expected headless action to have a name when using `extract`');
                }
                break;
            case 'wait':
                logger_1.default.debug(`Waiting for ${renderedArgs.ms}ms`);
                await page.waitForTimeout(renderedArgs.ms);
                break;
            case 'waitForNewChildren':
                logger_1.default.debug(`Waiting for new element in ${renderedArgs.parentSelector}`);
                await this.waitForNewChildren(page, renderedArgs.parentSelector, renderedArgs.delay, renderedArgs.timeout);
                break;
            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    }
    async waitForSelector(page, selector) {
        try {
            return await page.waitForSelector(selector, { timeout: this.defaultTimeout });
        }
        catch {
            logger_1.default.warn(`Timeout waiting for selector: ${selector}`);
            return null;
        }
    }
    async waitForNewChildren(page, parentSelector, delay = 1000, timeout = this.defaultTimeout) {
        await page.waitForTimeout(delay);
        const initialChildCount = await page.$$eval(`${parentSelector} > *`, (elements) => elements.length);
        await page.waitForFunction(({ parentSelector, initialChildCount }) => {
            const currentCount = document.querySelectorAll(`${parentSelector} > *`).length;
            return currentCount > initialChildCount;
        }, { parentSelector, initialChildCount }, { timeout, polling: 'raf' });
    }
    renderArgs(args, vars) {
        const renderedArgs = {};
        for (const [key, value] of Object.entries(args)) {
            if (typeof value === 'string') {
                renderedArgs[key] = nunjucks.renderString(value, vars);
            }
            else {
                renderedArgs[key] = value;
            }
        }
        return renderedArgs;
    }
}
exports.BrowserProvider = BrowserProvider;
//# sourceMappingURL=browser.js.map