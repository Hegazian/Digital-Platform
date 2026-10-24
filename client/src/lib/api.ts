

import { useAppStore } from './store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/**
 * Fired when the refresh cookie is definitively dead. The app-level provider
 * listens for this to purge user-scoped React Query caches in one place.
 */
export const SESSION_EXPIRED_EVENT = 'eduplat:session-expired';

let isRefreshing = false;
// Callbacks receive the renewed token, or null when the session is gone.
let refreshSubscribers: ((token: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export function clearLocalAccessToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
}

/**
 * Full local teardown when the session cannot be renewed: drops the access
 * token AND the persisted zustand user/role, then notifies cache owners.
 * Without this the UI keeps showing logged-in chrome while every request 401s.
 */
function teardownDeadSession() {
  clearLocalAccessToken();
  try {
    useAppStore.getState().setUser(null, null);
  } catch {
    // Store not hydrated yet - the token removal above is sufficient.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

/**
 * Renews the access token using the httpOnly refresh cookie. Safe to call
 * concurrently: parallel callers wait for a single in-flight refresh.
 * Returns null when the session cannot be renewed (logged out / revoked).
 */
/**
 * Sentinel value: the session is definitively dead (server rejected the
 * refresh). Callers should tear down local auth state.
 */
const SESSION_DEAD = null;

/**
 * Sentinel value: a transient network error prevented the refresh attempt.
 * Callers should NOT tear down the session — connectivity may return.
 */
const NETWORK_ERROR = undefined;

async function refreshSession(): Promise<string | null | undefined> {
  try {
    let res: Response;
    for (let attempt = 0; ; attempt += 1) {
      res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Browsers without Web Locks can still race across tabs. The winner's
      // Set-Cookie may arrive just after the loser's 409, so retry briefly
      // using the browser's now-current shared cookie jar.
      if (res.status !== 409 || attempt >= 2) break;
      await new Promise((resolve) => setTimeout(resolve, 75 * (attempt + 1)));
    }
    // Only an authentication denial proves the session is gone. Rate limits,
    // rotation conflicts and server outages must preserve the local session.
    if (!res.ok) return res.status === 401 || res.status === 403 ? SESSION_DEAD : NETWORK_ERROR;
    const data = await res.json();
    const accessToken = data?.data?.accessToken;
    if (typeof accessToken !== 'string' || !accessToken) return NETWORK_ERROR;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
    }
    // Sync the Zustand store so components reading useAppStore(s => s.token)
    // always have the latest access token after a refresh.
    try {
      const currentUser = useAppStore.getState().user;
      useAppStore.getState().setUser(currentUser, accessToken);
    } catch {
      // Store not hydrated yet — localStorage update above is sufficient.
    }
    return accessToken;
  } catch {
    // Network error (fetch TypeError): do NOT treat as a dead session.
    return NETWORK_ERROR;
  }
}

async function refreshSessionCoordinated(tokenThatFailed: string | null): Promise<string | null | undefined> {
  if (typeof window === 'undefined') return refreshSession();
  const refresh = async () => {
    const latestToken = localStorage.getItem('accessToken');
    if (latestToken && tokenThatFailed && latestToken !== tokenThatFailed) return latestToken;
    return refreshSession();
  };
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    try {
      return await navigator.locks.request('eduplatform-auth-refresh', { mode: 'exclusive' }, refresh);
    } catch {
      // A denied/aborted lock must settle queued callers and permit another retry.
      return NETWORK_ERROR;
    }
  }
  return refresh();
}

export async function fetchApi(endpoint: string, options: RequestInit & { responseType?: 'blob' } = {}) {
  const { responseType, ...requestOptions } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const isFormData = options.body instanceof FormData;

  const headers = new Headers(isFormData ? {} : { 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  const renewedHeaders = (newToken: string) => {
    const value = new Headers(headers);
    value.set('Authorization', `Bearer ${newToken}`);
    return value;
  };

  try {
    let res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...requestOptions,
      headers,
      credentials: 'include',
    });

    // Auto-refresh session on 401 (except auth endpoints themselves)
    const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/mfa-login', '/auth/logout'].includes(endpoint.split('?')[0]);
    if (res.status === 401 && !isAuthEndpoint && !endpoint.includes('/playgrounds/execute')) {
      const latestToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token && latestToken && latestToken !== token) {
        // A delayed response may arrive after a concurrent refresh has finished.
        res = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...requestOptions,
          headers: renewedHeaders(latestToken),
          credentials: 'include',
        });
      } else if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshSessionCoordinated(token);
        isRefreshing = false;

        if (newToken) {
          onRefreshed(newToken);
          res = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...requestOptions,
            headers: renewedHeaders(newToken),
            credentials: 'include',
          });
        } else if (newToken === NETWORK_ERROR) {
          // Transient network failure: don't destroy the session.
          // Settle queued waiters with null so they surface the original 401.
          onRefreshed(null);
        } else {
          // Session is definitively gone (SESSION_DEAD). Settle every queued
          // waiter with null so their promises don't hang forever, tear down
          // local auth state, and let this request fall through to surface its 401.
          onRefreshed(null);
          teardownDeadSession();
        }
      } else {
        // Park until the in-flight refresh settles. On failure the promise
        // resolves with null and we fall through so the original 401 is
        // surfaced normally instead of leaving the caller hanging.
        const newToken = await new Promise<string | null>((resolve) =>
          subscribeTokenRefresh(resolve)
        );
        if (newToken) {
          res = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...requestOptions,
            headers: renewedHeaders(newToken),
            credentials: 'include',
          });
        }
      }
    }

    if (res.ok && responseType === 'blob') return res.blob();
    const text = await res.text();
    // Single untyped boundary: raw JSON is parsed once here; all consumers
    // above this layer work with concrete types.
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || `HTTP error ${res.status} ${res.statusText}` };
    }

    if (!res.ok) {
      const error = new Error(data.message || `API request failed with status ${res.status}`);
      if (typeof data.code === 'string') Object.assign(error, { code: data.code });
      throw error;
    }
    return data;
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    // Effect cleanup/lesson navigation intentionally cancels document fetches.
    // Propagate cancellation for callers to settle, without an API warning.
    if (!requestOptions.signal?.aborted && !(err instanceof Error && err.name === 'AbortError')) {
      console.warn(`API Error [${endpoint}]:`, errorObj?.message);
    }
    throw err;
  }
}
