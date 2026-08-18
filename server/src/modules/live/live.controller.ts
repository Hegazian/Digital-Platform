import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { LiveService } from './live.service';

export class LiveController {
  static async createLiveSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teacherId = req.user!.userId;
      const session = await LiveService.createLiveSession({
        teacherId,
        ...req.body,
      });
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }

  static async getSubjectLiveSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const studentId = req.user!.userId;
      const { subjectId } = req.params;
      const sessions = await LiveService.getSubjectLiveSessions(studentId, subjectId as string);
      res.status(200).json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }
}
