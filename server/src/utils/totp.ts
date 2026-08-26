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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaLastTimeStep: true },
  });

  const verification = verifySync({
    token,
    secret,
    ...(user?.mfaLastTimeStep != null ? { afterTimeStep: user.mfaLastTimeStep } : {}),
  });

  if (!verification.valid) {
    return false;
  }

  // Strategy is always TOTP here, but the union type includes HOTP results.
  const timeStep = (verification as { timeStep: number }).timeStep;
  await prisma.user.update({
    where: { id: userId },
    data: { mfaLastTimeStep: timeStep },
  });
  return true;
}
