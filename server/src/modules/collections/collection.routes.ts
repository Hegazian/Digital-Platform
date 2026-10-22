import { Router } from 'express';
import { z } from 'zod';
import {
  listCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  setCollectionCourses,
} from './collection.controller';
import { authenticate, requireRole, optionalAuth } from '../auth/auth.middleware';
import { Role } from '@prisma/client';
import { validateBody } from '../../utils/validate';

const router = Router();

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCollectionSchema = z.object({
  titleEn: z.string().min(2),
  titleAr: z.string().min(1),
  slug: z.string().min(2).max(80).regex(slugRegex, 'slug must be kebab-case'),
  description: z.string().max(500).optional(),
  thumbnail: z.string().max(500).optional(),
  isPublished: z.boolean().default(true),
});

export const updateCollectionSchema = createCollectionSchema.partial();

const setCoursesSchema = z.object({
  courseIds: z.array(z.string().uuid()).max(100).default([]),
});

// Public catalog (admins may pass ?includeUnpublished=true - requires
// optionalAuth so the controller can see the caller's role)
router.get('/', optionalAuth, listCollections);
router.get('/:id', optionalAuth, getCollectionById);

// Admin management
router.post('/', authenticate, requireRole([Role.ADMIN]), validateBody(createCollectionSchema), createCollection);
router.patch('/:id', authenticate, requireRole([Role.ADMIN]), validateBody(updateCollectionSchema), updateCollection);
router.delete('/:id', authenticate, requireRole([Role.ADMIN]), deleteCollection);
router.put(
  '/:id/courses',
  authenticate,
  requireRole([Role.ADMIN]),
  validateBody(setCoursesSchema),
  setCollectionCourses
);

export default router;
