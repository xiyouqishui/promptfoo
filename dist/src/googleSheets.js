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
exports.checkGoogleSheetAccess = checkGoogleSheetAccess;
exports.fetchCsvFromGoogleSheetUnauthenticated = fetchCsvFromGoogleSheetUnauthenticated;
exports.fetchCsvFromGoogleSheetAuthenticated = fetchCsvFromGoogleSheetAuthenticated;
exports.fetchCsvFromGoogleSheet = fetchCsvFromGoogleSheet;
exports.writeCsvToGoogleSheet = writeCsvToGoogleSheet;
const fetch_1 = require("./fetch");
const logger_1 = __importDefault(require("./logger"));
async function checkGoogleSheetAccess(url) {
    try {
        const response = await (0, fetch_1.fetchWithProxy)(url);
        if (response.ok) {
            return { public: true, status: response.status };
        }
        else {
            return { public: false, status: response.status };
        }
    }
    catch (error) {
        logger_1.default.error(`Error checking sheet access: ${error}`);
        return { public: false };
    }
}
async function fetchCsvFromGoogleSheetUnauthenticated(url) {
    const { parse: parseCsv } = await Promise.resolve().then(() => __importStar(require('csv-parse/sync')));
    const gid = new URL(url).searchParams.get('gid');
    const csvUrl = `${url.replace(/\/edit.*$/, '/export')}?format=csv${gid ? `&gid=${gid}` : ''}`;
    const response = await (0, fetch_1.fetchWithProxy)(csvUrl);
    if (response.status !== 200) {
        throw new Error(`Failed to fetch CSV from Google Sheets URL: ${url}`);
    }
    const csvData = await response.text();
    return parseCsv(csvData, { columns: true });
}
async function fetchCsvFromGoogleSheetAuthenticated(url) {
    const { sheets: googleSheets, auth: googleAuth } = await Promise.resolve().then(() => __importStar(require('@googleapis/sheets')));
    const auth = new googleAuth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = googleSheets('v4');
    const match = url.match(/\/d\/([^/]+)/);
    if (!match) {
        throw new Error(`Invalid Google Sheets URL: ${url}`);
    }
    const spreadsheetId = match[1];
    let range = 'A1:ZZZ';
    const gid = Number(new URL(url).searchParams.get('gid'));
    if (gid) {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, auth });
        const sheetName = spreadsheet.data.sheets?.find((sheet) => sheet.properties?.sheetId === gid)
            ?.properties?.title;
        if (!sheetName) {
            throw new Error(`Sheet not found for gid: ${gid}`);
        }
        range = `${sheetName}!${range}`;
    }
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range, auth });
    const rows = response.data.values;
    if (!rows?.length) {
        throw new Error(`No data found in Google Sheets URL: ${url}`);
    }
    // Assuming the first row contains headers
    const headers = rows[0];
    const dataRows = rows.slice(1);
    return dataRows.map((row) => {
        const csvRow = {};
        headers.forEach((header, index) => {
            csvRow[header] = row[index] ?? '';
        });
        return csvRow;
    });
}
async function fetchCsvFromGoogleSheet(url) {
    const { public: isPublic } = await checkGoogleSheetAccess(url);
    logger_1.default.debug(`Google Sheets URL: ${url}, isPublic: ${isPublic}`);
    if (isPublic) {
        return fetchCsvFromGoogleSheetUnauthenticated(url);
    }
    return fetchCsvFromGoogleSheetAuthenticated(url);
}
async function writeCsvToGoogleSheet(rows, url) {
    const { sheets: googleSheets, auth: googleAuth } = await Promise.resolve().then(() => __importStar(require('@googleapis/sheets')));
    const auth = new googleAuth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = googleSheets('v4');
    const match = url.match(/\/d\/([^/]+)/);
    if (!match) {
        throw new Error(`Invalid Google Sheets URL: ${url}`);
    }
    const spreadsheetId = match[1];
    let range = 'A1:ZZZ';
    const gid = Number(new URL(url).searchParams.get('gid'));
    if (gid) {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, auth });
        const sheetName = spreadsheet.data.sheets?.find((sheet) => sheet.properties?.sheetId === gid)
            ?.properties?.title;
        if (!sheetName) {
            throw new Error(`Sheet not found for gid: ${gid}`);
        }
        range = `${sheetName}!${range}`;
    }
    else {
        // Create a new sheet if no gid is provided
        const newSheetTitle = `Sheet${Date.now()}`;
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            auth,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: newSheetTitle,
                            },
                        },
                    },
                ],
            },
        });
        range = `${newSheetTitle}!${range}`;
    }
    // Extract headers from the first row
    const headers = Object.keys(rows[0]);
    // Convert rows to a 2D array
    const values = [headers, ...rows.map((row) => headers.map((header) => row[header]))];
    // Write data to the sheet
    logger_1.default.debug(`Writing CSV to Google Sheets URL: ${url} with ${values.length} rows`);
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        auth,
        requestBody: {
            values,
        },
    });
}
//# sourceMappingURL=googleSheets.js.map