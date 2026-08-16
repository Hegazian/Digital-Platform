import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { QuizService } from './quiz.service';

export class QuizController {
  static async createQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const quiz = await QuizService.createQuiz(req.body);
      res.status(201).json({ success: true, data: quiz });
    } catch (error) {
      next(error);
    }
  }

  static async getQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
      const quiz = await QuizService.getQuizById(id, isTeacher);
      res.status(200).json({ success: true, data: quiz });
    } catch (error) {
      next(error);
    }
  }

  static async submitAttempt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const result = await QuizService.submitAttempt(userId, id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getMyAttempts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const attempts = await QuizService.getUserAttempts(userId, id);
      res.status(200).json({ success: true, data: attempts });
    } catch (error) {
      next(error);
    }
  }
}
