import { fetchApi } from './api';

const managedContent = /^\/api\/v1\/(?:materials\/[^/]+|assignments\/submission-files\/[^/]+)\/content$/;

/** Managed resources use the same refresh-aware Bearer flow as JSON requests.
 * Tokens are never forwarded to uploader-supplied external URLs. */
export async function resolveDocumentUrl(fileUrl: string, signal?: AbortSignal): Promise<{ url: string; revoke: () => void }> {
  if (managedContent.test(fileUrl)) {
    const blob: Blob = await fetchApi(fileUrl.slice('/api/v1'.length), { responseType: 'blob', signal });
    // Old prototype uploads may have been mislabelled. Never turn active
    // HTML/SVG/XML/JavaScript into a same-origin blob document.
    if (/(?:html|svg|xml|javascript)/i.test(blob.type)) throw new Error('Unsupported active document type');
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  }
  const external = new URL(fileUrl);
  if (!['https:', 'http:'].includes(external.protocol)) throw new Error('Unsupported document URL');
  return { url: external.href, revoke: () => {} };
}
