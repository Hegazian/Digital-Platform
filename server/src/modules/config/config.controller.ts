import { Request, Response } from "express";
import { prisma } from "../../prisma";

export const getAppConfig = async (req: Request, res: Response) => {
  try {
    let config = prisma.appConfig ? await prisma.appConfig.findFirst() : null;

    if (!config && prisma.appConfig) {
      config = await prisma.appConfig.create({
        data: {},
      });
    }

    // Return the stored row as-is; schema defaults cover every field.
    res.status(200).json({ success: true, data: config ?? {} });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: {
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
        enableCodePlaygrounds: true,
        enableCollaborativeBoards: true,
        primaryColor: "#4f46e5",
      },
    });
  }
};

export const updateAppConfig = async (req: Request, res: Response) => {
  try {
    const {
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
      // Exchange rate must be a positive number — it drives every USD price.
      ...(exchangeRateUsdToEgp !== undefined && {
        exchangeRateUsdToEgp: Math.max(
          0.01,
          Number(exchangeRateUsdToEgp) || 48
        ),
      }),
      ...(requireCourseApproval !== undefined && {
        requireCourseApproval: Boolean(requireCourseApproval),
      }),
      ...(allowTeacherRegistration !== undefined && { allowTeacherRegistration: Boolean(allowTeacherRegistration) }),
      ...(enableCodePlaygrounds !== undefined && { enableCodePlaygrounds: Boolean(enableCodePlaygrounds) }),
      ...(enableCollaborativeBoards !== undefined && { enableCollaborativeBoards: Boolean(enableCollaborativeBoards) }),
      ...(primaryColor !== undefined && { primaryColor }),
    };

    let config: any = null;
    if (prisma.appConfig) {
      config = await prisma.appConfig.findFirst();

      if (!config) {
        config = await prisma.appConfig.create({
          data,
        });
      } else {
        config = await prisma.appConfig.update({
          where: { id: config.id },
          data,
        });
      }
    }

    // The row already contains exactly what was provided + prior values.
    res.status(200).json({ success: true, data: config ?? {} });
  } catch (error: any) {
    console.error("Failed to update config:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to update config" });
  }
};
