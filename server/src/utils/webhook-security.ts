import crypto from 'crypto';
import { PAYMOB_HMAC_SECRET, FAWRY_SECRET_KEY } from './env';

/**
 * Stable canonical serialization shared by all webhook signature schemes.
 * - Keys are sorted so JSON key order can never change a signature.
 * - Key NAMES are part of the signed material: values-only concatenation is
 *   collision-prone ({"a":"AB"} and {"a":"A","b":"B"} produce identical HMAC
 *   input), which would let one captured signature be transplanted onto a
 *   reshaped payload.
 * - Nested objects/arrays are deterministically stringified instead of
 *   degrading to "[object Object]".
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${k}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

function canonicalize(data: Record<string, unknown>): string {
  return Object.keys(data)
    .filter((k) => data[k] !== undefined)
    .sort()
    .map((k) => `${k}=${stableStringify(data[k])}`)
    .join('&');
}

/**
 * Calculates the Paymob HMAC-SHA512 signature over the full callback payload
 * (sorted key=value pairs). The whole body is covered so no field used to
 * decide fulfillment can be altered without invalidating the signature.
 */
export function calculatePaymobHmac(data: Record<string, any>, secret: string): string {
  return crypto.createHmac('sha512', secret).update(canonicalize(data)).digest('hex');
}

/**
 * Cryptographically verifies incoming Paymob webhook signatures using
 * timing-safe comparison. Accepts the HMAC from headers only — query-string
 * signatures end up in access logs, proxy logs and browser history.
 */
export function verifyPaymobSignature(
  data: Record<string, any>,
  receivedHmac?: string,
  secretKey?: string
): boolean {
  if (!receivedHmac) return false;

  const secret = secretKey || PAYMOB_HMAC_SECRET;
  const calculatedHmac = calculatePaymobHmac(data, secret);

  if (calculatedHmac.length !== receivedHmac.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac, 'utf8'),
    Buffer.from(receivedHmac, 'utf8')
  );
}

/**
 * Calculates the Fawry SHA-256 signature over the ENTIRE callback body minus
 * the signature field itself. Signing decision fields such as statusCode /
 * success is mandatory: an attacker who captures a legitimately-signed FAILED
 * delivery must not be able to flip statusCode to "200" and keep the
 * signature valid.
 *
 * NOTE: this is this platform's own scheme, not Fawry's documented one. When
 * integrating against the live Fawry gateway, replace verification with their
 * documented field list or server-side transaction verification.
 */
export function calculateFawrySignature(
  data: Record<string, unknown>,
  secret: string
): string {
  const { signature: _signature, ...signedFields } = data;
  return crypto
    .createHash('sha256')
    .update(`${canonicalize(signedFields)}${secret}`)
    .digest('hex');
}

/**
 * Cryptographically verifies incoming Fawry webhook signatures using
 * timing-safe comparison.
 */
export function verifyFawrySignature(
  data: Record<string, any> & { signature?: string },
  secretKey?: string
): boolean {
  if (!data.signature) return false;
  const secret = secretKey || FAWRY_SECRET_KEY;
  const calculated = calculateFawrySignature(data, secret);

  if (calculated.length !== data.signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(calculated, 'utf8'),
    Buffer.from(data.signature, 'utf8')
  );
}
