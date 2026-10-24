import crypto from 'node:crypto';
import { AppError } from './errors';

const PREFIX = 'mfa:v1:';

function encryptionKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) throw new AppError(503, 'MFA encryption is not configured');
  const key = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new AppError(503, 'MFA encryption key must decode to 32 bytes');
  return key;
}

export function encryptMfaSecret(secret: string): string {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${PREFIX}${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export function isEncryptedMfaSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Plain values are accepted only for the controlled pre-encryption migration window. */
export function decryptMfaSecret(value: string): string {
  if (!isEncryptedMfaSecret(value)) return value;
  const [ivPart, tagPart, bodyPart] = value.slice(PREFIX.length).split(':');
  if (!ivPart || !tagPart || !bodyPart) throw new AppError(503, 'Stored MFA secret is invalid');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(bodyPart, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError(503, 'MFA secret could not be decrypted; check key configuration');
  }
}
