"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizController = void 0;
const quiz_service_1 = require("./quiz.service");
class QuizController {
    static async createQuiz(req, res, next) {
        try {
            const quiz = await quiz_service_1.QuizService.createQuiz(req.body);
            res.status(201).json({ success: true, data: quiz });
        }
        catch (error) {
            next(error);
        }
    }
    static async getQuiz(req, res, next) {
        try {
            const { id } = req.params;
            const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
            const quiz = await quiz_service_1.QuizService.getQuizById(id, isTeacher);
            res.status(200).json({ success: true, data: quiz });
        }
        catch (error) {
            next(error);
        }
    }
    static async submitAttempt(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const result = await quiz_service_1.QuizService.submitAttempt(userId, id, req.body);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMyAttempts(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const attempts = await quiz_service_1.QuizService.getUserAttempts(userId, id);
            res.status(200).json({ success: true, data: attempts });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.QuizController = QuizController;
