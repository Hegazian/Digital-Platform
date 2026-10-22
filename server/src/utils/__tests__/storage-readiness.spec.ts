import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('STORAGE_DRIVER', 'supabase'); vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(buckets)));
    await expect(StorageService.assertPrivateProductionStorage()).resolves.toBeUndefined();
  });
  it.each([{ value: buckets.map((b) => ({ ...b, public: true })) }, { value: buckets.slice(1) }, { value: {} }])('rejects public or missing buckets', async ({ value }) => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('STORAGE_DRIVER', 'supabase'); vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(value)));
    await expect(StorageService.assertPrivateProductionStorage()).rejects.toThrow('private');
  });
  it('fails closed when credentials or the storage service are unavailable', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('STORAGE_DRIVER', 'supabase'); vi.stubEnv('SUPABASE_URL', '');
    await expect(StorageService.assertPrivateProductionStorage()).rejects.toThrow('configuration');
    vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    await expect(StorageService.assertPrivateProductionStorage()).rejects.toThrow('verify');
  });
  it('rejects implicit or filesystem storage in production', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('STORAGE_DRIVER', '');
    await expect(StorageService.checkAvailability()).rejects.toThrow('explicitly set');
    vi.stubEnv('STORAGE_DRIVER', 'filesystem');
    await expect(StorageService.checkAvailability()).rejects.toThrow('Production requires');
    await expect(StorageService.uploadFile(Buffer.from('test'), 'test.pdf', 'application/pdf')).rejects.toThrow('Production requires');
  });
  it('probes the selected local filesystem and removes its temporary marker', async () => {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'eduplatform-storage-probe-'));
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('STORAGE_DRIVER', 'filesystem'); vi.stubEnv('UPLOADS_DIR', uploads);
    try {
      await expect(StorageService.checkAvailability()).resolves.toBeUndefined();
      expect(await fs.readdir(uploads)).toEqual([]);
    } finally {
      await fs.rm(uploads, { recursive: true, force: true });
    }
  });
  it('does not write a local fallback when the explicitly selected Supabase backend fails', async () => {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'eduplatform-storage-fail-closed-'));
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('STORAGE_DRIVER', 'supabase'); vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture'); vi.stubEnv('UPLOADS_DIR', uploads);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    try {
      await expect(StorageService.uploadFile(Buffer.from('test'), 'test.pdf', 'application/pdf')).rejects.toThrow('Private storage upload failed');
      expect(await fs.readdir(uploads)).toEqual([]);
    } finally {
      await fs.rm(uploads, { recursive: true, force: true });
    }
  });
});
