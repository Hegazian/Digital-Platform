import { verifySync } from 'otplib';
import { prisma } from '../prisma';

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
    select: { mfaLastTimeStep: true },
  });

  try {
    const verification = verifySync({
      token: String(token).trim(),
      secret,
      ...(user?.mfaLastTimeStep != null ? { afterTimeStep: user.mfaLastTimeStep } : {}),
    });

    if (!verification || !verification.valid) {
      return false;
    }

    const timeStep = (verification as { timeStep?: number }).timeStep;
    if (timeStep != null && Number.isFinite(timeStep)) {
      await prisma.user.update({
        where: { id: userId },
        data: { mfaLastTimeStep: timeStep },
      });
    }

    return true;
  } catch {
    return false;
  }
}
