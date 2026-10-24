import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../../prisma';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { verifyTotpToken, verifiedTotpTimeStep } from '../../utils/totp';
import { decryptMfaSecret, encryptMfaSecret } from '../../utils/mfa-crypto';
import { UnauthorizedError, ConflictError } from '../../utils/errors';

const ENROLLMENT_TTL_MS = 10 * 60_000;
const RECOVERY_CODE_COUNT = 10;

function newRecoveryCode(): string {
  const raw = crypto.randomBytes(12).toString('hex').toUpperCase();
  return `${raw.slice(0, 6)}-${raw.slice(6, 12)}-${raw.slice(12, 18)}-${raw.slice(18)}`;
}

function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase().replace(/-/g, '')).digest('hex');
}

export const setupMfa = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user?.authVersion !== undefined && user.authVersion !== req.user.authVersion) throw new UnauthorizedError('Session authorization has changed');

    const pendingResponse = async (secret: string, expiresAt: Date) => {
      const qrCode = await QRCode.toDataURL(generateURI({ label: user.email, issuer: 'EduPlatform', secret }));
      return res.status(200).json({ success: true, data: { secret, qrCode, expiresAt } });
    };
    // Repeated initial setup (including Strict Mode and tab retries) keeps one
    // pending factor so a late response cannot replace the displayed secret.
    if (!user.mfaEnabled && user.mfaPendingSecret && user.mfaPendingExpiresAt && user.mfaPendingExpiresAt > new Date()) {
      return pendingResponse(decryptMfaSecret(user.mfaPendingSecret), user.mfaPendingExpiresAt);
    }

    if (user.mfaEnabled) {
      const currentPassword = req.body?.currentPassword;
      const currentToken = req.body?.currentToken;
      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
        throw new UnauthorizedError('Current password is invalid');
      }
      if (!user.mfaSecret || typeof currentToken !== 'string' ||
          !(await verifyTotpToken(user.id, decryptMfaSecret(user.mfaSecret), currentToken))) {
        throw new UnauthorizedError('Current authenticator code is invalid');
      }
    }

    // A pending replacement is isolated from the active factor. Closing or
    // abandoning setup therefore leaves the current authenticator untouched.
    const secret = generateSecret();
    const encrypted = encryptMfaSecret(secret);
    const expiresAt = new Date(Date.now() + ENROLLMENT_TTL_MS);
    const staged = await prisma.user.updateMany({
      where: { id: userId, isActive: true, authVersion: user.authVersion,
        mfaEnabled: user.mfaEnabled, mfaSecret: user.mfaSecret, mfaPendingSecret: user.mfaPendingSecret },
      data: {
        mfaPendingSecret: encrypted,
        mfaPendingExpiresAt: expiresAt,
        mfaPendingLastTimeStep: null,
      },
    });
    if (staged.count !== 1) {
      const winner = await prisma.user.findUnique({ where: { id: userId } });
      if (!user.mfaEnabled && winner?.isActive && !winner.mfaEnabled && winner.authVersion === user.authVersion && winner.mfaPendingSecret && winner.mfaPendingExpiresAt && winner.mfaPendingExpiresAt > new Date()) {
        return pendingResponse(decryptMfaSecret(winner.mfaPendingSecret), winner.mfaPendingExpiresAt);
      }
      throw new ConflictError('MFA enrollment changed; start setup again', 'MFA_ENROLLMENT_CHANGED');
    }
    return pendingResponse(secret, expiresAt);
  } catch (error) {
    return next(error);
  }
};

export const verifyMfa = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  const token = req.body?.token;
  if (!userId || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const now = new Date();
    if (user && req.user?.authVersion !== undefined && user.authVersion !== req.user.authVersion) throw new UnauthorizedError('Session authorization has changed');
    if (!user?.mfaPendingSecret || !user.mfaPendingExpiresAt || user.mfaPendingExpiresAt <= now) {
      return res.status(400).json({ success: false, message: 'MFA setup is missing or expired' });
    }

    const secret = decryptMfaSecret(user.mfaPendingSecret);
    const timeStep = verifiedTotpTimeStep(secret, token, user.mfaPendingLastTimeStep);
    if (timeStep == null) return res.status(400).json({ success: false, message: 'Invalid MFA token' });

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
    const saved = await prisma.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: {
          id: userId,
          isActive: true,
          authVersion: user.authVersion,
          mfaSecret: user.mfaSecret,
          mfaEnabled: user.mfaEnabled,
          mfaPendingSecret: user.mfaPendingSecret,
          mfaPendingExpiresAt: { gt: now },
          mfaPendingLastTimeStep: user.mfaPendingLastTimeStep,
        },
        data: {
          mfaSecret: user.mfaPendingSecret,
          mfaEnabled: true,
          mfaLastTimeStep: timeStep,
          mfaPendingSecret: null,
          mfaPendingExpiresAt: null,
          mfaPendingLastTimeStep: null,
        },
      });
      if (claimed.count !== 1) return false;

      await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
      await tx.mfaRecoveryCode.createMany({
        data: recoveryCodes.map((code) => ({ userId, codeHash: hashRecoveryCode(code) })),
      });
      return true;
    });

    if (!saved) throw new ConflictError('MFA enrollment changed; start setup again', 'MFA_ENROLLMENT_CHANGED');
    return res.status(200).json({
      success: true,
      message: 'MFA enabled successfully. Save these recovery codes now; they will not be shown again.',
      data: { recoveryCodes },
    });
  } catch (error) {
    return next(error);
  }
};

export const cancelMfaSetup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    await prisma.user.updateMany({
      where: { id: userId, ...(req.user?.authVersion !== undefined && { authVersion: req.user.authVersion }) },
      data: { mfaPendingSecret: null, mfaPendingExpiresAt: null, mfaPendingLastTimeStep: null },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};


export const adminResetMfa = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const adminId = req.user?.userId;
  const rawTargetId = req.params.userId;
  const targetId = Array.isArray(rawTargetId) ? rawTargetId[0] : rawTargetId;
  if (!targetId) return res.status(400).json({ success: false, message: 'Target user is required' });
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (reason.length < 10 || reason.length > 500) return res.status(400).json({ success: false, message: 'A reset reason between 10 and 500 characters is required' });
  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { id: true, mfaEnabled: true } });
      if (!target) throw new ConflictError('MFA account not found', 'MFA_ACCOUNT_NOT_FOUND');
      if (!target.mfaEnabled) throw new ConflictError('MFA is not enabled for this account', 'MFA_NOT_ENABLED');
      await tx.user.update({
        where: { id: targetId },
        data: {
          mfaSecret: null,
          mfaEnabled: false,
          mfaLastTimeStep: null,
          mfaPendingSecret: null,
          mfaPendingExpiresAt: null,
          mfaPendingLastTimeStep: null,
          authVersion: { increment: 1 },
        },
      });
      await tx.mfaRecoveryCode.deleteMany({ where: { userId: targetId } });
      await tx.refreshToken.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'MFA_ADMIN_RESET',
          entityId: targetId,
          entityType: 'User',
          details: { reason },
        },
      });
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};
