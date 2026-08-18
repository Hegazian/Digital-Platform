"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parent_controller_1 = require("./parent.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// All parent endpoints require PARENT role
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.PARENT]));
router.post('/link', parent_controller_1.ParentController.linkStudent);
router.post('/link-request', parent_controller_1.ParentController.requestLinkOtp);
router.post('/verify-otp', parent_controller_1.ParentController.verifyLinkOtp);
router.get('/children', parent_controller_1.ParentController.getChildren);
exports.default = router;
