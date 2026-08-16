import { Response, NextFunction } from 'express';
import { VideoService } from './video.service';
import { AuthRequest } from '../auth/auth.middleware';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

export class VideoController {
  /**
   * Handles video upload from teacher.
   */
  static async uploadVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('No video file provided');
      }

      const userId = req.user!.userId;
      const video = await VideoService.uploadVideo(
        userId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );

      res.status(201).json({
        success: true,
        data: video,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a secure playback URL for authorized users.
   */
  static async getPlaybackUrl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { videoId } = req.params;
      const userId = req.user!.userId;

      const secureUrl = await VideoService.getSecurePlaybackUrl(videoId, userId);

      res.status(200).json({
        success: true,
        data: {
          playbackUrl: secureUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Streams a local video file (chunked) securely using a short-lived token.
   */
  static async streamLocalVideo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { videoId } = req.params;
      const { token } = req.query;

      if (!token) {
        throw new UnauthorizedError('Stream token is missing');
      }

      const secret = process.env.JWT_SECRET || 'fallback-secret';
      let payload: any;
      try {
        payload = jwt.verify(token as string, secret);
      } catch (err) {
        throw new UnauthorizedError('Invalid or expired stream token');
      }

      if (payload.videoId !== videoId || payload.purpose !== 'stream') {
        throw new UnauthorizedError('Invalid token purpose or video mismatch');
      }

      const { prisma } = await import('../../prisma');
      const video = await prisma.video.findUnique({ where: { id: videoId } });
      if (!video || !video.videoUrl || !video.videoUrl.startsWith('/uploads/')) {
        throw new BadRequestError('Local video not found');
      }

      // Convert '/uploads/lesson-videos/xxx.mp4' to absolute path
      const filePath = path.join(process.cwd(), video.videoUrl);
      if (!fs.existsSync(filePath)) {
        throw new BadRequestError('Video file missing from disk');
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }
}
