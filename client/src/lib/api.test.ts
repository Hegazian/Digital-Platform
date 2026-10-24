import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ setUser: vi.fn(), user: { id: 'student-a', role: 'STUDENT' } }));
vi.mock('./store', () => ({ useAppStore: { getState: () => session } }));

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let fetchApi: typeof import('./api').fetchApi;
let transport: ReturnType<typeof vi.fn>;
let warning: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  vi.resetModules();
  session.setUser.mockClear();
  localStorage.setItem('accessToken', 'old-token');
  transport = vi.fn();
  vi.stubGlobal('fetch', transport);
  warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  ({ fetchApi } = await import('./api'));
});
afterEach(() => { warning.mockRestore(); });

describe('API transport and cancellation', () => {
  it('preserves Headers and authenticates managed byte delivery', async () => {
    transport.mockResolvedValue(new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }));
    const blob = await fetchApi('/materials/m1/content', { responseType: 'blob', headers: new Headers({ 'X-Request-ID': 'request-a' }) });
    expect(blob.type).toBe('application/pdf');
    const options = transport.mock.calls[0][1];
    expect(options.headers.get('Authorization')).toBe('Bearer old-token');
    expect(options.headers.get('X-Request-ID')).toBe('request-a');
    expect(options).not.toHaveProperty('responseType');
    expect(options.credentials).toBe('include');
  });

  it('lets the browser set a multipart boundary', async () => {
    transport.mockResolvedValue(json({ success: true }));
    await fetchApi('/assignments/upload', { method: 'POST', body: new FormData() });
    expect(transport.mock.calls[0][1].headers.has('Content-Type')).toBe(false);
  });

  it('propagates effect cleanup cancellation without an API warning', async () => {
    const controller = new AbortController();
    transport.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }));
    const pending = fetchApi('/materials/m1/content', { signal: controller.signal, responseType: 'blob' });
    controller.abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    expect(warning).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('also suppresses cancellation while reading the document body', async () => {
    const controller = new AbortController();
    transport.mockResolvedValue({ ok: true, status: 200, blob: () => {
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    } });
    await expect(fetchApi('/materials/m1/content', { signal: controller.signal, responseType: 'blob' })).rejects.toThrow('Aborted');
    expect(warning).not.toHaveBeenCalled();
  });

  it('keeps genuine server failures visible', async () => {
    transport.mockResolvedValue(json({ message: 'Storage is unavailable' }, 503));
    await expect(fetchApi('/materials/m1/content')).rejects.toThrow('Storage is unavailable');
    expect(warning).toHaveBeenCalledWith('API Error [/materials/m1/content]:', 'Storage is unavailable');
  });

  it('preserves stable API error codes for localized caller handling', async () => {
    transport.mockResolvedValue(json({ code: 'CONFIG_VERSION_CONFLICT', message: 'Configuration changed.' }, 409));
    await expect(fetchApi('/config', { method: 'PUT' })).rejects.toMatchObject({
      message: 'Configuration changed.',
      code: 'CONFIG_VERSION_CONFLICT',
    });
  });

  it('keeps genuine network failures visible', async () => {
    transport.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchApi('/courses')).rejects.toThrow('Failed to fetch');
    expect(warning).toHaveBeenCalled();
  });
});

