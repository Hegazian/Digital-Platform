import { prisma } from '../../prisma';

const inMemoryAuditLogs: any[] = [];

export const logAuditAction = async (
  userId: string,
  action: string,
  entityId?: string,
  entityType?: string,
  details?: Record<string, any>,
  ipAddress?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityId,
        entityType,
        details: details ? details : undefined,
        ipAddress,
      },
    });
  } catch (error) {
    inMemoryAuditLogs.push({
      id: `mock-audit-${Date.now()}`,
      userId,
      action,
      entityId,
      entityType,
      details,
      ipAddress,
      createdAt: new Date().toISOString(),
    });
    console.warn('Audit DB error, logged to memory fallback.');
  }
};

export const getInMemoryAuditLogs = () => inMemoryAuditLogs;
