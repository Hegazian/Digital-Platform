import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { getPublicCapabilities } from "../../utils/capabilities";

export const persistConfigRevision = (
  transaction: <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>,
  id: string,
  expectedVersion: number,
  data: Record<string, unknown>,
) => transaction(async (tx) => {
  const result = await tx.appConfig.updateMany({
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
  if (result.count !== 1) return null;
  // The write lock remains held until this transaction commits, so another
  // admin cannot replace this response's version between update and readback.
  return tx.appConfig.findUnique({ where: { id } });
});

export const getAppConfig = async (req: Request, res: Response) => {
  try {
    let config = prisma.appConfig ? await prisma.appConfig.findFirst() : null;

    if (!config && prisma.appConfig) {
      config = await prisma.appConfig.create({
        data: {},
      });
    }

    // Never advertise staged capabilities as enabled, even if an old row or
    // forged admin setting stored true.
    res.status(200).json({ success: true, data: { ...config, currency: 'EGP', requireCourseApproval: true, enableCodePlaygrounds: false, enableCollaborativeBoards: false, capabilities: getPublicCapabilities() } });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
        version: 1,
        siteNameEn: "EduPlatform",
        siteNameAr: "منصة التعليم",
        siteDescriptionEn: "Next-generation Egyptian secondary education platform",
        siteDescriptionAr: "المنصة التعليمية المتقدمة لطلاب المرحلة الثانوية",
        hostDomain: "localhost:3000",
        supportEmail: "support@eduplatform.com",
        currency: "EGP",
        exchangeRateUsdToEgp: 48,
        requireCourseApproval: true,
        allowTeacherRegistration: true,
        enableCodePlaygrounds: false,
        enableCollaborativeBoards: false,
        primaryColor: "#4f46e5",
        capabilities: getPublicCapabilities(),
      },
    });
  }
};

export const updateAppConfig = async (req: Request, res: Response) => {
  try {
    const {
      expectedVersion,
      siteNameEn,
      siteNameAr,
      siteDescriptionEn,
      siteDescriptionAr,
      sloganEn,
      sloganAr,
      hostDomain,
      supportEmail,
      currency,
      exchangeRateUsdToEgp,
      requireCourseApproval,
      allowTeacherRegistration,
      enableCodePlaygrounds,
      enableCollaborativeBoards,
      primaryColor,
      homeContent,
    } = req.body;

    const data: any = {
      ...(siteNameEn !== undefined && { siteNameEn }),
      ...(siteNameAr !== undefined && { siteNameAr }),
      ...(siteDescriptionEn !== undefined && { siteDescriptionEn }),
      ...(siteDescriptionAr !== undefined && { siteDescriptionAr }),
      ...(sloganEn !== undefined && { sloganEn }),
      ...(sloganAr !== undefined && { sloganAr }),
      ...(hostDomain !== undefined && { hostDomain }),
      ...(supportEmail !== undefined && { supportEmail }),
      ...(currency !== undefined && { currency }),
      // EGP is the only charge currency. This rate is for indicative USD display.
      ...(exchangeRateUsdToEgp !== undefined && {
        exchangeRateUsdToEgp,
      }),
      // Course approval is a platform invariant; clients cannot turn it off.
      requireCourseApproval: true,
      ...(allowTeacherRegistration !== undefined && { allowTeacherRegistration: Boolean(allowTeacherRegistration) }),
      // Hard-off until isolated execution and realtime collaboration gates pass.
      enableCodePlaygrounds: false,
      enableCollaborativeBoards: false,
      ...(primaryColor !== undefined && { primaryColor }),
      ...(homeContent !== undefined && { homeContent }),
    };

    if (!prisma.appConfig) {
      return res.status(503).json({ success: false, message: 'Configuration storage is unavailable' });
    }

    const current = await prisma.appConfig.findFirst();
    if (!current || current.version !== expectedVersion) {
      return res.status(409).json({ success: false, code: 'CONFIG_VERSION_CONFLICT', message: 'Configuration changed since it was loaded. Reload and try again.' });
    }

    const config = await persistConfigRevision(
      (callback) => prisma.$transaction(callback),
      current.id,
      expectedVersion,
      data,
    );
    if (!config) {
      return res.status(409).json({ success: false, code: 'CONFIG_VERSION_CONFLICT', message: 'Configuration changed since it was loaded. Reload and try again.' });
    }

    res.status(200).json({ success: true, data: { ...config, currency: 'EGP', requireCourseApproval: true, enableCodePlaygrounds: false, enableCollaborativeBoards: false, capabilities: getPublicCapabilities() } });
  } catch (error: any) {
    console.error("Failed to update config:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to update config" });
  }
};
