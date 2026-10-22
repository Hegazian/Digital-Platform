import { BadRequestError, NotFoundError } from './errors';

/** Public external content never identifies platform-owned storage objects. */
export function externalContentUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new BadRequestError('Use a public HTTPS content URL or upload the file'); }
  const storageHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : undefined;
  const appHost = process.env.CLIENT_URL ? new URL(process.env.CLIENT_URL).hostname : undefined;
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.hostname === storageHost || url.hostname === appHost ||
      /(?:^|\.)supabase\.(?:co|in)$/i.test(url.hostname) ||
      /^\/(?:storage\/v1|api\/v1|uploads)(?:\/|$)/i.test(url.pathname)) {
    throw new BadRequestError('Use a public HTTPS content URL or upload the file');
  }
  return url.href;
}

export function boundObjectKey(stored: string, bucket: 'lesson-materials' | 'lesson-videos', resourceId: string): string {
  const key = stored.replace(/^\/uploads\//, '');
  const parts = key.split('/');
  if (parts.length !== 3 || parts[0] !== bucket || parts[1] !== resourceId ||
      !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(parts[2])) {
    throw new NotFoundError('Media reference requires verified re-upload');
  }
  return key;
}
