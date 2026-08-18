"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhook_controller_1 = require("./webhook.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Only ADMINs can manage Webhooks
router.post('/webhooks', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), webhook_controller_1.registerWebhook);
router.get('/webhooks', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), webhook_controller_1.getWebhooks);
exports.default = router;
