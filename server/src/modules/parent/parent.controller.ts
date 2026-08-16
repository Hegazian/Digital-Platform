import { Response, NextFunction } from 'express';
import { ParentService } from './parent.service';
import { AuthRequest } from '../auth/auth.middleware';
import { BadRequestError } from '../../utils/errors';

export class ParentController {
  static async linkStudent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { studentEmail } = req.body;
      const parentId = req.user!.userId;

      if (!studentEmail) {
        throw new BadRequestError('studentEmail is required');
      }

      const link = await ParentService.linkStudent(parentId, studentEmail.trim().toLowerCase());

      res.status(201).json({
        success: true,
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getChildren(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const parentId = req.user!.userId;
      const children = await ParentService.getChildrenAnalytics(parentId);

      res.status(200).json({
        success: true,
        data: children,
      });
    } catch (error) {
      next(error);
    }
  }
}
