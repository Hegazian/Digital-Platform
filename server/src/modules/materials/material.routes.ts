import { Router } from 'express';
import multer from 'multer';
import { MaterialController } from './material.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

const materialRouter = Router();

// Teacher routes
materialRouter.post('/upload', authenticate, requireApprovedTeacher, upload.single('file'), MaterialController.uploadMaterial);
materialRouter.delete('/:id', authenticate, requireApprovedTeacher, MaterialController.deleteMaterial);

// Student / Access route
materialRouter.get('/lesson/:lessonId', authenticate, MaterialController.getMaterialsByLesson);

export default materialRouter;
