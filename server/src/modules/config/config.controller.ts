import { Request, Response } from "express";
import { prisma } from "../../prisma";

export const getAppConfig = async (req: Request, res: Response) => {
  try {
    let config = await prisma.appConfig.findFirst();
    
    // If no config exists, create default
    if (!config) {
      config = await prisma.appConfig.create({
        data: {}
      });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    // Return default fallback config if DB table is not yet created
    res.status(200).json({
      success: true,
      data: {
        siteNameEn: "EduPlatform",
        siteNameAr: "منصة التعليم",
        siteDescriptionEn: null,
        siteDescriptionAr: null,
        allowTeacherRegistration: true,
        enableCodePlaygrounds: true,
        enableCollaborativeBoards: true,
        primaryColor: "#000000"
      }
    });
  }
};

export const updateAppConfig = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    let config = await prisma.appConfig.findFirst();

    if (!config) {
      config = await prisma.appConfig.create({
        data
      });
    } else {
      config = await prisma.appConfig.update({
        where: { id: config.id },
        data
      });
    }

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update config" });
  }
};
