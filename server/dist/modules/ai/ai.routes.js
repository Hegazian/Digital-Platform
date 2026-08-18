"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("./ai.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
router.post('/tutor', auth_middleware_1.authenticate, ai_controller_1.askAITutor);
exports.default = router;
