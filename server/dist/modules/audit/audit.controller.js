"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const prisma_1 = require("../../prisma");
const audit_service_1 = require("./audit.service");
const getAuditLogs = async (req, res) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                user: {
                    select: { name: true, email: true },
                },
            },
        });
        return res.status(200).json({ success: true, data: logs });
    }
    catch (error) {
        return res.status(200).json({ success: true, data: (0, audit_service_1.getInMemoryAuditLogs)() });
    }
};
exports.getAuditLogs = getAuditLogs;
