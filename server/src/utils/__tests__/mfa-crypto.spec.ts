import { afterEach, describe, expect, it, vi } from 'vitest';
import { decryptMfaSecret, encryptMfaSecret, isEncryptedMfaSecret } from '../mfa-crypto';

afterEach(() => vi.unstubAllEnvs());

describe('MFA secret encryption', () => {
  it('uses authenticated encryption and rejects tampering', () => {
    vi.stubEnv('MFA_ENCRYPTION_KEY', '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff');
    const encrypted = encryptMfaSecret('JBSWY3DPEHPK3PXP');
    expect(isEncryptedMfaSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptMfaSecret(encrypted)).toBe('JBSWY3DPEHPK3PXP');
    expect(() => decryptMfaSecret(`${encrypted.slice(0, -2)}xx`)).toThrow('MFA secret could not be decrypted');
  });

  it('fails closed when encryption key is missing or malformed', () => {
    vi.stubEnv('MFA_ENCRYPTION_KEY', '');
    expect(() => encryptMfaSecret('secret')).toThrow('MFA encryption is not configured');
    vi.stubEnv('MFA_ENCRYPTION_KEY', 'not-a-key');
    expect(() => encryptMfaSecret('secret')).toThrow('32 bytes');
  });

  it('reads legacy plaintext only for the controlled encryption transition', () => {
    expect(decryptMfaSecret('legacy-secret')).toBe('legacy-secret');
  });
});
