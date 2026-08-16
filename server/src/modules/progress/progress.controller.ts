import { Response, NextFunction } from 'express';
import { ProgressService } from './progress.service';
import { AuthRequest } from '../auth/auth.middleware';
import { BadRequestError } from '../../utils/errors';

export class ProgressController {
  static async updateWatchTime(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { lessonId } = req.params;
      const { watchTimeDeltaSec } = req.body;
      const userId = req.user!.userId;

      if (typeof watchTimeDeltaSec !== 'number') {
        throw new BadRequestError('watchTimeDeltaSec must be a number');
      }

      const progress = await ProgressService.updateWatchTime(userId, lessonId, watchTimeDeltaSec);

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markCompleted(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { lessonId } = req.params;
      const userId = req.user!.userId;

      const progress = await ProgressService.markCompleted(userId, lessonId);

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const summary = await ProgressService.getStudentProgressSummary(userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}
