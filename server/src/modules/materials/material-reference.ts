import { BadRequestError, NotFoundError } from '../../utils/errors';

/** Public uploader links never identify platform-owned storage objects. */
export function externalMaterialUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new BadRequestError('Attach a public HTTPS document URL or upload the file'); }
  const storageHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : undefined;
  const appHost = process.env.CLIENT_URL ? new URL(process.env.CLIENT_URL).hostname : undefined;
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.hostname === storageHost || url.hostname === appHost ||
      /(?:^|\.)supabase\.(?:co|in)$/i.test(url.hostname) ||
      /^\/(?:storage\/v1|api\/v1|uploads)(?:\/|$)/i.test(url.pathname)) {
    throw new BadRequestError('Attach a public HTTPS document URL or upload the file');
  }
  return url.href;
}

export function materialDeliveryUrl(material: { id: string; fileUrl: string }): string {
  if (/^https?:\/\//i.test(material.fileUrl)) {
    try { return externalMaterialUrl(material.fileUrl); } catch { /* unverified legacy storage URL */ }
  }
  return `/api/v1/materials/${material.id}/content`;
}

/** New uploads bind the object key to the server-generated material identity.
 * Legacy unscoped references require verified re-upload; never infer ownership
 * from possession of an arbitrary storage key. */
export function materialObjectKey(material: { id: string; fileUrl: string }): string {
  const key = material.fileUrl.replace(/^\/uploads\//, '');
  const parts = key.split('/');
  if (parts.length !== 3 || parts[0] !== 'lesson-materials' || parts[1] !== material.id ||
      !/^[a-f0-9-]+\.[a-z0-9]+$/i.test(parts[2])) {
    throw new NotFoundError('Material reference requires verified re-upload');
  }
  return key;
}
