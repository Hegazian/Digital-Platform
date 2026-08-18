import { Response } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { prisma } from '../../prisma';
import { getInMemoryAuditLogs } from './audit.service';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(200).json({ success: true, data: getInMemoryAuditLogs() });
  }
};
