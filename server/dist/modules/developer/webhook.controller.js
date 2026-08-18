"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhooks = exports.registerWebhook = void 0;
const prisma_1 = require("../../prisma");
const crypto_1 = __importDefault(require("crypto"));
const inMemoryWebhooks = [];
const registerWebhook = async (req, res) => {
    const { url, events } = req.body;
    const userId = req.user?.userId;
    if (!url) {
        return res.status(400).json({ success: false, message: 'Webhook URL is required' });
    }
    const secret = `whsec_${crypto_1.default.randomBytes(24).toString('hex')}`;
    try {
        const webhook = await prisma_1.prisma.webhookEndpoint.create({
            data: {
                userId: userId || 'anonymous',
                url,
                events: events || [],
                secret,
            },
        });
        return res.status(201).json({ success: true, data: webhook });
    }
    catch (error) {
        const mockHook = {
            id: `mock-webhook-${Date.now()}`,
            userId: userId || 'anonymous',
            url,
            events: events || [],
            secret,
            isActive: true,
            createdAt: new Date().toISOString(),
        };
        inMemoryWebhooks.push(mockHook);
        return res.status(201).json({ success: true, data: mockHook });
    }
};
exports.registerWebhook = registerWebhook;
const getWebhooks = async (req, res) => {
    const userId = req.user?.userId;
    try {
        const webhooks = await prisma_1.prisma.webhookEndpoint.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({ success: true, data: webhooks });
    }
    catch (error) {
        return res.status(200).json({ success: true, data: inMemoryWebhooks });
    }
};
exports.getWebhooks = getWebhooks;
