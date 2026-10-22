import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { AssessmentService } from './assessment.service';

export class AssessmentController {
  // Question Pools
  static async listQuestionPools(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pools = await AssessmentService.listQuestionPools();
      res.status(200).json({ success: true, data: pools });
    } catch (err) {
      next(err);
    }
  }

  static async createQuestionPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pool = await AssessmentService.createQuestionPool(req.body);
      res.status(201).json({ success: true, data: pool });
    } catch (err) {
      next(err);
    }
  }

  static async addQuestionItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { poolId } = req.params;
      const question = await AssessmentService.addQuestionItem(poolId as string, req.body);
      res.status(201).json({ success: true, data: question });
    } catch (err) {
      next(err);
    }
  }

  // Assessments
  static async listAssessments(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assessments = await AssessmentService.listAssessments();
      res.status(200).json({ success: true, data: assessments });
    } catch (err) {
      next(err);
    }
  }

  static async createAssessment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const assessment = await AssessmentService.createAssessment(req.body);
      res.status(201).json({ success: true, data: assessment });
    } catch (err) {
      next(err);
    }
  }

  // Exam Assembly & Attempts
  static async startAssessmentAttempt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const { assessmentId } = req.params;
      const session = await AssessmentService.startAssessmentAttempt(studentId, assessmentId as string);
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }

  static async getAttempt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const { attemptId } = req.params;
      const attempt = await AssessmentService.getAttempt(studentId, attemptId as string);
      res.status(200).json({ success: true, data: attempt });
    } catch (err) {
      next(err);
    }
  }

  static async submitAttempt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const { attemptId } = req.params;
      const { answers } = req.body;
      const result = await AssessmentService.submitAttempt(studentId, attemptId as string, answers);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
