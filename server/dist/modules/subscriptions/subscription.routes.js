"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("./subscription.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const validate_1 = require("../../utils/validate");
const schemas_1 = require("../../utils/schemas");
const subscriptionRouter = (0, express_1.Router)();
// Static Routes
subscriptionRouter.post('/manual', auth_middleware_1.authenticate, (0, validate_1.validateBody)(schemas_1.createManualSubscriptionSchema), subscription_controller_1.SubscriptionController.createManualSubscription);
subscriptionRouter.get('/me', auth_middleware_1.authenticate, subscription_controller_1.SubscriptionController.getMySubscriptions);
subscriptionRouter.get('/pending', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), subscription_controller_1.SubscriptionController.getPending);
// Parameterized Routes
subscriptionRouter.patch('/:id/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), subscription_controller_1.SubscriptionController.approve);
subscriptionRouter.patch('/:id/reject', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), subscription_controller_1.SubscriptionController.reject);
subscriptionRouter.delete('/:id', auth_middleware_1.authenticate, subscription_controller_1.SubscriptionController.cancelSubscription);
exports.default = subscriptionRouter;
