import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  calculatePaymobHmac,
  verifyPaymobSignature,
  calculateFawrySignature,
  verifyFawrySignature,
} from '../webhook-security';

/**
 * Regression tests for webhook signature integrity:
 * - key names are part of the signed material (collision resistance)
 * - Fawry decision fields (statusCode/success) are covered by the signature,
 *   so a legitimately-signed FAILED delivery cannot be flipped to success.
 */
describe('webhook-security canonical signing', () => {
  const PAYMOB_SECRET = process.env.PAYMOB_HMAC_SECRET || 'x'.repeat(32);
  const FAWRY_SECRET = process.env.FAWRY_SECRET_KEY || 'y'.repeat(32);

  describe('Paymob', () => {
    it('validates a legitimate signature', () => {
      const payload = { orderId: 'o1', transactionRef: 'tx1', success: true, amount: 300 };
      expect(verifyPaymobSignature(payload, calculatePaymobHmac(payload, PAYMOB_SECRET), PAYMOB_SECRET)).toBe(true);
    });

    it('rejects a signature transplanted onto a reshaped collision payload', () => {
      // Values-only schemes sign "AB" for both of these; ours must not.
      const sig = calculatePaymobHmac({ a: 'AB' }, PAYMOB_SECRET);
      expect(verifyPaymobSignature({ a: 'A', b: 'B' }, sig, PAYMOB_SECRET)).toBe(false);
    });

    it('rejects tampered field values', () => {
      const payload = { orderId: 'o1', transactionRef: 'tx1', success: true, amount: 300 };
      const sig = calculatePaymobHmac(payload, PAYMOB_SECRET);
      expect(verifyPaymobSignature({ ...payload, amount: 1 }, sig, PAYMOB_SECRET)).toBe(false);
      expect(verifyPaymobSignature({ ...payload, success: false }, sig, PAYMOB_SECRET)).toBe(false);
    });

    it('is insensitive to JSON key order', () => {
      const sig1 = calculatePaymobHmac({ orderId: 'o1', amount: 5 }, PAYMOB_SECRET);
      const sig2 = calculatePaymobHmac({ amount: 5, orderId: 'o1' }, PAYMOB_SECRET);
      expect(sig1).toBe(sig2);
    });
  });

  describe('Fawry', () => {
    it('validates a signature computed over the full body', () => {
      const body = {
        merchantCode: 'MC',
        merchantRefNum: 'ref-1',
        amount: '300.00',
        statusCode: '200',
        signature: '',
      };
      body.signature = calculateFawrySignature(body, FAWRY_SECRET);
      expect(verifyFawrySignature(body, FAWRY_SECRET)).toBe(true);
    });

    it('rejects flipping statusCode on a captured FAILED delivery (free-purchase attack)', () => {
      const failed = {
        merchantCode: 'MC',
        merchantRefNum: 'ref-2',
        amount: '300.00',
        statusCode: '1',
        signature: '',
      };
      failed.signature = calculateFawrySignature(failed, FAWRY_SECRET);

      // Attacker edits the unsigned-in-the-old-scheme decision field...
      const forged = { ...failed, statusCode: '200' };
      // ...the stolen signature must no longer verify.
      expect(verifyFawrySignature(forged, FAWRY_SECRET)).toBe(false);

      // Re-signing with the server secret is required, which outsiders can't do.
      forged.signature = calculateFawrySignature(forged, FAWRY_SECRET);
      expect(verifyFawrySignature(forged, FAWRY_SECRET)).toBe(true);
    });

    it('rejects missing signature', () => {
      expect(verifyFawrySignature({ merchantCode: 'MC' }, FAWRY_SECRET)).toBe(false);
    });
  });
});
