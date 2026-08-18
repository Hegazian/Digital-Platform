import { Router } from 'express';
import { issueCertificate, verifyCertificate } from './certificate.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.post('/issue', authenticate, issueCertificate);
router.get('/verify/:code', verifyCertificate);

export default router;
