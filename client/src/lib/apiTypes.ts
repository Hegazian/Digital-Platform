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
