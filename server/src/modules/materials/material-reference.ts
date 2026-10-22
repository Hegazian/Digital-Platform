import { externalContentUrl, boundObjectKey } from '../../utils/media-references';

/** Public uploader links never identify platform-owned storage objects. */
export const externalMaterialUrl = externalContentUrl;

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
  return boundObjectKey(material.fileUrl, 'lesson-materials', material.id);
}
