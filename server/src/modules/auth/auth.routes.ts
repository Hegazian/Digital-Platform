import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, requireRole } from './auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Example of a protected route
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: (req as any).user });
});

export default router;
