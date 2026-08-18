"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAppConfig = exports.getAppConfig = void 0;
const prisma_1 = require("../../prisma");
const getAppConfig = async (req, res) => {
    try {
        let config = await prisma_1.prisma.appConfig.findFirst();
        // If no config exists, create default
        if (!config) {
            config = await prisma_1.prisma.appConfig.create({
                data: {}
            });
        }
        res.status(200).json({ success: true, data: config });
    }
    catch (error) {
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
exports.getAppConfig = getAppConfig;
const updateAppConfig = async (req, res) => {
    try {
        const data = req.body;
        let config = await prisma_1.prisma.appConfig.findFirst();
        if (!config) {
            config = await prisma_1.prisma.appConfig.create({
                data
            });
        }
        else {
            config = await prisma_1.prisma.appConfig.update({
                where: { id: config.id },
                data
            });
        }
        res.status(200).json({ success: true, data: config });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to update config" });
    }
};
exports.updateAppConfig = updateAppConfig;
