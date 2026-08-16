import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { MaterialService } from './material.service';
import { BadRequestError } from '../../utils/errors';

export class MaterialController {
  static async uploadMaterial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const { lessonId, title } = req.body;
      const { userId, role } = req.user!;

      const material = await MaterialService.uploadMaterial({
        lessonId,
        title: title || req.file.originalname,
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        userId,
        userRole: role,
      });

      res.status(201).json({ success: true, data: material });
    } catch (error) {
      next(error);
    }
  }

  static async getMaterialsByLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { lessonId } = req.params;
      const { userId, role } = req.user!;

      const materials = await MaterialService.getMaterialsByLesson(lessonId, userId, role);
      res.status(200).json({ success: true, data: materials });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMaterial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { userId, role } = req.user!;

      const result = await MaterialService.deleteMaterial(id, userId, role);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
