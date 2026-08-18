"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_token_controller_1 = require("./api-token.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Only ADMINs can create/view Developer API Tokens
router.post('/tokens', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), api_token_controller_1.createApiToken);
router.get('/tokens', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.ADMIN]), api_token_controller_1.getApiTokens);
exports.default = router;
