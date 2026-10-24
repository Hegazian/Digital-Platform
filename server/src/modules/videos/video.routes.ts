import { stagedUploadStorage, validateUploadedFile, scanUploadedFile, requireUploadScanner, completeVideoUpload, VideoUploadLifecycle } from '../../utils/file-validation';
import { Router } from 'express';
import { VideoController } from './video.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';
import multer from 'multer';
import { AppError, BadRequestError } from '../../utils/errors';
import { unlink } from 'fs/promises';

const router = Router();
const MAX_CONCURRENT_VIDEO_UPLOADS = 2;
let activeVideoUploads = 0;

function admitVideoUpload(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  if (activeVideoUploads >= MAX_CONCURRENT_VIDEO_UPLOADS) {
    res.setHeader('Retry-After', '30');
    return next(new AppError(503, 'Video upload capacity is temporarily full. Retry shortly.'));
  }
  activeVideoUploads += 1;
  let releasePromise: Promise<void> | undefined;
  const controller = new AbortController();
  const lifecycle: VideoUploadLifecycle = {
    signal: controller.signal,
    complete: () => {
      if (!releasePromise) {
        releasePromise = (async () => {
          const stagedFile = (req as import('express').Request & { file?: Express.Multer.File }).file;
          if (stagedFile?.path) await unlink(stagedFile.path).catch(() => undefined);
          activeVideoUploads = Math.max(0, activeVideoUploads - 1);
        })();
      }
      return releasePromise;
    },
  };
  (req as import('express').Request & { videoUploadLifecycle?: VideoUploadLifecycle }).videoUploadLifecycle = lifecycle;
  req.once('aborted', () => controller.abort());
  res.once('finish', () => { void completeVideoUpload(req); });
  res.once('close', () => {
    if (!res.writableFinished) controller.abort();
  });
  req.setTimeout(15 * 60_000, () => req.destroy());
  next();
}

// Video bytes are staged on private disk and streamed onward, never retained as a request-sized Buffer.
const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/mpeg',
]);

const upload = multer({
  storage: multer.diskStorage(stagedUploadStorage()),
  limits: {
    // Multer 2.5 compensates for Busboy's equality boundary internally.
    // Keep the application cap exact; the load check tests both boundaries.
    fileSize: 500 * 1024 * 1024,
    files: 1,
    fields: 4,
    fieldSize: 8 * 1024,
    parts: 5,
  },
  fileFilter: (_req, file, cb) => {
    // NFR-001 / TC-TEACHER-063: reject unsupported uploads with a clear error.
    if (ALLOWED_VIDEO_MIME.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new BadRequestError(`Unsupported video type "${file.mimetype}". Allowed: mp4, webm, mov, avi, mkv, mpeg`));
  },
});

// Upload endpoint (Approved Teachers Only)
router.post('/upload', authenticate, requireApprovedTeacher, requireUploadScanner, admitVideoUpload, upload.single('file'), validateUploadedFile, scanUploadedFile, VideoController.uploadVideo);

// Playback & Security endpoints (Authenticated Users with Entitlement Check)
router.get('/:videoId/playback-url', authenticate, VideoController.getPlaybackUrl);
router.get('/:videoId/stream', VideoController.streamLocalVideo); // Token is passed in query for this one

router.use((error: unknown, req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
  void completeVideoUpload(req).finally(() => next(error));
});

export default router;
