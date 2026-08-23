import crypto from 'crypto';
import { PAYMOB_HMAC_SECRET, FAWRY_SECRET_KEY } from './env';

/**
 * Calculates Paymob SHA-512 HMAC signature from sorted dictionary keys.
 */
export function calculatePaymobHmac(data: Record<string, any>, secret: string): string {
  const concatenatedValues = Object.keys(data)
    .sort()
    .map((k) => String(data[k]))
    .join('');
  return crypto.createHmac('sha512', secret).update(concatenatedValues).digest('hex');
}

/**
 * Cryptographically verifies incoming Paymob webhook signature using timing-safe comparison.
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
 * Calculates Fawry SHA-256 signature.
 */
export function calculateFawrySignature(
  merchantCode: string,
  merchantRefNum: string,
  amount: string,
  secret: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${merchantCode}${merchantRefNum}${amount}${secret}`)
    .digest('hex');
}

/**
 * Cryptographically verifies incoming Fawry webhook signature.
 */
export function verifyFawrySignature(
  data: { merchantCode: string; merchantRefNum: string; amount: string; signature?: string },
  secretKey?: string
): boolean {
  if (!data.signature) return false;
  const secret = secretKey || FAWRY_SECRET_KEY;
  const calculated = calculateFawrySignature(data.merchantCode, data.merchantRefNum, data.amount, secret);

  if (calculated.length !== data.signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(calculated, 'utf8'),
    Buffer.from(data.signature, 'utf8')
  );
}
