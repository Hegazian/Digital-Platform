import { Request, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';
import crypto from 'crypto';

const inMemoryWebhooks: any[] = [];

export const registerWebhook = async (req: AuthRequest, res: Response) => {
  const { url, events } = req.body;
  const userId = req.user?.userId;

  if (!url) {
    return res.status(400).json({ success: false, message: 'Webhook URL is required' });
  }

  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

  try {
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId: userId || 'anonymous',
        url,
        events: events || [],
        secret,
      },
    });

    return res.status(201).json({ success: true, data: webhook });
  } catch (error) {
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

export const getWebhooks = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  try {
    const webhooks = await prisma.webhookEndpoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: webhooks });
  } catch (error) {
    return res.status(200).json({ success: true, data: inMemoryWebhooks });
  }
};
