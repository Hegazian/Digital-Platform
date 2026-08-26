import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../../prisma';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { verifyTotpToken } from '../../utils/totp';

export const setupMfa = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Re-enrolling on an MFA-active account effectively disables the existing
    // factor, so it demands proof of identity: current password AND a code
    // from the currently enrolled authenticator. A stolen access token alone
    // must not be able to strip a victim's second factor.
    if (user.mfaEnabled && user.mfaSecret) {
      const { currentPassword, currentToken } = req.body || {};
      if (!currentPassword || !currentToken) {
        return res.status(400).json({
          success: false,
          message:
            'MFA is already enabled. Provide your current password and a valid authenticator code to modify it.',
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Incorrect password' });
      }

      const isCodeValid = await verifyTotpToken(userId, user.mfaSecret, String(currentToken));
      if (!isCodeValid) {
        return res.status(401).json({ success: false, message: 'Invalid MFA token' });
      }
    }

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

    const isValid = await verifyTotpToken(userId, user.mfaSecret, String(token));

    if (isValid) {
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
