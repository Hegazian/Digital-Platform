import { prisma } from '../prisma';

/**
 * EGP is the single source of truth for all pricing. Admins set prices in
 * EGP; USD is always DERIVED from the configured exchange rate so both
 * currencies represent exactly the same money.
 *
 * Rate lives in AppConfig and is used only to derive an indicative USD
 * display price. Read it for each conversion so admin changes take effect
 * immediately across all server instances.
 */
const FALLBACK_RATE_USD_TO_EGP = 48;

export async function getUsdToEgpRate(): Promise<number> {
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

  return rate;
}

/** USD equivalent of an EGP amount at the configured rate, rounded to cents. */
export async function egpToUsd(egp: number): Promise<number> {
  const rate = await getUsdToEgpRate();
  return Math.round((Number(egp || 0) / rate) * 100) / 100;
}
