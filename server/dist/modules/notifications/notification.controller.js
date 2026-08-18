"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("./notification.service");
class NotificationController {
    static async getMyNotifications(req, res, next) {
        try {
            const userId = req.user.userId;
            const notifications = await notification_service_1.NotificationService.getUserNotifications(userId);
            res.status(200).json({ success: true, data: notifications });
        }
        catch (err) {
            next(err);
        }
    }
    static async markAsRead(req, res, next) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const updated = await notification_service_1.NotificationService.markAsRead(userId, id);
            res.status(200).json({ success: true, data: updated });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.NotificationController = NotificationController;
