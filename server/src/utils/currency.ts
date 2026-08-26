import { prisma } from '../prisma';

/**
 * EGP is the single source of truth for all pricing. Admins set prices in
 * EGP; USD is always DERIVED from the configured exchange rate so both
 * currencies represent exactly the same money.
 *
 * Rate lives in AppConfig (admin-editable via Platform Settings) and is
 * cached briefly to avoid a DB round-trip on every price write.
 */
const FALLBACK_RATE_USD_TO_EGP = 48;
const RATE_CACHE_TTL_MS = 60_000;

let rateCache: { rate: number; expiresAt: number } | null = null;

export async function getUsdToEgpRate(): Promise<number> {
  if (rateCache && rateCache.expiresAt > Date.now()) {
    return rateCache.rate;
  }

  let rate = FALLBACK_RATE_USD_TO_EGP;
  try {
    const config = prisma.appConfig
      ? await prisma.appConfig.findFirst({
          select: { exchangeRateUsdToEgp: true },
        })
      : null;
    const configured = Number((config as any)?.exchangeRateUsdToEgp);
    if (Number.isFinite(configured) && configured > 0) {
      rate = configured;
    }
  } catch {
    // Config unavailable -> fallback keeps pricing functional.
  }

  rateCache = { rate, expiresAt: Date.now() + RATE_CACHE_TTL_MS };
  return rate;
}

/** USD equivalent of an EGP amount at the configured rate, rounded to cents. */
export async function egpToUsd(egp: number): Promise<number> {
  const rate = await getUsdToEgpRate();
  return Math.round((Number(egp || 0) / rate) * 100) / 100;
}

/** EGP equivalent of a USD amount (legacy clients that still send USD). */
export async function usdToEgp(usd: number): Promise<number> {
  const rate = await getUsdToEgpRate();
  return Math.round((Number(usd || 0) * rate) * 100) / 100;
}
