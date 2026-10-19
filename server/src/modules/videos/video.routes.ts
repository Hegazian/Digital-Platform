import { Router } from 'express';
import { VideoController } from './video.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';
import multer from 'multer';
import path from 'path';
import { BadRequestError } from '../../utils/errors';
import { getTempUploadsDir } from '../../utils/storage';

const router = Router();

// Configure multer for disk storage streaming (prevents V8 heap OOM on large 500MB uploads)
const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/mpeg',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getTempUploadsDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB limit
  },
  fileFilter: (_req, file, cb) => {
    // NFR-001 / TC-TEACHER-063: reject unsupported uploads before streaming to disk.
    if (ALLOWED_VIDEO_MIME.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new BadRequestError(`Unsupported video type "${file.mimetype}". Allowed: mp4, webm, mov, avi, mkv, mpeg`));
  },
});

// Upload endpoint (Approved Teachers Only)
router.post('/upload', authenticate, requireApprovedTeacher, upload.single('file'), VideoController.uploadVideo);

// Playback & Security endpoints (Authenticated Users with Entitlement Check)
router.get('/:videoId/playback-url', authenticate, VideoController.getPlaybackUrl);
router.get('/:videoId/stream', VideoController.streamLocalVideo); // Token is passed in query for this one

export default router;
