"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePaymobHmac = calculatePaymobHmac;
exports.verifyPaymobSignature = verifyPaymobSignature;
exports.calculateFawrySignature = calculateFawrySignature;
exports.verifyFawrySignature = verifyFawrySignature;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Calculates Paymob SHA-512 HMAC signature from sorted dictionary keys.
 */
function calculatePaymobHmac(data, secret) {
    const concatenatedValues = Object.keys(data)
        .sort()
        .map((k) => String(data[k]))
        .join('');
    return crypto_1.default.createHmac('sha512', secret).update(concatenatedValues).digest('hex');
}
/**
 * Cryptographically verifies incoming Paymob webhook signature using timing-safe comparison.
 */
function verifyPaymobSignature(data, receivedHmac, secretKey) {
    if (!receivedHmac)
        return false;
    const secret = secretKey || process.env.PAYMOB_HMAC_SECRET || 'test_paymob_hmac_secret_key_123';
    const calculatedHmac = calculatePaymobHmac(data, secret);
    if (calculatedHmac.length !== receivedHmac.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(Buffer.from(calculatedHmac, 'utf8'), Buffer.from(receivedHmac, 'utf8'));
}
/**
 * Calculates Fawry SHA-256 signature.
 */
function calculateFawrySignature(merchantCode, merchantRefNum, amount, secret) {
    return crypto_1.default
        .createHash('sha256')
        .update(`${merchantCode}${merchantRefNum}${amount}${secret}`)
        .digest('hex');
}
/**
 * Cryptographically verifies incoming Fawry webhook signature.
 */
function verifyFawrySignature(data, secretKey) {
    if (!data.signature)
        return false;
    const secret = secretKey || process.env.FAWRY_SECRET_KEY || 'test_fawry_secret_key_123';
    const calculated = calculateFawrySignature(data.merchantCode, data.merchantRefNum, data.amount, secret);
    if (calculated.length !== data.signature.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(Buffer.from(calculated, 'utf8'), Buffer.from(data.signature, 'utf8'));
}
