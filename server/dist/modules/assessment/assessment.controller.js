"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentController = void 0;
const assessment_service_1 = require("./assessment.service");
class AssessmentController {
    // Question Pools
    static async createQuestionPool(req, res, next) {
        try {
            const pool = await assessment_service_1.AssessmentService.createQuestionPool(req.body);
            res.status(201).json({ success: true, data: pool });
        }
        catch (err) {
            next(err);
        }
    }
    static async addQuestionItem(req, res, next) {
        try {
            const { poolId } = req.params;
            const question = await assessment_service_1.AssessmentService.addQuestionItem(poolId, req.body);
            res.status(201).json({ success: true, data: question });
        }
        catch (err) {
            next(err);
        }
    }
    // Assessments
    static async createAssessment(req, res, next) {
        try {
            const assessment = await assessment_service_1.AssessmentService.createAssessment(req.body);
            res.status(201).json({ success: true, data: assessment });
        }
        catch (err) {
            next(err);
        }
    }
    // Exam Assembly & Attempts
    static async startAssessmentAttempt(req, res, next) {
        try {
            const studentId = req.user.userId;
            const { assessmentId } = req.params;
            const session = await assessment_service_1.AssessmentService.startAssessmentAttempt(studentId, assessmentId);
            res.status(201).json({ success: true, data: session });
        }
        catch (err) {
            next(err);
        }
    }
    static async getAttempt(req, res, next) {
        try {
            const studentId = req.user.userId;
            const { attemptId } = req.params;
            const attempt = await assessment_service_1.AssessmentService.getAttempt(studentId, attemptId);
            res.status(200).json({ success: true, data: attempt });
        }
        catch (err) {
            next(err);
        }
    }
    static async submitAttempt(req, res, next) {
        try {
            const studentId = req.user.userId;
            const { attemptId } = req.params;
            const { answers } = req.body;
            const result = await assessment_service_1.AssessmentService.submitAttempt(studentId, attemptId, answers);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AssessmentController = AssessmentController;
