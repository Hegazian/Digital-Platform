import { verifySync } from 'otplib';
import { prisma } from '../prisma';
import { decryptMfaSecret } from './mfa-crypto';

export function verifiedTotpTimeStep(secret: string, token: string, afterTimeStep?: number | null): number | null {
  if (!secret || !token) return null;
  try {
    const verification = verifySync({
      token: String(token).trim(),
      secret,
      ...(afterTimeStep != null ? { afterTimeStep } : {}),
    });
    const step = (verification as { timeStep?: number } | null)?.timeStep;
    return verification?.valid && step != null && Number.isFinite(step) ? step : null;
  } catch {
    return null;
  }
}

/**
 * Verifies a TOTP code with replay protection: a successfully consumed
 * time step is persisted and rejected on every later attempt, so a single
 * 6-digit code cannot be replayed within (or after) its validity window.
 */
export async function verifyTotpToken(
  userId: string,
  secret: string,
  token: string
): Promise<boolean> {
  if (!secret || !token) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaLastTimeStep: true, mfaSecret: true, mfaEnabled: true, authVersion: true },
  });
  if (!user?.mfaEnabled || !user.mfaSecret || decryptMfaSecret(user.mfaSecret) !== secret) return false;

  const timeStep = verifiedTotpTimeStep(secret, token, user?.mfaLastTimeStep);
  if (timeStep == null) return false;
  const consumed = await prisma.user.updateMany({
    where: { id: userId, mfaEnabled: true, mfaSecret: user.mfaSecret, authVersion: user.authVersion, mfaLastTimeStep: user.mfaLastTimeStep ?? null },
    data: { mfaLastTimeStep: timeStep },
  });
  return consumed.count === 1;
}
