import { Response } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../../prisma';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

export const setupMfa = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const secret = generateSecret();
    const otpauth = generateURI({ label: user.email, issuer: 'EduPlatform', secret });
    const qrCode = await QRCode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: false }, // Not fully enabled until verified
    });

    return res.status(200).json({
      success: true,
      data: { secret, qrCode },
    });
  } catch (error) {
    console.error('MFA Setup Error:', error);
    return res.status(500).json({ success: false, message: 'Error setting up MFA' });
  }
};

export const verifyMfa = async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  const userId = req.user?.userId;

  if (!userId || !token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ success: false, message: 'MFA setup not initiated' });
    }

    const verification = verifySync({ token, secret: user.mfaSecret });

    if (verification.valid) {
      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      });
      return res.status(200).json({ success: true, message: 'MFA enabled successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid MFA token' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error verifying MFA' });
  }
};
