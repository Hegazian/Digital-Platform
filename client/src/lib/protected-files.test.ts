import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDocumentUrl } from './protected-files';

describe('authenticated document delivery', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:document');
    URL.revokeObjectURL = vi.fn();
    localStorage.setItem('accessToken', 'current-access');
  });

  it.each(['/api/v1/materials/m1/content', '/api/v1/assignments/submission-files/f1/content'])(
    'authenticates %s before producing a blob URL', async (url) => {
      const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }));
      const resolved = await resolveDocumentUrl(url);
      expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer current-access' }), credentials: 'include' }));
      expect(resolved.url).toBe('blob:document');
      resolved.revoke();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:document');
      fetch.mockRestore();
    },
  );

  it('refreshes an expired access token before downloading', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{"message":"Expired"}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"data":{"accessToken":"renewed-access"}}'))
      .mockResolvedValueOnce(new Response('%PDF-1.7'));
    expect((await resolveDocumentUrl('/api/v1/materials/m1/content')).url).toBe('blob:document');
    expect(fetch.mock.calls[2][1]).toEqual(expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer renewed-access' }) }));
    fetch.mockRestore();
  });

  it('never sends credentials to external document hosts', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const external = await resolveDocumentUrl('https://school.example/document.pdf');
    expect(external.url).toBe('https://school.example/document.pdf');
    external.revoke();
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
    await expect(resolveDocumentUrl('javascript:alert(1)')).rejects.toThrow();
    await expect(resolveDocumentUrl('/uploads/unsafe.pdf')).rejects.toThrow();
  });

  it('surfaces a denied download without minting an object URL', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"message":"Access denied"}', { status: 403 }));
    await expect(resolveDocumentUrl('/api/v1/materials/m1/content')).rejects.toThrow('Access denied');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  it('rejects legacy active content before exposing a same-origin blob', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<script>test</script>', { headers: { 'Content-Type': 'text/html' } }));
    await expect(resolveDocumentUrl('/api/v1/materials/m1/content')).rejects.toThrow('active document');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
});
