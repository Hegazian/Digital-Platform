import fs from 'fs';
import path from 'path';
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

/**
 * Storage Utility for handling file uploads (Supabase Storage with local fallback).
 */
export class StorageService {
  /** A production process must never expose teaching/submission files from a public bucket. */
  static async assertPrivateProductionStorage(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !key || !base.startsWith('https://')) throw new Error('Production requires private Supabase storage configuration');
    const response = await fetch(`${base.replace(/\/$/, '')}/storage/v1/bucket`, { headers: { Authorization: `Bearer ${key}`, apikey: key }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error('Unable to verify private production storage');
    const buckets = await response.json();
    if (!Array.isArray(buckets) || ['lesson-videos', 'lesson-materials', 'submission-files'].some((id) => !buckets.some((bucket: any) => bucket.id === id && bucket.public === false))) {
      throw new Error('Educational and submission storage buckets must exist and be private');
    }
  }

  /**
   * Upload a file buffer to Supabase Storage or local fallback.
   */
  static async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, bucketName: string = 'lesson-materials'): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.match(/https:\/\/[^/]+/)?.[0];
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseKey)) {
      throw new Error('Private Supabase storage credentials are required in production');
    }

    const extension = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const uniqueFileName = `${randomUUID()}${extension}`;

    if (supabaseUrl && supabaseKey) {
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

        if (response.ok) {
          // Persist only private bucket paths. Delivery always goes through an authorized adapter.
          return `${bucketName}/${uniqueFileName}`;
        }
      } catch (error) {
        console.warn('Supabase storage upload failed');
      }
    }

    if (process.env.NODE_ENV === 'production' && supabaseUrl) {
      throw new Error('Private storage upload failed; production uploads cannot fall back to local storage');
    }

    // Local-only development fallback
    const uploadDir = path.join(getUploadsRoot(), bucketName);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localFilePath = path.join(uploadDir, uniqueFileName);
    fs.writeFileSync(localFilePath, fileBuffer);

    return `/uploads/${bucketName}/${uniqueFileName}`;
  }

  /**
   * Generates a secure, temporary signed URL for private bucket objects.
   * Expires only for the requested, bounded delivery interval.
   */
  static async getSignedUrl(internalPath: string, expiresIn: number = 120): Promise<string> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL?.match(/https:\/\/[^/]+/)?.[0];
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseKey)) {
      throw new Error('Private Supabase storage credentials are required in production');
    }

    if (internalPath.startsWith('/uploads/')) {
      // It's a local file. We return a backend API route that streams the file securely.
      // We will handle token generation at the video service level, so just return internal path.
      return internalPath;
    }

    if (supabaseUrl && supabaseKey) {
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
      const parts = fileUrl.split('/');
      const fileName = parts.pop()!;
      const bucketName = parts.pop()!;
      const root = path.resolve(getUploadsRoot());
      const localFilePath = path.resolve(root, bucketName, fileName);
      if (!localFilePath.startsWith(root + path.sep) || !fs.existsSync(localFilePath)) return;
      const realRoot = fs.realpathSync(root);
      const realFilePath = fs.realpathSync(localFilePath);
      if (realFilePath.startsWith(realRoot + path.sep)) fs.unlinkSync(realFilePath);
    }
    // Note: Supabase deletion can be added here if needed
  }
}
