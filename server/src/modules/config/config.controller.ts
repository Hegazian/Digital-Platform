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

    res.status(200).json({
      success: true,
      data: {
        siteNameEn: config?.siteNameEn || "EduPlatform",
        siteNameAr: config?.siteNameAr || "منصة التعليم",
        siteDescriptionEn: config?.siteDescriptionEn || "Next-generation Egyptian secondary education platform",
        siteDescriptionAr: config?.siteDescriptionAr || "المنصة التعليمية المتقدمة لطلاب المرحلة الثانوية",
        hostDomain: "localhost:3000",
        supportEmail: "support@eduplatform.com",
        currency: "EGP",
        requireCourseApproval: true,
        allowTeacherRegistration: config?.allowTeacherRegistration ?? true,
        enableCodePlaygrounds: config?.enableCodePlaygrounds ?? true,
        enableCollaborativeBoards: config?.enableCollaborativeBoards ?? true,
        primaryColor: config?.primaryColor || "#4f46e5",
      },
    });
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
      hostDomain,
      supportEmail,
      currency,
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

    res.status(200).json({
      success: true,
      data: {
        ...(config || {}),
        siteNameEn: siteNameEn || config?.siteNameEn || "EduPlatform",
        siteNameAr: siteNameAr || config?.siteNameAr || "منصة التعليم",
        siteDescriptionEn: siteDescriptionEn || config?.siteDescriptionEn || "Next-generation Egyptian secondary education platform",
        siteDescriptionAr: siteDescriptionAr || config?.siteDescriptionAr || "المنصة التعليمية المتقدمة لطلاب المرحلة الثانوية",
        hostDomain: hostDomain || "localhost:3000",
        supportEmail: supportEmail || "support@eduplatform.com",
        currency: currency || "EGP",
        requireCourseApproval: requireCourseApproval !== undefined ? Boolean(requireCourseApproval) : true,
        allowTeacherRegistration: allowTeacherRegistration !== undefined ? Boolean(allowTeacherRegistration) : true,
        enableCodePlaygrounds: enableCodePlaygrounds !== undefined ? Boolean(enableCodePlaygrounds) : true,
        enableCollaborativeBoards: enableCollaborativeBoards !== undefined ? Boolean(enableCollaborativeBoards) : true,
        primaryColor: primaryColor || config?.primaryColor || "#4f46e5",
      },
    });
  } catch (error: any) {
    console.error("Failed to update config:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to update config" });
  }
};
