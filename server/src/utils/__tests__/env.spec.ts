import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('production signing configuration', () => {
  it('starts without secrets for disabled payment gateways', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(48));
    vi.stubEnv('JWT_REFRESH_SECRET', 'y'.repeat(48));
    vi.stubEnv('PAYMOB_HMAC_SECRET', undefined);
    vi.stubEnv('FAWRY_SECRET_KEY', undefined);
    vi.stubEnv('VIDEO_STREAM_SECRET', undefined);
    const env = await import('../env');
    expect(env.JWT_SECRET).toHaveLength(48);
    expect(env.PAYMOB_HMAC_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.VIDEO_STREAM_SECRET).toBe(env.JWT_SECRET);
  });

  it('rejects a weak dedicated stream signing key', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(48));
    vi.stubEnv('JWT_REFRESH_SECRET', 'y'.repeat(48));
    vi.stubEnv('VIDEO_STREAM_SECRET', 'weak');
    await expect(import('../env')).rejects.toThrow('VIDEO_STREAM_SECRET');
  });
});
