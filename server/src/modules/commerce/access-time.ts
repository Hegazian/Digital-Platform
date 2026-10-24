import { EntitlementStatus } from '@prisma/client';

export function isGrantEffective(
  grant: { status: EntitlementStatus | string; startsAt: Date; expiresAt: Date | null },
  now: Date
): boolean {
  return grant.status === EntitlementStatus.ACTIVE && grant.startsAt <= now && (!grant.expiresAt || now < grant.expiresAt);
}

export function effectiveEntitlementWhere(now: Date) {
  return {
    status: EntitlementStatus.ACTIVE,
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export function effectiveSubscriptionWhere(now: Date) {
  return {
    status: 'ACTIVE' as const,
    startDate: { lte: now },
    endDate: { gt: now },
  };
}
