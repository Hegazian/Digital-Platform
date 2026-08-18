"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMfa = exports.setupMfa = void 0;
const prisma_1 = require("../../prisma");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const setupMfa = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId)
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const secret = (0, otplib_1.generateSecret)();
        const otpauth = (0, otplib_1.generateURI)({ label: user.email, issuer: 'EduPlatform', secret });
        const qrCode = await qrcode_1.default.toDataURL(otpauth);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { mfaSecret: secret, mfaEnabled: false }, // Not fully enabled until verified
        });
        return res.status(200).json({
            success: true,
            data: { secret, qrCode },
        });
    }
    catch (error) {
        console.error('MFA Setup Error:', error);
        return res.status(500).json({ success: false, message: 'Error setting up MFA' });
    }
};
exports.setupMfa = setupMfa;
const verifyMfa = async (req, res) => {
    const { token } = req.body;
    const userId = req.user?.userId;
    if (!userId || !token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.mfaSecret) {
            return res.status(400).json({ success: false, message: 'MFA setup not initiated' });
        }
        const verification = (0, otplib_1.verifySync)({ token, secret: user.mfaSecret });
        if (verification.valid) {
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: { mfaEnabled: true },
            });
            return res.status(200).json({ success: true, message: 'MFA enabled successfully' });
        }
        else {
            return res.status(400).json({ success: false, message: 'Invalid MFA token' });
        }
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Error verifying MFA' });
    }
};
exports.verifyMfa = verifyMfa;
