"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInMemoryAuditLogs = exports.logAuditAction = void 0;
const prisma_1 = require("../../prisma");
const inMemoryAuditLogs = [];
const logAuditAction = async (userId, action, entityId, entityType, details, ipAddress) => {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                userId,
                action,
                entityId,
                entityType,
                details: details ? details : undefined,
                ipAddress,
            },
        });
    }
    catch (error) {
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
exports.logAuditAction = logAuditAction;
const getInMemoryAuditLogs = () => inMemoryAuditLogs;
exports.getInMemoryAuditLogs = getInMemoryAuditLogs;
