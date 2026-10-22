import { Response, NextFunction } from 'express';
import { VideoService } from './video.service';
import { AuthRequest } from '../auth/auth.middleware';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../../utils/errors';
import { VIDEO_STREAM_SECRET } from '../../utils/env';
import { getUploadsRoot } from '../../utils/storage';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { boundObjectKey } from '../../utils/media-references';

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

      const secureUrl = await VideoService.getSecurePlaybackUrl(videoId as string, userId);
      res.setHeader('Cache-Control', 'private, no-store');

      res.status(200).json({
        success: true,
        data: {
          playbackUrl: secureUrl,
          expiresAt: new Date(Date.now() + 120_000).toISOString(),
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

      const secret = VIDEO_STREAM_SECRET;
      let payload: any;
      try {
        payload = jwt.verify(token as string, secret);
      } catch (err) {
        throw new UnauthorizedError('Invalid or expired stream token');
      }

      if (payload.videoId !== videoId || payload.purpose !== 'stream') {
        throw new UnauthorizedError('Invalid token purpose or video mismatch');
      }
      if (typeof payload.userId !== 'string' || !(await VideoService.verifyPlaybackAccess(videoId as string, payload.userId))) {
        throw new ForbiddenError('Video access is no longer available');
      }
      res.setHeader('Cache-Control', 'private, no-store');

      const { prisma } = await import('../../prisma');
      const video = await prisma.video.findUnique({ where: { id: videoId as string } });
      if (!video || !video.videoUrl || !video.videoUrl.startsWith('/uploads/')) {
        throw new BadRequestError('Local video not found');
      }
      boundObjectKey(video.videoUrl, 'lesson-videos', video.id);

      // Resolve the stored '/uploads/<bucket>/<file>' against the server's
      // real uploads root (cwd-independent - see getUploadsRoot) and pin it
      // inside that root (defense against crafted stored paths).
      const uploadsRoot = getUploadsRoot();
      const relativePath = video.videoUrl.replace(/^\/uploads\//, '');
      const filePath = path.join(uploadsRoot, relativePath);
      if (!filePath.startsWith(uploadsRoot + path.sep)) {
        throw new ForbiddenError('Invalid video storage path');
      }
      if (!fs.existsSync(filePath)) {
        throw new BadRequestError('Video file missing from disk');
      }
      const realRoot = fs.realpathSync(uploadsRoot);
      const realFilePath = fs.realpathSync(filePath);
      if (!realFilePath.startsWith(realRoot + path.sep)) throw new ForbiddenError('Invalid video storage path');

      const stat = fs.statSync(realFilePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const contentType = ({ '.webm': 'video/webm', '.mov': 'video/quicktime', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo', '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg' } as Record<string, string>)[path.extname(realFilePath).toLowerCase()] || 'video/mp4';
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);

      if (range) {
        const parsed = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        let start: number;
        let end: number;
        if (!parsed || fileSize === 0 || (!parsed[1] && !parsed[2])) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          return;
        }
        if (!parsed[1]) {
          const suffixLength = Number(parsed[2]);
          if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
            return;
          }
          start = Math.max(0, fileSize - suffixLength);
          end = fileSize - 1;
        } else {
          start = Number(parsed[1]);
          end = parsed[2] ? Number(parsed[2]) : fileSize - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= fileSize || end < start) {
            res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
            return;
          }
          end = Math.min(end, fileSize - 1);
        }
        const chunksize = end - start + 1;
        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(chunksize),
        });
        const file = fs.createReadStream(realFilePath, { start, end });
        file.on('error', (error) => {
          if (res.headersSent) res.destroy(error);
          else next(error);
        });
        res.on('close', () => {
          if (!res.writableEnded) file.destroy();
        });
        file.pipe(res);
      } else {
        res.status(200).set('Content-Length', String(fileSize));
        const file = fs.createReadStream(realFilePath);
        file.on('error', (error) => {
          if (res.headersSent) res.destroy(error);
          else next(error);
        });
        res.on('close', () => {
          if (!res.writableEnded) file.destroy();
        });
        file.pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }
}
