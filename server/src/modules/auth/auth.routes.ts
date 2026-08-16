import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, AuthRequest } from './auth.middleware';
import { validateBody } from '../../utils/validate';
import { registerSchema, loginSchema, refreshTokenSchema } from '../../utils/schemas';

const router = Router();

router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/refresh', validateBody(refreshTokenSchema), AuthController.refreshToken);

// Protected user endpoint
router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({ success: true, user: req.user });
});

export default router;
