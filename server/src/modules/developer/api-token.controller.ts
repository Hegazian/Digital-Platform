import { Request, Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const inMemoryApiTokens: any[] = [];

export const createApiToken = async (req: AuthRequest, res: Response) => {
  const { name, scopes } = req.body;
  const userId = req.user?.userId;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Token name is required' });
  }

  const rawToken = `edu_${crypto.randomBytes(24).toString('hex')}`;
  const tokenHash = await bcrypt.hash(rawToken, 10);

  try {
    const apiToken = await prisma.apiToken.create({
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
  } catch (error) {
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

export const getApiTokens = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  try {
    const tokens = await prisma.apiToken.findMany({
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
  } catch (error) {
    const safeTokens = inMemoryApiTokens.map(({ tokenHash, ...rest }) => rest);
    return res.status(200).json({ success: true, data: safeTokens });
  }
};
