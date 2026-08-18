"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const playground_controller_1 = require("./playground.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
// Protect code execution so only logged-in users (students/teachers) can run code
router.post('/execute', auth_middleware_1.authenticate, playground_controller_1.executeCode);
exports.default = router;
