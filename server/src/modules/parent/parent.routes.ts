import { Router } from 'express';
import { ParentController } from './parent.controller';
import { authenticate, requireRole } from '../auth/auth.middleware';

const router = Router();

// All parent endpoints require PARENT role
router.use(authenticate, requireRole('PARENT'));

router.post('/link', ParentController.linkStudent);
router.get('/children', ParentController.getChildren);

export default router;
