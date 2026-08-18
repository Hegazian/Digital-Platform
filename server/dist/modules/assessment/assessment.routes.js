"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessment_controller_1 = require("./assessment.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const client_1 = require("@prisma/client");
const assessmentRouter = (0, express_1.Router)();
// Teacher Question Pool & Items Management
assessmentRouter.post('/pools', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, assessment_controller_1.AssessmentController.createQuestionPool);
assessmentRouter.post('/pools/:poolId/questions', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, assessment_controller_1.AssessmentController.addQuestionItem);
// Teacher Assessment Template Creation
assessmentRouter.post('/assessments', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, assessment_controller_1.AssessmentController.createAssessment);
// Student Exam Assembly & Attempts
assessmentRouter.post('/assessments/:assessmentId/start', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.STUDENT]), assessment_controller_1.AssessmentController.startAssessmentAttempt);
assessmentRouter.get('/attempts/:attemptId', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.STUDENT]), assessment_controller_1.AssessmentController.getAttempt);
assessmentRouter.post('/attempts/:attemptId/submit', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)([client_1.Role.STUDENT]), assessment_controller_1.AssessmentController.submitAttempt);
exports.default = assessmentRouter;
