import { Request, Response, NextFunction } from 'express';
import { CareersService } from './careers.service';

export class CareersController {
  static async listTracks(_req: Request, res: Response, next: NextFunction) {
    try {
      const tracks = await CareersService.listTracks();
      res.status(200).json({ success: true, data: tracks });
    } catch (err) {
      next(err);
    }
  }

  static async getMyTrack(req: any, res: Response, next: NextFunction) {
    try {
      const track = await CareersService.getMyTrack(req.user.userId);
      res.status(200).json({ success: true, data: track });
    } catch (err) {
      next(err);
    }
  }

  static async getMyTrackProgress(req: any, res: Response, next: NextFunction) {
    try {
      const progress = await CareersService.getMyTrackProgress(req.user.userId);
      res.status(200).json({ success: true, data: progress });
    } catch (err) {
      next(err);
    }
  }

  static async setMyTrack(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.userId;
      const slug = req.body?.slug ?? null;
      const track = await CareersService.setMyTrack(userId, slug);
      res.status(200).json({
        success: true,
        data: track,
        message: track ? 'Career track saved' : 'Career track cleared',
      });
    } catch (err) {
      next(err);
    }
  }
}
