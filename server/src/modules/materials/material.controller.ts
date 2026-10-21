import { Response, NextFunction } from 'express';
import { AuthRequest } from '../auth/auth.middleware';
import { MaterialService } from './material.service';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import fs from 'fs';
import path from 'path';
import { getUploadsRoot, StorageService } from '../../utils/storage';

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

      res.status(201).json({ success: true, data: { ...material, fileUrl: `/api/v1/materials/${material.id}/content` } });
    } catch (error) {
      next(error);
    }
  }

  static async getMaterialsByLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { lessonId } = req.params;
      const { userId, role } = req.user!;

      const materials = await MaterialService.getMaterialsByLesson(lessonId as string, userId, role);
      res.status(200).json({ success: true, data: materials });
    } catch (error) {
      next(error);
    }
  }

  static async getMaterialContent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const material = await MaterialService.getMaterialForDelivery(req.params.id as string, req.user!.userId, req.user!.role);
      res.setHeader('Cache-Control', 'private, no-store');
      const stored = material.fileUrl;
      if (stored.startsWith('/uploads/')) {
        const root = path.resolve(getUploadsRoot());
        const relative = stored.replace(/^\/uploads\//, '');
        const filePath = path.resolve(root, relative);
        if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) throw new NotFoundError('Material file not found');
        const realRoot = fs.realpathSync(root);
        const realFilePath = fs.realpathSync(filePath);
        if (!realFilePath.startsWith(realRoot + path.sep)) throw new NotFoundError('Material file not found');
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath).replace(/["\r\n]/g, '_')}"`);
        return res.sendFile(realFilePath, { dotfiles: 'allow' });
      }
      const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.match(/https:\/\/[^/]+/)?.[0];
      let internalPath = stored;
      if (/^https?:\/\//i.test(stored)) {
        const parsed = new URL(stored);
        const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+\/.+)$/);
        if (!match) throw new NotFoundError('Material file not found');
        internalPath = decodeURIComponent(match[1]);
      }
      const signedUrl = await StorageService.getSignedUrl(internalPath, 120);
      if (!supabaseUrl && /^https?:\/\//i.test(stored)) return res.redirect(302, signedUrl);
      res.redirect(302, signedUrl);
    } catch (error) { next(error); }
  }

  static async deleteMaterial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { userId, role } = req.user!;

      const result = await MaterialService.deleteMaterial(id as string, userId, role);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
