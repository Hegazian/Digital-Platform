import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate, AuthRequest } from './auth.middleware';
import { validateBody } from '../../utils/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  mfaLoginSchema,
  updateProfileSchema,
} from '../../utils/schemas';

const router = Router();

router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/mfa-login', validateBody(mfaLoginSchema), AuthController.mfaLogin);
router.post('/refresh', validateBody(refreshTokenSchema), AuthController.refreshToken);

// Protected user endpoint
router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/profile', authenticate, AuthController.getProfile);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), AuthController.updateProfile);

export default router;
