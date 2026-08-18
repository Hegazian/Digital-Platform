"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("./notification.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const notificationRouter = (0, express_1.Router)();
notificationRouter.get('/me', auth_middleware_1.authenticate, notification_controller_1.NotificationController.getMyNotifications);
notificationRouter.patch('/:id/read', auth_middleware_1.authenticate, notification_controller_1.NotificationController.markAsRead);
exports.default = notificationRouter;
