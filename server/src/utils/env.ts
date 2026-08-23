import crypto from 'crypto';

/**
 * Central secret resolution.
 *
 * Security invariants:
 * - Production (NODE_ENV=production) FAILS FAST if a required secret is
 *   missing or shorter than 32 chars. The server must never boot with a
 *   guessable signing key.
 * - Dev/test never fall back to a hardcoded constant either: an ephemeral
 *   random secret is generated per process instead. Tokens simply invalidate
 *   on restart rather than being forgeable by anyone who reads the source.
 */

const isProd = process.env.NODE_ENV === 'production';

function resolveSecret(name: string): string {
  const value = process.env[name];

  if (isProd && (!value || value.length < 32)) {
    throw new Error(
      `[config] ${name} is missing or too weak (<32 chars). ` +
        `Generate one with: openssl rand -base64 48`
    );
  }

  if (!value) {
    console.warn(
      `[config] ${name} not set - using an ephemeral random secret (dev/test only; tokens reset on restart)`
    );
    return crypto.randomBytes(48).toString('hex');
  }

  return value;
}

export const JWT_SECRET = resolveSecret('JWT_SECRET');
export const JWT_REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET');

/** Stream tokens may use a dedicated key; falls back to the main JWT secret. */
export const VIDEO_STREAM_SECRET = process.env.VIDEO_STREAM_SECRET || JWT_SECRET;

/**
 * Payment webhook HMAC keys. When unset outside production an ephemeral random
 * value is used, which makes every external signature verification fail closed
 * until real keys are configured.
 */
export const PAYMOB_HMAC_SECRET = resolveSecret('PAYMOB_HMAC_SECRET');
export const FAWRY_SECRET_KEY = resolveSecret('FAWRY_SECRET_KEY');
