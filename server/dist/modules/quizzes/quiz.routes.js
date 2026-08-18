"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quiz_controller_1 = require("./quiz.controller");
const auth_middleware_1 = require("../auth/auth.middleware");
const validate_1 = require("../../utils/validate");
const schemas_1 = require("../../utils/schemas");
const quizRouter = (0, express_1.Router)();
// Teacher routes
quizRouter.post('/', auth_middleware_1.authenticate, auth_middleware_1.requireApprovedTeacher, (0, validate_1.validateBody)(schemas_1.createQuizSchema), quiz_controller_1.QuizController.createQuiz);
// Shared / Student routes
quizRouter.get('/:id', auth_middleware_1.authenticate, quiz_controller_1.QuizController.getQuiz);
quizRouter.post('/:id/attempts', auth_middleware_1.authenticate, (0, validate_1.validateBody)(schemas_1.submitQuizAttemptSchema), quiz_controller_1.QuizController.submitAttempt);
quizRouter.get('/:id/attempts', auth_middleware_1.authenticate, quiz_controller_1.QuizController.getMyAttempts);
exports.default = quizRouter;
