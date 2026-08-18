"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiTokens = exports.createApiToken = void 0;
const prisma_1 = require("../../prisma");
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const inMemoryApiTokens = [];
const createApiToken = async (req, res) => {
    const { name, scopes } = req.body;
    const userId = req.user?.userId;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Token name is required' });
    }
    const rawToken = `edu_${crypto_1.default.randomBytes(24).toString('hex')}`;
    const tokenHash = await bcrypt_1.default.hash(rawToken, 10);
    try {
        const apiToken = await prisma_1.prisma.apiToken.create({
            data: {
                userId: userId || 'anonymous',
                name,
                tokenHash,
                scopes: scopes || [],
            },
        });
        return res.status(201).json({
            success: true,
            data: {
                id: apiToken.id,
                name: apiToken.name,
                scopes: apiToken.scopes,
                createdAt: apiToken.createdAt,
                token: rawToken, // Only return the raw token once!
            },
        });
    }
    catch (error) {
        const mockToken = {
            id: `mock-token-${Date.now()}`,
            userId: userId || 'anonymous',
            name,
            tokenHash,
            scopes: scopes || [],
            createdAt: new Date().toISOString(),
        };
        inMemoryApiTokens.push(mockToken);
        return res.status(201).json({
            success: true,
            data: {
                ...mockToken,
                token: rawToken,
            },
        });
    }
};
exports.createApiToken = createApiToken;
const getApiTokens = async (req, res) => {
    const userId = req.user?.userId;
    try {
        const tokens = await prisma_1.prisma.apiToken.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                scopes: true,
                lastUsed: true,
                expiresAt: true,
                createdAt: true,
                // INTENTIONALLY OMITTING tokenHash for security
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({ success: true, data: tokens });
    }
    catch (error) {
        const safeTokens = inMemoryApiTokens.map(({ tokenHash, ...rest }) => rest);
        return res.status(200).json({ success: true, data: safeTokens });
    }
};
exports.getApiTokens = getApiTokens;
