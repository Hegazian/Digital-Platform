"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("./auth.middleware");
const validate_1 = require("../../utils/validate");
const schemas_1 = require("../../utils/schemas");
const router = (0, express_1.Router)();
router.post('/register', (0, validate_1.validateBody)(schemas_1.registerSchema), auth_controller_1.AuthController.register);
router.post('/login', (0, validate_1.validateBody)(schemas_1.loginSchema), auth_controller_1.AuthController.login);
router.post('/mfa-login', (0, validate_1.validateBody)(schemas_1.mfaLoginSchema), auth_controller_1.AuthController.mfaLogin);
router.post('/refresh', (0, validate_1.validateBody)(schemas_1.refreshTokenSchema), auth_controller_1.AuthController.refreshToken);
// Protected user endpoint
router.get('/me', auth_middleware_1.authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
});
exports.default = router;
