"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBleuScore = calculateBleuScore;
exports.handleBleuScore = handleBleuScore;
const invariant_1 = __importDefault(require("../util/invariant"));
const ngrams_1 = require("./ngrams");
/**
 * Calculates the brevity penalty for BLEU score.
 * Penalizes translations that are shorter than the reference.
 *
 * @param candidateLength - Length of candidate translation
 * @param referenceLength - Length of reference translation
 * @returns Brevity penalty score between 0 and 1
 * @internal
 */
function calculateBrevityPenalty(candidateLength, referenceLength) {
    if (candidateLength > referenceLength) {
        return 1;
    }
    return Math.exp(1 - candidateLength / referenceLength);
}
/**
 * Calculates BLEU score for a candidate string against reference strings.
 *
 * @param candidate - The string to evaluate
 * @param references - Array of reference strings to compare against
 * @param weights - Weights for each n-gram precision (1-gram to 4-gram)
 * @returns BLEU score between 0 and 1
 * @throws When inputs are invalid or weights don't sum to 1
 */
function calculateBleuScore(candidate, references, weights = [0.25, 0.25, 0.25, 0.25]) {
    if (!candidate || references.length === 0 || weights.length !== 4) {
        throw new Error('Invalid inputs');
    }
    if (Math.abs(weights.reduce((a, b) => a + b) - 1) > 1e-4) {
        throw new Error('Weights must sum to 1');
    }
    const candidateWords = candidate.toLowerCase().trim().split(/\s+/);
    // Find reference with closest length to candidate
    const refLengths = references.map((ref) => ref.toLowerCase().trim().split(/\s+/).length);
    const closestRefLength = refLengths.reduce((prev, curr) => Math.abs(curr - candidateWords.length) < Math.abs(prev - candidateWords.length) ? curr : prev);
    const maxN = 4;
    const precisions = [];
    for (let n = 1; n <= maxN; n++) {
        const candidateNGrams = (0, ngrams_1.getNGrams)(candidateWords, n);
        let maxClippedCount = 0;
        const totalCount = candidateNGrams.length;
        // Calculate n-gram matches against each reference
        for (const reference of references) {
            const referenceWords = reference.toLowerCase().trim().split(/\s+/);
            const referenceNGrams = (0, ngrams_1.getNGrams)(referenceWords, n);
            const candidateNGramCounts = new Map();
            const referenceNGramCounts = new Map();
            for (const gram of referenceNGrams) {
                referenceNGramCounts.set(gram, (referenceNGramCounts.get(gram) || 0) + 1);
            }
            for (const gram of candidateNGrams) {
                candidateNGramCounts.set(gram, (candidateNGramCounts.get(gram) || 0) + 1);
            }
            let clippedCount = 0;
            for (const [gram, count] of candidateNGramCounts.entries()) {
                const refCount = referenceNGramCounts.get(gram) || 0;
                clippedCount += Math.min(count, refCount);
            }
            // Take the maximum clipped count across all references
            maxClippedCount = Math.max(maxClippedCount, clippedCount);
        }
        const precision = totalCount > 0 ? maxClippedCount / totalCount : 0;
        precisions.push(precision);
    }
    const bp = calculateBrevityPenalty(candidateWords.length, closestRefLength);
    // Apply weights and calculate final score
    const weightedScore = precisions.reduce((acc, p, i) => {
        const smoothedP = p === 0 ? 1e-7 : p; // smoothing
        return acc + weights[i] * Math.log(smoothedP);
    }, 0);
    return bp * Math.exp(weightedScore);
}
/**
 * Handles BLEU score assertion for promptfoo.
 * Compares output against reference(s) using BLEU metric.
 *
 * @param assertion - The assertion configuration
 * @param inverse - Whether to invert the comparison
 * @param outputString - Actual output to evaluate
 * @param renderedValue - Expected output(s)
 * @returns Result of the BLEU score comparison
 */
function handleBleuScore({ assertion, inverse, outputString, renderedValue, }) {
    (0, invariant_1.default)(typeof renderedValue === 'string' ||
        (Array.isArray(renderedValue) && renderedValue.every((v) => typeof v === 'string')), '"bleu" assertion type must have a string or array of strings value');
    const threshold = assertion.threshold ?? 0.5;
    const references = Array.isArray(renderedValue) ? renderedValue : [renderedValue];
    const score = calculateBleuScore(outputString, references);
    const pass = score >= threshold !== inverse;
    return {
        pass,
        score: inverse ? 1 - score : score,
        reason: pass
            ? 'Assertion passed'
            : `BLEU score ${score.toFixed(4)} is ${inverse ? 'greater' : 'less'} than threshold ${threshold}`,
        assertion,
    };
}
//# sourceMappingURL=bleu.js.map