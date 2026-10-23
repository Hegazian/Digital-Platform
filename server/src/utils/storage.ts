import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';

/**
 * Absolute uploads root, deliberately independent of process.cwd().
 *
 * Dev servers can be launched from different working directories (IDE task,
 * `npm --prefix`, repo root, a copied workspace). Deriving `/uploads/...`
 * paths from cwd makes previously uploaded files "vanish" whenever the
 * launch directory differs from the one used at upload time - the stream
 * endpoint then 400s and the player appears broken.
 *
 * Resolution order:
 * 1. UPLOADS_DIR env override (explicit deployments / volume mounts)
 * 2. The server package root, derived from this module's location so it is
 *    correct whether running from src (tsx) or dist (compiled JS)
 * 3. process.cwd() as a last-resort fallback (e.g. exotic test runners)
 */
export function getUploadsRoot(): string {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }
  try {
    // __dirname = <server>/src/utils (dev) or <server>/dist/utils (built);
    // ../../uploads is <server>/uploads in both layouts.
    return path.resolve(__dirname, '..', '..', 'uploads');
  } catch {
    return path.resolve(process.cwd(), 'uploads');
  }
}

/** Private, same-host staging area used only while an upload is validated and transferred. */
export function getUploadStagingRoot(): string {
  const directory = path.join(getUploadsRoot(), '.staging');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(directory, 0o700); } catch { /* Windows ACLs are managed by the host. */ }
  return directory;
}

