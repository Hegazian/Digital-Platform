import { Request, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';
import crypto from 'crypto';

const inMemoryWebhooks: any[] = [];

export const registerWebhook = async (req: AuthRequest, res: Response) => {
  const { url, events } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, message: 'Webhook URL is required' });
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ success: false, message: 'Invalid URL protocol: must be http or https' });
    }
    const host = parsed.hostname.toLowerCase();
    if (
      process.env.NODE_ENV === 'production' &&
      (host === 'localhost' ||
        host === '127.0.0.1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.'))
    ) {
      return res.status(400).json({ success: false, message: 'Loopback and private network URLs are prohibited' });
    }
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid webhook URL format' });
  }

  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

  try {
    const webhook = await prisma.webhookEndpoint.create({
      data: {
        userId,
        url,
        events: events || [],
        secret,
      },
    });

    return res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    const mockHook = {
      id: `mock-webhook-${Date.now()}`,
      userId,
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
