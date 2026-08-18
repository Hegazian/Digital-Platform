"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const progress_controller_1 = require("./progress.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const validate_1 = require("../../utils/validate");
const schemas_1 = require("../../utils/schemas");
const router = (0, express_1.Router)();
// All progress endpoints require authentication
router.use(auth_middleware_1.authenticate);
router.get('/summary', progress_controller_1.ProgressController.getSummary);
router.post('/:lessonId', (0, validate_1.validateBody)(schemas_1.updateWatchTimeSchema), progress_controller_1.ProgressController.updateWatchTime);
router.post('/:lessonId/complete', progress_controller_1.ProgressController.markCompleted);
exports.default = router;