describe('session renewal', () => {
  it.each(['/auth/profile', '/auth/me', '/courses/private/learning'])('renews protected %s and retries once', async (endpoint) => {
    transport.mockResolvedValueOnce(json({ message: 'Expired' }, 401))
      .mockResolvedValueOnce(json({ data: { accessToken: 'renewed-token' } }))
      .mockResolvedValueOnce(json({ success: true, data: { id: 'student-a' } }));
    expect((await fetchApi(endpoint)).success).toBe(true);
    expect(transport.mock.calls[1][0]).toBe('/api/v1/auth/refresh');
    expect(transport.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer renewed-token');
    expect(localStorage.getItem('accessToken')).toBe('renewed-token');
  });

  it.each([409, 429, 500, 503])('preserves the session when refresh returns %s', async (status) => {
    transport.mockResolvedValueOnce(json({ message: 'Expired' }, 401)).mockResolvedValueOnce(json({ message: 'Try later' }, status));
    await expect(fetchApi('/courses/private/learning')).rejects.toThrow('Expired');
    expect(localStorage.getItem('accessToken')).toBe('old-token');
    expect(session.setUser).not.toHaveBeenCalled();
  });

  it('preserves the session on an incomplete refresh response', async () => {
    transport.mockResolvedValueOnce(json({ message: 'Expired' }, 401)).mockResolvedValueOnce(json({ data: {} }));
    await expect(fetchApi('/auth/profile')).rejects.toThrow('Expired');
    expect(localStorage.getItem('accessToken')).toBe('old-token');
  });

  it('clears a definitively revoked session and notifies cache owners', async () => {
    const event = vi.fn();
    window.addEventListener('eduplat:session-expired', event);
    transport.mockResolvedValueOnce(json({ message: 'Expired' }, 401)).mockResolvedValueOnce(json({ message: 'Revoked' }, 401));
    await expect(fetchApi('/auth/profile')).rejects.toThrow('Expired');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(session.setUser).toHaveBeenCalledWith(null, null);
    expect(event).toHaveBeenCalledTimes(1);
    window.removeEventListener('eduplat:session-expired', event);
  });

  it('shares one refresh between concurrent protected requests', async () => {
    let finish!: (response: Response) => void;
    transport.mockImplementation((url, options) => {
      if (url.endsWith('/auth/refresh')) return new Promise<Response>((resolve) => { finish = resolve; });
      return Promise.resolve(options.headers.get('Authorization') === 'Bearer renewed-token'
        ? json({ success: true }) : json({ message: 'Expired' }, 401));
    });
    const one = fetchApi('/auth/profile');
    const two = fetchApi('/courses/private/learning');
    await vi.waitFor(() => expect(transport.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1));
    finish(json({ data: { accessToken: 'renewed-token' } }));
    expect((await Promise.all([one, two])).every((result) => result.success)).toBe(true);
    expect(transport).toHaveBeenCalledTimes(5);
  });

  it('uses the Web Lock winner token instead of rotating again in a second tab', async () => {
    const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
    const request = vi.fn(async (_name: string, _options: unknown, callback: () => Promise<unknown>) => {
      // Simulate another tab finishing its rotation while this tab waits.
      localStorage.setItem('accessToken', 'tab-winner-token');
      return callback();
    });
    try {
      Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
      transport.mockResolvedValueOnce(json({ message: 'Expired' }, 401))
        .mockResolvedValueOnce(json({ success: true }));

      expect((await fetchApi('/auth/profile')).success).toBe(true);
      expect(request).toHaveBeenCalledWith('eduplatform-auth-refresh', { mode: 'exclusive' }, expect.any(Function));
      expect(transport.mock.calls.some(([url]) => url.endsWith('/auth/refresh'))).toBe(false);
      expect(transport.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer tab-winner-token');
    } finally {
      if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks);
      else Reflect.deleteProperty(navigator, 'locks');
    }
  });

  it('settles waiting callers when a Web Lock is denied and permits the next refresh', async () => {
    const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
    try {
      Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn().mockRejectedValue(new Error('Lock denied')) } });
      transport.mockResolvedValue(json({ message: 'Expired' }, 401));
      const outcomes = await Promise.allSettled([fetchApi('/auth/profile'), fetchApi('/courses/private/learning')]);
      expect(outcomes.every(outcome => outcome.status === 'rejected')).toBe(true);
      expect(localStorage.getItem('accessToken')).toBe('old-token');
      Reflect.deleteProperty(navigator, 'locks');
      transport.mockReset().mockResolvedValueOnce(json({ message: 'Expired' }, 401))
        .mockResolvedValueOnce(json({ data: { accessToken: 'renewed-token' } })).mockResolvedValueOnce(json({ success: true }));
      expect((await fetchApi('/auth/profile')).success).toBe(true);
    } finally {
      if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks);
      else Reflect.deleteProperty(navigator, 'locks');
    }
  });

  it.each([undefined, 'blob'] as const)('retries a delayed old-token 401 with the already renewed token (%s)', async (responseType) => {
    let finishLate!: (response: Response) => void;
    let refreshes = 0;
    transport.mockImplementation((url, options) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes++;
        return Promise.resolve(refreshes === 1 ? json({ data: { accessToken: 'renewed-token' } }) : json({ message: 'Rate limited' }, 429));
      }
      if (options.headers.get('Authorization') === 'Bearer renewed-token') {
        return Promise.resolve(responseType === 'blob' && url.endsWith('/materials/late/content')
          ? new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }) : json({ success: true }));
      }
      if (url.endsWith('/materials/late/content')) return new Promise<Response>((resolve) => { finishLate = resolve; });
      return Promise.resolve(json({ message: 'Expired' }, 401));
    });
    const late = fetchApi('/materials/late/content', { responseType, headers: new Headers({ 'X-Request-ID': 'late' }) });
    expect((await fetchApi('/auth/profile')).success).toBe(true);
    finishLate(json({ message: 'Expired' }, 401));
    const result = await late;
    if (responseType === 'blob') expect(result.type).toBe('application/pdf');
    else expect(result.success).toBe(true);
    expect(refreshes).toBe(1);
    expect(transport.mock.calls.at(-1)?.[1].headers.get('Authorization')).toBe('Bearer renewed-token');
    expect(transport.mock.calls.at(-1)?.[1].headers.get('X-Request-ID')).toBe('late');
    expect(warning).not.toHaveBeenCalled();
  });

  it.each(['/auth/login', '/auth/register', '/auth/mfa-login', '/auth/refresh', '/auth/logout'])('never recursively refreshes %s', async (endpoint) => {
    transport.mockResolvedValue(json({ message: 'Invalid credentials' }, 401));
    await expect(fetchApi(endpoint)).rejects.toThrow('Invalid credentials');
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
