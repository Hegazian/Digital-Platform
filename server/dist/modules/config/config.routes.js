"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const config_controller_1 = require("./config.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Publicly available config for the frontend to consume
router.get("/", config_controller_1.getAppConfig);
// Admin-only route to update config
router.patch("/", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), config_controller_1.updateAppConfig);
exports.default = router;
