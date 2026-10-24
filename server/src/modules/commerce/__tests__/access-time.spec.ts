import { describe, expect, it } from 'vitest';
import { EntitlementStatus } from '@prisma/client';
import { effectiveEntitlementWhere, effectiveSubscriptionWhere, isGrantEffective } from '../access-time';

describe('effective access boundaries', () => {
  const now = new Date('2026-10-24T12:00:00.000Z');

  it('uses inclusive starts and exclusive expiry with explicit perpetual grants', () => {
    const base = { status: EntitlementStatus.ACTIVE, startsAt: now, expiresAt: null };
    expect(isGrantEffective(base, now)).toBe(true);
    expect(isGrantEffective({ ...base, startsAt: new Date(now.getTime() + 1) }, now)).toBe(false);
    expect(isGrantEffective({ ...base, expiresAt: new Date(now.getTime() + 1) }, now)).toBe(true);
    expect(isGrantEffective({ ...base, expiresAt: now }, now)).toBe(false);
    expect(isGrantEffective({ ...base, status: EntitlementStatus.REVOKED }, now)).toBe(false);
  });

  it('uses exact startsAt <= now < endDate and expiresAt <= now semantics in database predicates', () => {
    expect(effectiveEntitlementWhere(now)).toEqual({
      status: 'ACTIVE', startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    });
    expect(effectiveSubscriptionWhere(now)).toEqual({ status: 'ACTIVE', startDate: { lte: now }, endDate: { gt: now } });
  });
});
