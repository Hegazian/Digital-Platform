/**
 * Shared API payload types used across components. Keep these structural
 * (server responses are validated at the API boundary; the UI treats them
 * as trusted shapes).
 */

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  code?: string;
  message?: string;
}

/** Parses a fetch response body defensively without resorting to `any`. */
export function parseJsonBody(text: string, status: number, statusText: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || `HTTP error ${status} ${statusText}` };
  }
}

export function hasMessage(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'message' in body;
}

/** Extracts a human-readable message from an unknown thrown value. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  if (hasMessage(err) && typeof err.message === 'string') return err.message;
  return fallback;
}

/** Reads a stable API error code without coupling callers to the transport shape. */
export function errorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('code' in err)) return undefined;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
