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

  static async updateQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const quiz = await QuizService.updateQuiz(id as string, req.body, req.user?.userId, req.user?.role);
      res.status(200).json({ success: true, data: quiz });
    } catch (error) {
      next(error);
    }
  }

  static async startAttempt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const attempt = await QuizService.startAttempt(userId, id as string);
      res.status(201).json({ success: true, data: attempt });
    } catch (error) {
      next(error);
    }
  }

  static async getQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
      const quiz = await QuizService.getQuizById(id as string, isTeacher);
      res.status(200).json({ success: true, data: quiz });
    } catch (error) {
      next(error);
    }
  }

  static async submitAttempt(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const result = await QuizService.submitAttempt(userId, id as string, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getMyAttempts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const attempts = await QuizService.getUserAttempts(userId, id as string);
      res.status(200).json({ success: true, data: attempts });
    } catch (error) {
      next(error);
    }
  }
}
