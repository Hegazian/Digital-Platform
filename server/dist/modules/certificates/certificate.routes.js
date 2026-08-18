"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const certificate_controller_1 = require("./certificate.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const router = (0, express_1.Router)();
router.post('/issue', auth_middleware_1.authenticate, certificate_controller_1.issueCertificate);
router.get('/verify/:code', certificate_controller_1.verifyCertificate);
exports.default = router;
