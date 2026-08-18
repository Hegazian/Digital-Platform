import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export class NotificationService {
  static async createNotification(data: {
    userId: string;
    titleEn: string;
    titleAr: string;
    messageEn: string;
    messageAr: string;
  }) {
    return await prisma.notification.create({
      data: {
        user: { connect: { id: data.userId } },
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        messageEn: data.messageEn,
        messageAr: data.messageAr,
      },
    });
  }

  static async getUserNotifications(userId: string) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new BadRequestError('Unauthorized notification access');
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
