import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchApi, SESSION_EXPIRED_EVENT } from '../api';
import { useAppStore } from '../store';

describe('fetchApi client utility', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({ user: null, token: null });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('injects Bearer authorization header from localStorage', async () => {
    localStorage.setItem('accessToken', 'my-test-token');

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ success: true, data: { ok: true } }),
    });
    globalThis.fetch = fetchMock;

    const res = await fetchApi('/test-endpoint');
    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/test-endpoint',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-test-token',
        }),
      })
    );
  });

  it('performs single-flight token refresh and retries requests when receiving 401', async () => {
    localStorage.setItem('accessToken', 'old-expired-token');

    let refreshCallCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCallCount++;
        return {
          status: 200,
          ok: true,
          json: async () => ({
            success: true,
            data: { accessToken: 'new-fresh-token' },
          }),
        };
      }

      if (url.includes('/protected-data')) {
        const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
        const headers = lastCall?.[1]?.headers;
        if (headers?.Authorization === 'Bearer new-fresh-token') {
          return {
            status: 200,
            ok: true,
            text: async () => JSON.stringify({ success: true, data: 'secure data' }),
          };
        }
        return {
          status: 401,
          ok: false,
          text: async () => JSON.stringify({ success: false, message: 'Unauthorized' }),
        };
      }

      return {
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      };
    });

    globalThis.fetch = fetchMock;

    // Fire 2 concurrent requests
    const [res1, res2] = await Promise.all([
      fetchApi('/protected-data'),
      fetchApi('/protected-data'),
    ]);

    expect(res1.data).toBe('secure data');
    expect(res2.data).toBe('secure data');
    // Refresh endpoint should have been called only once for both concurrent requests
    expect(refreshCallCount).toBe(1);
    expect(localStorage.getItem('accessToken')).toBe('new-fresh-token');
  });

  it('dispatches eduplat:session-expired event and clears credentials when refresh fails', async () => {
    localStorage.setItem('accessToken', 'stale-token');
    useAppStore.setState({
      user: { id: 'u1', name: 'User', email: 'u@test.com', role: 'STUDENT' },
      token: 'stale-token',
    });

    const eventListener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, eventListener);

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        return {
          status: 401,
          ok: false,
          json: async () => ({ success: false, message: 'Session revoked' }),
        };
      }

      return {
        status: 401,
        ok: false,
        text: async () => JSON.stringify({ success: false, message: 'Unauthorized' }),
      };
    });

    globalThis.fetch = fetchMock;

    await expect(fetchApi('/orders/me')).rejects.toThrow();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(useAppStore.getState().user).toBeNull();
    expect(eventListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(SESSION_EXPIRED_EVENT, eventListener);
  });
});
