"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("./audit.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Only ADMINs can view Audit Logs
router.get('/', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), audit_controller_1.getAuditLogs);
exports.default = router;
