import { Router } from 'express';
import { createCollection, getCollections } from './collection.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', getCollections);
router.post('/', authenticate, requireRole([Role.ADMIN]), createCollection);

export default router;
