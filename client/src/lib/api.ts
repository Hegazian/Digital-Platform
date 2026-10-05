

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
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) return SESSION_DEAD;
    const data = await res.json();
    const accessToken = data?.data?.accessToken;
    if (!accessToken) return SESSION_DEAD;
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

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    let res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Auto-refresh session on 401 (except auth endpoints themselves)
    const isAuthEndpoint = endpoint.startsWith('/auth/');
    if (res.status === 401 && !isAuthEndpoint && !endpoint.includes('/playgrounds/execute')) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshSession();
        isRefreshing = false;

        if (newToken) {
          onRefreshed(newToken);
          res = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: { ...headers, Authorization: `Bearer ${newToken}` },
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
            ...options,
            headers: { ...headers, Authorization: `Bearer ${newToken}` },
            credentials: 'include',
          });
        }
      }
    }

    const text = await res.text();
    // Single untyped boundary: raw JSON is parsed once here; all consumers
    // above this layer work with concrete types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || `HTTP error ${res.status} ${res.statusText}` };
    }

    if (!res.ok) {
      throw new Error(data.message || `API request failed with status ${res.status}`);
    }
    return data;
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.warn(`API Error [${endpoint}]:`, errorObj.message);
    throw err;
  }
}
