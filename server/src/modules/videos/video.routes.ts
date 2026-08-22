import { Router } from 'express';
import { VideoController } from './video.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';
import multer from 'multer';
import { BadRequestError } from '../../utils/errors';

const router = Router();

// Configure multer for memory storage (we upload to Supabase or handle local storage inside the service)
const ALLOWED_VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/mpeg',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB limit
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
router.post('/upload', authenticate, requireApprovedTeacher, upload.single('file'), VideoController.uploadVideo);

// Playback & Security endpoints (Authenticated Users with Entitlement Check)
router.get('/:videoId/playback-url', authenticate, VideoController.getPlaybackUrl);
router.get('/:videoId/stream', VideoController.streamLocalVideo); // Token is passed in query for this one

export default router;
