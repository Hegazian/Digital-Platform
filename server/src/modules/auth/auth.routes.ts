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
// Refresh accepts an httpOnly cookie (preferred) or body token (legacy).
router.post('/refresh', validateBody(refreshTokenSchema), AuthController.refreshToken);
// Logout requires no access token: it acts on the refresh cookie itself.
router.post('/logout', AuthController.logout);

// Protected user endpoint
router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({ success: true, user: req.user });
});

router.get('/profile', authenticate, AuthController.getProfile);
router.patch('/profile', authenticate, validateBody(updateProfileSchema), AuthController.updateProfile);

export default router;
