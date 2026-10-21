import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '../storage';

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('production private bucket gate', () => {
  const buckets = ['lesson-videos', 'lesson-materials', 'submission-files'].map((id) => ({ id, public: false }));
  it('does not call external storage in local/test mode', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    await StorageService.assertPrivateProductionStorage();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts only a complete private bucket configuration', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(buckets)));
    await expect(StorageService.assertPrivateProductionStorage()).resolves.toBeUndefined();
  });
  it.each([{ value: buckets.map((b) => ({ ...b, public: true })) }, { value: buckets.slice(1) }, { value: {} }])('rejects public or missing buckets', async ({ value }) => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(value)));
    await expect(StorageService.assertPrivateProductionStorage()).rejects.toThrow('private');
  });
  it('fails closed when credentials or the storage service are unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SUPABASE_URL', '');
    await expect(StorageService.assertPrivateProductionStorage()).rejects.toThrow('configuration');
    vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    await expect(StorageService.assertPrivateProductionStorage()).rejects.toThrow('verify');
  });
});