/** Remove only abandoned regular upload files older than the maximum request lifetime. */
export async function cleanupStaleUploadStaging(
  staleAfterMs = 24 * 60 * 60 * 1000,
  now = Date.now()
): Promise<number> {
  if (!Number.isFinite(staleAfterMs) || staleAfterMs < 15 * 60 * 1000) {
    throw new Error('Upload staging retention must exceed the maximum upload request lifetime.');
  }
  const stagingRoot = path.resolve(getUploadStagingRoot());
  const entries = await fs.promises.readdir(stagingRoot, { withFileTypes: true });
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.upload')) continue;
    const filePath = path.resolve(stagingRoot, entry.name);
    if (path.dirname(filePath) !== stagingRoot) continue;
    try {
      const metadata = await fs.promises.lstat(filePath);
      if (!metadata.isFile() || now - metadata.mtimeMs < staleAfterMs) continue;
      await fs.promises.unlink(filePath);
      removed += 1;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return removed;
}

/**
 * Storage Utility for handling file uploads through the explicitly selected driver.
 */
export class StorageService {
  private static driver(): 'filesystem' | 'supabase' {
    const configured = process.env.STORAGE_DRIVER;
    if (configured === 'filesystem' || configured === 'supabase') {
      if (process.env.NODE_ENV === 'production' && configured !== 'supabase') throw new Error('Production requires STORAGE_DRIVER=supabase');
      return configured;
    }
    if (configured) throw new Error('STORAGE_DRIVER must be filesystem or supabase');
    if (process.env.NODE_ENV === 'production') throw new Error('STORAGE_DRIVER must be explicitly set to supabase in production');
    return 'filesystem';
  }

  private static supabaseConfig(): { base: string; key: string } {
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key || !base.startsWith('https://')) throw new Error('Private Supabase storage configuration is required');
    return { base: base.replace(/\/$/, ''), key };
  }

  private static async verifyPrivateBuckets(timeoutMs: number): Promise<void> {
    const { base, key } = this.supabaseConfig();
    let response: Response;
    try {
      response = await fetch(`${base}/storage/v1/bucket`, {
        headers: { Authorization: `Bearer ${key}`, apikey: key },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      throw new Error('Unable to verify private production storage');
    }
    if (!response.ok) throw new Error('Unable to verify private production storage');
    const buckets = await response.json();
    if (!Array.isArray(buckets) || ['lesson-videos', 'lesson-materials', 'submission-files'].some((id) => !buckets.some((bucket: any) => bucket.id === id && bucket.public === false))) {
      throw new Error('Educational and submission storage buckets must exist and be private');
    }
  }

  /** A bounded health probe for the explicitly selected storage backend. */
  static async checkAvailability(timeoutMs = 3_000): Promise<void> {
    const driver = this.driver();
    if (driver === 'supabase') return this.verifyPrivateBuckets(timeoutMs);
    if (process.env.NODE_ENV === 'production') throw new Error('Production cannot use filesystem storage');

    const root = getUploadsRoot();
    fs.mkdirSync(root, { recursive: true });
    const probePath = path.join(root, `.health-${randomUUID()}`);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        fs.promises.writeFile(probePath, 'ok', { flag: 'wx' }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Filesystem readiness probe timed out')), timeoutMs);
          timeout.unref?.();
        })
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
      try { await fs.promises.unlink(probePath); } catch { /* no file was created */ }
    }
  }

  /** A production process must never expose teaching/submission files from a public bucket. */
  static async assertPrivateProductionStorage(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    if (this.driver() !== 'supabase') throw new Error('Production requires STORAGE_DRIVER=supabase');
    await this.verifyPrivateBuckets(10_000);
  }

  /**
   * Upload a file buffer to the explicitly selected storage backend.
   */
  static async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, bucketName: string = 'lesson-materials', scope?: string): Promise<string> {
    const driver = this.driver();
    const { base: supabaseUrl, key: supabaseKey } = driver === 'supabase' ? this.supabaseConfig() : { base: '', key: '' };

    const extension = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (scope && !/^[a-f0-9-]+$/i.test(scope)) throw new Error('Invalid storage scope');
    const uniqueFileName = `${scope ? `${scope}/` : ''}${randomUUID()}${extension}`;

    if (driver === 'supabase') {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${uniqueFileName}`;
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'API-Key': supabaseKey,
            'Content-Type': mimeType,
            'x-upsert': 'false',
          },
          body: fileBuffer as any,
        });

        if (!response.ok) throw new Error('Storage upload rejected');
        // Persist only private bucket paths. Delivery always goes through an authorized adapter.
        return `${bucketName}/${uniqueFileName}`;
      } catch {
        throw new Error('Private storage upload failed');
      }
    }

    // Local-only development fallback
    const uploadDir = path.join(getUploadsRoot(), bucketName);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localFilePath = path.join(uploadDir, uniqueFileName);
    fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
    fs.writeFileSync(localFilePath, fileBuffer);

    return `/uploads/${bucketName}/${uniqueFileName}`;
  }

  /** Upload a staged file without loading its contents into API memory. */
  static async uploadFileFromPath(filePath: string, fileName: string, mimeType: string, sizeBytes: number, bucketName: string, scope: string, signal?: AbortSignal): Promise<string> {
    const extension = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (!scope || !/^[a-f0-9-]+$/i.test(scope)) throw new Error('Invalid storage scope');
    const uniqueFileName = `${scope}/${randomUUID()}${extension}`;
    const driver = this.driver();

    if (driver === 'filesystem') {
      if (process.env.NODE_ENV === 'production') throw new Error('Production cannot use filesystem storage');
      const destination = path.join(getUploadsRoot(), bucketName, uniqueFileName);
      await fs.promises.mkdir(path.dirname(destination), { recursive: true });
      try {
        await pipeline(fs.createReadStream(filePath), fs.createWriteStream(destination, { flags: 'wx', mode: 0o600 }), { signal });
      } catch (error) {
        await fs.promises.unlink(destination).catch(() => undefined);
        throw error;
      }
      return `/uploads/${bucketName}/${uniqueFileName}`;
    }

    const { base, key } = this.supabaseConfig();
    let response: Response;
    try {
      response = await fetch(`${base}/storage/v1/object/${bucketName}/${uniqueFileName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'API-Key': key,
          'Content-Type': mimeType,
          'Content-Length': String(sizeBytes),
          'x-upsert': 'false',
        },
        body: fs.createReadStream(filePath) as any,
        // Node's fetch requires duplex mode for a streaming request body.
        duplex: 'half',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15 * 60_000)]) : AbortSignal.timeout(15 * 60_000),
      } as RequestInit & { duplex: 'half' });
    } catch {
      await this.deleteFile(`${bucketName}/${uniqueFileName}`).catch(() => undefined);
      throw new Error('Private storage upload failed');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      await this.deleteFile(`${bucketName}/${uniqueFileName}`).catch(() => undefined);
      throw new Error('Private storage upload failed');
    }
    return `${bucketName}/${uniqueFileName}`;
  }

  /**
   * Generates a secure, temporary signed URL for private bucket objects.
   * Expires only for the requested, bounded delivery interval.
   */
  static async getSignedUrl(internalPath: string, expiresIn: number = 120): Promise<string> {
    const driver = this.driver();

    if (internalPath.startsWith('/uploads/')) {
      // It's a local file. We return a backend API route that streams the file securely.
      // We will handle token generation at the video service level, so just return internal path.
      return internalPath;
    }

    if (driver === 'supabase') {
      const { base: supabaseUrl, key: supabaseKey } = this.supabaseConfig();
      try {
        const boundedExpiry = Math.min(120, Math.max(1, Math.floor(expiresIn)));
        // internalPath format: "lesson-videos/163000000-video.mp4"
        const signUrl = `${supabaseUrl}/storage/v1/object/sign/${internalPath}`;
        const response = await fetch(signUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'API-Key': supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: boundedExpiry }),
        });

        if (response.ok) {
          const data = await response.json();
          // Supabase returns { signedURL: "/object/sign/..." }
          if (data.signedURL) {
             return `${supabaseUrl}/storage/v1${data.signedURL}`;
          }
        }
      } catch (error) {
        console.error('Error generating Supabase signed URL');
      }
    }
    
    throw new Error('Failed to generate signed URL');
  }

  /**
   * Delete a file from storage.
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    if (fileUrl.startsWith('/uploads/')) {
      const root = path.resolve(getUploadsRoot());
      const localFilePath = path.resolve(root, fileUrl.slice('/uploads/'.length));
      if (!localFilePath.startsWith(root + path.sep) || !fs.existsSync(localFilePath)) return;
      const realRoot = fs.realpathSync(root);
      const realFilePath = fs.realpathSync(localFilePath);
      if (realFilePath.startsWith(realRoot + path.sep)) fs.unlinkSync(realFilePath);
      return;
    }
    const driver = this.driver();
    if (driver !== 'supabase') return;
    const objectPath = fileUrl.replace(/^\//, '');
    if (!/^(?:lesson-videos|lesson-materials|submission-files)\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/.test(objectPath)) return;
    const { base, key } = this.supabaseConfig();
    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
    try {
      const response = await fetch(`${base}/storage/v1/object/${encodedPath}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}`, 'API-Key': key },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok && response.status !== 404) throw new Error('Private storage cleanup failed');
    } catch {
      throw new Error('Private storage cleanup failed');
    }
  }
}
