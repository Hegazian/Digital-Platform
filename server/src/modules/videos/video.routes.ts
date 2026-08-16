import { Router } from 'express';
import { VideoController } from './video.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';
import multer from 'multer';

const router = Router();

// Configure multer for memory storage (we upload to Supabase or handle local storage inside the service)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB limit
  },
});

// Upload endpoint (Approved Teachers Only)
router.post('/upload', authenticate, requireApprovedTeacher, upload.single('file'), VideoController.uploadVideo);

// Playback & Security endpoints (Authenticated Users with Entitlement Check)
router.get('/:videoId/playback-url', authenticate, VideoController.getPlaybackUrl);
router.get('/:videoId/stream', VideoController.streamLocalVideo); // Token is passed in query for this one

export default router;
