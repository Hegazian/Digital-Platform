import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { AdminService } from './admin.service';
import { BadRequestError } from '../../utils/errors';
import { Role, TeacherStatus } from '@prisma/client';

export class AdminController {
  /**
   * GET /api/v1/admin/users
   * Query params: role, teacherStatus, search, page, limit
   */
  static async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { role, teacherStatus, search, page, limit } = req.query;

      const result = await AdminService.getAllUsers({
        role: role as Role | undefined,
        teacherStatus: teacherStatus as TeacherStatus | undefined,
        search: search as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/teachers/pending
   */
  static async getPendingTeachers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const teachers = await AdminService.getPendingTeachers();
      res.status(200).json({ success: true, data: teachers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/teachers/:id/status
   * Body: { status: "APPROVED" | "REJECTED" }
   */
  static async updateTeacherStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
        throw new BadRequestError('status must be "APPROVED" or "REJECTED"');
      }

      const updated = await AdminService.updateTeacherStatus(id, status);

      res.status(200).json({
        success: true,
        message: `Teacher ${status.toLowerCase()} successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:id/active
   * Body: { isActive: boolean }
   */
  static async setUserActive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        throw new BadRequestError('isActive must be a boolean');
      }

      const updated = await AdminService.setUserActiveStatus(id, isActive);

      res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/stats
   */
  static async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getPlatformStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
