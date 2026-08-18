"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mfa_controller_1 = require("./mfa.controller");
const auth_middleware_1 = require("./auth.middleware");
const router = (0, express_1.Router)();
router.post('/setup', auth_middleware_1.authenticate, mfa_controller_1.setupMfa);
router.post('/verify', auth_middleware_1.authenticate, mfa_controller_1.verifyMfa);
exports.default = router;
