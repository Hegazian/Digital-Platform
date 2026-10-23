import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanupStaleUploadStaging, StorageService } from '../storage';

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
  it('cancels a disk-to-storage copy and removes its partial local object', async () => {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'eduplatform-storage-cancel-'));
    const source = path.join(uploads, 'staged.upload');
    const scope = randomUUID();
    const controller = new AbortController();
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('STORAGE_DRIVER', 'filesystem'); vi.stubEnv('UPLOADS_DIR', uploads);
    await fs.writeFile(source, Buffer.alloc(4 * 1024 * 1024, 7));
    controller.abort();
    try {
      await expect(StorageService.uploadFileFromPath(source, 'clip.mp4', 'video/mp4', 4 * 1024 * 1024, 'lesson-videos', scope, controller.signal)).rejects.toThrow();
      const destination = path.join(uploads, 'lesson-videos', scope);
      const files = await fs.readdir(destination).catch((error: NodeJS.ErrnoException) => error.code === 'ENOENT' ? [] : Promise.reject(error));
      expect(files).toEqual([]);
    } finally {
      await fs.rm(uploads, { recursive: true, force: true });
    }
  });
  it('uses a Node stream and fixed content length for Supabase video upload requests', async () => {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'eduplatform-storage-stream-'));
    const source = path.join(uploads, 'source.upload');
    const bytes = Buffer.from('video-stream-fixture');
    const scope = randomUUID();
    let requestUrl = '';
    let requestOptions: any;
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('STORAGE_DRIVER', 'supabase'); vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture'); vi.stubEnv('UPLOADS_DIR', uploads);
    await fs.writeFile(source, bytes);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, options: any) => {
      requestUrl = String(url);
      requestOptions = options;
      const chunks: Buffer[] = [];
      for await (const chunk of options.body) chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks)).toEqual(bytes);
      return new Response('', { status: 200 });
    });
    try {
      const objectPath = await StorageService.uploadFileFromPath(source, 'lesson.mp4', 'video/mp4', bytes.length, 'lesson-videos', scope);
      expect(requestUrl).toMatch(new RegExp(`/storage/v1/object/lesson-videos/${scope}/`));
      expect(requestOptions.duplex).toBe('half');
      expect(requestOptions.headers['Content-Length']).toBe(String(bytes.length));
      expect(objectPath).toContain(`lesson-videos/${scope}/`);
    } finally {
      await fs.rm(uploads, { recursive: true, force: true });
    }
  });
  it('attempts private-object cleanup after a failed Supabase streaming upload', async () => {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'eduplatform-storage-stream-failure-'));
    const source = path.join(uploads, 'source.upload');
    const scope = randomUUID();
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('STORAGE_DRIVER', 'supabase'); vi.stubEnv('SUPABASE_URL', 'https://storage.test.invalid'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture'); vi.stubEnv('UPLOADS_DIR', uploads);
    await fs.writeFile(source, 'video');
    const fetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    try {
      await expect(StorageService.uploadFileFromPath(source, 'lesson.mp4', 'video/mp4', 5, 'lesson-videos', scope)).rejects.toThrow('Private storage upload failed');
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch.mock.calls[1][1]?.method).toBe('DELETE');
    } finally {
      await fs.rm(uploads, { recursive: true, force: true });
    }
  });
});

describe('stale upload staging cleanup', () => {
  it('removes only expired regular .upload files from the private staging directory', async () => {
    const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'eduplatform-staging-cleanup-'));
    const staging = path.join(uploads, '.staging');
    const stale = path.join(staging, 'abandoned.upload');
    const active = path.join(staging, 'active.upload');
    const unrelated = path.join(staging, 'keep.txt');
    vi.stubEnv('UPLOADS_DIR', uploads);
    await fs.mkdir(staging);
    await Promise.all([fs.writeFile(stale, 'old'), fs.writeFile(active, 'active'), fs.writeFile(unrelated, 'keep')]);
    const now = Date.now();
    await fs.utimes(stale, new Date(now - 16 * 60_000), new Date(now - 16 * 60_000));
    await fs.utimes(active, new Date(now - 1_000), new Date(now - 1_000));
    try {
      await expect(cleanupStaleUploadStaging(15 * 60_000, now)).resolves.toBe(1);
      await expect(fs.readdir(staging).then((names) => names.sort())).resolves.toEqual(['active.upload', 'keep.txt']);
    } finally {
      await fs.rm(uploads, { recursive: true, force: true });
    }
  });

  it('rejects a retention shorter than the maximum upload request lifetime', async () => {
    await expect(cleanupStaleUploadStaging(1_000)).rejects.toThrow('maximum upload request lifetime');
  });
});
