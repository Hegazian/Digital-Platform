"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
class NotificationService {
    static async createNotification(data) {
        return await prisma_1.prisma.notification.create({
            data: {
                user: { connect: { id: data.userId } },
                titleEn: data.titleEn,
                titleAr: data.titleAr,
                messageEn: data.messageEn,
                messageAr: data.messageAr,
            },
        });
    }
    static async getUserNotifications(userId) {
        return await prisma_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    static async markAsRead(userId, notificationId) {
        const notification = await prisma_1.prisma.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            throw new errors_1.NotFoundError('Notification not found');
        }
        if (notification.userId !== userId) {
            throw new errors_1.BadRequestError('Unauthorized notification access');
        }
        return await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
    }
}
exports.NotificationService = NotificationService;
