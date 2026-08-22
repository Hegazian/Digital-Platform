import { Router } from 'express';
import multer from 'multer';
import { BadRequestError } from '../../utils/errors';
import { MaterialController } from './material.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';

const ALLOWED_MATERIAL_MIME = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Audio (lesson podcasts)
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: (_req, file, cb) => {
    // NFR-001 / TC-TEACHER-063: reject unsupported uploads with a clear error.
    if (ALLOWED_MATERIAL_MIME.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new BadRequestError(`Unsupported material type "${file.mimetype}". Allowed: pdf, office docs, text, images, audio`));
  },
});

const materialRouter = Router();

// Teacher routes
materialRouter.post('/upload', authenticate, requireApprovedTeacher, upload.single('file'), MaterialController.uploadMaterial);
materialRouter.delete('/:id', authenticate, requireApprovedTeacher, MaterialController.deleteMaterial);

// Student / Access route
materialRouter.get('/lesson/:lessonId', authenticate, MaterialController.getMaterialsByLesson);

export default materialRouter;
